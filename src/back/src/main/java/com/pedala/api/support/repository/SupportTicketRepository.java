package com.pedala.api.support.repository;

import com.pedala.api.support.domain.SupportTicket;
import com.pedala.api.support.domain.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    List<SupportTicket> findByUsuarioIdOrderByCriadoEmDesc(Long usuarioId);
    List<SupportTicket> findAllByOrderByCriadoEmDesc();
    List<SupportTicket> findByStatusOrderByCriadoEmDesc(TicketStatus status);
    long countByStatus(TicketStatus status);
}
