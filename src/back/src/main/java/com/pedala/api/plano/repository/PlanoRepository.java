package com.pedala.api.plano.repository;

import com.pedala.api.plano.domain.Plano;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlanoRepository extends JpaRepository<Plano, Long> {

    List<Plano> findByAtivoTrueOrderByValorAdicionalAsc();

    @Query(value = """
            SELECT p.* FROM planos p
            JOIN bike_planos bp ON p.id = bp.plano_id
            WHERE bp.bike_id = :bikeId AND p.ativo = 1
            ORDER BY p.valor_adicional
            """, nativeQuery = true)
    List<Plano> findByBikeId(@Param("bikeId") Long bikeId);

    @Query(value = "SELECT bike_id FROM bike_planos WHERE plano_id = :planoId", nativeQuery = true)
    List<Long> findBikeIdsByPlanoId(@Param("planoId") Long planoId);

    @Query(value = """
            SELECT COUNT(1) FROM bike_planos
            WHERE bike_id = :bikeId AND plano_id = :planoId
            """, nativeQuery = true)
    int existsBikePlano(@Param("bikeId") Long bikeId, @Param("planoId") Long planoId);

    @Modifying
    @Query(value = "INSERT INTO bike_planos (bike_id, plano_id) VALUES (:bikeId, :planoId)", nativeQuery = true)
    void insertBikePlano(@Param("bikeId") Long bikeId, @Param("planoId") Long planoId);

    @Modifying
    @Query(value = "DELETE FROM bike_planos WHERE bike_id = :bikeId AND plano_id = :planoId", nativeQuery = true)
    void deleteBikePlano(@Param("bikeId") Long bikeId, @Param("planoId") Long planoId);
}
