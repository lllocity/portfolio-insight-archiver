# Application Design Plan — Portfolio Insight & Archiver

以下の設計質問にご回答ください。各質問の `[Answer]:` タグの後に選択肢の英字を記入してください。

---

## Design Question 1: フロントエンド・バックエンドのデプロイ構成

Vue.js フロントエンドと Spring Boot バックエンドをどう構成しますか？

A) **分離構成**: Vue.js（Vite dev server, ポート5173）と Spring Boot（ポート8080）を別々のDockerサービスとして起動。フロントはAPIをhttp://localhost:8080に呼ぶ
B) **統合構成**: Spring Boot がビルド済みVue.jsの静的ファイルを配信。単一ポート（8080）ですべて提供

[Answer]: A

---

## Design Question 2: CSVインポートのトリガー方式

Q2でサーバーサイドのローカルパス読み込み（B）を選択されました。具体的な操作フローはどちらですか？

A) UIに「CSVを取り込む」ボタンを配置し、クリックすると設定済みパス（Dockerマウント）から`New_file.csv`を自動読み込みする
B) UIにファイルパスを入力するテキストフィールドを設け、パスを指定してインポートする

[Answer]: B

---

## Design Question 3: Google認証方式

[Answer]: サービスアカウント方式を採用（会話にて決定）
→ JSONキーファイルを専用の `./config/` ディレクトリにマウント。環境変数 `GOOGLE_SA_KEY_PATH` でパスを指定。
→ Google OAuth は不要。ユーザーログインフローなし。

---

## Design Question 4: ナビゲーション構造

アプリのメイン画面構成はどちらが望ましいですか？

A) **シングルダッシュボード**: 1画面に最新スナップショットの分析結果・セクター比・AIプロンプトをすべて表示。ページ下部に履歴一覧
B) **マルチページ**: 「現在のポートフォリオ」「履歴・比較」「AIプロンプト」「設定」を別タブ/ページに分ける

[Answer]: B

---

## Design Question 5: AIプロンプトのフォーマット

生成するAI分析プロンプトの構造はどちらが望ましいですか？

A) **構造化プロンプト**: セクション分け（現在のポートフォリオ概要 / 指標データ / 投資方針 / 質問事項）で詳細なプロンプトを生成
B) **シンプルプロンプト**: ポートフォリオデータを表形式でまとめ、「買い増し・整理のアドバイスをください」という1段落の質問を付ける

[Answer]: A

---

## Artifacts Generation Plan

以下のアーティファクトを生成します（回答後に実行）:

- [x] `aidlc-docs/inception/application-design/components.md` — コンポーネント定義と責務
- [x] `aidlc-docs/inception/application-design/component-methods.md` — メソッドシグネチャ（高レベル）
- [x] `aidlc-docs/inception/application-design/services.md` — サービス定義とオーケストレーション
- [x] `aidlc-docs/inception/application-design/component-dependency.md` — 依存関係マトリクスとデータフロー
- [x] `aidlc-docs/inception/application-design/application-design.md` — 統合設計ドキュメント
