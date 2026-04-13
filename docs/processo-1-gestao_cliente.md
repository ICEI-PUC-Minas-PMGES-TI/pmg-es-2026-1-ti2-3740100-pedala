### 3.3.1 Processo 1 – Gestão do Cliente

Uma melhoria importante seria a implementação de validação automática em tempo real dos dados inseridos, reduzindo erros no preenchimento. Além disso, a inclusão de autenticação em duas etapas aumentaria a segurança do acesso do usuário.

![Imagem do processo 1](images/Processo-1-gestao-cliente.png)

#### Detalhamento das atividades

_Descreva aqui cada uma das propriedades das atividades do processo 1. 
Devem estar relacionadas com o modelo de processo apresentado anteriormente._



**Acessar Home**

| **Campo** | **Tipo** | **Restrições** | **Valor default** |
| --- | --- | --- | --- |
| N/A | N/A | N/A | N/A |

| **Comandos** | **Destino** | **Tipo** |
| --- | --- | --- |
| Fazer Login | Efetuar Login | default |
| Criar Conta | Preencher dados de cadastro | link/botão |

**Efetuar Login**

| **Campo** | **Tipo** | **Restrições** | **Valor default** |
| --- | --- | --- | --- |
| Email | Caixa de texto | Obrigatório, formato de e-mail | |
| Senha | Caixa de texto | Obrigatório | |

| **Comandos** | **Destino** | **Tipo** |
| --- | --- | --- |
| entrar | Gateway: Informações Atualizadas? | default |
| cancelar | Acessar Home | cancel |

**Preencher dados de cadastro**

| **Campo** | **Tipo** | **Restrições** | **Valor default** |
| --- | --- | --- | --- |
| Nome | Caixa de texto | Obrigatório | |
| CPF | Caixa de texto | Obrigatório, formato CPF válido | |
| Email | Caixa de texto | Obrigatório, formato de e-mail | |
| Telefone | Caixa de texto | Obrigatório, números válidos | |
| Senha | Caixa de texto | Obrigatório, mínimo de 8 caracteres | |
| Repetir senha | Caixa de texto | Obrigatório, ser igual à senha | |

| **Comandos** | **Destino** | **Tipo** |
| --- | --- | --- |
| enviar | Validar informações | default |
| cancelar | Acessar Home | cancel |

**Validar informações**

| **Regras (Sistema)** |
| --- |
| Verificar se o CPF já está cadastrado na base de dados. |
| Verificar se o e-mail já existe no sistema. |
| Verificar integridade dos dados obrigatórios. |

| **Comandos** | **Destino** | **Tipo** |
| --- | --- | --- |
| Sim (dados válidos) | Efetuar Cadastro | default |
| Não (dados inválidos) | Preencher dados de cadastro | cancel |

**Efetuar Cadastro**

| **Campo** | **Tipo** | **Restrições** | **Valor default** |
| --- | --- | --- | --- |
| id do usuário | Número | Gerado automaticamente, chave primária | automático |
| data de cadastro | Data e hora | Gerado pelo sistema | atual |

| **Comandos** | **Destino** | **Tipo** |
| --- | --- | --- |
| concluir | Fim | default |

**Atualizar dados cadastrais**

| **Campo** | **Tipo** | **Restrições** | **Valor default** |
| --- | --- | --- | --- |
| Telefone | Caixa de texto | Formato numérico válido | Trazido do BD |
| Endereço | Caixa de texto | | Trazido do BD |
| Email | Caixa de texto | Formato de e-mail | Trazido do BD |

| **Comandos** | **Destino** | **Tipo** |
| --- | --- | --- |
| salvar | Salvar modificações | default |
| pular/cancelar | End | cancel |

**Salvar modificações**

| **Regras (Sistema)** |
| --- |
| Atualizar os registros do cliente no banco de dados com as novas entradas. |
| Registrar log de atualização de dados (data/hora). |

| **Comandos** | **Destino** | **Tipo** |
| --- | --- | --- |
| concluir | End | default |
