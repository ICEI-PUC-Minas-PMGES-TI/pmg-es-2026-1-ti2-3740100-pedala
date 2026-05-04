# Pedala API — Spring Boot Backend

API REST da plataforma **Pedala** (aluguel de bicicletas), migrada de Node.js/Express para **Java 17 + Spring Boot 3.3.x**.

## Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Runtime | Java 17 |
| Framework | Spring Boot 3.3.6 |
| Banco de Dados | MySQL 8.0 |
| Migrations | Flyway |
| Autenticação | JWT (jjwt) + BCrypt |
| Documentação | SpringDoc OpenAPI (Swagger UI) |
| Build | Maven |

## Pré-requisitos

- Java 17+ (JDK)
- MySQL 8.0+ (ou Docker)
- Maven 3.9+ (ou usar o wrapper `mvnw`)

## Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `DB_URL` | `jdbc:mysql://localhost:3306/pedala?...` | URL do banco MySQL |
| `DB_USER` | `root` | Usuário do banco |
| `DB_PASSWORD` | `root` | Senha do banco |
| `JWT_SECRET` | (chave padrão dev) | Chave de assinatura JWT (mín 32 chars) |
| `PORT` | `8080` | Porta do servidor |
| `UPLOAD_DIR` | `./uploads` | Diretório para upload de imagens |

## Como Rodar Localmente

### 1. Com Docker (recomendado)

```bash
docker-compose up -d
```

A API estará disponível em `http://localhost:8080`.

### 2. Sem Docker

```bash
# 1. Criar banco MySQL
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS pedala;"

# 2. Compilar e rodar
mvn spring-boot:run

# Ou com o wrapper:
./mvnw spring-boot:run
```

## URLs Úteis

| URL | Descrição |
|-----|-----------|
| `http://localhost:8080/api/health` | Health check |
| `http://localhost:8080/swagger-ui.html` | Swagger UI (documentação interativa) |
| `http://localhost:8080/v3/api-docs` | OpenAPI JSON |
| `http://localhost:8080/actuator/health` | Spring Actuator |

## Usuários Padrão (seed automático)

| Role | Email | Senha |
|------|-------|-------|
| Admin | `admin@pedala.com` | `admin123` |
| Funcionário | `funcionario@pedala.com` | `funcionario123` |
| Usuário | `usuario@pedala.com` | `usuario123` |

## Rodar Testes

```bash
mvn test
```

## Estrutura do Projeto

```
src/main/java/com/pedala/api/
├── config/          # SecurityConfig, CorsConfig, OpenApiConfig, DataSeeder
├── security/        # JWT filter, token provider, UserPrincipal
├── user/            # Auth: registro, login, perfil
├── bike/            # CRUD de bicicletas, upload de imagens
├── rental/          # Locações: criar, ativar, devolver, renovar, pagar
├── inspection/      # Vistorias: listar, aprovar, reprovar
├── admin/           # Dashboard admin: stats, pagamentos, usuários
├── gps/             # Simulador GPS: SSE streaming, posições
├── contract/        # Geração de contrato HTML
├── exception/       # GlobalExceptionHandler, exceções customizadas
└── shared/          # FileStorageService, TimeSimulator
```
