package com.pedala.api.gps.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pedala.api.exception.ResourceNotFoundException;
import com.pedala.api.rental.domain.Rental;
import com.pedala.api.rental.repository.RentalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RouteGenerationService {

    private final RentalRepository rentalRepository;
    private final RestTemplate     restTemplate;
    private final ObjectMapper     objectMapper;

    // ── Mesmos waypoints do GpsSimulatorService ───────────────────────────────
    private static final double[][] WAYPOINTS = {
        {-23.5615, -46.6560}, {-23.5580, -46.6606}, {-23.5558, -46.6640},
        {-23.5486, -46.6590}, {-23.5421, -46.6528}, {-23.5388, -46.6480},
        {-23.5431, -46.6395}, {-23.5445, -46.6354}, {-23.5593, -46.6358},
        {-23.5631, -46.6441}, {-23.5581, -46.6631}, {-23.5658, -46.6603},
        {-23.5747, -46.6658}, {-23.5793, -46.6404}, {-23.5886, -46.6385},
        {-23.5875, -46.6573}, {-23.6034, -46.6639}, {-23.5987, -46.6498},
        {-23.6020, -46.6350}, {-23.5861, -46.6780}, {-23.5725, -46.6876},
        {-23.5668, -46.6800}, {-23.5542, -46.6903}, {-23.5483, -46.6921},
        {-23.5388, -46.6840}, {-23.5380, -46.6743}, {-23.5320, -46.6842},
        {-23.5270, -46.7050}, {-23.5239, -46.6621}, {-23.5978, -46.6842},
        {-23.6140, -46.6950}, {-23.6170, -46.6670},
    };

    private static final String[] BAIRROS = {
        "Av. Paulista", "Av. Paulista — Trianon", "Av. Paulista — Consolação",
        "Higienópolis", "Santa Cecília", "Vila Buarque", "República",
        "Centro — Anhangabaú", "Liberdade", "Bela Vista", "Cerqueira César",
        "Jardins", "Jardim Paulista", "Paraíso", "Vila Mariana",
        "Parque Ibirapuera", "Moema", "Moema — Leste", "Saúde",
        "Itaim Bibi", "Pinheiros — Faria Lima", "Pinheiros",
        "Vila Madalena", "Vila Madalena — Norte", "Sumaré",
        "Perdizes", "Pompeia", "Lapa", "Barra Funda",
        "Vila Olímpia", "Brooklin", "Campo Belo",
    };

    private static final int[][] ROUTE_TEMPLATES = {
        {0, 1, 2, 10, 11, 12, 19, 15, 16, 13, 9, 8, 0},
        {22, 23, 24, 25, 26, 21, 20, 12, 19, 29, 16, 15, 20, 21, 22},
        {7, 6, 5, 4, 3, 2, 10, 9, 8, 7},
        {28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 29, 30, 31, 16, 15, 13, 14, 17, 18, 8, 7, 28},
        {16, 17, 18, 14, 13, 15, 16, 31, 29, 19, 20, 12, 11, 10, 9, 16},
        {0, 1, 3, 4, 5, 6, 7, 8, 9, 10, 0},
    };

    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> getOrGenerate(Long rentalId) {
        Rental rental = rentalRepository.findById(rentalId)
                .orElseThrow(() -> new ResourceNotFoundException("Locação não encontrada."));

        // Já tem rota salva — retorna direto
        if (rental.getRotaGeojson() != null) {
            log.debug("[Route] Cache hit para locação #{}", rentalId);
            return buildResponse(rental, true);
        }

        // Selecionar template deterministicamente pelo rentalId
        int templateIdx = (int)(rentalId % ROUTE_TEMPLATES.length);
        int[] template  = ROUTE_TEMPLATES[templateIdx];

        // Montar coordenadas para OSRM: lng,lat;lng,lat;...
        String coords = Arrays.stream(template)
                .mapToObj(i -> WAYPOINTS[i][1] + "," + WAYPOINTS[i][0])
                .collect(Collectors.joining(";"));

        String url = "https://router.project-osrm.org/route/v1/driving/"
                + coords + "?overview=full&geometries=geojson&steps=false";

        log.info("[Route] Gerando rota para locação #{} via OSRM (template {})", rentalId, templateIdx);
        try {
            Map<String, Object> osrm = restTemplate.getForObject(url, Map.class);
            List<Map<String, Object>> routes = (List<Map<String, Object>>) osrm.get("routes");

            if (routes == null || routes.isEmpty()) {
                throw new RuntimeException("OSRM não retornou rotas");
            }

            Map<String, Object> route    = routes.get(0);
            double distanceM = ((Number) route.get("distance")).doubleValue();
            double durationS = ((Number) route.get("duration")).doubleValue();
            Object geometry  = route.get("geometry");

            // Serializar geometry (GeoJSON LineString) para string
            String geojsonStr = objectMapper.writeValueAsString(geometry);

            rental.setRotaGeojson(geojsonStr);
            rental.setRotaDistanciaKm(BigDecimal.valueOf(distanceM / 1000.0).setScale(1, RoundingMode.HALF_UP));
            rental.setRotaDuracaoMin((int)(durationS / 60));
            rental.setRotaBairroInicio(BAIRROS[template[0]]);
            rental.setRotaBairroFim(BAIRROS[template[template.length - 1]]);
            rentalRepository.save(rental);

            log.info("[Route] Rota gerada e salva para locação #{}: {:.1f}km, {}min",
                    rentalId, rental.getRotaDistanciaKm(), rental.getRotaDuracaoMin());

        } catch (Exception e) {
            log.error("[Route] Erro ao gerar rota via OSRM: {}", e.getMessage());
            throw new RuntimeException("Não foi possível gerar a rota: " + e.getMessage());
        }

        return buildResponse(rental, false);
    }

    private Map<String, Object> buildResponse(Rental rental, boolean cached) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("rentalId",      rental.getId());
        m.put("bikeNome",      rental.getBikeNome());
        m.put("usuarioNome",   rental.getUsuarioNome());
        m.put("geojson",       rental.getRotaGeojson());
        m.put("distanciaKm",   rental.getRotaDistanciaKm());
        m.put("duracaoMin",    rental.getRotaDuracaoMin());
        m.put("bairroInicio",  rental.getRotaBairroInicio());
        m.put("bairroFim",     rental.getRotaBairroFim());
        m.put("cached",        cached);
        return m;
    }
}
