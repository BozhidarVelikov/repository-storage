package com.bvelikov.repository_storage.controller;

import com.bvelikov.repository_storage.dto.SecretDTO;
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

        Secret secret = secretRepository.findByRepositoryAndSecretKey(repository.get(), secretDTO.getSecretKey());

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

        String encryptedValue;
        try {
            encryptedValue = EncryptionUtil.encrypt(secretDTO.getSecretValue());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }

        Secret secret = new Secret();
        secret.setSecretKey(secretDTO.getSecretKey());
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

        String encryptedValue;
        try {
            encryptedValue = EncryptionUtil.encrypt(secretDTO.getSecretValue());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }

        Secret secret = secretRepository.findByRepositoryAndSecretKey(repository.get(), secretDTO.getSecretKey());
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

        Secret secret = secretRepository.findByRepositoryAndSecretKey(repository.get(), secretKey);
        secretRepository.delete(secret);

        return ResponseEntity.noContent().build();
    }
}
