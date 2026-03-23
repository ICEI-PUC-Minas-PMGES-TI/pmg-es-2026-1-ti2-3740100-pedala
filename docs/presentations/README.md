# TITULO DO PROJETO


**Bernardo Parreiras Prado**

**Davi Santana Knaip Delogo**

**Eli Junior Domingos Dias**

**João Paulo Aguiar Prado**

**Luiz Eduardo Campos Silva**


---

Professores:

**Michelle Hanne Soares de Andrade**

**Lucca Soares de Paiva Lacerda**

**Luiz Carlos da Silva**

---

_Curso de Engenharia de Software_

_Instituto de Informática e Ciências Exatas – Pontifícia Universidade Católica de Minas Gerais (PUC MINAS), Belo Horizonte – MG – Brasil_

---

_**Resumo**. O PedaLá é uma plataforma web de locação de bicicletas que incentiva a mobilidade sustentável de forma prática e acessível. Criada para pessoas físicas, a solução atende tanto quem busca lazer quanto profissionais, como entregadores. O projeto elimina os altos custos de aquisição e manutenção de uma bicicleta própria, oferecendo um processo de aluguel 100% digital. Por meio do sistema, o cliente consegue realizar o cadastro, a reserva, o pagamento e a contratação de um seguro (Básico, Intermediário ou Premium) de forma totalmente online. O principal diferencial tecnológico e de segurança é o rastreamento via GPS integrado a todas as unidades. Isso garante à administração um monitoramento em tempo real, inibindo furtos e protegendo o patrimônio antes, durante e após a locação.._

---


## 1. Introdução

_A mobilidade urbana e as atividades ao ar livre vêm ganhando cada vez mais 
espaço na rotina das pessoas, seja para lazer, prática de exercícios ou até mesmo 
como forma de trabalho. Nesse cenário, a bicicleta se destaca como uma alternativa 
sustentável, acessível e benéfica para a saúde, sendo utilizada tanto para 
deslocamentos no dia a dia quanto para momentos de lazer, como trilhas e passeios 
com amigos._

### 1.1 Contextualização

_Diante dessa realidade, surge a proposta de desenvolver um sistema web voltado 
para a locação de bicicletas para pessoas físicas. A plataforma terá como objetivo 
facilitar o aluguel de bicicletas de maneira prática e segura, atendendo diferentes 
necessidades, como passeios de fim de semana, atividades esportivas, 
deslocamento urbano ou uso profissional, como no caso de entregadores._

### 1.2 Problema

_Mesmo com o aumento do uso de bicicletas, muitas pessoas não têm uma bicicleta 
própria ou não querem investir na compra para usar apenas de vez em quando. 
Além disso, existem outras dificuldades, como custos de manutenção, preocupação 
com segurança e falta de espaço para guardar o equipamento. 
Atualmente, nem todas as opções de locação oferecem um processo simples e 
totalmente digital. Em alguns casos, é necessário atendimento presencial ou não há 
clareza sobre disponibilidade e condições de uso._

### 1.3 Objetivo geral

_Desenvolver um sistema web para locação de bicicletas destinado a pessoas 
físicas, permitindo reserva online, pagamento digital, contratação de diferentes 
planos de seguro e monitoramento das bicicletas por meio de tecnologia GPS, 
garantindo segurança, controle operacional e eficiência na gestão._

#### 1.3.1 Objetivos específicos

_● Desenvolver um catálogo digital de bicicletas com informações detalhadas 
sobre modelo, categoria, valor da locação e disponibilidade;_

_● Implementar sistema de cadastro e autenticação de usuários, garantindo 
segurança e rastreabilidade das locações;_

_● Permitir a reserva de bicicletas por período determinado, com atualização 
automática da disponibilidade no sistema;_

_● Implementar diferentes planos de seguro (Básico, Intermediário e Premium),
permitindo ao cliente escolher o nível de proteção desejado;_

_● Integrar sistema de pagamento online para processamento e confirmação 
automática das transações;_ 

_● Implementar tecnologia de monitoramento por GPS em todas as bicicletas,
permitindo acompanhamento em tempo real pelo painel administrativo;_

_● Desenvolver painel administrativo para gestão de bicicletas, reservas, 
seguros e monitoramento de localização;_

_● Gerenciar o processo de entrega e devolução das bicicletas, incluindo 
inspeção e aplicação das regras de seguro em caso de danos;_

_● Controlar o status operacional das bicicletas (disponível, reservada, em uso 
ou em manutenção)._

### 1.4 Justificativas

_Por isso, propõe-se o desenvolvimento de uma plataforma web que torne o aluguel 
de bicicletas mais fácil e acessível. A ideia é oferecer um sistema prático, que 
permita reserva online, pagamento digital e opção de seguro para trazer mais 
segurança ao usuário, além de incentivar o uso de um meio de transporte 
sustentável. Além disso, o sistema contará com tecnologia de rastreamento via 
GPS, proporcionando maior segurança patrimonial, controle administrativo em 
tempo real e redução de riscos de furto._

## 2. Participantes do processo

_3.1 Cliente_

Pessoa física que utiliza a plataforma para:

● _Realizar cadastro;_

● _Consultar bicicletas disponíveis;_

● _Efetuar reserva;_

● _Selecionar tipo de seguro;- 

● _Realizar pagamento;_ 


_3.2 Administrador do Sistema_ 

_Responsável pela gestão do sistema, incluindo:_

● _Cadastro e atualização de bicicletas;_

● _Definição de preços;_

● _Configuração dos tipos de seguro;_

● _Controle de disponibilidade;_

● _Acompanhamento de reservas;_

● _Emissão de relatórios._

_3.3 Funcionário_

_Responsável pelo suporte operacional e atendimento ao cliente. Atua em:_ 

● _Entrega da bicicleta;_

● _Conferência do estado do equipamento antes da retirada;_ 

● _Orientação sobre regras de uso;_ 

● _Explicação dos tipos de seguro disponíveis;_

● _Registro de contratação ou alteração de seguro (quando necessário);_ 

● _Inspeção na devolução;_

● _Registro de eventuais danos._

● _Check-Out_

## 3. Modelagem do processo de negócio

### 3.1. Análise da situação atual

_Hoje, 23 de março, estamos no processo de estruturação da solução. Estamos lapidando a ideia, levantando os requisitos (funcionais e não funcionais) necessários para a construção da plataforma , verificando projetos semelhantes, entendendo os casos de uso. Além disso, levatamento de processos (BPMN). Esse processo é fundamental para validarmos a nossa proposta de valor e garantirmos que a plataforma entregue uma experiência 100% digital, segura e inovadora._

### 3.2. Descrição geral da proposta de solução

_A proposta do PedaLá é desenvolver uma plataforma web que centraliza todo o processo de locação de bicicletas, permitindo cadastro, reserva, pagamento e acompanhamento em um único sistema. A solução inclui catálogo digital, escolha de seguro, pagamento online e monitoramento em tempo real via GPS, trazendo mais praticidade e segurança._

_Como melhoria, o sistema reduz processos manuais, aumenta o controle operacional e melhora a experiência do usuário, além de estar alinhado com a mobilidade sustentável e a digitalização dos serviços. A solução também facilita a gestão administrativa e reduz riscos relacionados ao uso e à segurança das bicicletas._

### 3.3. Modelagem dos processos

[PROCESSO 1 - Nome do Processo](processo-1-nome-do-processo.md "Detalhamento do Processo 1.")

[PROCESSO 2 - Nome do Processo](processo-2-nome-do-processo.md "Detalhamento do Processo 2.")

[PROCESSO 3 - Nome do Processo](processo-3-nome-do-processo.md "Detalhamento do Processo 3.")

[PROCESSO 4 - Nome do Processo](processo-4-nome-do-processo.md "Detalhamento do Processo 4.")

## 4. Projeto da solução

_O documento a seguir apresenta o detalhamento do projeto da solução. São apresentadas duas seções que descrevem, respectivamente: modelo relacional e tecnologias._

[Projeto da solução](solution-design.md "Detalhamento do projeto da solução: modelo relacional e tecnologias.")


## 5. Indicadores de desempenho

_O documento a seguir apresenta os indicadores de desempenho dos processos._

[Indicadores de desempenho dos processos](performance-indicators.md)


## 6. Interface do sistema

_A sessão a seguir apresenta a descrição do produto de software desenvolvido._

[Documentação da interface do sistema](interface.md)

## 7. Conclusão

_Apresente aqui a conclusão do seu trabalho. Deve ser apresentada aqui uma discussão dos resultados obtidos no trabalho, local em que se verifica as observações pessoais de cada aluno. Essa seção poderá também apresentar sugestões de novas linhas de estudo._

# REFERÊNCIAS

_Como um projeto de software não requer revisão bibliográfica, a inclusão das referências não é obrigatória. No entanto, caso você deseje incluir referências relacionadas às tecnologias, padrões, ou metodologias que serão usadas no seu trabalho, relacione-as de acordo com a ABNT._

_Verifique no link abaixo como devem ser as referências no padrão ABNT:_

http://portal.pucminas.br/imagedb/documento/DOC_DSC_NOME_ARQUI20160217102425.pdf

**[1.1]** - _ELMASRI, Ramez; NAVATHE, Sham. **Sistemas de banco de dados**. 7. ed. São Paulo: Pearson, c2019. E-book. ISBN 9788543025001._

**[1.2]** - _COPPIN, Ben. **Inteligência artificial**. Rio de Janeiro, RJ: LTC, c2010. E-book. ISBN 978-85-216-2936-8._

**[1.3]** - _CORMEN, Thomas H. et al. **Algoritmos: teoria e prática**. Rio de Janeiro, RJ: Elsevier, Campus, c2012. xvi, 926 p. ISBN 9788535236996._

**[1.4]** - _SUTHERLAND, Jeffrey Victor. **Scrum: a arte de fazer o dobro do trabalho na metade do tempo**. 2. ed. rev. São Paulo, SP: Leya, 2016. 236, [4] p. ISBN 9788544104514._

**[1.5]** - _RUSSELL, Stuart J.; NORVIG, Peter. **Inteligência artificial**. Rio de Janeiro: Elsevier, c2013. xxi, 988 p. ISBN 9788535237016._



# APÊNDICES


_Atualizar os links e adicionar novos links para que a estrutura do código esteja corretamente documentada._


## Apêndice A - Código fonte

[Código do front-end](../src/front) -- repositório do código do front-end

[Código do back-end](../src/back)  -- repositório do código do back-end


## Apêndice B - Apresentação final


[Slides da apresentação final](presentations/)


[Vídeo da apresentação final](video/)xx
