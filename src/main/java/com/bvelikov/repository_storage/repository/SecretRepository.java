package com.bvelikov.repository_storage.repository;

import com.bvelikov.repository_storage.model.Repository;
import com.bvelikov.repository_storage.model.Secret;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SecretRepository extends JpaRepository<Secret, Long> {
    Secret findByRepositoryAndSecretKey(Repository repository, String secretKey);
}
