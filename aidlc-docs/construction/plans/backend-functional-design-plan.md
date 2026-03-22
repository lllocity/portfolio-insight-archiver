# Backend Functional Design Plan

以下の質問にご回答ください。

---

## FD Question 1: SBI証券CSVの文字コード

SBI証券からダウンロードされるCSVの文字コードはどちらですか？

A) Shift-JIS（CP932）
B) UTF-8
C) わからない → 自動判定する

[Answer]: A

---

## FD Question 2: 同一銘柄の複数買付行

SBI証券のCSVでは、同じ銘柄を異なる日に買い付けた場合、**複数行**が出力されることがあります。

例：
```
銘柄コード | 買付日     | 数量 | 取得単価
7203      | 2024-10-01 | 100  | 2500
7203      | 2025-01-15 | 50   | 2800
```

この場合、スナップショットの保存・表示はどうするべきですか？

A) **買付行ごとに保存**（複数行をそのまま個別レコードとして保持）
B) **銘柄コードで集約**（同一銘柄の行を1件にまとめ、数量は合計・取得単価は加重平均）

[Answer]: B

---

## FD Question 3: スナップショット差分の比較単位

前回スナップショットとの差分計算において、「同じ銘柄」の判定基準はどちらですか？

A) **銘柄コードのみ**（買付日が違っても同じ銘柄扱い）
B) **銘柄コード + 買付日**（別日買付は別銘柄扱い）

（FD Q2 で B 集約を選んだ場合は自動的に A になります）

[Answer]: A

---

## FD Question 4: Google Docsのコンテンツ形式

Google Docsアーカイブのフォーマットはどちらが望ましいですか？

A) **リッチフォーマット**（Google Docs の見出し・テーブル・箇条書きを使う）
B) **プレーンテキスト**（マークダウン風のシンプルなテキストとして書き込む）

[Answer]: A

---

## FD Question 5: AIプロンプトの投資方針セクション

プロンプト内の「投資方針」セクションはどちらにしますか？

A) **固定テキスト**（バリュー株・高配当・国策テーマ重視という方針をコードに埋め込む）
B) **設定画面で編集可能**（Settings からカスタマイズできるようにする）

[Answer]: A

---

## Artifacts Generation Plan

- [x] `aidlc-docs/construction/backend/functional-design/domain-entities.md`
- [x] `aidlc-docs/construction/backend/functional-design/business-rules.md`
- [x] `aidlc-docs/construction/backend/functional-design/business-logic-model.md`
