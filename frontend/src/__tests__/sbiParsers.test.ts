import { describe, it, expect } from 'vitest'
import { parseRealizedCsv } from '../../../supabase/functions/_shared/realized-parser.ts'
import { parseDividendCsv } from '../../../supabase/functions/_shared/dividend-parser.ts'

// 実データ（DOMESTIC_STOCK_*.csv）を模したフィクスチャ。
// プリアンブル＋集計ブロック＋明細、分割約定、0/負の損益、186Aコード、NISA行を含む。
const REALIZED_CSV = [
  '"国内株式"',
  '',
  '"検索件数","6"',
  '"約定日","2025/4/1-2026/8/4"',
  '"種類","現物"',
  '"口座","すべて"',
  '',
  '"商品","実現損益(税引前・円)","利益金額(円)","損失金額(円)"',
  '"現物","+552,320","640,010","-87,690"',
  '"合計","+552,320","640,010","-87,690"',
  '',
  '"約定日","口座","銘柄名","取引","数量","売却/決済額","単価","平均取得価額","実現損益(税引前・円)"',
  '"2026/7/30","特定","ブックオフグループホールディングス 9278","売却","100","285,010","2,850.1","1,255","+159,510"',
  '"2026/7/30","特定","ブックオフグループホールディングス 9278","売却","100","285,000","2,850","1,255","+159,500"',
  '"2026/6/18","特定","ルネサスエレクトロニクス 6723","売却","200","933,800","4,669","4,669","0"',
  '"2026/6/17","特定","三井Ｅ＆Ｓ 7003","売却","100","449,810","4,498.1","5,375","-87,690"',
  '"2026/6/10","特定","アストロスケールホールディングス 186A","売却","500","903,000","1,806","1,272","+267,000"',
  '"2025/12/4","NISA（成長投資枠）","ＪＦＥホールディングス 5411","売却","300","581,700","1,939","1,759","+54,000"',
  '',
].join('\n')

// 実データ（DISTRIBUTION_*.csv）を模したフィクスチャ。
// 投資信託（コードなし・大きな数量）、NISA、円額が空の行（USD建て相当→skip）を含む。
const DIVIDEND_CSV = [
  '"検索件数","4"',
  '"受渡日","2026/4/1-2026/8/4"',
  '"種類","すべて"',
  '"口座","すべて"',
  '',
  '"商品","受取額(税引後・円)","受取額(税引後・USD)"',
  '"国内株式(現物)","16,194",',
  '"投資信託","10,565",',
  '"合計","26,759",',
  '',
  '"受渡日","口座","商品","銘柄名","数量","受取額(税引後・円)"',
  '"2026/6/29","NISA（成長投資枠）","国内株式(現物)","ふくおかフィナンシャルグループ 8354","100","9,500"',
  '"2026/6/29","特定/一般","国内株式(現物)","三井Ｅ＆Ｓ 7003","200","6,694"',
  '"2026/6/16","NISA（つみたて投資枠）","投資信託","日経平均高配当利回り株ファンド","293,475","10,565"',
  '"2026/6/10","特定/一般","国内株式(現物)","テスト外貨建 9999","100",""',
  '',
].join('\n')

describe('parseRealizedCsv', () => {
  const { records, skipped } = parseRealizedCsv(REALIZED_CSV)

  it('プリアンブル・集計ブロックを除いた明細のみを取得する', () => {
    expect(records).toHaveLength(6)
    expect(skipped).toBe(0)
  })

  it('分割約定を潰さずに約定単位で保持する', () => {
    const bookoff = records.filter((r) => r.tickerCode === '9278')
    expect(bookoff).toHaveLength(2)
    expect(bookoff.map((r) => r.realizedPl)).toEqual([159510, 159500])
  })

  it('0・負の実現損益を保持する', () => {
    expect(records.find((r) => r.tickerCode === '6723')?.realizedPl).toBe(0)
    expect(records.find((r) => r.tickerCode === '7003')?.realizedPl).toBe(-87690)
  })

  it('英数字コード(186A)を末尾から抽出する', () => {
    const astro = records.find((r) => r.tickerCode === '186A')
    expect(astro?.companyName).toBe('アストロスケールホールディングス')
    expect(astro?.quantity).toBe(500)
    expect(astro?.proceeds).toBe(903000)
  })

  it('NISA口座の行も含む', () => {
    const jfe = records.find((r) => r.tickerCode === '5411')
    expect(jfe?.account).toBe('NISA（成長投資枠）')
    expect(jfe?.tradeDate).toBe('2025-12-04')
  })

  it('実現損益の合計がSBI集計値と一致する', () => {
    const sum = records.reduce((s, r) => s + r.realizedPl, 0)
    expect(sum).toBe(552320)
  })
})

describe('parseDividendCsv', () => {
  const { records, skipped } = parseDividendCsv(DIVIDEND_CSV)

  it('円額のある明細のみ取得し、円額が空の行はスキップする', () => {
    expect(records).toHaveLength(3)
    expect(skipped).toBe(1)
  })

  it('税引後の受取額を数値として保持する', () => {
    expect(records.map((r) => r.amountNet)).toEqual([9500, 6694, 10565])
    const sum = records.reduce((s, r) => s + r.amountNet, 0)
    expect(sum).toBe(26759)
  })

  it('投資信託はファンド名をtickerCodeにし数量を保持する', () => {
    const fund = records.find((r) => r.product === '投資信託')
    expect(fund?.tickerCode).toBe('日経平均高配当利回り株ファンド')
    expect(fund?.companyName).toBeNull()
    expect(fund?.quantity).toBe(293475)
  })

  it('国内株式はコードを末尾から抽出する', () => {
    const fukuoka = records.find((r) => r.tickerCode === '8354')
    expect(fukuoka?.companyName).toBe('ふくおかフィナンシャルグループ')
    expect(fukuoka?.account).toBe('NISA（成長投資枠）')
    expect(fukuoka?.payDate).toBe('2026-06-29')
  })
})

// 明細に USD 列が増えた（列順・列数が変わる）ケースと、
// 末尾が4桁トークンで終わる投信名のコード誤認防止を検証（code-review #1・#2）。
const DIVIDEND_CSV_EXTRA_COL = [
  '"検索件数","2"',
  '"受渡日","2026/4/1-2026/8/4"',
  '',
  '"受渡日","口座","商品","銘柄名","数量","受取額(税引後・円)","受取額(税引後・USD)"',
  '"2026/6/29","特定/一般","国内株式(現物)","ふくおかフィナンシャルグループ 8354","100","9,500",',
  '"2026/6/16","NISA（つみたて投資枠）","投資信託","ひふみプラス 2024","293,475","10,565",',
  '',
].join('\n')

describe('parseDividendCsv（列追加・投信名の堅牢性）', () => {
  const { records } = parseDividendCsv(DIVIDEND_CSV_EXTRA_COL)

  it('明細にUSD列が増えても列名解決で円明細を取得する', () => {
    expect(records).toHaveLength(2)
    expect(records.map((r) => r.amountNet)).toEqual([9500, 10565])
  })

  it('投資信託は末尾4桁トークンをコード誤認せずファンド名全体をtickerCodeにする', () => {
    const fund = records.find((r) => r.product === '投資信託')
    expect(fund?.tickerCode).toBe('ひふみプラス 2024')
    expect(fund?.companyName).toBeNull()
  })

  it('株式は引き続き末尾コードを抽出する', () => {
    const stock = records.find((r) => r.product === '国内株式(現物)')
    expect(stock?.tickerCode).toBe('8354')
    expect(stock?.companyName).toBe('ふくおかフィナンシャルグループ')
  })
})
