package com.pedala.api.shared.controller;

import com.pedala.api.shared.service.GroqService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Tag(name = "Chatbot", description = "Chatbot com IA (PedaBot — Groq llama-3.3-70b)")
public class ChatController {

    private final GroqService groqService;

    /**
     * Endpoint do chatbot.
     *
     * Aceita:
     *  { "message": "..." }                                          — sem histórico
     *  { "message": "...", "history": [{role,content}, ...] }       — com histórico
     */
    @Operation(summary = "Enviar mensagem para a PedaBot")
    @PostMapping
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, String>> chat(@RequestBody Map<String, Object> request) {
        Object msgObj = request.get("message");
        if (msgObj == null || msgObj.toString().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("reply", "Mensagem vazia."));
        }

        String message = msgObj.toString().trim();

        List<Map<String, String>> history = null;
        Object histObj = request.get("history");
        if (histObj instanceof List<?> rawList) {
            try {
                history = (List<Map<String, String>>) rawList;
            } catch (ClassCastException ignored) {
                // history mal-formado — ignora e continua sem histórico
            }
        }

        String reply = groqService.askChatbot(message, history);
        return ResponseEntity.ok(Map.of("reply", reply));
    }
}
