package com.bvelikov.repository_storage.repository;

import com.bvelikov.repository_storage.model.Repository;
import org.springframework.data.jpa.repository.JpaRepository;

@org.springframework.stereotype.Repository
public interface RepositoryRepository extends JpaRepository<Repository, Long> {
}
