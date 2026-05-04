package com.pedala.api.shared.controller;

import com.pedala.api.shared.service.GeminiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Tag(name = "Chatbot", description = "Chatbot com IA (Gemini)")
public class ChatController {

    private final GeminiService geminiService;

    @Operation(summary = "Enviar mensagem para o chatbot")
    @PostMapping
    public ResponseEntity<Map<String, String>> chat(@RequestBody Map<String, String> request) {
        String message = request.get("message");
        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("reply", "Mensagem vazia."));
        }
        
        String reply = geminiService.askChatbot(message);
        return ResponseEntity.ok(Map.of("reply", reply));
    }
}
