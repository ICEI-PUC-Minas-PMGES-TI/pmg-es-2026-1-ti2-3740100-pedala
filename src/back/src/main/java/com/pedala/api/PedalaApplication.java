package com.pedala.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PedalaApplication {

    public static void main(String[] args) {
        SpringApplication.run(PedalaApplication.class, args);
    }
}
