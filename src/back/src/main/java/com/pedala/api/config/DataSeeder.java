package com.pedala.api.config;

import com.pedala.api.bike.domain.Bike;
import com.pedala.api.bike.repository.BikeRepository;
import com.pedala.api.gps.service.GpsSimulatorService;
import com.pedala.api.rental.domain.Rental;
import com.pedala.api.rental.domain.RentalInvoice;
import com.pedala.api.rental.domain.RentalStatus;
import com.pedala.api.rental.domain.RentalType;
import com.pedala.api.rental.repository.RentalRepository;
import com.pedala.api.user.domain.User;
import com.pedala.api.user.domain.UserRole;
import com.pedala.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final BikeRepository bikeRepository;
    private final RentalRepository rentalRepository;
    private final GpsSimulatorService gpsSimulatorService;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        // Seed Users
        List<SeedUser> seeds = List.of(
                new SeedUser("Administrador", "admin@pedala.com", "admin123", UserRole.ADMIN),
                new SeedUser("Funcionario Padrao", "funcionario@pedala.com", "funcionario123", UserRole.FUNCIONARIO),
                new SeedUser("Usuario Padrao", "usuario@pedala.com", "usuario123", UserRole.USER)
        );

        User defaultUser = null;

        for (SeedUser s : seeds) {
            User user;
            if (userRepository.existsByEmail(s.email)) {
                log.info("  [seed] {} ja existe: {}", s.role.name().toLowerCase(), s.email);
                user = userRepository.findByEmail(s.email).orElseThrow();
            } else {
                user = User.builder()
                        .nome(s.nome)
                        .email(s.email)
                        .senha(passwordEncoder.encode(s.senha))
                        .role(s.role)
                        .build();
                user = userRepository.save(user);
                log.info("  [seed] {} criado: {}", s.role.name().toLowerCase(), s.email);
            }
            if (s.role == UserRole.USER) {
                defaultUser = user;
            }
        }

        // Seed Bikes
        if (bikeRepository.count() == 0) {
            List<Bike> bikes = List.of(
                    Bike.builder().nome("Pedala City Plus").categoria("Urbana").descricao("Ideal para o dia a dia urbano. Conforto e agilidade.").precoSemanal(new BigDecimal("59.00")).precoQuinzenal(new BigDecimal("99.00")).precoMensal(new BigDecimal("169.00")).quantidade(5).quantidadeDisponivel(5).disponivel(true).build(),
                    Bike.builder().nome("Pedala E-Motion").categoria("Eletrica").descricao("Chegue sem suar. Motor potente e bateria de longa duracao.").precoSemanal(new BigDecimal("89.00")).precoQuinzenal(new BigDecimal("149.00")).precoMensal(new BigDecimal("259.00")).quantidade(3).quantidadeDisponivel(3).disponivel(true).build(),
                    Bike.builder().nome("Pedala Sport Trail").categoria("Mountain").descricao("Explore novos caminhos no final de semana.").precoSemanal(new BigDecimal("69.00")).precoQuinzenal(new BigDecimal("119.00")).precoMensal(new BigDecimal("199.00")).quantidade(2).quantidadeDisponivel(2).disponivel(true).build()
            );
            bikeRepository.saveAll(bikes);
            log.info("  [seed] {} bikes criadas no catalogo.", bikes.size());
        }

        // Seed Rental & Start GPS
        if (rentalRepository.count() == 0 && defaultUser != null) {
            Bike bikeToRent = bikeRepository.findAll().get(0);
            bikeToRent.decrementarEstoque();
            bikeRepository.save(bikeToRent);

            Rental rental = Rental.builder()
                    .usuarioId(defaultUser.getId())
                    .usuarioNome(defaultUser.getNome())
                    .usuarioEmail(defaultUser.getEmail())
                    .bikeId(bikeToRent.getId())
                    .bikeNome(bikeToRent.getNome())
                    .bikeCategoria(bikeToRent.getCategoria())
                    .tipo(RentalType.mensal)
                    .planoLabel("Plano Mensal")
                    .preco(bikeToRent.getPrecoMensal())
                    .status(RentalStatus.ativo)
                    .dataInicio(Instant.now())
                    .dataDevolucaoPrevista(Instant.now().plus(30, ChronoUnit.DAYS))
                    .ativadoEm(Instant.now())
                        .pagamentoStatus("aprovado")
                    .build();

                    RentalInvoice fatura = RentalInvoice.builder()
                        .id("FAT-SEED-1")
                        .dataVencimento(Instant.now())
                        .valor(bikeToRent.getPrecoMensal())
                        .status("pago")
                        .pagoEm(Instant.now())
                        .build();
                    rental.addFatura(fatura);

            rental = rentalRepository.save(rental);
            log.info("  [seed] Aluguel criado para usuario {} com a bike {}", defaultUser.getEmail(), bikeToRent.getNome());

            // START GPS TRACKING
            gpsSimulatorService.startTracking(rental.getBikeId(), rental.getId(), rental.getBikeNome());
            log.info("  [seed] Rastreador GPS ativado para a bike ID {}", rental.getBikeId());
        } else {
            // Se ja tem alugueis ativos, garante que o GPS rode para eles
            rentalRepository.findAll().stream()
                .filter(r -> r.getStatus() == RentalStatus.ativo)
                .forEach(r -> {
                    gpsSimulatorService.startTracking(r.getBikeId(), r.getId(), r.getBikeNome());
                    log.info("  [seed] Rastreador GPS reativado para a bike ID {}", r.getBikeId());
                });
        }

        // Backfill basico de faturas para alugueis sem registros
        rentalRepository.findAll().forEach(r -> {
            if (r.getFaturas() != null && !r.getFaturas().isEmpty()) return;
            String status = r.getPagamentoStatus();
            String faturaStatus = "pendente";
            Instant pagoEm = null;
            if ("aprovado".equals(status) || "pago".equals(status)) {
                faturaStatus = "pago";
                pagoEm = Instant.now();
            } else if ("aguardando_aprovacao".equals(status)) {
                faturaStatus = "aguardando_aprovacao";
            }
            RentalInvoice fatura = RentalInvoice.builder()
                    .id("FAT-BACKFILL-" + r.getId())
                    .dataVencimento(r.getDataInicio())
                    .valor(r.getPreco())
                    .status(faturaStatus)
                    .pagoEm(pagoEm)
                    .build();
            r.addFatura(fatura);
            rentalRepository.save(r);
            log.info("  [seed] Fatura gerada para aluguel {} com status {}", r.getId(), faturaStatus);
        });

        log.info("");
        log.info("  Admin:       admin@pedala.com / admin123");
        log.info("  Funcionario: funcionario@pedala.com / funcionario123");
        log.info("  Usuario:     usuario@pedala.com / usuario123");
        log.info("");
    }

    private record SeedUser(String nome, String email, String senha, UserRole role) {}
}
