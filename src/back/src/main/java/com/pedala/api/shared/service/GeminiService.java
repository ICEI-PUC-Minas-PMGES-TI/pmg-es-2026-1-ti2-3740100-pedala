package com.pedala.api.shared.service;

import com.pedala.api.bike.domain.Bike;
import com.pedala.api.bike.repository.BikeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class GeminiService {

    private static final String GEMINI_GENERATE_CONTENT_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";

    @Value("${app.gemini.api-key}")
    private String apiKey;

    @Value("${app.gemini.model:gemini-3.1-flash-lite}")
    private String model;

    private final BikeRepository bikeRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    public String askChatbot(String userMessage) {
        String url = GEMINI_GENERATE_CONTENT_URL.formatted(model);

        // Obter as bikes disponiveis para informar o chatbot
        List<Bike> bikes = bikeRepository.findAll();
        StringBuilder catalogo = new StringBuilder();
        for (Bike b : bikes) {
            catalogo.append(b.getNome()).append(" (").append(b.getCategoria()).append("): R$")
                    .append(b.getPrecoSemanal()).append("/sem. ");
        }

        String systemPrompt = String.format(
                """
                        # Assistente Pedala (IA)
                        ## Papel
                        Você é o assistente virtual da Pedala, uma plataforma premium de assinatura de bicicletas.
                        Sua missão é ajudar os usuários com dúvidas sobre o serviço, planos, pagamentos e processos.
                        Responda de forma profissional, amigável e prestativa.

                        ## Regras de Negócio e FAQ
                        - **Planos de Assinatura**: Oferecemos planos Semanal, Quinzenal e Mensal. O valor total depende da bicicleta escolhida e do plano de proteção.
                        - **Planos de Proteção (Seguro)**:
                            - Básico: Cobertura contra defeitos de fabricação.
                            - Intermediário (+20%% sobre o valor base): Cobre danos acidentais leves.
                            - Premium (Valor fixo): Cobertura total, incluindo furto e roubo (mediante BO).
                        - **Pagamento**: O pagamento é realizado via faturas (invoices) geradas mensalmente ou conforme o ciclo do plano. O cliente solicita a aprovação do pagamento no painel, enviando o comprovante (Pix ou Cartão). A equipe administrativa aprova para manter o contrato ativo.
                        - **Entrega e Prazos**: Após a contratação, a entrega é agendada para o endereço cadastrado. O prazo médio de entrega é de 24h a 48h úteis após a aprovação do pagamento inicial.
                        - **Renovação**: Os contratos podem ser renovados manualmente no dashboard do cliente. Na renovação, o cliente pode optar por trocar o plano de proteção ou até mesmo o modelo da bicicleta (mediante disponibilidade).
                        - **Devolução e Vistoria**: Ao final do contrato, o cliente solicita a devolução. Nossa equipe coleta a bike e realiza uma vistoria técnica (Inspeção) para verificar o estado de conservação antes de finalizar o contrato e liberar a caução (se houver).
                        - **Rastreamento**: Todas as nossas bikes possuem rastreamento GPS em tempo real para sua segurança.

                        ## Catálogo de Bikes Disponíveis
                        %s

                        ## Estilo de Resposta
                        - Seja direto, mas informativo.
                        - Responda em Português do Brasil (PT-BR).
                        - Use no máximo 3 frases por resposta.
                        - Use um tom de voz moderno e tecnológico (aesthetic premium).
                        - Se o usuário perguntar algo fora do contexto da Pedala, direcione-o gentilmente de volta ao assunto de locação de bicicletas.

                        Mensagem do usuário: %s
                        """,
                catalogo, userMessage);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", systemPrompt)))));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-goog-api-key", apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            log.info("Chamando Gemini API: {}", url);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.getBody().get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                    if (content != null) {
                        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                        if (parts != null && !parts.isEmpty()) {
                            return (String) parts.get(0).get("text");
                        }
                    }
                }
            }
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("Erro de Cliente na Gemini API: {} - Status: {} - Body: {}",
                    url, e.getStatusCode(), e.getResponseBodyAsString());
            return "Erro na API Gemini: " + e.getStatusCode()
                    + ". Verifique se o modelo '" + model + "' está disponível para sua chave e se ela possui saldo/permissão.";
        } catch (Exception e) {
            log.error("Erro generico na API da Gemini: ", e);
            return "Desculpe, ocorreu um erro inesperado ao falar com o Gemini. Verifique o console do backend.";
        }

        return "Não consegui formular uma resposta agora.";
    }
}
