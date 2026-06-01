## 5. Indicadores de desempenho

_Apresente aqui os principais indicadores de desempenho e algumas metas para o processo. Atenção: as informações necessárias para gerar os indicadores devem estar contempladas no modelo relacional. Defina no mínimo 3 indicadores de desempenho._

_Usar o seguinte modelo:_

| **Indicador** | **Objetivos** | **Descrição** | **Fonte de dados** | **Fórmula de cálculo** |
| ---           | ---           | ---           | ---             | ---             |
| Taxa de ocupação de bicicletas | Avaliar o quanto do estoque está sendo aproveitado em aluguéis ativos |Percentual de bicicletas disponíveis que estão atualmente alugadas | Tabela Bikes e Rentals | (COUNT de RENTALS com status = 'ativo' / quantidade_total de BIKES) × 100 |
| Taxa de renovação de aluguéis | Medir a fidelização do cliente e satisfação com o serviço| Percentual de aluguéis que geraram ao menos uma renovação em relação ao total de aluguéis encerrados | Tabela Rentals e Rental_Renewals | (COUNT de RENTALS com ao menos 1 registro em RENTAL_RENEWALS / COUNT total de RENTALS encerrados) × 100 |
| |  |  |  |  |

_Obs.: todas as informações para gerar os indicadores devem estar no modelo relacional._
