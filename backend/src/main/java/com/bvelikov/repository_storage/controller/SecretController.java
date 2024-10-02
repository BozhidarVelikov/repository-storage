package com.bvelikov.repository_storage.controller;

import com.bvelikov.repository_storage.dto.SecretDTO;
import com.bvelikov.repository_storage.exception.SecretNotFoundException;
import com.bvelikov.repository_storage.model.Repository;
import com.bvelikov.repository_storage.model.Secret;
import com.bvelikov.repository_storage.repository.RepositoryRepository;
import com.bvelikov.repository_storage.repository.SecretRepository;
import com.bvelikov.repository_storage.security.encryption.EncryptionUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController()
@RequestMapping("/api/secret")
public class SecretController {
    @Autowired
    private SecretRepository secretRepository;

    @Autowired
    private RepositoryRepository repositoryRepository;

    @PostMapping("/verify")
    public ResponseEntity<Void> verifySecret(@RequestParam Long repositoryId, @RequestBody SecretDTO secretDTO) {
        Optional<Repository> repository = repositoryRepository.findById(repositoryId);
        if (repository.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Optional<Secret> potentialSecret = secretRepository.findByRepository_IdAndSecretKey(repositoryId, secretDTO.getSecretKey());
        if (potentialSecret.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Secret secret = potentialSecret.get();

        String decryptedValue;
        try {
            decryptedValue = EncryptionUtil.decrypt(secret.getSecretValue());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }

        if (secretDTO.getSecretValue().equals(decryptedValue)) {
            return ResponseEntity.ok().build();
        }

        return ResponseEntity.badRequest().build();
    }

    @PostMapping("/")
    public ResponseEntity<Void> saveSecret(@RequestParam Long repositoryId, @RequestBody SecretDTO secretDTO) {
        Optional<Repository> repository = repositoryRepository.findById(repositoryId);
        if (repository.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Optional<Secret> potentialSecret = secretRepository.findByRepository_IdAndSecretKey(repositoryId, secretDTO.getSecretKey());
        if (potentialSecret.isPresent()) {
            return ResponseEntity.badRequest().build();
        }

        String encryptedValue;
        try {
            encryptedValue = EncryptionUtil.encrypt(secretDTO.getSecretValue());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }

        Secret secret = SecretDTO.fromDTO(secretDTO);
        secret.setId(null);
        secret.setSecretValue(encryptedValue);
        secret.setRepository(repository.get());

        secretRepository.save(secret);

        return ResponseEntity.noContent().build();
    }

    @PutMapping("/")
    public ResponseEntity<Void> updateSecret(@RequestParam Long repositoryId, @RequestBody SecretDTO secretDTO) {
        Optional<Repository> repository = repositoryRepository.findById(repositoryId);
        if (repository.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Optional<Secret> potentialSecret = secretRepository.findByRepository_IdAndSecretKey(repositoryId, secretDTO.getSecretKey());
        if (potentialSecret.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        String encryptedValue;
        try {
            encryptedValue = EncryptionUtil.encrypt(secretDTO.getSecretValue());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }

        Secret secret = potentialSecret.get();
        secret.setSecretValue(encryptedValue);

        secretRepository.save(secret);

        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/")
    public ResponseEntity<Void> deleteSecret(@RequestParam Long repositoryId, @RequestParam String secretKey) {
        Optional<Repository> repository = repositoryRepository.findById(repositoryId);
        if (repository.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Optional<Secret> potentialSecret = secretRepository.findByRepository_IdAndSecretKey(repositoryId, secretKey);
        if (potentialSecret.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        secretRepository.findByRepository_IdAndSecretKey(repositoryId, secretKey)
                .ifPresentOrElse(
                        secret -> secretRepository.delete(secret),
                        () -> {
                            throw new SecretNotFoundException("Secret with key " + secretKey + " not found for repository with id " + repositoryId);
                        }
                );

        return ResponseEntity.noContent().build();
    }
}
