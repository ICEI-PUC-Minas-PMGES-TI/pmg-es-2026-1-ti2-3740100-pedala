## 5. Indicadores de desempenho

_Usar o seguinte modelo:_

| **Indicador** | **Objetivos** | **Descrição** | **Fonte de dados** | **Fórmula de cálculo** |
| --- | --- | --- | --- | --- |
| Taxa de ocupação mensal de bicicletas | Avaliar o aproveitamento da frota ao longo de um mês, identificando períodos de alta e baixa demanda | Percentual de bicicletas que tiveram ao menos um aluguel iniciado dentro do mês em relação ao total da frota| Tabela Bikes e Rentals | (COUNT DISTINCT de RENTALS.bike_id onde data_inicio está no mês / quantidade_total de BIKES) × 100 |
| Taxa de renovação de aluguéis | Medir a fidelização do cliente e a satisfação com o serviço. Meta: atingir pelo menos 25%. | Percentual de aluguéis que geraram ao menos uma renovação em relação ao total de aluguéis encerrados. | Tabela Rentals e Rental_Renewals | (COUNT de RENTALS com ao menos 1 registro em RENTAL_RENEWALS / COUNT total de RENTALS encerrados) × 100 |
| Tempo médio de entrega da bicicleta | Medir a agilidade na disponibilização da bicicleta após a abertura do aluguel | Tempo médio entre a criação do aluguel e a data de início efetivo, indicando a eficiência operacional na entrega | Tabela Rentals | AVG(data_inicio − criado_em) para todos os RENTALS no período, em horas ou minutos |

_Metas sugeridas:_ manter a taxa de ocupação acima de 70 e a renovação de aluguéis acima de 25%.
