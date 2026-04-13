### 3.3.2 Processo 2 – RESERVA DE BICICLETA

O processo pode ser aprimorado com a implementação de filtros mais avançados na busca de bicicletas, como localização, tipo e preço.

![Exemplo de um Modelo BPMN do PROCESSO 2](images\Processo-2-Reserva-Bike.jpg "Modelo BPMN do Processo 2.")

#### Detalhamento das atividades

_Descreva aqui cada uma das propriedades das atividades do processo 2. Devem estar relacionadas com o modelo de processo apresentado anteriormente._

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

**Acessar catálogo de bicicletas**

| **Campo** | **Tipo** | **Restrições** | **Valor default** |
| --- | --- | --- | --- |
| Localização | Caixa de texto | opcional | |
| Tipo de bicicleta | Seleção única | opções disponíveis | |
| Preço máximo | Número | valor positivo | |

| **Comandos** | **Destino** | **Tipo** |
| --- | --- | --- |
| Buscar | Exibir modelos disponíveis | default |

**Exibir modelos disponíveis**

| **Campo** | **Tipo** | **Restrições** | **Valor default** |
| --- | --- | --- | --- |
| Lista de bicicletas | Tabela | dados do sistema | |
| Imagem da bicicleta | Imagem | opcional | |

| **Comandos** | **Destino** | **Tipo** |
| --- | --- | --- |
| Selecionar bicicleta | Selecionar bicicleta | default |

**Selecionar bicicleta**

| **Campo** | **Tipo** | **Restrições** | **Valor default** |
| --- | --- | --- | --- |
| Bicicleta escolhida | Caixa de texto | obrigatório | |

| **Comandos** | **Destino** | **Tipo** |
| --- | --- | --- |
| Continuar | Definir período de locação | default |

**Definir período de locação**

| **Campo** | **Tipo** | **Restrições** | **Valor default** |
| --- | --- | --- | --- |
| Data início | Data | obrigatório | |
| Data fim | Data | maior que data início | |

| **Comandos** | **Destino** | **Tipo** |
| --- | --- | --- |
| Confirmar período | Escolher tipo de seguro | default |

**Escolher tipo de seguro**

| **Campo** | **Tipo** | **Restrições** | **Valor default** |
| --- | --- | --- | --- |
| Tipo de seguro | Seleção única | Básico, Intermediário, Premium | Básico |

| **Comandos** | **Destino** | **Tipo** |
| --- | --- | --- |
| Confirmar seguro | Calcular valor da locação | default |

**Calcular valor da locação**

| **Campo** | **Tipo** | **Restrições** | **Valor default** |
| --- | --- | --- | --- |
| Valor da locação | Número | calculado automaticamente | automático |

| **Comandos** | **Destino** | **Tipo** |
| --- | --- | --- |
| Continuar | Registrar reserva | default |

**Registrar reserva**

| **Campo** | **Tipo** | **Restrições** | **Valor default** |
| --- | --- | --- | --- |
| Status da reserva | Caixa de texto | pendente de pagamento | Pendente |
| Código da reserva | Número | gerado automaticamente | automático |

| **Comandos** | **Destino** | **Tipo** |
| --- | --- | --- |
| Finalizar | Fim do processo | default |