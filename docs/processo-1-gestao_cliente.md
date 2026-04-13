### 3.3.1 Processo 1 – Gestão do Cliente

Uma melhoria importante seria a implementação de validação automática em tempo real dos dados inseridos, reduzindo erros no preenchimento. Além disso, a inclusão de autenticação em duas etapas aumentaria a segurança do acesso do usuário.


![Imagem do processo 1](images/Processo-2-gestao-cliente)

#### Detalhamento das atividades

_Descreva aqui cada uma das propriedades das atividades do processo 1. 
Devem estar relacionadas com o modelo de processo apresentado anteriormente._

_Os tipos de dados a serem utilizados são:_

_* **Área de texto** - campo texto de múltiplas linhas_

_* **Caixa de texto** - campo texto de uma linha_

_* **Número** - campo numérico_

_* **Data** - campo do tipo data (dd-mm-aaaa)_

_* **Hora** - campo do tipo hora (hh:mm:ss)_

_* **Data e Hora** - campo do tipo data e hora (dd-mm-aaaa, hh:mm:ss)_

_* **Imagem** - campo contendo uma imagem_

_* **Seleção única** - campo com várias opções de valores que são mutuamente exclusivas (tradicional radio button ou combobox)_

_* **Seleção múltipla** - campo com várias opções que podem ser selecionadas mutuamente (tradicional checkbox ou listbox)_

_* **Arquivo** - campo de upload de documento_

_* **Link** - campo que armazena uma URL_

_* **Tabela** - campo formado por uma matriz de valores_


**Acessar Sistema **

| **Campo**       | **Tipo**         | **Restrições** | **Valor default** |
| ---             | ---              | ---            | ---               |
| email           | Caixa de texto   |formato de email|                   |
| senha           | Caixa de texto   | minimo de 8 caracteres |           |
|                 |                  |                |                   |


| **Comandos**         |  **Destino**                   | **Tipo** |
| ---                  | ---                            | ---               |
| entrar               | Fim do processo                | default           |
| cadastrar             | Preencher dados do processo   |                   |
|                       |                                |                   |



**Preencher dados pessoais**

| **Campo**       | **Tipo**         | **Restrições** | **Valor default** |
| ---             | ---              | ---            | ---               |
| nome            | Caixa de texto  |                |                   |
| CPF             | Caixa de texto   |Formato CPF válido|                   |
| email           | Caixa de texto   |formato de email|                   |
| telefone        | Caixa de texto   |números válidos|                   |
|                 |                  |                |                   |

| **Comandos**         |  **Destino**                   | **Tipo**          |
| ---                  | ---                            | ---               |
| Enviar               | Validar informações            | default |
| cancelar             | Fim do processo                | cancel |
|                      |                                |                   |



**Validar informações**

| **Campo**       | **Tipo**         | **Restrições** | **Valor default** |
| ---             | ---              | ---            | ---               |
| dados do usuário| área de texto    |  obrigatório   |                   |
|                  |                 |                |                   |


| **Comandos**         |  **Destino**                   | **Tipo** |
| ---                  | ---                            | ---               |
|dados válidos         |Criar conta                     | default           |
|dados inválidos       | Preencher dados pessoais       | cancel            |
|                      |                                |                   |



**Criar conta**

| **Campo**       | **Tipo**         | **Restrições** | **Valor default** |
| ---             | ---              | ---            | ---               |
| id do usuário   | Número           |Gerado automaticamente|automático   |
|data de cadastro | Data e hora      |atual                               |
|                 |                  |                |                   |

| **Comandos**         |  **Destino**                   | **Tipo**          |
| ---                  | ---                            | ---               |
| concluir             |Fim do processo                 |default            |
|                      |                                |                   |



