package com.pedala.api.user.controller;

import com.pedala.api.security.UserPrincipal;
import com.pedala.api.user.dto.*;
import com.pedala.api.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Autenticacao e gerenciamento de usuarios")
public class AuthController {

    private final UserService userService;

    @Operation(summary = "Cadastrar novo usuario")
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.register(request));
    }

    @Operation(summary = "Login")
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(userService.login(request));
    }

    @Operation(summary = "Perfil do usuario logado")
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(userService.getProfile(principal.getId()));
    }

    @Operation(summary = "Atualizar perfil")
    @PutMapping("/me")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(userService.updateProfile(principal.getId(), request));
    }

    @Operation(summary = "Criar funcionario (admin only)")
    @PostMapping("/criar-funcionario")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> createFuncionario(
            @Valid @RequestBody CreateFuncionarioRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createFuncionario(request));
    }

    @Operation(summary = "Seed admin inicial")
    @PostMapping("/seed-admin")
    public ResponseEntity<Map<String, Object>> seedAdmin() {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.seedAdmin());
    }
}
