package com.pedala.api.bike.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bike_categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BikeCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 50)
    private String nome;
}
