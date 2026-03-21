# Portfolio Insight & Archiver — 要件確認質問

以下の質問にご回答ください。各質問の `[Answer]:` タグの後に選択肢の英字を記入してください。
選択肢に当てはまるものがない場合は最後の選択肢（Other）を選び、自由記述してください。

---

## Question 1: フロントエンドフレームワーク
TypeScript のモダンなフレームワークとして、具体的に何を使用しますか？

A) React (+ Vite)
B) Next.js
C) Vue.js (+ Vite)
D) Angular
E) Other (please describe after [Answer]: tag below)

[Answer]: C (どれでもいいがVue.jsを使用します)

---

## Question 2: CSVのアップロード方式
CSVファイルのアップロードはどのような方式を想定していますか？

A) ブラウザ上でファイルを選択してAPIへアップロード（通常のファイルアップロード）
B) ローカルのファイルパスを指定してサーバーサイドで直接読み込む（CLIライク）
C) ドラッグ＆ドロップによるアップロードUI
D) Other (please describe after [Answer]: tag below)

[Answer]: B
SBI証券のポートフォリオからダウンロードされるCSVは常に New_file.csv という名前だが
アップロード先のファイルは YYYY-MM-DD.docx のようにアーカイブされるファイル名が望ましい。

---

## Question 3: CSVのフォーマット・証券会社
CSVの形式は特定の証券会社のフォーマットに準拠しますか？それとも独自フォーマットを定義しますか？

A) 特定の証券会社のCSVをそのまま利用する（SBI証券、楽天証券、マネックス証券 など）
B) 独自のCSVフォーマットを定義する（カラム名・構造を自分で決める）
C) 複数証券会社のCSVに対応できるよう、マッピング設定を持たせる
D) Other (please describe after [Answer]: tag below)

[Answer]: A (SBI証券)

---

## Question 4: 分析に使用する外部データ
PBR・PER・配当利回りなどの指標は、CSVに含まれる前提ですか？それとも外部APIから取得しますか？

A) CSVにすべての指標（PBR, PER, 配当利回りなど）が含まれている前提
B) CSVは保有株数・取得単価・評価額などの基本情報のみ。指標は外部APIから取得する
C) CSVに含まれる情報で計算できるものは計算し、不足分は外部APIから補う
D) Other (please describe after [Answer]: tag below)

[Answer]: B
→ CSVに入っている情報としては以下。
銘柄（コード）	買付日	数量	取得単価	現在値	前日比	前日比（％）	損益	損益（％）	評価額

---

## Question 5: 外部株価・指標データAPI（Question 4でB/Cを選んだ場合）
外部の株価・指標データはどのAPIから取得しますか？

A) Yahoo Finance API（非公式含む）
B) J-Quants API（日本株特化）
C) 別途APIを決めていない（スタブ/モックで先行開発し、後で差し込む）
D) Other (please describe after [Answer]: tag below)

[Answer]: B
→ セクターごとの割合や配当情報、決算発表日、時価総額など補完する想定です

---

## Question 6: AI分析の方式
AI分析（買い増し・整理アドバイス）の方式として、どちらが望ましいですか？

A) アプリが分析プロンプトを生成し、ユーザーが手動でChatGPT/Claude等のChat UIにコピペする
B) バックエンドからAI APIを直接呼び出し、アプリ内で分析結果を表示する
C) 両方に対応する（プロンプト出力モードとAPI直接呼び出しモードを切り替えられる）
D) Other (please describe after [Answer]: tag below)

[Answer]: A
→ なぜなら今入っているプラン内で実現できるからです。APIは従量課金なのできつい。

---

## Question 7: AI分析対象のモデル・サービス（Question 6でB/Cを選んだ場合）
API直接呼び出しを行う場合、どのAIサービスを使用しますか？

A) OpenAI API (GPT-4系)
B) Anthropic API (Claude系)
C) Google Gemini API
D) Other (please describe after [Answer]: tag below)

[Answer]: None

---

## Question 8: Google Docsへのアーカイブ粒度
Google Docsへのスナップショット保存はどのタイミング・粒度で行いますか？

A) CSVアップロードのたびに自動でスナップショットを作成・保存する
B) ユーザーが明示的に「アーカイブ」ボタンを押したときに保存する
C) 両方（自動保存 + 手動トリガーの両方をサポート）
D) Other (please describe after [Answer]: tag below)

[Answer]: A
前述の通り、YYYY-MM-DD.docx のように日付ごとでいいと思います
同日にアップロードした場合は、後のファイルで上書きでいいです

---

## Question 9: Google Docsのドキュメント構造
Google Docsへのアーカイブは、どのような構造で保存しますか？

A) スナップショットごとに1つの新しいGoogle Docを作成する
B) 1つのGoogle Docに時系列で追記していく（スナップショットをセクションとして追加）
C) Google Driveのフォルダを月単位などで分け、その配下にDocを作成する
D) Other (please describe after [Answer]: tag below)

[Answer]: A (日付でユニーク)

---

## Question 10: 認証・マルチユーザー対応
このアプリは単一ユーザー（個人利用）前提ですか、それとも複数ユーザー対応が必要ですか？

A) 完全にシングルユーザー（認証不要・ローカル環境のみ）
B) シングルユーザーだが、Google OAuth認証を使って自分のGoogle Docsに安全にアクセスする
C) マルチユーザー対応が必要（各ユーザーが自分のポートフォリオを管理）
D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 11: セクター分類の基準
投資セクターの偏り分析に使用する「セクター分類」の基準はどれを使用しますか？

A) 東証33業種分類（日本株標準）
B) GICS（世界産業分類基準）
C) 独自分類（国策テーマ等：造船、銀行、保険など自分でカテゴリを定義）
D) A + C（東証33業種を基本にしつつ、国策テーマタグも付与する）
E) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 12: 対象市場
分析対象の銘柄市場はどこですか？

A) 日本株のみ（東証プライム・スタンダード・グロース）
B) 日本株 + 米国株（一部）
C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 13: アーカイブするGoogle Docsのコンテンツ
Google Docsに保存するスナップショットに含めるべき情報はどれですか？（複数選択可 → 該当する選択肢をすべてカンマ区切りで記入）

A) ポートフォリオ全銘柄のリスト（銘柄名、保有株数、評価額など）
B) セクター別の構成比グラフ（テキスト表現）
C) PBR/PER/配当利回りの一覧表
D) AI分析によるアドバイステキスト
E) 前回スナップショットとの差分（増減した銘柄、評価額の変化）
F) Other (please describe after [Answer]: tag below)

[Answer]: A, B, D, E

---

## Question 14: デプロイ・実行環境
このアプリはどこで動かしますか？

A) ローカルPC（Docker Compose でローカル起動）のみ
B) 自宅サーバー / NAS（Docker Compose）
C) クラウド（AWS / GCP / Azure など）にデプロイ
D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 15: セキュリティ拡張
セキュリティ拡張ルールをこのプロジェクトに適用しますか？

A) Yes — すべてのセキュリティルールをブロッキング制約として適用する（本番品質のアプリを目指す場合に推奨）
B) No — セキュリティルールをスキップする（PoC・プロトタイプ・実験的プロジェクト向け）
C) Other (please describe after [Answer]: tag below)

[Answer]: Yes
