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

### 4.2. Tecnologias

A stack foi escolhida com foco em **agilidade de desenvolvimento**, **baixo custo de infraestrutura** e **aderência ao escopo acadêmico** do projeto, sem abrir mão de boas práticas de engenharia de software.

| **Dimensão**         | **Tecnologia**                              | **Justificativa** |
|---|---|---|
| **SGBD**             | Azure SQL Server                            | Banco relacional usado pela API em produção, com migrations Flyway em T-SQL e suporte a integridade referencial. |
| **Front-end**        | HTML + CSS + JavaScript (Vanilla)           | Sem frameworks de build, garantindo portabilidade e compatibilidade com GitHub Pages. Design system próprio baseado em design tokens (cores, tipografia, espaçamentos). |
| **Back-end**         | Java 17 + Spring Boot                       | API REST com camadas de controller, service e repository, autenticação JWT, validação e persistência via Spring Data JPA. |
| **GPS / Tempo real** | Simulador GPS integrado à API               | Simula posições de bicicletas em movimento e envia atualizações para demonstração do rastreamento em tempo real. |

| **Testes**           | JUnit/Spring Boot Test e Postman            | Testes automatizados no back-end e validação manual dos endpoints durante o desenvolvimento. |


