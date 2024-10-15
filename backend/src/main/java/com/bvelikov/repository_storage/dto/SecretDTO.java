package com.bvelikov.repository_storage.dto;

import com.bvelikov.repository_storage.model.Secret;

public class SecretDTO {
    private Long id;
    private String secretKey;
    private String secretValue;
    private Long repositoryId;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSecretKey() {
        return secretKey;
    }

    public void setSecretKey(String secretKey) {
        this.secretKey = secretKey;
    }

    public String getSecretValue() {
        return secretValue;
    }

    public void setSecretValue(String secretValue) {
        this.secretValue = secretValue;
    }

    public Long getRepositoryId() {
        return repositoryId;
    }

    public void setRepositoryId(Long repositoryId) {
        this.repositoryId = repositoryId;
    }

    public static Secret fromDTO(SecretDTO secretDTO) {
        Secret secret = new Secret();
        secret.setId(secretDTO.getId());
        secret.setSecretKey(secretDTO.getSecretKey());
        secret.setSecretValue(secretDTO.getSecretValue());

        return secret;
    }

    public static SecretDTO toDTO(Secret secret, Long repositoryId) {
        SecretDTO secretDTO = new SecretDTO();
        secretDTO.setId(secret.getId());
        secretDTO.setSecretKey(secret.getSecretKey());
        secretDTO.setSecretValue(null);
        secretDTO.setRepositoryId(repositoryId);

        return secretDTO;
    }
}
