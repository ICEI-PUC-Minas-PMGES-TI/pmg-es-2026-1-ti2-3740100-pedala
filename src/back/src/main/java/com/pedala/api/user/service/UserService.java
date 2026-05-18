package com.pedala.api.user.service;

import com.pedala.api.exception.BusinessException;
import com.pedala.api.exception.DuplicateResourceException;
import com.pedala.api.exception.ResourceNotFoundException;
import com.pedala.api.rental.domain.RentalStatus;
import com.pedala.api.rental.repository.RentalRepository;
import com.pedala.api.security.JwtTokenProvider;
import com.pedala.api.user.domain.User;
import com.pedala.api.user.domain.UserAddress;
import com.pedala.api.user.domain.UserRole;
import com.pedala.api.user.dto.*;
import com.pedala.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RentalRepository rentalRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public Map<String, Object> register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("Email ja cadastrado.");
        }

        User user = User.builder()
                .nome(request.nome())
                .email(request.email())
                .senha(passwordEncoder.encode(request.senha()))
                .cpf(request.cpf())
                .telefone(request.telefone())
                .role(UserRole.USER)
                .build();

        if (request.endereco() != null) {
            UserAddress addr = mapAddress(request.endereco());
            user.setEndereco(addr);
        }

        user = userRepository.save(user);

        String token = jwtTokenProvider.generateToken(
                user.getId(), user.getEmail(), user.getNome(), user.getRole().name().toLowerCase());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Usuario cadastrado com sucesso!");
        result.put("token", token);
        result.put("usuario", buildUserSummary(user));
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BusinessException("Email ou senha incorretos."));

        if (!passwordEncoder.matches(request.senha(), user.getSenha())) {
            throw new BusinessException("Email ou senha incorretos.");
        }

        String token = jwtTokenProvider.generateToken(
                user.getId(), user.getEmail(), user.getNome(), user.getRole().name().toLowerCase());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Login realizado com sucesso!");
        result.put("token", token);
        result.put("usuario", buildUserSummary(user));
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado."));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", user.getId());
        result.put("nome", user.getNome());
        result.put("email", user.getEmail());
        result.put("cpf", user.getCpf());
        result.put("telefone", user.getTelefone());
        result.put("endereco", user.getEndereco() != null ? mapAddressToDto(user.getEndereco()) : null);
        result.put("role", user.getRole().name().toLowerCase());
        result.put("plano", user.getPlano());
        result.put("criadoEm", user.getCriadoEm().toString());
        return result;
    }

    @Transactional
    public Map<String, Object> updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado."));

        if (request.nome() != null) user.setNome(request.nome());
        if (request.telefone() != null) user.setTelefone(request.telefone());
        if (request.endereco() != null) {
            UserAddress addr = user.getEndereco();
            if (addr == null) {
                addr = mapAddress(request.endereco());
                user.setEndereco(addr);
            } else {
                updateAddress(addr, request.endereco());
            }
        }

        user = userRepository.save(user);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Perfil atualizado!");
        Map<String, Object> usuario = new LinkedHashMap<>();
        usuario.put("id", user.getId());
        usuario.put("nome", user.getNome());
        usuario.put("email", user.getEmail());
        usuario.put("telefone", user.getTelefone());
        usuario.put("endereco", user.getEndereco() != null ? mapAddressToDto(user.getEndereco()) : null);
        result.put("usuario", usuario);
        return result;
    }

    @Transactional
    public Map<String, Object> createFuncionario(CreateFuncionarioRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateResourceException("Email ja cadastrado.");
        }

        User user = User.builder()
                .nome(request.nome())
                .email(request.email())
                .senha(passwordEncoder.encode(request.senha()))
                .role(UserRole.FUNCIONARIO)
                .build();

        user = userRepository.save(user);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Funcionario criado com sucesso!");
        result.put("id", user.getId());
        result.put("nome", user.getNome());
        result.put("email", user.getEmail());
        return result;
    }

    @Transactional
    public Map<String, Object> seedAdmin() {
        if (userRepository.existsByRole(UserRole.ADMIN)) {
            throw new DuplicateResourceException("Admin ja existe.");
        }

        User admin = User.builder()
                .nome("Administrador")
                .email("admin@pedala.com")
                .senha(passwordEncoder.encode("admin123"))
                .role(UserRole.ADMIN)
                .build();

        userRepository.save(admin);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Admin criado! Email: admin@pedala.com | Senha: admin123");
        return result;
    }

    @Transactional
    public Map<String, Object> deleteUser(Long targetUserId, Long requesterId) {
        if (targetUserId.equals(requesterId)) {
            throw new BusinessException("Administrador nao pode excluir a propria conta por aqui. Use 'Excluir minha conta' no seu perfil.");
        }

        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado."));

        if (target.getRole() == UserRole.ADMIN && userRepository.countByRole(UserRole.ADMIN) <= 1) {
            throw new BusinessException("Nao e possivel excluir o unico administrador do sistema.");
        }

        boolean hasActiveRentals = rentalRepository.findByUsuarioId(targetUserId).stream()
                .anyMatch(r -> r.getStatus() != RentalStatus.finalizado);
        if (hasActiveRentals) {
            throw new BusinessException("Usuario possui locacoes ativas e nao pode ser excluido.");
        }

        userRepository.delete(target);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Usuario " + target.getNome() + " excluido com sucesso.");
        return result;
    }

    @Transactional
    public Map<String, Object> deleteOwnAccount(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado."));

        if (user.getRole() == UserRole.ADMIN && userRepository.countByRole(UserRole.ADMIN) <= 1) {
            throw new BusinessException("Nao e possivel excluir o unico administrador do sistema.");
        }

        boolean hasActiveRentals = rentalRepository.findByUsuarioId(userId).stream()
                .anyMatch(r -> r.getStatus() != RentalStatus.finalizado);
        if (hasActiveRentals) {
            throw new BusinessException("Voce possui locacoes ativas. Finalize ou devolva a bike antes de excluir a conta.");
        }

        userRepository.delete(user);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Conta excluida com sucesso.");
        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listAllUsers() {
        return userRepository.findAll().stream()
                .map(u -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", u.getId());
                    m.put("nome", u.getNome());
                    m.put("email", u.getEmail());
                    m.put("role", u.getRole().name().toLowerCase());
                    m.put("telefone", u.getTelefone());
                    m.put("endereco", u.getEndereco() != null ? mapAddressToDto(u.getEndereco()) : null);
                    m.put("criadoEm", u.getCriadoEm().toString());
                    return m;
                }).toList();
    }

    private Map<String, Object> buildUserSummary(User user) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("id", user.getId());
        summary.put("nome", user.getNome());
        summary.put("email", user.getEmail());
        summary.put("role", user.getRole().name().toLowerCase());
        summary.put("plano", user.getPlano());
        return summary;
    }

    private UserAddress mapAddress(AddressDto dto) {
        return UserAddress.builder()
                .cep(dto.cep())
                .logradouro(dto.logradouro())
                .numero(dto.numero())
                .bairro(dto.bairro())
                .cidade(dto.cidade())
                .uf(dto.uf())
                .complemento(dto.complemento())
                .build();
    }

    private void updateAddress(UserAddress addr, AddressDto dto) {
        if (dto.cep() != null) addr.setCep(dto.cep());
        if (dto.logradouro() != null) addr.setLogradouro(dto.logradouro());
        if (dto.numero() != null) addr.setNumero(dto.numero());
        if (dto.bairro() != null) addr.setBairro(dto.bairro());
        if (dto.cidade() != null) addr.setCidade(dto.cidade());
        if (dto.uf() != null) addr.setUf(dto.uf());
        if (dto.complemento() != null) addr.setComplemento(dto.complemento());
    }

    private Map<String, Object> mapAddressToDto(UserAddress addr) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("cep", addr.getCep());
        m.put("logradouro", addr.getLogradouro());
        m.put("numero", addr.getNumero());
        m.put("bairro", addr.getBairro());
        m.put("cidade", addr.getCidade());
        m.put("uf", addr.getUf());
        m.put("complemento", addr.getComplemento());
        return m;
    }
}
