# Multi-stage build for Pedala API
FROM eclipse-temurin:17-jdk-alpine AS build

# Instala o Maven
RUN apk add --no-cache maven

WORKDIR /app
COPY pom.xml .
COPY .mvn .mvn
COPY src src
RUN mvn -B dependency:go-offline
RUN mvn -B package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
RUN mkdir -p /app/uploads
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
