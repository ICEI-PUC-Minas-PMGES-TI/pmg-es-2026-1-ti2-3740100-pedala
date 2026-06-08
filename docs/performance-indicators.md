## 5. Indicadores de desempenho

_Usar o seguinte modelo:_

| **Indicador** | **Objetivos** | **Descrição** | **Fonte de dados** | **Fórmula de cálculo** |
| --- | --- | --- | --- | --- |
| Taxa de ocupação de bicicletas | Avaliar o quanto do estoque está sendo aproveitado em aluguéis ativos. Meta: manter acima de 70%. | Percentual de bicicletas disponíveis que estão atualmente alugadas. | Tabela Bikes e Rentals | (COUNT de RENTALS com status = 'ativo' / quantidade total de BIKES) × 100 |
| Taxa de renovação de aluguéis | Medir a fidelização do cliente e a satisfação com o serviço. Meta: atingir pelo menos 25%. | Percentual de aluguéis que geraram ao menos uma renovação em relação ao total de aluguéis encerrados. | Tabela Rentals e Rental_Renewals | (COUNT de RENTALS com ao menos 1 registro em RENTAL_RENEWALS / COUNT total de RENTALS encerrados) × 100 |
| Tempo médio de aprovação do pagamento | Monitorar a agilidade operacional na liberação dos pedidos. Meta: aprovar em até 2 horas. | Média de tempo entre a solicitação e a aprovação do pagamento dos aluguéis. | Tabela Rentals | AVG(data/hora de pagamento_aprovado_em - data/hora de pagamento_solicitado_em) em horas |

_Metas sugeridas:_ manter a taxa de ocupação acima de 70%, a renovação de aluguéis acima de 25% e o tempo médio de aprovação do pagamento abaixo de 2 horas.
