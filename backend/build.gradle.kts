import org.gradle.api.tasks.testing.logging.TestExceptionFormat

plugins {
    java
    id("org.springframework.boot") version "3.3.5"
    id("io.spring.dependency-management") version "1.1.6"
    id("org.owasp.dependencycheck") version "10.0.4"
}

group = "com.portfolio"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

// Dependency locking (SECURITY-10)
dependencyLocking {
    lockAllConfigurations()
}

repositories {
    mavenCentral()
}

dependencies {
    // Spring Boot core
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-webflux")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-validation")

    // Database
    implementation("org.flywaydb:flyway-core")
    implementation("org.xerial:sqlite-jdbc:3.47.1.0")
    implementation("org.hibernate.orm:hibernate-community-dialects:6.6.4.Final")

    // CSV parsing (Shift-JIS / SBI証券)
    implementation("org.apache.commons:commons-csv:1.11.0")


    // Testing
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
}

tasks.withType<Test> {
    useJUnitPlatform()
    testLogging {
        events("passed", "skipped", "failed")
        exceptionFormat = TestExceptionFormat.FULL
    }
}

// OWASP Dependency Check configuration (manual run: ./gradlew dependencyCheckAnalyze)
dependencyCheck {
    format = "HTML"
    outputDirectory = "${layout.buildDirectory.asFile.get()}/reports"
    failBuildOnCVSS = 7f
}
