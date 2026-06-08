package com.pedala.api.support.service;

import com.pedala.api.exception.BusinessException;
import com.pedala.api.exception.ResourceNotFoundException;
import com.pedala.api.inspection.domain.InsuranceCoverage;
import com.pedala.api.rental.domain.Rental;
import com.pedala.api.rental.domain.RentalInvoice;
import com.pedala.api.rental.repository.RentalRepository;
import com.pedala.api.shared.TimeSimulator;
import com.pedala.api.support.domain.*;
import com.pedala.api.support.dto.AbrirTicketRequest;
import com.pedala.api.support.dto.ResolverTicketRequest;
import com.pedala.api.support.repository.SupportTicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SupportTicketService {

    private final SupportTicketRepository ticketRepository;
    private final RentalRepository rentalRepository;
    private final TimeSimulator timeSimulator;

    @Transactional
    public Map<String, Object> abrir(AbrirTicketRequest req, Long userId, String userName) {
        Rental rental = rentalRepository.findById(req.rentalId())
                .orElseThrow(() -> new ResourceNotFoundException("Locação não encontrada."));
        if (!rental.getUsuarioId().equals(userId))
            throw new BusinessException("Você não tem permissão para abrir chamado nesta locação.");

        SupportTicket ticket = SupportTicket.builder()
                .rentalId(req.rentalId())
                .usuarioId(userId)
                .usuarioNome(userName)
                .tipo(TicketTipo.valueOf(req.tipo()))
                .descricao(req.descricao())
                .prioridade(req.prioridade() != null ? TicketPrioridade.valueOf(req.prioridade()) : TicketPrioridade.normal)
                .build();
        ticketRepository.save(ticket);
        return Map.of("message", "Chamado aberto com sucesso.", "ticket", toMap(ticket, rental));
    }

    @Transactional
    public Map<String, Object> atender(Long ticketId, Long funcId, String funcNome) {
        SupportTicket ticket = findTicket(ticketId);
        if (ticket.getStatus() != TicketStatus.aberto)
            throw new BusinessException("Chamado não está aberto.");
        ticket.setStatus(TicketStatus.em_atendimento);
        ticket.setFuncionarioId(funcId);
        ticket.setFuncionarioNome(funcNome);
        ticket.setAtualizadoEm(timeSimulator.now());
        ticketRepository.save(ticket);
        return Map.of("message", "Chamado em atendimento.", "ticket", toMap(ticket, null));
    }

    @Transactional
    public Map<String, Object> resolver(Long ticketId, ResolverTicketRequest req, Long funcId, String funcNome) {
        SupportTicket ticket = findTicket(ticketId);
        if (ticket.getStatus() == TicketStatus.resolvido) throw new BusinessException("Chamado já resolvido.");
        if (ticket.getStatus() == TicketStatus.cancelado) throw new BusinessException("Chamado cancelado.");

        Rental rental = rentalRepository.findById(ticket.getRentalId()).orElse(null);
        String tipoSeguro = rental != null ? rental.getTipoSeguro() : null;

        BigDecimal custo = req.custo() != null ? req.custo() : BigDecimal.ZERO;
        boolean coberto = custo.compareTo(BigDecimal.ZERO) == 0
                || InsuranceCoverage.cobreChamado(tipoSeguro, ticket.getTipo().name());

        ticket.setStatus(TicketStatus.resolvido);
        ticket.setResolucao(req.resolucao());
        ticket.setFuncionarioId(funcId);
        ticket.setFuncionarioNome(funcNome);
        ticket.setCobertoPLano(coberto);
        ticket.setAtualizadoEm(timeSimulator.now());

        if (!coberto && custo.compareTo(BigDecimal.ZERO) > 0 && rental != null) {
            String faturaId = "FAT-TK-" + ticketId;
            RentalInvoice fatura = RentalInvoice.builder()
                    .id(faturaId)
                    .rental(rental)
                    .dataVencimento(timeSimulator.now().plus(7, ChronoUnit.DAYS))
                    .valor(custo)
                    .status("aguardando_aprovacao")
                    .build();
            rental.addFatura(fatura);
            rentalRepository.save(rental);
            ticket.setFaturaId(faturaId);
            ticket.setCustoGerado(custo);
        }

        ticketRepository.save(ticket);
        return Map.of("message", "Chamado resolvido.", "ticket", toMap(ticket, rental));
    }

    @Transactional
    public Map<String, Object> cancelar(Long ticketId, Long userId, boolean isAdmin) {
        SupportTicket ticket = findTicket(ticketId);
        if (!isAdmin && !ticket.getUsuarioId().equals(userId))
            throw new BusinessException("Sem permissão para cancelar este chamado.");
        if (ticket.getStatus() == TicketStatus.resolvido)
            throw new BusinessException("Chamado já resolvido, não pode ser cancelado.");
        ticket.setStatus(TicketStatus.cancelado);
        ticket.setAtualizadoEm(timeSimulator.now());
        ticketRepository.save(ticket);
        return Map.of("message", "Chamado cancelado.");
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listAll(String statusFilter) {
        List<SupportTicket> lista = statusFilter != null && !statusFilter.isBlank()
                ? ticketRepository.findByStatusOrderByCriadoEmDesc(TicketStatus.valueOf(statusFilter))
                : ticketRepository.findAllByOrderByCriadoEmDesc();
        return buildListResult(lista);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listMeus(Long userId) {
        List<SupportTicket> lista = ticketRepository.findByUsuarioIdOrderByCriadoEmDesc(userId);
        return buildListResult(lista);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> stats() {
        return Map.of(
            "abertos",         ticketRepository.countByStatus(TicketStatus.aberto),
            "emAtendimento",   ticketRepository.countByStatus(TicketStatus.em_atendimento),
            "resolvidos",      ticketRepository.countByStatus(TicketStatus.resolvido),
            "cancelados",      ticketRepository.countByStatus(TicketStatus.cancelado)
        );
    }

    // ── helpers ──────────────────────────────────────────

    private SupportTicket findTicket(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Chamado não encontrado."));
    }

    private Map<String, Object> buildListResult(List<SupportTicket> lista) {
        // Batch-load rentals for tipoSeguro
        Set<Long> rentalIds = new HashSet<>();
        lista.forEach(t -> rentalIds.add(t.getRentalId()));
        Map<Long, Rental> rentalMap = new HashMap<>();
        rentalRepository.findAllById(rentalIds).forEach(r -> rentalMap.put(r.getId(), r));

        List<Map<String, Object>> mapped = lista.stream()
                .map(t -> toMap(t, rentalMap.get(t.getRentalId())))
                .toList();
        return Map.of("tickets", mapped, "total", mapped.size());
    }

    private Map<String, Object> toMap(SupportTicket t, Rental rental) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("rentalId", t.getRentalId());
        m.put("usuarioId", t.getUsuarioId());
        m.put("usuarioNome", t.getUsuarioNome());
        m.put("tipo", t.getTipo().name());
        m.put("descricao", t.getDescricao());
        m.put("status", t.getStatus().name());
        m.put("prioridade", t.getPrioridade().name());
        m.put("funcionarioId", t.getFuncionarioId());
        m.put("funcionarioNome", t.getFuncionarioNome());
        m.put("resolucao", t.getResolucao());
        m.put("cobertoPLano", t.getCobertoPLano());
        m.put("custoGerado", t.getCustoGerado());
        m.put("faturaId", t.getFaturaId());
        m.put("criadoEm", t.getCriadoEm().toString());
        m.put("atualizadoEm", t.getAtualizadoEm().toString());
        if (rental != null) {
            m.put("tipoSeguro", rental.getTipoSeguro());
            m.put("bikeNome", rental.getBikeNome());
        }
        return m;
    }
}
