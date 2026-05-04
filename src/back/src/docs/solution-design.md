## 4. Projeto da Solução

### 4.1. Modelo de Dados

O modelo relacional abaixo contempla todas as entidades e atributos identificados na modelagem dos processos de negócio do **Pedala** — plataforma de aluguel de bicicletas. O banco de dados foi estruturado para suportar o ciclo completo de uma locação: cadastro de usuário, seleção de bicicleta, **escolha de plano de proteção** (independente da bike, no modelo dos planos de seguro da Localiza), pagamento, rastreamento GPS, vistorias e renovações.

![Modelo Relacional do Pedala](images/modeloRelacional.png "Modelo Relacional — Pedala")

#### Descrição das Entidades

| Entidade | Descrição |
|---|---|
| `USERS` | Usuários do sistema (clientes, funcionários e administradores). O campo `role` diferencia os níveis de acesso (`customer`, `employee`, `admin`). |
| `USER_ADDRESSES` | Endereço associado a cada usuário (1:1). Armazena CEP, logradouro, bairro, cidade e UF. |
| `BIKES` | Catálogo de bicicletas. Possui `preco_base` (diária da bike, independente de plano), quantidade total e disponível, além de flags de bloqueio e remoção. **Não possui vínculo direto com planos de proteção.** |
| `RENTAL_PLANS` | **Planos de proteção/seguro**, independentes da bicicleta — análogo aos planos da Localiza (ex: Básico, Intermediário, Premium). Cada plano define uma `cobertura_descricao` (o que cobre) e uma `tipo_calculo` (`percentual` ou `fixo`) com um `valor_referencia` que define quanto agrega ao `preco_base` da bike no cálculo do `valor_total` da locação. |
| `RENTALS` | Registro central de cada locação. Referencia `bike_id` (a bike alugada) **e** `plan_id` (o plano de proteção escolhido). O `valor_total` é calculado a partir do `preco_base` da bike + a regra de acréscimo do plano. |
| `RENTAL_PAYMENTS` | Controle de aprovação do pagamento de cada locação. O campo `aprovado_por_user_id` rastreia o funcionário que autorizou. |
| `RENTAL_INVOICES` | Faturas geradas por locação (podendo ser recorrentes). Guarda código externo de cobrança, valor, status e data de vencimento. |
| `RENTAL_RENEWALS` | Histórico de renovações. Cada renovação referencia também o `plan_id` (o cliente pode trocar de plano na renovação). |
| `INSPECTIONS` | Vistorias realizadas na bicicleta antes e após a locação. Registra o funcionário responsável, status (pendente, aprovado, reprovado) e observações. |
| `GPS_POSITIONS_CURRENT` | Posição GPS atual de cada bicicleta (atualização em tempo real). Chave primária é `bike_id`. |
| `GPS_POSITIONS_HISTORY` | Histórico de posições GPS geradas durante uma locação (trilha completa). |

#### Relacionamentos principais

```
USERS           1:1   USER_ADDRESSES
USERS           1:N   RENTALS
USERS           1:N   INSPECTIONS          (como avaliador)
USERS           1:N   RENTAL_PAYMENTS      (como aprovador)
BIKES           1:N   RENTALS
BIKES           1:1   GPS_POSITIONS_CURRENT
BIKES           1:N   GPS_POSITIONS_HISTORY
BIKES           1:N   INSPECTIONS
RENTAL_PLANS    1:N   RENTALS              (plano escolhido na locação)
RENTAL_PLANS    1:N   RENTAL_RENEWALS      (plano pode ser trocado na renovação)
RENTALS         1:1   RENTAL_PAYMENTS
RENTALS         1:N   RENTAL_INVOICES
RENTALS         1:N   RENTAL_RENEWALS
RENTALS         1:N   INSPECTIONS
RENTALS         1:N   GPS_POSITIONS_HISTORY
```

#### Regra de negócio — Cálculo do valor da locação

```
valor_total = preco_base da BIKE
            + acréscimo do RENTAL_PLAN escolhido

Se tipo_calculo = 'percentual':
  acréscimo = preco_base × (valor_referencia / 100)
  Exemplo: plano Intermediário = +20% → diária R$50 → total R$60

Se tipo_calculo = 'fixo':
  acréscimo = valor_referencia (valor fixo em R$)
  Exemplo: plano Premium = +R$15 fixo → diária R$50 → total R$65
```

---

### 4.2. Tecnologias

A stack foi escolhida com foco em **agilidade de desenvolvimento**, **baixo custo de infraestrutura** e **aderência ao escopo acadêmico** do projeto, sem abrir mão de boas práticas de engenharia de software.

| **Dimensão**         | **Tecnologia**                              | **Justificativa** |
|---|---|---|
| **SGBD**             | MySQL                                       | Banco relacional robusto, amplamente utilizado no mercado e suportado nativamente pela maioria dos provedores de hospedagem gratuitos. |
| **Front-end**        | HTML + CSS + JavaScript (Vanilla)           | Sem frameworks de build, garantindo portabilidade e compatibilidade com GitHub Pages. Design system próprio baseado em design tokens (cores, tipografia, espaçamentos). |
| **Back-end**         | Node.js + Express.js                        | Runtime JavaScript leve e não bloqueante, ideal para APIs REST. Framework Express minimiza boilerplate mantendo flexibilidade. |
| **Autenticação**     | JWT (jsonwebtoken) + bcryptjs               | Autenticação stateless via Bearer Token. Senhas armazenadas com hash bcrypt (fator 12). |
| **Validação**        | Validação manual no back-end (a migrar para Zod) | Regras de negócio validadas antes da persistência. |
| **GPS / Tempo real** | Simulador GPS em Node.js (WebSocket-ready)  | Simula posições de bicicletas em movimento para demonstração do rastreamento em tempo real. |
| **Deploy**           | GitHub Pages (front-end) + Render/Railway (back-end) | Hospedagem estática gratuita para o front-end; plataformas PaaS gratuitas para o servidor Node.js. |
| **Controle de Versão** | Git + GitHub                              | Versionamento do código-fonte, controle de branches e colaboração entre os membros da equipe. |
| **IDE / Ferramentas** | Visual Studio Code, ESLint, Prettier       | Padronização de código, detecção precoce de erros e formatação automática. |
| **Testes**           | Testes manuais via REST Client / Postman    | Validação dos endpoints da API durante o desenvolvimento. |

#### Diagrama de Camadas da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                        │
│          HTML + CSS + JavaScript — GitHub Pages                 │
│   Páginas: Landing / Login / Cadastro / Dashboard / Admin       │
└────────────────────────┬────────────────────────────────────────┘
                         │  HTTPS (fetch / REST API)
┌────────────────────────▼────────────────────────────────────────┐
│                     BACK-END (Node.js + Express)                │
│                      Render / Railway                           │
│                                                                 │
│  Routes:  /auth  /bikes  /rentals  /admin  /gps  /vistorias    │
│  Middleware: JWT Auth  │  CORS  │  Rate Limiting               │
└────────────────────────┬────────────────────────────────────────┘
                         │  SQL
┌────────────────────────▼────────────────────────────────────────┐
│                      BANCO DE DADOS (MySQL)                     │
│                 11 tabelas — modelo relacional                  │
│      users · bikes · rentals · payments · gps · inspections    │
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
