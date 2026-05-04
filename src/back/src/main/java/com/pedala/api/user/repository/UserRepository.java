package com.pedala.api.user.repository;

import com.pedala.api.user.domain.User;
import com.pedala.api.user.domain.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByRole(UserRole role);

    List<User> findByRole(UserRole role);

    long countByRole(UserRole role);
}
