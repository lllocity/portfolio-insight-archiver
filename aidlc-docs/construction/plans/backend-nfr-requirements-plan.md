# Backend NFR Requirements Plan

以下の質問にご回答ください。

---

## NFR Question 1: CSVファイルパスのバリデーション（セキュリティ）

ユーザーがUIでCSVファイルパスを入力する際、**パストラバーサル攻撃**（例: `../../etc/passwd`）を防ぐためにバックエンドで検証しますか？

個人ツールですが Security Baseline（SECURITY-05）では入力バリデーションが必須です。

A) **厳格に検証する** — 指定パスがDockerマウントディレクトリ（`/data/`）配下であることを必ず確認する
B) **基本検証のみ** — ファイルが存在するか・拡張子が`.csv`かのみ確認する（パスの制限なし）

[Answer]: A

---

## NFR Question 2: 依存ライブラリの脆弱性スキャン

Security Baseline（SECURITY-10）では「依存関係の脆弱性スキャンをビルドフローに組み込む」が必須です。

A) **OWASP Dependency Check** を Gradle タスクに組み込む（ビルド時にスキャン）
B) **スキャンは手動で実施**（個人ツールなので CI/CD なし。スキャンは手動run で対応）

[Answer]: B

---

## NFR Question 3: テストスコープ

このプロジェクトで期待するテストのスコープはどちらですか？

A) **ユニットsテストのみ** — 外部依存（J-Quants・Google Docs・SQLite）はすべてモック
B) **ユニットテスト + 統合テスト** — SQLiteはインメモリで実テスト、外部APIはモック

[Answer]: A

---

## Artifacts Generation Plan

- [x] `aidlc-docs/construction/backend/nfr-requirements/nfr-requirements.md`
- [x] `aidlc-docs/construction/backend/nfr-requirements/tech-stack-decisions.md`
