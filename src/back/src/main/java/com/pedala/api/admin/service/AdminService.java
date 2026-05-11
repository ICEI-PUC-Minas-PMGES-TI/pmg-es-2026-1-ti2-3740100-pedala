package com.pedala.api.admin.service;

import com.pedala.api.bike.domain.Bike;
import com.pedala.api.bike.repository.BikeRepository;
import com.pedala.api.exception.BusinessException;
import com.pedala.api.exception.ResourceNotFoundException;
import com.pedala.api.inspection.domain.InspectionStatus;
import com.pedala.api.inspection.repository.InspectionRepository;
import com.pedala.api.rental.domain.Rental;
import com.pedala.api.rental.domain.RentalStatus;
import com.pedala.api.rental.repository.RentalRepository;
import com.pedala.api.rental.service.RentalService;
import com.pedala.api.shared.TimeSimulator;
import com.pedala.api.user.domain.UserRole;
import com.pedala.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final BikeRepository bikeRepository;
    private final RentalRepository rentalRepository;
    private final InspectionRepository inspectionRepository;
    private final UserRepository userRepository;
    private final RentalService rentalService;
    private final TimeSimulator timeSimulator;

    private static final List<String> ACTIVE_STATUSES = List.of("ativo", "aguardando_locacao", "agendada", "aguardando_vistoria");

    @Transactional(readOnly = true)
    public Map<String, Object> getStats() {
        Instant agora = timeSimulator.now();
        long totalBikes = bikeRepository.countByRemovidaFalse();
        long bikesDisponiveis = bikeRepository.countByDisponivelTrueAndBloqueadaFalseAndRemovidaFalse();
        long bikesAlugadas = bikeRepository.countByDisponivelFalseAndRemovidaFalse();

        long totalAlugueis = rentalRepository.count();
        long ativos = rentalRepository.countByStatus(RentalStatus.ativo);
        long aguardandoLocacao = rentalRepository.countByStatus(RentalStatus.aguardando_locacao);
        long agendadas = rentalRepository.countByStatus(RentalStatus.agendada);
        long aguardandoVistoria = rentalRepository.countByStatus(RentalStatus.aguardando_vistoria);
        long finalizados = rentalRepository.countByStatus(RentalStatus.finalizado);

        long vistPendentes = inspectionRepository.countByStatus(InspectionStatus.pendente);
        long vistAprovadas = inspectionRepository.countByStatus(InspectionStatus.aprovada);
        long vistReprovadas = inspectionRepository.countByStatus(InspectionStatus.reprovada);

        long totalUsuarios = userRepository.countByRole(UserRole.USER);
        long totalFuncionarios = userRepository.countByRole(UserRole.FUNCIONARIO);

        // Receita total (faturas pagas)
        List<Rental> rentalsAtivosOuFinalizados = rentalRepository.findAllWithDetails();
        BigDecimal receitaTotal = rentalsAtivosOuFinalizados.stream()
                .filter(r -> List.of(RentalStatus.ativo, RentalStatus.finalizado, RentalStatus.aguardando_vistoria).contains(r.getStatus()))
                .map(r -> r.getFaturas().stream()
                        .filter(f -> "pago".equals(f.getStatus()))
                        .map(f -> f.getValor())
                        .reduce(BigDecimal.ZERO, BigDecimal::add))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long atrasados = rentalsAtivosOuFinalizados.stream()
                .filter(r -> ACTIVE_STATUSES.contains(r.getStatus().name()))
                .filter(r -> r.getDataDevolucaoPrevista().isBefore(agora))
                .count();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("bikes", Map.of("total", totalBikes, "disponiveis", bikesDisponiveis, "alugadas", bikesAlugadas));
        result.put("alugueis", Map.of("total", totalAlugueis, "ativos", ativos, "aguardandoEntrega", aguardandoLocacao,
                "agendadas", agendadas, "aguardandoVistoria", aguardandoVistoria, "finalizados", finalizados, "atrasados", atrasados));
        result.put("vistorias", Map.of("pendentes", vistPendentes, "aprovadas", vistAprovadas, "reprovadas", vistReprovadas));
        result.put("usuarios", Map.of("total", totalUsuarios, "funcionarios", totalFuncionarios));
        result.put("receitaTotal", receitaTotal);
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAdminBikes() {
        Instant agora = timeSimulator.now();
        List<Bike> bikes = bikeRepository.findAll();
        List<Map<String, Object>> lista = bikes.stream().map(bike -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", bike.getId()); m.put("nome", bike.getNome()); m.put("categoria", bike.getCategoria());
            m.put("descricao", bike.getDescricao()); m.put("disponivel", bike.getQuantidadeDisponivel() > 0 && !bike.getBloqueada());
            m.put("bloqueada", bike.getBloqueada()); m.put("removida", bike.getRemovida());
            m.put("quantidade", bike.getQuantidade()); m.put("quantidadeDisponivel", bike.getQuantidadeDisponivel());
            Map<String, Object> precos = new LinkedHashMap<>();
            precos.put("semanal", bike.getPrecoSemanal()); precos.put("quinzenal", bike.getPrecoQuinzenal()); precos.put("mensal", bike.getPrecoMensal());
            m.put("precos", precos); m.put("imagem", bike.getImagem());
            m.put("adicionadaEm", bike.getAdicionadaEm().toString());

            List<Rental> activeRentals = rentalRepository.findByBikeIdAndStatusIn(bike.getId(),
                    List.of(RentalStatus.ativo, RentalStatus.aguardando_locacao, RentalStatus.agendada, RentalStatus.aguardando_vistoria));
            if (!activeRentals.isEmpty()) {
                Rental r = activeRentals.get(0);
                Instant startDate = r.getAtivadoEm() != null ? r.getAtivadoEm() : r.getDataInicio();
                long diasEmUso = Math.max(0, ChronoUnit.DAYS.between(startDate, agora));
                long diasRestantes = ChronoUnit.DAYS.between(agora, r.getDataDevolucaoPrevista());
                Map<String, Object> det = new LinkedHashMap<>();
                det.put("aluguelId", r.getId()); det.put("usuarioNome", r.getUsuarioNome());
                det.put("tipo", r.getTipo().name()); det.put("status", r.getStatus().name());
                det.put("dataInicio", r.getDataInicio().toString()); det.put("ativadoEm", r.getAtivadoEm() != null ? r.getAtivadoEm().toString() : null);
                det.put("dataDevolucaoPrevista", r.getDataDevolucaoPrevista().toString());
                det.put("diasEmUso", diasEmUso); det.put("diasRestantes", diasRestantes); det.put("atrasado", diasRestantes < 0);
                det.put("alertaDesvio", r.getAlertaDesvio());
                m.put("aluguelAtivo", det);
            } else {
                m.put("aluguelAtivo", null);
            }
            return m;
        }).toList();
        return Map.of("bikes", lista, "total", lista.size());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAdminRentals(String statusFilter) {
        return rentalService.getAllRentals(statusFilter);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPayments(String statusFilter) {
        List<Rental> rentals = rentalRepository.findAllWithDetails();
        if (statusFilter != null && !statusFilter.isBlank()) {
            rentals = rentals.stream().filter(r -> statusFilter.equals(r.getPagamentoStatus())).toList();
        }
        List<Map<String, Object>> mapped = rentals.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("aluguelId", r.getId()); m.put("usuarioNome", r.getUsuarioNome()); m.put("usuarioEmail", r.getUsuarioEmail());
            m.put("bikeNome", r.getBikeNome()); m.put("tipo", r.getTipo().name()); m.put("planoLabel", r.getPlanoLabel());
            m.put("preco", r.getPreco());
            Map<String, Object> pag = new LinkedHashMap<>();
            pag.put("status", r.getPagamentoStatus()); pag.put("solicitadoEm", r.getPagamentoSolicitadoEm() != null ? r.getPagamentoSolicitadoEm().toString() : null);
            pag.put("aprovadoEm", r.getPagamentoAprovadoEm() != null ? r.getPagamentoAprovadoEm().toString() : null); pag.put("aprovadoPor", r.getPagamentoAprovadoPor());
            m.put("pagamento", pag); m.put("criadoEm", r.getCriadoEm().toString()); m.put("status", r.getStatus().name());
            m.put("faturas", r.getFaturas().stream().map(f -> {
                Map<String, Object> fm = new LinkedHashMap<>(); fm.put("id", f.getId()); fm.put("dataVencimento", f.getDataVencimento().toString());
                fm.put("valor", f.getValor()); fm.put("status", f.getStatus()); fm.put("pagoEm", f.getPagoEm() != null ? f.getPagoEm().toString() : null);
                return fm;
            }).toList());
            return m;
        }).toList();
        return Map.of("pagamentos", mapped, "total", mapped.size());
    }

    @Transactional
    public Map<String, Object> approvePayment(Long aluguelId, String approverName) {
        Rental rental = rentalRepository.findById(aluguelId)
                .orElseThrow(() -> new ResourceNotFoundException("Locacao nao encontrada."));
        if (!"aguardando_aprovacao".equals(rental.getPagamentoStatus())) {
            throw new BusinessException("Status atual do pagamento: " + rental.getPagamentoStatus() + ". Nao esta aguardando aprovacao.");
        }
        var agora = timeSimulator.now();
        rental.getFaturas().forEach(f -> {
            f.setStatus("pago");
            f.setPagoEm(agora);
        });
        rental.setPagamentoStatus("aprovado");
        rental.setPagamentoAprovadoEm(agora);
        rental.setPagamentoAprovadoPor(approverName);
        rental = rentalRepository.save(rental);
        return Map.of("message", "Pagamento da locacao #" + rental.getId() + " aprovado!", "aluguel", rentalService.rentalToMap(rental, timeSimulator.now()));
    }

    @Transactional
    public Map<String, Object> rejectPayment(Long aluguelId, String motivo) {
        Rental rental = rentalRepository.findById(aluguelId)
                .orElseThrow(() -> new ResourceNotFoundException("Locacao nao encontrada."));
        rental.setPagamentoStatus("rejeitado");
        rental.setPagamentoMotivoRejeicao(motivo != null ? motivo : "Rejeitado pelo administrador");
        rental.setPagamentoAprovadoEm(null);
        rental = rentalRepository.save(rental);
        return Map.of("message", "Pagamento rejeitado.", "aluguel", rentalService.rentalToMap(rental, timeSimulator.now()));
    }

    @Transactional
    public Map<String, Object> approveInvoice(Long aluguelId, String faturaId, String approverName) {
        Rental rental = rentalRepository.findByIdWithDetails(aluguelId)
                .orElseThrow(() -> new ResourceNotFoundException("Locacao nao encontrada."));
        var fatura = rental.getFaturas().stream().filter(f -> f.getId().equals(faturaId)).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Fatura nao encontrada."));
        if (!"aguardando_aprovacao".equals(fatura.getStatus())) {
            throw new BusinessException("Status atual da fatura: " + fatura.getStatus() + ". E necessario estar aguardando_aprovacao.");
        }
        fatura.setStatus("pago");
        fatura.setPagoEm(timeSimulator.now());
        boolean allPaid = rental.getFaturas().stream().allMatch(f -> "pago".equals(f.getStatus()));
        boolean hasAwaiting = rental.getFaturas().stream().anyMatch(f -> "aguardando_aprovacao".equals(f.getStatus()));
        if (allPaid) { rental.setPagamentoStatus("aprovado"); rental.setPagamentoAprovadoEm(timeSimulator.now()); rental.setPagamentoAprovadoPor(approverName); }
        else if (hasAwaiting) { rental.setPagamentoStatus("aguardando_aprovacao"); }
        else { rental.setPagamentoStatus("nao_pago"); }
        rental = rentalRepository.save(rental);
        return Map.of("message", "Fatura " + fatura.getId() + " aprovada!", "aluguel", rentalService.rentalToMap(rental, timeSimulator.now()));
    }
}
