# Multi-stage build for Pedala API
FROM eclipse-temurin:17-jdk-alpine AS build

# Instala o Maven
RUN apk add --no-cache maven

WORKDIR /app
COPY src/pom.xml .
COPY src/.mvn .mvn
COPY src/main src/main
RUN mvn -B dependency:go-offline
RUN mvn -B package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
RUN mkdir -p /app/uploads
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
