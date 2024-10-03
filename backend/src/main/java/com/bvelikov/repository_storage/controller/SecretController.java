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

    @PostMapping("")
    public ResponseEntity<SecretDTO> saveSecret(@RequestBody SecretDTO secretDTO) {
        Optional<Repository> repository = repositoryRepository.findById(secretDTO.getRepositoryId());
        if (repository.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Optional<Secret> potentialSecret = secretRepository.findByRepository_IdAndSecretKey(secretDTO.getRepositoryId(), secretDTO.getSecretKey());
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

        SecretDTO responseSecretDTO = SecretDTO.toDTO(secret);
        responseSecretDTO.setSecretValue(null);

        return ResponseEntity.ok(responseSecretDTO);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SecretDTO> updateSecret(@PathVariable Long id,  @RequestBody SecretDTO secretDTO) {
        Optional<Repository> repository = repositoryRepository.findById(secretDTO.getRepositoryId());
        if (repository.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Optional<Secret> potentialSecret = secretRepository.findById(id);
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

        SecretDTO responseSecretDTO = SecretDTO.toDTO(secret);
        responseSecretDTO.setSecretValue(null);

        return ResponseEntity.ok(responseSecretDTO);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSecret(@PathVariable Long id) {
        Optional<Secret> potentialSecret = secretRepository.findById(id);
        if (potentialSecret.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        secretRepository.delete(potentialSecret.get());

        return ResponseEntity.noContent().build();
    }
}
