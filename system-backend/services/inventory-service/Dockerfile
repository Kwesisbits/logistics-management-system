FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

COPY pom.xml .
COPY logistics-security-common/pom.xml logistics-security-common/
COPY services/inventory-service/pom.xml services/inventory-service/

RUN mvn dependency:go-offline -B

COPY . .

RUN mvn package -pl services/inventory-service -am -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/services/inventory-service/target/*.jar app.jar
EXPOSE 8082

# Health check for Render
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8082/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
