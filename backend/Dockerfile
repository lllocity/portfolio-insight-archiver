# ---- Build Stage ----
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app

COPY gradlew gradlew.bat settings.gradle.kts build.gradle.kts ./
COPY gradle/ gradle/
RUN ./gradlew dependencies --no-daemon

COPY src/ src/
RUN ./gradlew bootJar --no-daemon -x test

# ---- Run Stage ----
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

COPY --from=builder /app/build/libs/*.jar app.jar

# Non-root user (SECURITY-09)
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
