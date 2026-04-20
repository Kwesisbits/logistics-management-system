FROM eclipse-temurin:21-jdk-alpine AS build
RUN apk add --no-cache maven

WORKDIR /app

COPY pom.xml .
COPY logistics-security-common/pom.xml logistics-security-common/
COPY services/warehouse-service/pom.xml services/warehouse-service/

RUN mvn dependency:go-offline -B || true

COPY . .

RUN mvn package -pl services/warehouse-service -am -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/services/warehouse-service/target/*.jar app.jar
EXPOSE 8083

# Health check for Render
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8083/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
