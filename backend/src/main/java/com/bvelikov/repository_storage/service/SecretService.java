package com.bvelikov.repository_storage.service;

import com.bvelikov.repository_storage.dto.SecretDTO;
import com.bvelikov.repository_storage.model.Repository;
import com.bvelikov.repository_storage.model.Secret;
import com.bvelikov.repository_storage.repository.RepositoryRepository;
import com.bvelikov.repository_storage.repository.SecretRepository;
import com.bvelikov.repository_storage.security.encryption.EncryptionUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

@Service
public class SecretService {
    @Autowired
    private SecretRepository secretRepository;

    @Autowired
    private RepositoryRepository repositoryRepository;

    /**
     * A method that lists all secrets.
     *
     * @return A response entity of a list containing all secrets in the database.
     */
    @GetMapping("/list")
    public ResponseEntity<List<SecretDTO>> getAllSecrets() {
        List<Secret> secrets = secretRepository.findAll();

        List<SecretDTO> dtos = new ArrayList<>();
        secrets.forEach(secret -> dtos.add(SecretDTO.toDTO(secret, 0L)));

        return ResponseEntity.ok(dtos);
    }

    /**
     * A method that verifies a secret's value.
     *
     * @param secretDTO the secret details, passed in the request's body
     * @return Response entity with response code 200 if the secret is successfully verified,
     *         response entity with response code 400 if the secret is not successfully verified,
     *         response entity with response code 404 if the secret or its repository do not exist.
     */
    public ResponseEntity<Void> verifySecret(SecretDTO secretDTO) {
        Optional<Repository> repository = repositoryRepository.findById(secretDTO.getRepositoryId());
        if (repository.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Optional<Secret> potentialSecret = secretRepository.findByRepositoriesInAndSecretKey(List.of(repository.get()), secretDTO.getSecretKey());
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
    public ResponseEntity<SecretDTO> saveSecret(SecretDTO secretDTO) {
        Optional<Repository> potentialRepository = repositoryRepository.findById(secretDTO.getRepositoryId());
        if (potentialRepository.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Optional<Secret> potentialSecret = secretRepository.findByRepositoriesInAndSecretKey(List.of(potentialRepository.get()), secretDTO.getSecretKey());
        if (potentialSecret.isPresent()) {
            return ResponseEntity.badRequest().build();
        }

        String encryptedValue;
        try {
            encryptedValue = EncryptionUtil.encrypt(secretDTO.getSecretValue());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }

        Repository repository = potentialRepository.get();

        Secret secret = SecretDTO.fromDTO(secretDTO);
        secret.setId(null);
        secret.setSecretValue(encryptedValue);
        secret.setRepositories(new HashSet<>());
        secret.getRepositories().add(repository);
        if (repository.getSecrets() == null) {
            repository.setSecrets(new HashSet<>());
        }
        repository.getSecrets().add(secret);

        secretRepository.save(secret);
        repositoryRepository.save(repository);

        SecretDTO responseSecretDTO = SecretDTO.toDTO(secret, repository.getId());
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
    public ResponseEntity<SecretDTO> updateSecret(Long id, SecretDTO secretDTO) {
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

        SecretDTO responseSecretDTO = SecretDTO.toDTO(secret, repository.get().getId());
        responseSecretDTO.setSecretValue(null);

        return ResponseEntity.ok(responseSecretDTO);
    }

    /**
     * A method that adds a secret to a repository.
     *
     * @param id the secret's id, passed as a path variable
     * @return TODO: Fill in
     */
    public ResponseEntity<SecretDTO> addSecretToRepository(Long id, Long repositoryId) {
        Optional<Repository> potentialRepository = repositoryRepository.findById(repositoryId);
        if (potentialRepository.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Optional<Secret> potentialSecret = secretRepository.findById(id);
        if (potentialSecret.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Secret secret = potentialSecret.get();
        secret.getRepositories().add(potentialRepository.get());
        secretRepository.save(secret);

        Repository repository = potentialRepository.get();
        repository.getSecrets().add(potentialSecret.get());
        repositoryRepository.save(repository);

        SecretDTO secretDTO = SecretDTO.toDTO(secret, repositoryId);

        return ResponseEntity.ok(secretDTO);
    }

    /**
     * A method that deletes a secret from a repository.
     *
     * @param id the secret's id, passed as a path variable
     * @return Response entity with response code 204 if the secret is successfully deleted,
     *         response entity with response code 404 if the secret does not exist.
     */
    public ResponseEntity<Void> deleteSecret(Long id, Long repositoryId) {
        Optional<Repository> potentialRepository = repositoryRepository.findById(repositoryId);
        if (potentialRepository.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Optional<Secret> potentialSecret = secretRepository.findById(id);
        if (potentialSecret.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Secret secret = potentialSecret.get();
        Repository repository = potentialRepository.get();
        if (repository.getSecrets().contains(secret)) {
            // Delete from repository
            repository.getSecrets().remove(secret);
            secret.getRepositories().remove(repository);

            // If the secret is not used by any repository, delete it
            if (secret.getRepositories().isEmpty()) {
                secretRepository.delete(secret);
            }

            repositoryRepository.save(repository);
        }

        return ResponseEntity.noContent().build();
    }
}
