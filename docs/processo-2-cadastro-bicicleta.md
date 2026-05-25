### 3.3.3 Processo 2 – Cadastro de Bicicletas

O processo tem como objetivo permitir que o administrador cadastre novas bicicletas no sistema, garantindo que estejam prontas para locação. Uma oportunidade de melhoria futura seria a inclusão de integração com uma API de fabricantes para preenchimento automático das especificações técnicas com base no modelo, reduzindo o tempo de digitação do administrador.

![Modelo BPMN do Processo de Cadastro de Bicicletas](images/Processo-2-cadastro-bicicleta.png "Modelo BPMN do Processo de Cadastro de Bicicletas.")

![Wireframe de Cadastro de Bicicletas](Wireframes/wfCadastrarbicicleta.jpeg)

#### Detalhamento das atividades

O processo 2 contempla o acesso do administrador ao painel de gestão, o cadastro
de novos modelos de bicicletas, a definição de preços por período, controle de
estoque e inclusão opcional de imagem. As atividades abaixo descrevem os campos,
regras e comandos utilizados pelo painel administrativo.


**Acessar painel administrativo**

| **Campo** | **Tipo** | **Restrições** | **Valor default** |
| --- | --- | --- | --- |
| Email | Caixa de texto | Obrigatório, formato válido de e-mail | |
| Senha | Caixa de texto | Obrigatório | |

| **Comandos** | **Destino** | **Tipo** |
| --- | --- | --- |
| entrar | Clicar na opção cadastrar bicicleta | default |

**Clicar na opção cadastrar bicicleta**
*(Navegação no dashboard do administrador)*

| **Campo** | **Tipo** | **Restrições** | **Valor default** |
| --- | --- | --- | --- |
| N/A | N/A | | |

| **Comandos** | **Destino** | **Tipo** |
| --- | --- | --- |
| cadastrar bicicleta | Preencher dados da bicicleta | link/botão |

**Preencher dados da bicicleta**

| **Campo** | **Tipo** | **Restrições** | **Valor default** |
| --- | --- | --- | --- |
| Nome/modelo | Caixa de texto | Obrigatório | |
| Categoria | Seleção única | Deve existir no cadastro de categorias | Urbana |
| Quantidade | Número inteiro | Obrigatório, maior ou igual a 1 | 1 |
| Preço semanal | Número decimal | Obrigatório, maior que zero (> 0) | |
| Preço quinzenal | Número decimal | Obrigatório, maior que zero (> 0) | |
| Preço mensal | Número decimal | Obrigatório, maior que zero (> 0) | |
| Descrição | Área de texto | Opcional | |
| Imagem | Upload de arquivo | Opcional; JPG, PNG ou WebP na interface | |

| **Comandos** | **Destino** | **Tipo** |
| --- | --- | --- |
| salvar | Validar informações | default |
| cancelar | End | cancel |

**Validar informações**
*(Atividade de serviço/sistema: não possui interface de usuário)*

| **Regras (Sistema)** |
| --- |
| Verificar se todos os campos obrigatórios foram preenchidos. |
| Validar se os preços semanal, quinzenal e mensal são números positivos válidos. |
| Validar se a quantidade informada é maior ou igual a 1. |
| Validar se a categoria existe na lista de categorias cadastradas. |
| Verificar integridade do formato da imagem enviada (se houver). |

| **Comandos (Retorno do Sistema)** | **Destino** | **Tipo** |
| --- | --- | --- |
| Sim (Dados Válidos) | Definir Status como Disponível | default |
| Não (Dados Inválidos) | Preencher dados da bicicleta | cancel |

**Definir Status como Disponível**
*(Atividade de serviço/sistema: gravação no banco de dados e atualização de status)*

| **Regras (Sistema)** |
| --- |
| Gerar ID único para a nova bicicleta. |
| Registrar data e hora do cadastro automaticamente. |
| Salvar todos os dados da bicicleta no banco de dados do sistema. |
| Definir a quantidade total e a quantidade disponível conforme o estoque informado. |
| Considerar a bicicleta disponível quando houver estoque e ela não estiver bloqueada. |

| **Comandos (Retorno do Sistema)** | **Destino** | **Tipo** |
| --- | --- | --- |
| concluir | End | default |
