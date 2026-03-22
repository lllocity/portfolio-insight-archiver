# Tech Stack Decisions — backend

---

## コア技術スタック

| レイヤー | 技術 | バージョン | 選定理由 |
|---|---|---|---|
| 言語 | Java | 21 (LTS) | 長期サポート・Virtual Threads対応 |
| フレームワーク | Spring Boot | 3.x | 豊富なエコシステム・Auto-configuration |
| ビルドシステム | Gradle Kotlin DSL | 8.x | タイプセーフな設定・高速ビルド |
| データベース | SQLite | 3.x | ローカルファイルDB・追加インフラ不要 |
| DBアクセス | Spring Data JPA + Hibernate | Spring Boot 管理 | 標準ORM・マイグレーション対応 |
| DBマイグレーション | Flyway | Spring Boot 管理 | スキーマバージョン管理 |
| コンテナ | Docker + Docker Compose | 最新安定版 | ローカル実行環境の統一 |

---

## 主要ライブラリ選定

### CSV パース

| 採用 | ライブラリ | 理由 |
|---|---|---|
| ✅ | **Apache Commons CSV** | 軽量・文字コード指定が明確・SBI CSV形式に対応しやすい |
| ❌ | OpenCSV | 若干重い・Shift-JIS対応が煩雑 |

### Google API

| ライブラリ | 用途 |
|---|---|
| `google-api-services-docs` | Google Docs API v1 |
| `google-api-services-drive` | Google Drive API v3（フォルダ検索・削除） |
| `google-auth-library-oauth2-http` | サービスアカウント認証 |

### セキュリティ

| 採用 | ライブラリ | 用途 |
|---|---|---|
| ✅ | **Spring Security** | CORS設定・HTTPセキュリティヘッダー（認証機能は無効化） |
| ✅ | **Hibernate Validator** | Bean Validation（入力バリデーション） |

### テスト

| ライブラリ | 用途 |
|---|---|
| JUnit 5 | テストフレームワーク |
| Mockito | モック・スタブ |
| Spring Boot Test | Spring コンテキストのテスト |

### ロギング

| 採用 | ライブラリ | 用途 |
|---|---|---|
| ✅ | **SLF4J + Logback** | Spring Boot デフォルト。構造化ログ設定 |

### HTTP クライアント（J-Quants API）

| 採用 | ライブラリ | 理由 |
|---|---|---|
| ✅ | **Spring WebClient** (Reactor) | 非同期・タイムアウト設定が容易 |
| ❌ | RestTemplate | 非推奨（Spring 5 以降） |

---

## SQLite + Spring Data JPA 構成

Spring Data JPA で SQLite を使用する際の追加設定:

```kotlin
// build.gradle.kts
dependencies {
    implementation("org.xerial:sqlite-jdbc:3.x.x")
    implementation("org.hibernate.orm:hibernate-community-dialects") // SQLite dialect
}
```

```yaml
# application.yml
spring:
  datasource:
    url: jdbc:sqlite:${DB_PATH:/data/portfolio.db}
    driver-class-name: org.sqlite.JDBC
  jpa:
    database-platform: org.hibernate.community.dialect.SQLiteDialect
    hibernate:
      ddl-auto: validate  # Flyway でスキーマ管理するため validate
  flyway:
    enabled: true
    locations: classpath:db/migration
```

---

## Spring Security 設定方針

ユーザー認証は不要だが、CORS とセキュリティヘッダーのために Spring Security を使用する。

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    // 1. デフォルト認証を無効化
    // 2. CORS: localhost:5173 のみ許可
    // 3. セキュリティヘッダー: CSP・HSTS・X-Content-Type-Options 等を設定
    // 4. CSRF: REST API（ステートレス）のため無効化
    // 5. Spring Boot Actuator: /actuator/health のみ公開
}
```

---

## ロギング設定方針（SECURITY-03）

```xml
<!-- logback-spring.xml -->
<!-- パターン: timestamp | level | requestId | logger | message -->
<!-- 機密情報（token, key, password）はマスク -->
<!-- ログレベル: INFO (本番相当) / DEBUG (開発時は application.yml で切替) -->
```

環境変数 `LOG_LEVEL`（デフォルト: `INFO`）で制御。

---

## Gradle Dependency Locking（SECURITY-10）

```kotlin
// build.gradle.kts
dependencyLocking {
    lockAllConfigurations()
}
```

初回: `./gradlew dependencies --write-locks` でロックファイル生成・コミット。
更新時: `./gradlew dependencies --update-locks <group:artifact>` で個別更新。

---

## 脆弱性スキャン（手動実施）

OWASP Dependency Check プラグインを追加し、必要に応じて手動実行:

```kotlin
// build.gradle.kts
plugins {
    id("org.owasp.dependencycheck") version "x.x.x"
}
```

実行: `./gradlew dependencyCheckAnalyze`
出力: `build/reports/dependency-check-report.html`

---

## Docker ベースイメージ

| 用途 | イメージ | 理由 |
|---|---|---|
| ビルド | `eclipse-temurin:21-jdk` | 公式JDK・特定バージョン固定（`latest`禁止） |
| 実行 | `eclipse-temurin:21-jre` | 最小ランタイム。JDKは不要 |
