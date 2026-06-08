package com.pedala.api.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.util.concurrent.TimeUnit;

@Configuration
public class CacheConfig {

    // Cache de bikes: 5 minutos (mudam pouco)
    public static final String CACHE_BIKES      = "bikes";
    public static final String CACHE_BIKE       = "bike";
    // Cache de categorias: 10 minutos
    public static final String CACHE_CATEGORIAS = "categorias";
    // Cache de stats do admin: 60 segundos
    public static final String CACHE_STATS      = "admin-stats";

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();

        // Registra cada cache com seu próprio TTL usando um wrapper
        manager.registerCustomCache(CACHE_BIKES,
                Caffeine.newBuilder().expireAfterWrite(5, TimeUnit.MINUTES).maximumSize(100).build());

        manager.registerCustomCache(CACHE_BIKE,
                Caffeine.newBuilder().expireAfterWrite(5, TimeUnit.MINUTES).maximumSize(100).build());

        manager.registerCustomCache(CACHE_CATEGORIAS,
                Caffeine.newBuilder().expireAfterWrite(10, TimeUnit.MINUTES).maximumSize(50).build());

        manager.registerCustomCache(CACHE_STATS,
                Caffeine.newBuilder().expireAfterWrite(60, TimeUnit.SECONDS).maximumSize(10).build());

        return manager;
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
