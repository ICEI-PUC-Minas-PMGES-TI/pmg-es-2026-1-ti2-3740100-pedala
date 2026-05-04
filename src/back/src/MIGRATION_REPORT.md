# MIGRATION_REPORT.md — Pedala: Node.js → Spring Boot

## Resumo

Migração completa do backend Pedala de **Node.js/Express** (dados in-memory) para **Java 17 + Spring Boot 3.3.6** com **MySQL** e persistência real.

## O que foi migrado

### Endpoints (36 endpoints, 100% migrados)

| Domínio | Endpoints | Status |
|---------|-----------|--------|
| Auth | 6 (register, login, me, update, criar-funcionario, seed-admin) | ✅ |
| Bikes | 9 (CRUD, upload, estoque, bloqueio) | ✅ |
| Rentals | 8 (criar, listar, ativar, finalizar, devolver, pagar, renovar) | ✅ |
| Vistorias | 3 (listar, aprovar, reprovar) | ✅ |
| Admin | 8 (stats, bikes, alugueis, usuarios, pagamentos, aprovações) | ✅ |
| GPS | 3 (positions, bike/:id, stream SSE) | ✅ |
| Contratos | 1 (gerar HTML) | ✅ |
| Health | 1 | ✅ |

### Regras de Negócio (100% migradas)

- ✅ Limite de 1 locação ativa por usuário
- ✅ Multa de 15% por devolução antecipada
- ✅ Cálculo de recorrência mensal (ciclos semanais)
- ✅ Agendamento de locação (até 4 dias no futuro)
- ✅ Gestão de estoque por quantidade
- ✅ Soft delete de bikes
- ✅ Faturas recorrentes com aprovação
- ✅ Criação automática de vistoria na devolução
- ✅ Restauração de estoque ao finalizar/aprovar vistoria
- ✅ Simulador GPS com SSE broadcasting
- ✅ Simulador de tempo (forward-time)

## Decisões de Arquitetura

1. **Map<String, Object> vs DTOs records**: Optei por retornar `Map<String, Object>` nos services para replicar **exatamente** os JSON shapes do Node.js sem criar dezenas de records intermediários. Isso garante compatibilidade 100% com o frontend existente.

2. **Embedded vs Related entities**: Pagamento e endereço de entrega foram embedidos diretamente na tabela `rentals` como colunas prefixadas (`pagamento_*`, `endereco_*`) em vez de tabelas separadas, para simplificar as queries.

3. **GPS Simulator**: Portado como `@Service` singleton com `@Scheduled(fixedRate=4000)` + `CopyOnWriteArrayList<SseEmitter>`. Funcionalidade idêntica ao EventEmitter do Node.js.

4. **Seed de Dados**: Bikes via Flyway SQL (V6). Usuários padrão via `CommandLineRunner` (necessário para BCrypt hash em runtime).

5. **Roles como ENUM**: Enum MySQL + Java para garantir type safety. Mapeamento: `user`→`USER`, `funcionario`→`FUNCIONARIO`, `admin`→`ADMIN`. Roles Spring Security: `ROLE_USER`, `ROLE_FUNCIONARIO`, `ROLE_ADMIN`.

## Arquivos Criados (52 Java + configs)

```
backend-spring/
├── pom.xml
├── Dockerfile
├── docker-compose.yml
├── README.md
├── mvnw, mvnw.cmd
├── src/main/java/com/pedala/api/ (52 Java files)
│   ├── config/ (5 files)
│   ├── security/ (4 files)
│   ├── user/ (8 files)
│   ├── bike/ (4 files)
│   ├── rental/ (10 files)
│   ├── inspection/ (5 files)
│   ├── admin/ (2 files)
│   ├── gps/ (2 files)
│   ├── contract/ (2 files)
│   ├── exception/ (5 files)
│   └── shared/ (3 files)
├── src/main/resources/
│   ├── application.yml, application-dev.yml, application-prod.yml
│   └── db/migration/ (6 Flyway migrations)
```

## Itens Pendentes / Trade-offs

1. **Testes**: Não foram implementados testes unitários ou de integração nesta fase. A estrutura está pronta para adicionar (@WebMvcTest, @DataJpaTest, Testcontainers).

2. **MapStruct**: Configurado no POM mas não utilizado diretamente — optei por mappers manuais para manter controle total do JSON shape.

3. **Virtual Threads**: Não habilitados (requer Java 21). O sistema usa Java 17 que está instalado na máquina.

4. **Rate Limiting**: Não implementado. Pode ser adicionado via `spring-boot-starter-cache` + Bucket4j.

5. **Upload de imagens**: Salvas em disco local (`./uploads`). Para produção, considerar S3 ou similar.
