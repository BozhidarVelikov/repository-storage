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

    /**
     * A method that verifies a secret's value.
     *
     * @param secretDTO the secret details, passed in the request's body
     * @return Response entity with response code 200 if the secret is successfully verified,
     *         response entity with response code 400 if the secret is not successfully verified,
     *         response entity with response code 404 if the secret or its repository do not exist.
     */
    @PostMapping("/verify")
    public ResponseEntity<Void> verifySecret(@RequestBody SecretDTO secretDTO) {
        Optional<Repository> repository = repositoryRepository.findById(secretDTO.getRepositoryId());
        if (repository.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Optional<Secret> potentialSecret = secretRepository.findByRepository_IdAndSecretKey(secretDTO.getRepositoryId(), secretDTO.getSecretKey());
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

    /**
     * A method that saves a secret into the database.
     *
     * @param secretDTO the secret details, passed in the request's body
     * @return Response entity with response code 200 and body containing the newly saved secret,
     *         response entity with response code 400 and empty body if a secret with this key is already present
     *         for this repository,
     *         response entity with response code 404 and empty body if the repository for this secret does not exist.
     */
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

    /**
     * A method that updates a secret.
     *
     * @param id the secret's id, passed as a path variable
     * @param secretDTO the secret details, passed in the request's body
     * @return Response entity with response code 200 and body containing the updated secret,
     *         response entity with response code 404 if the secret or its repository do not exist.
     */
    @PutMapping("/{id}")
    public ResponseEntity<SecretDTO> updateSecret(@PathVariable Long id,  @RequestBody SecretDTO secretDTO) {
        System.out.println("update");
        Optional<Repository> repository = repositoryRepository.findById(secretDTO.getRepositoryId());
        if (repository.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Optional<Secret> potentialSecret = secretRepository.findById(id);
        if (potentialSecret.isEmpty()) {
            return ResponseEntity.notFound().build();
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

    /**
     * A method that deletes a secret.
     *
     * @param id the secret's id, passed as a path variable
     * @return Response entity with response code 204 if the secret is successfully deleted,
     *         response entity with response code 404 if the secret does not exist.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSecret(@PathVariable Long id) {
        Optional<Secret> potentialSecret = secretRepository.findById(id);
        if (potentialSecret.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        secretRepository.delete(potentialSecret.get());

        return ResponseEntity.noContent().build();
    }
}
