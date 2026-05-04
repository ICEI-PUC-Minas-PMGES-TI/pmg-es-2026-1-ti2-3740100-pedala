package com.pedala.api.contract.service;

import com.pedala.api.exception.ResourceNotFoundException;
import com.pedala.api.rental.domain.Rental;
import com.pedala.api.rental.repository.RentalRepository;
import com.pedala.api.user.domain.User;
import com.pedala.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ContractService {

    private final RentalRepository rentalRepository;
    private final UserRepository userRepository;
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy").withZone(ZoneId.of("America/Sao_Paulo"));

    @Transactional(readOnly = true)
    public Map<String, Object> generateContract(Long aluguelId, Long requesterId, String requesterRole) {
        Rental aluguel = rentalRepository.findByIdWithDetails(aluguelId)
                .orElseThrow(() -> new ResourceNotFoundException("Locacao nao encontrada."));
        boolean isOwner = aluguel.getUsuarioId().equals(requesterId);
        boolean isStaff = "admin".equals(requesterRole) || "funcionario".equals(requesterRole);
        if (!isOwner && !isStaff) throw new AccessDeniedException("Acesso negado.");

        User usuario = userRepository.findById(aluguel.getUsuarioId()).orElse(null);
        String nome = usuario != null ? usuario.getNome() : aluguel.getUsuarioNome();
        String email = usuario != null ? usuario.getEmail() : aluguel.getUsuarioEmail();
        String cpf = usuario != null && usuario.getCpf() != null ? usuario.getCpf() : "Nao informado";
        String telefone = usuario != null && usuario.getTelefone() != null ? usuario.getTelefone() : "Nao informado";

        String enderecoStr = "Endereco nao informado";
        if (aluguel.getEnderecoLogradouro() != null) {
            enderecoStr = aluguel.getEnderecoLogradouro() + ", " + aluguel.getEnderecoNumero()
                    + (aluguel.getEnderecoComplemento() != null ? ", " + aluguel.getEnderecoComplemento() : "")
                    + " - " + aluguel.getEnderecoBairro() + ", " + aluguel.getEnderecoCidade() + "/" + aluguel.getEnderecoUf();
        }

        String dataInicio = FMT.format(aluguel.getDataInicio());
        String dataDev = FMT.format(aluguel.getDataDevolucaoPrevista());
        String dataCriacao = FMT.format(aluguel.getCriadoEm());
        String statusLabel = aluguel.getStatus().name().toUpperCase().replace("_", " ");

        StringBuilder renovacoesHtml = new StringBuilder();
        if (aluguel.getRenovacoes() != null && !aluguel.getRenovacoes().isEmpty()) {
            renovacoesHtml.append("<div class=\"section\"><h3>Renovacoes de Contrato</h3><table><thead><tr><th>Data</th><th>Extensao</th><th>Nova data de devolucao</th></tr></thead><tbody>");
            aluguel.getRenovacoes().forEach(r -> renovacoesHtml.append("<tr><td>").append(FMT.format(r.getCriadoEm()))
                    .append("</td><td>").append(r.getDias()).append(" dias (").append(r.getTipo()).append(")</td><td>")
                    .append(FMT.format(r.getDataPara())).append("</td></tr>"));
            renovacoesHtml.append("</tbody></table></div>");
        }

        String html = buildHtml(aluguel, nome, email, cpf, telefone, enderecoStr,
                dataInicio, dataDev, dataCriacao, statusLabel, renovacoesHtml.toString());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("html", html);
        return result;
    }

    private String buildHtml(Rental a, String nome, String email, String cpf, String telefone,
                              String endereco, String dataInicio, String dataDev, String dataCriacao,
                              String status, String renovacoesHtml) {
        return """
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Contrato de Locacao #%d - Pedala</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',sans-serif;background:#F4F6F6;color:#1A202C;padding:40px 20px}
.contract{max-width:800px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(31,60,136,.12)}
.contract-header{background:linear-gradient(135deg,#1F3C88,#2a4fa8);color:#fff;padding:40px 48px}
.contract-header .logo{font-size:28px;font-weight:900;color:#FFC300;margin-bottom:8px}
.contract-header h1{font-size:20px;font-weight:700;color:rgba(255,255,255,.9)}
.contract-body{padding:40px 48px}.section{margin-bottom:32px}
.section h3{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#1F3C88;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #FFC300}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.info-item{background:#F4F6F6;border-radius:8px;padding:14px}.info-item .label{font-size:11px;font-weight:700;color:#8A95A3;text-transform:uppercase}
.info-item .value{font-size:15px;font-weight:700;color:#1A202C}.info-item.full{grid-column:1/-1}
.highlight{background:#1F3C88;color:#fff;border-radius:12px;padding:24px 32px;margin-bottom:32px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px;text-align:center}
.highlight .h-value{font-size:26px;font-weight:900;color:#FFC300}.highlight .h-label{font-size:11px;color:rgba(255,255,255,.6);margin-top:4px}
.badge-status{display:inline-block;padding:4px 14px;border-radius:100px;font-size:12px;font-weight:700;background:#dcfce7;color:#166534;margin-top:6px}
.footer{text-align:center;padding:24px;background:#F4F6F6;font-size:12px;color:#8A95A3;border-top:1px solid #E8ECEF}
.print-btn{position:fixed;top:20px;right:20px;background:#1F3C88;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:700;cursor:pointer}
@media print{.print-btn{display:none}body{background:white;padding:0}.contract{box-shadow:none;border-radius:0}}
table{width:100%%;border-collapse:collapse;font-size:13px}table th{text-align:left;padding:8px 12px;background:#F4F6F6}table td{padding:10px 12px;border-bottom:1px solid #E8ECEF}
.clausulas{font-size:13px;color:#4A5568;line-height:1.85}.clausulas .item{margin-bottom:10px;padding-left:16px}
.assinatura{margin-top:48px;padding-top:24px;border-top:1px solid #E8ECEF;display:grid;grid-template-columns:1fr 1fr;gap:40px}
.assinatura-box{text-align:center}.assinatura-line{border-bottom:1.5px solid #1A202C;margin-bottom:8px;height:40px}
.assinatura-label{font-size:11px;color:#8A95A3;font-weight:600}
</style></head><body>
<button class="print-btn" onclick="window.print()">Imprimir / Salvar PDF</button>
<div class="contract"><div class="contract-header"><div class="logo">Pedala</div>
<h1>Contrato de Locacao de Bicicleta</h1>
<div style="font-size:13px;color:rgba(255,255,255,.5);margin-top:4px">Locacao #%d &bull; Emitido em %s</div>
<div style="margin-top:10px"><span class="badge-status">%s</span></div></div>
<div class="contract-body">
<div class="highlight"><div><div class="h-value">R$%.2f</div><div class="h-label">Valor do plano</div></div>
<div><div class="h-value">%s</div><div class="h-label">Data de inicio</div></div>
<div><div class="h-value">%s</div><div class="h-label">Devolucao prevista</div></div></div>
<div class="section"><h3>Dados do Locatario</h3><div class="info-grid">
<div class="info-item"><div class="label">Nome completo</div><div class="value">%s</div></div>
<div class="info-item"><div class="label">Email</div><div class="value">%s</div></div>
<div class="info-item"><div class="label">CPF</div><div class="value">%s</div></div>
<div class="info-item"><div class="label">Telefone</div><div class="value">%s</div></div>
<div class="info-item full"><div class="label">Endereco de entrega</div><div class="value">%s</div></div></div></div>
<div class="section"><h3>Dados da Bicicleta</h3><div class="info-grid">
<div class="info-item"><div class="label">Modelo</div><div class="value">%s</div></div>
<div class="info-item"><div class="label">Categoria</div><div class="value">%s</div></div>
<div class="info-item"><div class="label">Plano contratado</div><div class="value">%s</div></div>
<div class="info-item"><div class="label">Valor total</div><div class="value" style="color:#1F3C88;font-size:18px">R$%.2f</div></div></div></div>
<div class="section"><h3>Clausulas e Condicoes de Uso</h3><div class="clausulas"><div class="clausulas-list">
<div class="item">1. O locatario declara receber a bicicleta em perfeito estado.</div>
<div class="item">2. O locatario se compromete a utilizar com cuidado e responsabilidade.</div>
<div class="item">3. Danos ao equipamento serao de responsabilidade do locatario.</div>
<div class="item">4. Atrasos na devolucao implicam cobranca proporcional adicional.</div>
<div class="item" style="color:#d97706;font-weight:700">5. MULTA POR DEVOLUCAO ANTECIPADA: 15%% sobre o valor proporcional do periodo nao utilizado.</div>
<div class="item">6. A bicicleta devera ser devolvida no mesmo estado em que foi recebida.</div>
<div class="item">7. O locatario autoriza coleta de dados GPS durante o periodo de locacao.</div>
<div class="item">8. Renovacao pode ser solicitada sujeita a disponibilidade.</div>
<div class="item">9. Em caso de roubo, comunicar a Pedala e registrar boletim de ocorrencia.</div></div></div></div>
%s
<div class="assinatura"><div class="assinatura-box"><div class="assinatura-line"></div>
<div class="assinatura-label">%s<br>Locatario — CPF: %s</div></div>
<div class="assinatura-box"><div class="assinatura-line"></div>
<div class="assinatura-label">Pedala Locacao de Bicicletas<br>Representante Legal</div></div></div></div>
<div class="footer">Pedala Locacao de Bicicletas &bull; Contrato #%d &bull; Emitido em %s<br>Este documento tem validade juridica mediante assinatura das partes.</div>
</div></body></html>""".formatted(
                a.getId(), a.getId(), dataCriacao, status,
                a.getPreco().doubleValue(), dataInicio, dataDev,
                nome, email, cpf, telefone, endereco,
                a.getBikeNome(), a.getBikeCategoria(), a.getPlanoLabel(), a.getPreco().doubleValue(),
                renovacoesHtml, nome, cpf, a.getId(), dataCriacao);
    }
}
