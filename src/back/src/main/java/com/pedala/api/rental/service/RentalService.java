package com.pedala.api.rental.service;

import com.pedala.api.bike.domain.Bike;
import com.pedala.api.bike.repository.BikeRepository;
import com.pedala.api.exception.BusinessException;
import com.pedala.api.exception.ResourceNotFoundException;
import com.pedala.api.gps.service.GpsSimulatorService;
import com.pedala.api.inspection.domain.Inspection;
import com.pedala.api.inspection.repository.InspectionRepository;
import com.pedala.api.rental.domain.*;
import com.pedala.api.rental.repository.RentalRepository;
import com.pedala.api.shared.TimeSimulator;
import com.pedala.api.user.domain.User;
import com.pedala.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class RentalService {

    private final RentalRepository rentalRepository;
    private final BikeRepository bikeRepository;
    private final UserRepository userRepository;
    private final InspectionRepository inspectionRepository;
    private final GpsSimulatorService gpsSimulatorService;
    private final TimeSimulator timeSimulator;

    @Transactional
    public Map<String, Object> createRental(Long userId, String userNome, String userEmail,
                                             Long bikeId, String tipo, String dataInicio, Integer recorrenciaMeses) {
        if (bikeId == null || tipo == null || tipo.isBlank()) {
            throw new BusinessException("bikeId e tipo sao obrigatorios.");
        }
        RentalType rentalType;
        try { rentalType = RentalType.valueOf(tipo); }
        catch (IllegalArgumentException e) { throw new BusinessException("Tipo invalido. Use: semanal, quinzenal, mensal"); }

        List<Rental> activeRentals = rentalRepository.findByUsuarioIdAndStatusNot(userId, RentalStatus.finalizado);
        if (!activeRentals.isEmpty()) {
            throw new BusinessException("Voce ja possui uma locacao ativa. Encerre a locacao atual antes de criar uma nova.");
        }

        Bike bike = bikeRepository.findById(bikeId).orElseThrow(() -> new ResourceNotFoundException("Bicicleta nao encontrada."));
        if (bike.getBloqueada() || bike.getRemovida() || bike.getQuantidadeDisponivel() < 1) {
            throw new BusinessException("Bicicleta indisponivel no momento.");
        }

        User usuario = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado."));
        Instant agora = timeSimulator.now();
        LocalDate hoje = agora.atZone(ZoneOffset.UTC).toLocalDate();
        Instant inicio;
        if (dataInicio != null && !dataInicio.isBlank()) {
            LocalDate dataInicioLocal = LocalDate.parse(dataInicio);
            if (dataInicioLocal.isBefore(hoje)) throw new BusinessException("A data de inicio nao pode ser no passado.");
            if (dataInicioLocal.isAfter(hoje.plusDays(4))) throw new BusinessException("A data de inicio pode ser no maximo 4 dias a partir de hoje.");
            inicio = dataInicioLocal.atTime(12, 0).toInstant(ZoneOffset.UTC);
        } else {
            inicio = hoje.atTime(12, 0).toInstant(ZoneOffset.UTC);
        }

        int ciclosRecorrencia = 1;
        if (rentalType == RentalType.mensal && recorrenciaMeses != null && recorrenciaMeses > 1) {
            ciclosRecorrencia = Math.min(recorrenciaMeses, 12);
        }
        int diasPorCiclo = rentalType.getDias();
        int diasTotais = diasPorCiclo * ciclosRecorrencia;
        BigDecimal precoPorCiclo = switch (rentalType) { 
            case semanal -> bike.getPrecoSemanal(); 
            case quinzenal -> bike.getPrecoQuinzenal(); 
            case mensal -> bike.getPrecoMensal(); 
        };
        BigDecimal precoTotal = precoPorCiclo.multiply(BigDecimal.valueOf(ciclosRecorrencia));
        Instant dataDevolucaoPrevista = inicio.plus(diasTotais, ChronoUnit.DAYS);
        boolean isAgendada = inicio.isAfter(agora);
        RentalStatus statusInicial = isAgendada ? RentalStatus.agendada : RentalStatus.aguardando_locacao;

        bike.decrementarEstoque();
        bikeRepository.save(bike);

        String planoLabel = ciclosRecorrencia > 1 ? "Mensal Recorrente (" + ciclosRecorrencia + " meses)" : rentalType.getLabel();
        Rental rental = Rental.builder().usuarioId(userId).usuarioNome(userNome).usuarioEmail(userEmail)
                .bikeId(bike.getId()).bikeNome(bike.getNome()).bikeCategoria(bike.getCategoria())
                .tipo(rentalType).planoLabel(planoLabel).ciclosRecorrencia(ciclosRecorrencia)
                .preco(precoTotal).status(statusInicial).dataInicio(inicio).dataDevolucaoPrevista(dataDevolucaoPrevista).criadoEm(agora).build();
        if (usuario.getEndereco() != null) {
            var addr = usuario.getEndereco();
            rental.setEnderecoLogradouro(addr.getLogradouro()); rental.setEnderecoNumero(addr.getNumero());
            rental.setEnderecoBairro(addr.getBairro()); rental.setEnderecoCidade(addr.getCidade());
            rental.setEnderecoUf(addr.getUf()); rental.setEnderecoComplemento(addr.getComplemento());
        }
        rental = rentalRepository.save(rental);
        for (int i = 0; i < ciclosRecorrencia; i++) {
            RentalInvoice fatura = RentalInvoice.builder().id("FAT-" + System.currentTimeMillis() + "-" + (i + 1))
                    .dataVencimento(inicio.plus((long) i * diasPorCiclo, ChronoUnit.DAYS)).valor(precoPorCiclo).status("pendente").build();
            rental.addFatura(fatura);
        }
        rental = rentalRepository.save(rental);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", isAgendada ? "Locacao agendada. A bike sera preparada para entrega na data." : "Locacao criada! A bicicleta sera preparada para envio ao seu endereco.");
        result.put("aluguel", rentalToMap(rental, agora));
        return result;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMyRentals(Long userId) {
        Instant agora = timeSimulator.now();
        List<Rental> rentals = rentalRepository.findByUsuarioIdWithDetails(userId);
        List<Map<String, Object>> lista = rentals.stream().map(r -> {
            Map<String, Object> m = rentalToMap(r, agora);
            m.put("diasRestantes", ChronoUnit.DAYS.between(agora, r.getDataDevolucaoPrevista()));
            return m;
        }).toList();
        return Map.of("alugueis", lista, "total", lista.size());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAllRentals(String statusFilter) {
        Instant agora = timeSimulator.now();
        List<Rental> rentals = rentalRepository.findAllWithDetails();
        if (statusFilter != null && !statusFilter.isBlank()) {
            RentalStatus st = RentalStatus.valueOf(statusFilter);
            rentals = rentals.stream().filter(r -> r.getStatus() == st).toList();
        }
        List<Map<String, Object>> lista = rentals.stream().map(r -> enrichRental(r, agora)).toList();
        return Map.of("alugueis", lista, "total", lista.size());
    }

    @Transactional
    public Map<String, Object> activateRental(Long rentalId) {
        Rental rental = rentalRepository.findByIdWithDetails(rentalId).orElseThrow(() -> new ResourceNotFoundException("Locacao nao encontrada."));
        if (rental.getStatus() != RentalStatus.aguardando_locacao && rental.getStatus() != RentalStatus.agendada)
            throw new BusinessException("Status atual: " + rental.getStatus() + ". Nao e possivel ativar agora.");
        rental.setStatus(RentalStatus.ativo);
        rental.setAtivadoEm(timeSimulator.now());
        rental = rentalRepository.save(rental);
        try { gpsSimulatorService.startTracking(rental.getBikeId(), rental.getId(), rental.getBikeNome()); } catch (Exception e) { log.error("[GPS] Erro: {}", e.getMessage()); }
        return Map.of("message", "Locacao ativada!", "aluguel", rentalToMap(rental, timeSimulator.now()));
    }

    @Transactional
    public Map<String, Object> finalizeRental(Long rentalId) {
        Rental rental = rentalRepository.findByIdWithDetails(rentalId).orElseThrow(() -> new ResourceNotFoundException("Locacao nao encontrada."));
        if (rental.getStatus() != RentalStatus.aguardando_vistoria && rental.getStatus() != RentalStatus.ativo)
            throw new BusinessException("Status atual: " + rental.getStatus() + ". Nao e possivel finalizar agora.");
        rental.setStatus(RentalStatus.finalizado); rental.setFinalizadoEm(timeSimulator.now());
        Bike bike = bikeRepository.findById(rental.getBikeId()).orElse(null);
        if (bike != null) { bike.incrementarEstoque(); bikeRepository.save(bike); }
        try { gpsSimulatorService.stopTracking(rental.getBikeId()); } catch (Exception e) {}
        rental = rentalRepository.save(rental);
        return Map.of("message", "Locacao encerrada com sucesso.", "aluguel", rentalToMap(rental, timeSimulator.now()));
    }

    @Transactional
    public Map<String, Object> requestReturn(Long rentalId, Long userId) {
        Rental rental = rentalRepository.findByIdWithDetails(rentalId).orElseThrow(() -> new ResourceNotFoundException("Locacao nao encontrada."));
        if (!rental.getUsuarioId().equals(userId)) throw new ResourceNotFoundException("Locacao nao encontrada.");
        if (rental.getStatus() != RentalStatus.ativo) throw new BusinessException("Somente locacoes ativas podem ser devolvidas.");
        Instant agora = timeSimulator.now();
        rental.setStatus(RentalStatus.aguardando_vistoria); rental.setDevolvidoEm(agora);
        long diasTotal = ChronoUnit.DAYS.between(rental.getDataInicio(), rental.getDataDevolucaoPrevista());
        long diasUsados = Math.max(1, ChronoUnit.DAYS.between(rental.getDataInicio(), agora));
        if (diasUsados < diasTotal) {
            long diasNao = diasTotal - diasUsados;
            BigDecimal vpd = rental.getPreco().divide(BigDecimal.valueOf(diasTotal), 2, RoundingMode.HALF_UP);
            BigDecimal vnu = vpd.multiply(BigDecimal.valueOf(diasNao));
            rental.setDevolucaoAntecipada(true); rental.setDiasNaoUtilizados((int)diasNao);
            rental.setValorNaoUtilizado(vnu); rental.setMultaAplicada(vnu.multiply(BigDecimal.valueOf(0.15)).setScale(2, RoundingMode.HALF_UP));
        }
        rental = rentalRepository.save(rental);
        inspectionRepository.save(Inspection.builder().aluguelId(rental.getId()).usuarioId(rental.getUsuarioId())
                .usuarioNome(rental.getUsuarioNome()).bikeId(rental.getBikeId()).bikeNome(rental.getBikeNome()).criadaEm(agora).build());
        return Map.of("message", "Devolucao solicitada. Um funcionario agendara a vistoria da bike.", "aluguel", rentalToMap(rental, agora));
    }

    @Transactional
    public Map<String, Object> requestPayment(Long rentalId, Long userId) {
        Rental rental = rentalRepository.findById(rentalId).filter(r -> r.getUsuarioId().equals(userId)).orElseThrow(() -> new ResourceNotFoundException("Locacao nao encontrada."));
        if ("aprovado".equals(rental.getPagamentoStatus())) throw new BusinessException("Pagamento ja aprovado.");
        if ("aguardando_aprovacao".equals(rental.getPagamentoStatus())) throw new BusinessException("Pagamento ja enviado para aprovacao.");
        rental.setPagamentoStatus("aguardando_aprovacao"); rental.setPagamentoSolicitadoEm(timeSimulator.now());
        rental = rentalRepository.save(rental);
        return Map.of("message", "Solicitacao de pagamento enviada!", "aluguel", rentalToMap(rental, timeSimulator.now()));
    }

    @Transactional
    public Map<String, Object> payInvoice(Long rentalId, String faturaId, Long userId) {
        Rental rental = rentalRepository.findByIdWithDetails(rentalId).filter(r -> r.getUsuarioId().equals(userId)).orElseThrow(() -> new ResourceNotFoundException("Locacao nao encontrada."));
        RentalInvoice fatura = rental.getFaturas().stream().filter(f -> f.getId().equals(faturaId)).findFirst().orElseThrow(() -> new ResourceNotFoundException("Fatura nao encontrada."));
        if (!"pendente".equals(fatura.getStatus()) && !"rejeitado".equals(fatura.getStatus())) throw new BusinessException("Pagamento nao pode ser solicitado para esta fatura.");
        fatura.setStatus("aguardando_aprovacao"); rental.setPagamentoStatus("aguardando_aprovacao"); rental.setPagamentoSolicitadoEm(timeSimulator.now());
        rental = rentalRepository.save(rental);
        return Map.of("message", "Solicitacao de pagamento da fatura enviada para analise.", "aluguel", rentalToMap(rental, timeSimulator.now()));
    }

    @Transactional
    public Map<String, Object> renewRental(Long rentalId, Long userId, String tipo) {
        if (tipo == null) throw new BusinessException("Tipo invalido.");
        RentalType rt; try { rt = RentalType.valueOf(tipo); } catch (IllegalArgumentException e) { throw new BusinessException("Tipo invalido."); }
        Rental rental = rentalRepository.findByIdWithDetails(rentalId).filter(r -> r.getUsuarioId().equals(userId)).orElseThrow(() -> new ResourceNotFoundException("Locacao nao encontrada."));
        if (rental.getStatus() != RentalStatus.ativo) throw new BusinessException("Somente locacoes ativas podem ser renovadas.");
        Instant novaData = rental.getDataDevolucaoPrevista().plus(rt.getDias(), ChronoUnit.DAYS);
        rental.addRenovacao(RentalRenewal.builder().tipo(tipo).dias(rt.getDias()).preco(rental.getPreco()).dataDe(rental.getDataDevolucaoPrevista()).dataPara(novaData).criadoEm(timeSimulator.now()).build());
        rental.setDataDevolucaoPrevista(novaData); rental = rentalRepository.save(rental);
        return Map.of("message", "Contrato renovado por mais " + rt.getDias() + " dias.", "aluguel", rentalToMap(rental, timeSimulator.now()));
    }

    public Map<String, Object> rentalToMap(Rental r, Instant agora) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId()); m.put("usuarioId", r.getUsuarioId()); m.put("usuarioNome", r.getUsuarioNome());
        m.put("usuarioEmail", r.getUsuarioEmail()); m.put("bikeId", r.getBikeId()); m.put("bikeNome", r.getBikeNome());
        m.put("bikeCategoria", r.getBikeCategoria()); m.put("tipo", r.getTipo().name()); m.put("planoLabel", r.getPlanoLabel());
        m.put("ciclosRecorrencia", r.getCiclosRecorrencia()); m.put("preco", r.getPreco());
        if (r.getEnderecoLogradouro() != null) {
            m.put("enderecoEntrega", Map.of("logradouro", r.getEnderecoLogradouro(), "numero", r.getEnderecoNumero() != null ? r.getEnderecoNumero() : "",
                    "bairro", r.getEnderecoBairro() != null ? r.getEnderecoBairro() : "", "cidade", r.getEnderecoCidade() != null ? r.getEnderecoCidade() : "", "uf", r.getEnderecoUf() != null ? r.getEnderecoUf() : ""));
        } else { m.put("enderecoEntrega", null); }
        Map<String, Object> pag = new LinkedHashMap<>();
        pag.put("status", r.getPagamentoStatus()); pag.put("solicitadoEm", r.getPagamentoSolicitadoEm() != null ? r.getPagamentoSolicitadoEm().toString() : null);
        pag.put("aprovadoEm", r.getPagamentoAprovadoEm() != null ? r.getPagamentoAprovadoEm().toString() : null); pag.put("aprovadoPor", r.getPagamentoAprovadoPor());
        m.put("pagamento", pag); m.put("status", r.getStatus().name()); m.put("dataInicio", r.getDataInicio().toString());
        m.put("dataDevolucaoPrevista", r.getDataDevolucaoPrevista().toString()); m.put("criadoEm", r.getCriadoEm().toString());
        m.put("ativadoEm", r.getAtivadoEm() != null ? r.getAtivadoEm().toString() : null);
        m.put("devolvidoEm", r.getDevolvidoEm() != null ? r.getDevolvidoEm().toString() : null);
        m.put("finalizadoEm", r.getFinalizadoEm() != null ? r.getFinalizadoEm().toString() : null);
        if (Boolean.TRUE.equals(r.getDevolucaoAntecipada())) {
            m.put("devolucaoAntecipada", true); m.put("diasNaoUtilizados", r.getDiasNaoUtilizados());
            m.put("valorNaoUtilizado", r.getValorNaoUtilizado()); m.put("multaAplicada", r.getMultaAplicada());
        }
        m.put("faturas", r.getFaturas() != null ? r.getFaturas().stream().map(f -> {
            Map<String, Object> fm = new LinkedHashMap<>(); fm.put("id", f.getId()); fm.put("dataVencimento", f.getDataVencimento().toString());
            fm.put("valor", f.getValor()); fm.put("status", f.getStatus()); fm.put("pagoEm", f.getPagoEm() != null ? f.getPagoEm().toString() : null); return fm;
        }).toList() : List.of());
        m.put("renovacoes", r.getRenovacoes() != null ? r.getRenovacoes().stream().map(rn -> {
            Map<String, Object> rm = new LinkedHashMap<>(); rm.put("tipo", rn.getTipo()); rm.put("dias", rn.getDias()); rm.put("preco", rn.getPreco());
            rm.put("de", rn.getDataDe().toString()); rm.put("para", rn.getDataPara().toString()); rm.put("em", rn.getCriadoEm().toString()); return rm;
        }).toList() : List.of());
        return m;
    }

    private Map<String, Object> enrichRental(Rental r, Instant agora) {
        Map<String, Object> m = rentalToMap(r, agora);
        Instant startDate = r.getAtivadoEm() != null ? r.getAtivadoEm() : r.getDataInicio();
        m.put("diasEmUso", Math.max(0, ChronoUnit.DAYS.between(startDate, agora)));
        long diasRestantes = ChronoUnit.DAYS.between(agora, r.getDataDevolucaoPrevista());
        m.put("diasRestantes", diasRestantes);
        m.put("atrasado", diasRestantes < 0 && r.getStatus() != RentalStatus.finalizado);
        return m;
    }
}
