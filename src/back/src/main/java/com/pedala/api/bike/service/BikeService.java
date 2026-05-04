package com.pedala.api.bike.service;

import com.pedala.api.bike.domain.Bike;
import com.pedala.api.bike.repository.BikeRepository;
import com.pedala.api.exception.BusinessException;
import com.pedala.api.exception.ResourceNotFoundException;
import com.pedala.api.rental.domain.RentalStatus;
import com.pedala.api.rental.repository.RentalRepository;
import com.pedala.api.shared.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class BikeService {

    private final BikeRepository bikeRepository;
    private final RentalRepository rentalRepository;
    private final FileStorageService fileStorageService;

    @Transactional(readOnly = true)
    public Map<String, Object> listBikes(String categoria, String disponivel) {
        List<Bike> bikes;
        if (categoria != null && !categoria.isBlank()) {
            bikes = bikeRepository.findByCategoriaIgnoreCaseAndRemovidaFalse(categoria);
        } else {
            bikes = bikeRepository.findByRemovidaFalse();
        }

        List<Map<String, Object>> resultado = bikes.stream()
                .filter(b -> {
                    if (disponivel != null) {
                        boolean disp = Boolean.parseBoolean(disponivel);
                        return (b.getQuantidadeDisponivel() > 0 && !b.getBloqueada()) == disp;
                    }
                    return true;
                })
                .map(this::bikeToMap)
                .toList();

        return Map.of("bikes", resultado, "total", resultado.size());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getBike(Long id) {
        Bike bike = bikeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bicicleta nao encontrada."));
        return bikeToMap(bike);
    }

    @Transactional
    public Map<String, Object> createBike(String nome, String categoria, String descricao,
                                           BigDecimal precoSemanal, BigDecimal precoQuinzenal,
                                           BigDecimal precoMensal, Integer quantidade, MultipartFile imagem) {
        if (nome == null || nome.isBlank() || precoSemanal == null || precoQuinzenal == null || precoMensal == null) {
            throw new BusinessException("nome, precoSemanal, precoQuinzenal e precoMensal sao obrigatorios.");
        }

        int qtd = quantidade != null ? quantidade : 1;
        if (qtd < 1) throw new BusinessException("Quantidade deve ser ao menos 1.");

        String imagemPath = null;
        if (imagem != null && !imagem.isEmpty()) {
            imagemPath = fileStorageService.store(imagem, "bike_new");
        }

        Bike bike = Bike.builder()
                .nome(nome)
                .categoria(categoria != null ? categoria : "Urbana")
                .descricao(descricao != null ? descricao : "")
                .precoSemanal(precoSemanal)
                .precoQuinzenal(precoQuinzenal)
                .precoMensal(precoMensal)
                .quantidade(qtd)
                .quantidadeDisponivel(qtd)
                .imagem(imagemPath)
                .build();

        bike = bikeRepository.save(bike);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Bike \"" + nome + "\" adicionada com " + qtd + " unidade(s)!");
        result.put("bike", bikeToMap(bike));
        return result;
    }

    @Transactional
    public Map<String, Object> updateBike(Long id, String nome, String categoria, String descricao,
                                           BigDecimal precoSemanal, BigDecimal precoQuinzenal,
                                           BigDecimal precoMensal, MultipartFile imagem) {
        Bike bike = bikeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bike nao encontrada."));

        if (nome != null) bike.setNome(nome);
        if (categoria != null) bike.setCategoria(categoria);
        if (descricao != null) bike.setDescricao(descricao);
        if (precoSemanal != null) bike.setPrecoSemanal(precoSemanal);
        if (precoQuinzenal != null) bike.setPrecoQuinzenal(precoQuinzenal);
        if (precoMensal != null) bike.setPrecoMensal(precoMensal);

        if (imagem != null && !imagem.isEmpty()) {
            fileStorageService.delete(bike.getImagem());
            bike.setImagem(fileStorageService.store(imagem, "bike_" + id));
        }

        bike = bikeRepository.save(bike);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Bike atualizada!");
        result.put("bike", bikeToMap(bike));
        return result;
    }

    @Transactional
    public Map<String, Object> uploadImage(Long id, MultipartFile imagem) {
        Bike bike = bikeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bike nao encontrada."));
        if (imagem == null || imagem.isEmpty()) {
            throw new BusinessException("Nenhuma imagem enviada.");
        }

        fileStorageService.delete(bike.getImagem());
        bike.setImagem(fileStorageService.store(imagem, "bike_" + id));
        bike = bikeRepository.save(bike);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Foto atualizada com sucesso!");
        result.put("bike", bikeToMap(bike));
        return result;
    }

    @Transactional
    public Map<String, Object> incrementStock(Long id, Integer incremento) {
        Bike bike = bikeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bike nao encontrada."));
        int inc = incremento != null ? incremento : 1;
        if (inc < 1) throw new BusinessException("Incremento deve ser >= 1.");

        bike.setQuantidade(bike.getQuantidade() + inc);
        bike.setQuantidadeDisponivel(bike.getQuantidadeDisponivel() + inc);
        if (!bike.getBloqueada()) bike.setDisponivel(bike.getQuantidadeDisponivel() > 0);
        bike = bikeRepository.save(bike);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "+" + inc + " unidade(s) adicionada(s). Total: " + bike.getQuantidade() + ", Disponivel: " + bike.getQuantidadeDisponivel());
        result.put("bike", bikeToMap(bike));
        return result;
    }

    @Transactional
    public Map<String, Object> blockBike(Long id, String motivo) {
        Bike bike = bikeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bike nao encontrada."));
        bike.setBloqueada(true);
        bike.setDisponivel(false);
        bike.setMotivoBloqueio(motivo != null ? motivo : "Bloqueada pelo administrador");
        bike.setBloqueadaEm(Instant.now());
        bike = bikeRepository.save(bike);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Bike bloqueada.");
        result.put("bike", bikeToMap(bike));
        return result;
    }

    @Transactional
    public Map<String, Object> activateBike(Long id) {
        Bike bike = bikeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bike nao encontrada."));
        bike.setBloqueada(false);
        bike.setDisponivel(bike.getQuantidadeDisponivel() > 0);
        bike.setMotivoBloqueio(null);
        bike.setBloqueadaEm(null);
        bike = bikeRepository.save(bike);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Bike ativada!");
        result.put("bike", bikeToMap(bike));
        return result;
    }

    @Transactional
    public Map<String, Object> deleteBike(Long id) {
        Bike bike = bikeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bike nao encontrada."));

        int unidadesAlugadas = bike.getQuantidade() - bike.getQuantidadeDisponivel();
        if (unidadesAlugadas > 0) {
            throw new BusinessException("Esta bike possui " + unidadesAlugadas + " unidade(s) atualmente alugada(s). Aguarde a devolucao antes de remover.");
        }

        if (!rentalRepository.findByBikeIdAndStatusIn(id,
                List.of(RentalStatus.ativo, RentalStatus.aguardando_locacao, RentalStatus.agendada, RentalStatus.aguardando_vistoria)).isEmpty()) {
            throw new BusinessException("Bike em locacao ativa. Aguarde a devolucao e vistoria para remover.");
        }

        bike.setRemovida(true);
        bike.setDisponivel(false);
        bike.setQuantidadeDisponivel(0);
        bikeRepository.save(bike);

        return Map.of("message", "Bike removida do estoque com sucesso.");
    }

    private Map<String, Object> bikeToMap(Bike bike) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", bike.getId());
        m.put("nome", bike.getNome());
        m.put("categoria", bike.getCategoria());
        m.put("descricao", bike.getDescricao());
        m.put("disponivel", bike.getQuantidadeDisponivel() > 0 && !bike.getBloqueada());
        m.put("bloqueada", bike.getBloqueada());
        m.put("removida", bike.getRemovida());
        m.put("quantidade", bike.getQuantidade());
        m.put("quantidadeDisponivel", bike.getQuantidadeDisponivel());
        Map<String, Object> precos = new LinkedHashMap<>();
        precos.put("semanal", bike.getPrecoSemanal());
        precos.put("quinzenal", bike.getPrecoQuinzenal());
        precos.put("mensal", bike.getPrecoMensal());
        m.put("precos", precos);
        m.put("imagem", bike.getImagem());
        m.put("motivoBloqueio", bike.getMotivoBloqueio());
        m.put("bloqueadaEm", bike.getBloqueadaEm() != null ? bike.getBloqueadaEm().toString() : null);
        m.put("adicionadaEm", bike.getAdicionadaEm().toString());
        return m;
    }
}
