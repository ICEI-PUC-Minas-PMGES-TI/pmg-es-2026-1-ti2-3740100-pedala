package com.pedala.api.rental.service;

import com.pedala.api.bike.domain.Bike;
import com.pedala.api.bike.repository.BikeRepository;
import com.pedala.api.gps.service.GpsSimulatorService;
import com.pedala.api.inspection.repository.InspectionRepository;
import com.pedala.api.rental.domain.Rental;
import com.pedala.api.rental.domain.RentalType;
import com.pedala.api.rental.repository.RentalRepository;
import com.pedala.api.shared.TimeSimulator;
import com.pedala.api.user.domain.User;
import com.pedala.api.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

public class RentalServiceTest {

    @Mock private RentalRepository rentalRepository;
    @Mock private BikeRepository bikeRepository;
    @Mock private UserRepository userRepository;
    @Mock private InspectionRepository inspectionRepository;
    @Mock private GpsSimulatorService gpsSimulatorService;
    @Mock private TimeSimulator timeSimulator;

    @InjectMocks
    private RentalService rentalService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void createRental_WithPremiumInsurance_CalculatesCorrectPrice() {
        // Arrange
        Long userId = 1L;
        Long bikeId = 1L;
        Bike bike = new Bike();
        bike.setId(bikeId);
        bike.setNome("Test Bike");
        bike.setCategoria("Urbana");
        bike.setPrecoSemanal(new BigDecimal("50.00"));
        bike.setQuantidadeDisponivel(1);
        bike.setBloqueada(false);
        bike.setRemovida(false);

        User user = new User();
        user.setId(userId);
        user.setNome("Test User");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(bikeRepository.findById(bikeId)).thenReturn(Optional.of(bike));
        when(rentalRepository.findByUsuarioIdAndStatusNot(userId, com.pedala.api.rental.domain.RentalStatus.finalizado))
                .thenReturn(Collections.emptyList());
        when(timeSimulator.now()).thenReturn(Instant.now());
        when(rentalRepository.save(any(Rental.class))).thenAnswer(i -> {
            Rental r = i.getArgument(0);
            r.setId(100L);
            return r;
        });

        // Act (Semanal = 50.00, Seguro Premium = 30.00 => Total 80.00)
        Map<String, Object> result = rentalService.createRental(userId, "Test User", "test@test.com", bikeId, "semanal", null, null, "Premium");

        // Assert
        assertNotNull(result);
        Map<String, Object> aluguel = (Map<String, Object>) result.get("aluguel");
        assertEquals(new BigDecimal("80.00"), aluguel.get("preco"));
        assertEquals("Premium", aluguel.get("tipoSeguro"));
        assertEquals(new BigDecimal("30.00"), aluguel.get("valorSeguro"));
    }
}
