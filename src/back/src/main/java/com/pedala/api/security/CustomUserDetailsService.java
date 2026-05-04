package com.pedala.api.security;

import com.pedala.api.user.domain.User;
import com.pedala.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario nao encontrado: " + email));

        return new UserPrincipal(
                user.getId(),
                user.getNome(),
                user.getEmail(),
                user.getRole().name().toLowerCase(),
                user.getSenha()
        );
    }

    @Transactional(readOnly = true)
    public UserDetails loadUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario nao encontrado: " + id));

        return new UserPrincipal(
                user.getId(),
                user.getNome(),
                user.getEmail(),
                user.getRole().name().toLowerCase(),
                user.getSenha()
        );
    }
}
