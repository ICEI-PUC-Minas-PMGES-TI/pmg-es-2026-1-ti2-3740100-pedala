package com.pedala.api.rental.repository;

import com.pedala.api.rental.domain.RentalInvoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RentalInvoiceRepository extends JpaRepository<RentalInvoice, String> {
}
