package com.bvelikov.repository_storage.repository;

import com.bvelikov.repository_storage.model.Repository;
import com.bvelikov.repository_storage.model.Secret;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SecretRepository extends JpaRepository<Secret, Long> {
    // Optional<Secret> findByRepository_IdAndSecretKey(Long id, String secretKey);
    Optional<Secret> findByRepositoriesInAndSecretKey(Collection<Repository> repositories, String secretKey);

    // List<Secret> findAllByRepository_Id(Long id);
    List<Secret> findByRepositories(Repository repositories);

}
