# Unit of Work Plan — Portfolio Insight & Archiver

以下の質問にご回答ください。

---

## UOW Question 1: バックエンドのビルドシステム

Spring Boot プロジェクトのビルドシステムはどちらを使用しますか？

A) Maven（`pom.xml`）
B) Gradle（`build.gradle.kts`）

[Answer]: B

---

## UOW Question 2: ディレクトリ構成（モノレポ）

フロントエンドとバックエンドのディレクトリ配置はどちらが望ましいですか？

A) **モノレポ**（1リポジトリ内に並列配置）
```
portfolio-insight-archiver/
├── backend/      # Spring Boot
└── frontend/     # Vue.js + Vite
```

B) **ルート直置き**（バックエンドをルートに置き、フロントを分ける）
```
portfolio-insight-archiver/
├── src/          # Spring Boot（Maven/Gradle標準構造）
├── frontend/     # Vue.js + Vite
└── pom.xml
```

[Answer]: A

---

## Artifacts Generation Plan

- [x] `aidlc-docs/inception/application-design/unit-of-work.md` — ユニット定義・責務・コード構成
- [x] `aidlc-docs/inception/application-design/unit-of-work-dependency.md` — ユニット間依存関係マトリクス
- [x] `aidlc-docs/inception/application-design/unit-of-work-story-map.md` — 機能要件とユニットのマッピング
