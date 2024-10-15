package com.bvelikov.repository_storage.dto;

import com.bvelikov.repository_storage.model.Repository;
import com.bvelikov.repository_storage.model.Secret;

import java.util.HashSet;
import java.util.Set;

public class RepositoryDTO {
    private Long id;
    private String url;
    private Set<SecretDTO> secrets = new HashSet<>();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public Set<SecretDTO> getSecrets() {
        return secrets;
    }

    public void setSecrets(Set<SecretDTO> secrets) {
        this.secrets = secrets;
    }

    public static Repository fromDTO(RepositoryDTO repositoryDTO) {
        Repository repository = new Repository();
        repository.setId(repositoryDTO.getId());
        repository.setUrl(repositoryDTO.getUrl());

        Set<Secret> secrets = new HashSet<>();
        repositoryDTO.getSecrets().forEach(secretDTO -> secrets.add(SecretDTO.fromDTO(secretDTO)));
        repository.setSecrets(secrets);

        return repository;
    }

    public static RepositoryDTO toDTO(Repository repository) {
        RepositoryDTO repositoryDTO = new RepositoryDTO();
        repositoryDTO.setId(repository.getId());
        repositoryDTO.setUrl(repository.getUrl());

        Set<SecretDTO> secretsDTO = new HashSet<>();
        repository.getSecrets().forEach(secret -> secretsDTO.add(SecretDTO.toDTO(secret, repository.getId())));
        repositoryDTO.setSecrets(secretsDTO);

        return repositoryDTO;
    }
}
