## 4. Projeto da Solução

### 4.1. Modelo de Dados

O modelo relacional do **Pedala** foi atualizado para refletir a implementação atual do back-end em Java Spring Boot com migrations Flyway para Azure SQL Server. A estrutura atende ao ciclo de uso da plataforma: cadastro do usuário, endereço de entrega, catálogo de bicicletas, cadastro de categorias, locações, pagamentos, faturas, renovações, vistorias e telemetria GPS.

![Modelo Relacional do Pedala](images/modeloRelacional.png "Modelo Relacional — Pedala")

#### Descrição das Entidades

| Entidade | Descrição |
|---|---|
| `users` | Usuários do sistema. Armazena nome, e-mail, senha criptografada, CPF, telefone, plano, data de criação e perfil de acesso (`USER`, `FUNCIONARIO` ou `ADMIN`). |
| `user_addresses` | Endereço associado a um usuário, em relacionamento 1:1. Armazena CEP, logradouro, número, bairro, cidade, UF e complemento. |
| `bikes` | Catálogo e estoque de bicicletas. Armazena nome, categoria, descrição, disponibilidade, bloqueio, remoção lógica, quantidade total, quantidade disponível, preços semanal/quinzenal/mensal, imagem e data de cadastro. |
| `bike_categories` | Lista de categorias disponíveis para o cadastro de bicicletas, como Urbana, Mountain, Speed, Dobravel, Eletrica e Infantil. |
| `rentals` | Registro central das locações. Referencia usuário e bicicleta, guarda tipo de plano de locação (`semanal`, `quinzenal` ou `mensal`), datas, preço, status, endereço de entrega, dados de pagamento, tipo/valor do seguro e alerta de desvio. |
| `rental_invoices` | Faturas vinculadas a uma locação. Controla vencimento, valor, status e data de pagamento de cada cobrança. |
| `rental_renewals` | Histórico de renovações de uma locação, registrando o novo período, dias adicionados, preço e datas alteradas. |
| `inspections` | Vistorias ligadas a uma locação, usuário e bicicleta. Registra status, observação, funcionário responsável, data de criação e data de avaliação. |
| `bike_telemetry` | Histórico de telemetria GPS das bicicletas. Armazena bike, locação, latitude, longitude, velocidade, endereço e momento do registro. |

#### Relacionamentos principais

```
users              1:1   user_addresses
users              1:N   rentals
users              1:N   inspections
bikes              1:N   rentals
bikes              1:N   inspections
bikes              1:N   bike_telemetry
rentals            1:N   rental_invoices
rentals            1:N   rental_renewals
rentals            1:N   inspections
rentals            1:N   bike_telemetry
bike_categories    1:N   bikes (relacionamento lógico pelo nome da categoria)
```

#### Observações de atualização

O pagamento não possui tabela separada nesta versão: os dados de aprovação ficam em campos da tabela `rentals` (`pagamento_status`, `pagamento_solicitado_em`, `pagamento_aprovado_em`, `pagamento_aprovado_por` e `pagamento_motivo_rejeicao`). Os planos de seguro também não possuem tabela própria; o tipo e o valor do seguro contratado são registrados diretamente na locação. A telemetria GPS foi consolidada em `bike_telemetry`, que funciona como histórico de posições por bicicleta e por locação.

---

### 4.2. Tecnologias

A stack foi escolhida com foco em **agilidade de desenvolvimento**, **baixo custo de infraestrutura** e **aderência ao escopo acadêmico** do projeto, sem abrir mão de boas práticas de engenharia de software.

| **Dimensão**         | **Tecnologia**                              | **Justificativa** |
|---|---|---|
| **SGBD**             | Azure SQL Server                            | Banco relacional usado pela API em produção, com migrations Flyway em T-SQL e suporte a integridade referencial. |
| **Front-end**        | HTML + CSS + JavaScript (Vanilla)           | Sem frameworks de build, garantindo portabilidade e compatibilidade com GitHub Pages. Design system próprio baseado em design tokens (cores, tipografia, espaçamentos). |
| **Back-end**         | Java 17 + Spring Boot                       | API REST com camadas de controller, service e repository, autenticação JWT, validação e persistência via Spring Data JPA. |
| **Autenticação**     | Spring Security + JWT + BCrypt              | Autenticação stateless via Bearer Token e senhas armazenadas com hash BCrypt. |
| **Validação**        | Jakarta Bean Validation + regras de serviço | Validação de dados de entrada e regras de negócio antes da persistência. |
| **GPS / Tempo real** | Simulador GPS integrado à API               | Simula posições de bicicletas em movimento e envia atualizações para demonstração do rastreamento em tempo real. |
| **Deploy**           | Docker/API Spring Boot + Azure SQL Server   | Empacotamento da API com Docker e banco relacional hospedado no Azure SQL Server. |
| **Controle de Versão** | Git + GitHub                              | Versionamento do código-fonte, controle de branches e colaboração entre os membros da equipe. |
| **IDE / Ferramentas** | Visual Studio Code, ESLint, Prettier       | Padronização de código, detecção precoce de erros e formatação automática. |
| **Testes**           | JUnit/Spring Boot Test e Postman            | Testes automatizados no back-end e validação manual dos endpoints durante o desenvolvimento. |

#### Diagrama de Camadas da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                        │
│          HTML + CSS + JavaScript — GitHub Pages                 │
│   Páginas: Landing / Login / Cadastro / Dashboard / Admin       │
└────────────────────────┬────────────────────────────────────────┘
                         │  HTTPS (fetch / REST API)
┌────────────────────────▼────────────────────────────────────────┐
│                  BACK-END (Java 17 + Spring Boot)               │
│                         Docker / API REST                       │
│                                                                 │
│  Routes:  /auth  /bikes  /rentals  /admin  /gps  /vistorias    │
│  Middleware: JWT Auth  │  CORS  │  Rate Limiting               │
└────────────────────────┬────────────────────────────────────────┘
                         │  SQL
┌────────────────────────▼────────────────────────────────────────┐
│                  BANCO DE DADOS (Azure SQL Server)              │
│                  9 tabelas principais — modelo relacional       │
│ users · bikes · rentals · invoices · telemetry · inspections   │
└─────────────────────────────────────────────────────────────────┘
```

#### Fluxo de Autenticação

```
Cliente                    API                          Banco
  │                         │                             │
  │── POST /auth/login ────>│                             │
  │                         │── SELECT user WHERE email ─>│
  │                         │<── user row ────────────────│
  │                         │   bcrypt.compare(senha)     │
  │<── 200 { token: JWT } ──│                             │
  │                         │                             │
  │── GET /api/rentals ────>│                             │
  │   Authorization: Bearer │   verifyJWT middleware      │
  │<── 200 { rentals[] } ───│── SELECT rentals ──────────>│
```

#### Principais Endpoints da API

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| `POST` | `/api/auth/register` | Pública | Cadastro de novo usuário |
| `POST` | `/api/auth/login` | Pública | Login — retorna JWT |
| `GET` | `/api/auth/me` | JWT | Perfil do usuário logado |
| `GET` | `/api/bikes` | Pública | Listar bicicletas disponíveis |
| `GET` | `/api/bikes/:id` | Pública | Detalhes de uma bicicleta |
| `POST` | `/api/rentals` | JWT (cliente) | Criar nova locação |
| `GET` | `/api/rentals/meus` | JWT (cliente) | Listar minhas locações |
| `PUT` | `/api/rentals/:id/finalizar` | JWT | Devolver bicicleta |
| `GET` | `/api/gps/current` | JWT | Posições GPS atuais |
| `GET` | `/api/admin/dashboard` | JWT (admin) | Métricas do painel admin |
| `GET` | `/api/vistorias` | JWT (funcionário) | Listar vistorias pendentes |
| `POST` | `/api/contratos/:id/aprovar` | JWT (admin) | Aprovar pagamento |

---

### 4.3. Guia de Estilos

O **Pedala** adota um sistema de design com identidade visual consistente em todas as páginas.

#### Paleta de Cores

| Token | Hex | Uso |
|---|---|---|
| `--color-primary` | `#F5C518` | Cor de destaque principal — botões CTA, badges, ícones ativos |
| `--color-primary-dark` | `#D4A800` | Estado hover dos elementos primários |
| `--color-surface` | `#0D0D0D` | Background base da aplicação |
| `--color-surface-2` | `#1A1A1A` | Cards, painéis, inputs |
| `--color-surface-3` | `#252525` | Bordas, separadores, hover de itens |
| `--color-text-primary` | `#FFFFFF` | Texto principal |
| `--color-text-secondary` | `#A0A0A0` | Labels, textos auxiliares |
| `--color-success` | `#22C55E` | Status ativo, confirmações |
| `--color-warning` | `#F59E0B` | Alertas, pendências |
| `--color-danger` | `#EF4444` | Erros, cancelamentos |

#### Tipografia

| Uso | Família | Peso | Tamanho |
|---|---|---|---|
| Títulos de seção (H1) | Inter | 700 | 2.5rem |
| Subtítulos (H2) | Inter | 600 | 1.75rem |
| Corpo de texto | Inter | 400 | 1rem |
| Labels / Badges | Inter | 500 | 0.75rem |
| Código / Dados técnicos | JetBrains Mono | 400 | 0.875rem |

#### Espaçamento e Border-radius

| Token | Valor | Uso |
|---|---|---|
| `--space-xs` | `4px` | Gaps mínimos |
| `--space-sm` | `8px` | Padding interno de badges |
| `--space-md` | `16px` | Padding padrão de cards |
| `--space-lg` | `24px` | Espaçamento entre seções |
| `--space-xl` | `48px` | Margens de seção |
| `--radius-sm` | `6px` | Inputs, badges |
| `--radius-md` | `12px` | Cards |
| `--radius-lg` | `20px` | Modais, painéis |
| `--radius-full` | `9999px` | Botões pill, avatares |

---

### 4.4. Wireframes das Telas

O **Pedala** possui 5 telas principais, cada uma com responsabilidade clara dentro do fluxo de uso:

| # | Tela | Arquivo | Acesso | Descrição |
|---|---|---|---|---|
| 1 | **Landing Page** | `frontend/index.html` | Público | Hero com CTA, seções de como funciona, catálogo de bikes, planos e FAQ |
| 2 | **Login** | `frontend/pages/login.html` | Público | Autenticação por e-mail e senha com validação client-side |
| 3 | **Cadastro** | `frontend/pages/register.html` | Público | Registro com máscara de CPF e telefone, validação de campos |
| 4 | **Dashboard do Cliente** | `frontend/pages/dashboard.html` | Autenticado | Painel pessoal: locações ativas, histórico, status de pagamento |
| 5 | **Painel Administrativo** | `frontend/pages/admin.html` | Admin/Funcionário | Gerenciamento de bikes, locações, aprovações, GPS e vistorias |

#### Fluxo de Navegação do Usuário

```
[Landing Page]
      │
      ├──► [Cadastro] ──► [Login]
      │                      │
      │                      ▼
      │              [Dashboard do Cliente]
      │                      │
      │              ├── Ver bikes disponíveis
      │              ├── Criar locação
      │              ├── Ver histórico
      │              └── Devolver bicicleta
      │
      └──► [Admin] (role: admin / employee)
                    │
              ├── Aprovar pagamentos
              ├── Gerenciar bikes (CRUD)
              ├── Visualizar mapa GPS
              ├── Registrar vistorias
              └── Ver métricas do dashboard
```
