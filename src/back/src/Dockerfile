FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests --no-transfer-progress -f src/back/src/pom.xml

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/src/back/src/target/*.jar app.jar
RUN mkdir -p /app/uploads
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
