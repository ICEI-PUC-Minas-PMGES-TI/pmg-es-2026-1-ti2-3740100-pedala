package com.pedala.api.rental.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "rentals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rental {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "usuario_nome", nullable = false, length = 100)
    private String usuarioNome;

    @Column(name = "usuario_email", length = 150)
    private String usuarioEmail;

    @Column(name = "bike_id", nullable = false)
    private Long bikeId;

    @Column(name = "bike_nome", nullable = false, length = 100)
    private String bikeNome;

    @Column(name = "bike_categoria", length = 50)
    private String bikeCategoria;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RentalType tipo;

    @Column(name = "plano_label", length = 100)
    private String planoLabel;

    @Column(name = "ciclos_recorrencia", nullable = false)
    @Builder.Default
    private Integer ciclosRecorrencia = 1;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal preco;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RentalStatus status = RentalStatus.aguardando_locacao;

    @Column(name = "data_inicio", nullable = false)
    private Instant dataInicio;

    @Column(name = "data_devolucao_prevista", nullable = false)
    private Instant dataDevolucaoPrevista;

    @Column(name = "criado_em", nullable = false, updatable = false)
    @Builder.Default
    private Instant criadoEm = Instant.now();

    @Column(name = "ativado_em")
    private Instant ativadoEm;

    @Column(name = "devolvido_em")
    private Instant devolvidoEm;

    @Column(name = "finalizado_em")
    private Instant finalizadoEm;

    @Column(name = "devolucao_antecipada")
    @Builder.Default
    private Boolean devolucaoAntecipada = false;

    @Column(name = "dias_nao_utilizados")
    private Integer diasNaoUtilizados;

    @Column(name = "valor_nao_utilizado", precision = 10, scale = 2)
    private BigDecimal valorNaoUtilizado;

    @Column(name = "multa_aplicada", precision = 10, scale = 2)
    private BigDecimal multaAplicada;

    @Column(name = "tipo_seguro", length = 50)
    private String tipoSeguro;

    @Column(name = "valor_seguro", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal valorSeguro = BigDecimal.ZERO;

    @Column(name = "alerta_desvio", nullable = false)
    @Builder.Default
    private Boolean alertaDesvio = false;

    // Endereco de entrega (embedded columns)
    @Column(name = "endereco_logradouro", length = 200)
    private String enderecoLogradouro;

    @Column(name = "endereco_numero", length = 20)
    private String enderecoNumero;

    @Column(name = "endereco_bairro", length = 100)
    private String enderecoBairro;

    @Column(name = "endereco_cidade", length = 100)
    private String enderecoCidade;

    @Column(name = "endereco_uf", length = 2)
    private String enderecoUf;

    @Column(name = "endereco_complemento", length = 100)
    private String enderecoComplemento;

    // Pagamento (embedded columns)
    @Column(name = "pagamento_status", nullable = false, length = 30)
    @Builder.Default
    private String pagamentoStatus = "nao_pago";

    @Column(name = "pagamento_solicitado_em")
    private Instant pagamentoSolicitadoEm;

    @Column(name = "pagamento_aprovado_em")
    private Instant pagamentoAprovadoEm;

    @Column(name = "pagamento_aprovado_por", length = 100)
    private String pagamentoAprovadoPor;

    @Column(name = "pagamento_motivo_rejeicao", length = 500)
    private String pagamentoMotivoRejeicao;

    @OneToMany(mappedBy = "rental", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<RentalInvoice> faturas = new LinkedHashSet<>();

    @OneToMany(mappedBy = "rental", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<RentalRenewal> renovacoes = new LinkedHashSet<>();

    public void addFatura(RentalInvoice fatura) {
        faturas.add(fatura);
        fatura.setRental(this);
    }

    public void addRenovacao(RentalRenewal renovacao) {
        renovacoes.add(renovacao);
        renovacao.setRental(this);
    }
}
