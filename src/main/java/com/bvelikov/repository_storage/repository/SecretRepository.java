package com.bvelikov.repository_storage.repository;

import com.bvelikov.repository_storage.model.Repository;
import com.bvelikov.repository_storage.model.Secret;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.lang.NonNull;

public interface SecretRepository extends JpaRepository<Secret, Long> {
    void deleteByRepositoryAndSecretKey(@NonNull Repository repository, @NonNull String secretKey);
}
