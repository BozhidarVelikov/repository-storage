package com.bvelikov.repository_storage.controller;

import com.bvelikov.repository_storage.dto.RepositoryDTO;
import com.bvelikov.repository_storage.model.Repository;
import com.bvelikov.repository_storage.repository.RepositoryRepository;
import com.bvelikov.repository_storage.repository.SecretRepository;
import com.bvelikov.repository_storage.security.encryption.EncryptionUtil;
import com.bvelikov.repository_storage.service.SecretService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

@RestController()
@RequestMapping("/api/repository")
public class RepositoryController {
    private final RestTemplate restTemplate = new RestTemplate();

    @Autowired
    private RepositoryRepository repositoryRepository;

    @Autowired
    private SecretRepository secretRepository;

    @Autowired
    private SecretService secretService;

    /**
     * A method that lists all repositories.
     *
     * @return A list containing all repositories in the database.
     */
    @GetMapping("/list")
    public List<RepositoryDTO> getAllRepositories() {
        List<Repository> repositories = repositoryRepository.findAll();

        List<RepositoryDTO> dtos = new ArrayList<>();
        repositories.forEach(repository -> dtos.add(RepositoryDTO.toDTO(repository)));

        return dtos;
    }

    /**
     * A method that saves a repository into the database. This method does not save any secrets passed
     * in the repository.
     *
     * @param repositoryDTO the repository details, passed in the request's body
     * @return Response entity with response code 200 and body containing the newly saved secret,
     *         response entity with response code 400 and empty body if a repository with this url already exists.
     */
    @PostMapping("")
    public ResponseEntity<RepositoryDTO> saveRepository(@RequestBody RepositoryDTO repositoryDTO) {
        try {
            Repository repository = RepositoryDTO.fromDTO(repositoryDTO);
            repository.setSecrets(new HashSet<>());
            repository.setId(null);

            repository = repositoryRepository.save(repository);

            return ResponseEntity.ok(RepositoryDTO.toDTO(repository));
        } catch(DataIntegrityViolationException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * A method that verifies if a repository's secrets are correct.
     *
     * @param id the repository id, passed in the request path
     * @return Response entity with response code 200 if the secrets are correct,
     *         response entity with response code 400 if the repository type is not supported,
     *         response entity with response code 404 if the repository is not found,
     *         response entity with response code of the response from the repository provider if the secret is wrong.
     */
    @GetMapping("/verify/{id}")
    public ResponseEntity<Void> verifyRepository(@PathVariable Long id) {
        Optional<Repository> potentialRepository = repositoryRepository.findById(id);
        if (potentialRepository.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Repository repository = potentialRepository.get();
        switch (repository.getRepositoryType()) {
            case GIT_HUB:
                return verifyGitHubRepository(repository);
            case GIT_LAB:
            case BIT_BUCKET:
            default:
                return ResponseEntity.badRequest().build();
        }
    }

    /**
     * A method that verifies if a GitHub repository.
     *
     * @param id the repository id, passed in the request path
     * @return Response entity with response code 200 if the secrets are correct,
     *         response entity with response code 400 if the repository type is not supported,
     *         response entity with response code 404 if the repository is not found,
     *         response entity with response code 503 if an error occurs while decrypting the secret,
     *         response entity with response code of the response from the repository provider if the secret is wrong.
     */
    private ResponseEntity<Void> verifyGitHubRepository(Repository repository) {
        if (repository.getSecrets().size() > 1) {
            return ResponseEntity.badRequest().build();
        }

        String ownerAndName = repository.getUrl().substring(repository.getUrl().indexOf("github.com/") + 11);
        String[] ownerAndNameSplit = ownerAndName.split("/", 2);

        String gitHubApiUrl = "https://api.github.com/repos/" + ownerAndNameSplit[0] + "/" + ownerAndNameSplit[1];

        HttpHeaders headers = new HttpHeaders();

        if (repository.getSecrets().size() == 1) {
            String token = repository.getSecrets().iterator().next().getSecretValue();
            try {
                token = EncryptionUtil.decrypt(token);
            } catch (Exception e) {
                return ResponseEntity.internalServerError().build();
            }

            headers.setBearerAuth(token);
        }

        HttpEntity<String> requestEntity = new HttpEntity<>(headers);

        try {
            // Make the API call to GitHub to validate the token
            ResponseEntity<String> response = restTemplate.exchange(
                    gitHubApiUrl, HttpMethod.GET, requestEntity, String.class);

            // If the response is OK (200), the token is valid
            if (response.getStatusCode().is2xxSuccessful()) {
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.status(response.getStatusCode()).build();
            }
        } catch (HttpClientErrorException e) {
            return ResponseEntity.status(e.getStatusCode()).build();
        }
    }

    /**
     * A method that updates a repository.
     *
     * @param id the repository's id, passed as a path variable
     * @param repositoryDTO the repository details, passed in the request's body
     * @return Response entity with response code 200 and body containing the updated repository,
     *         response entity with response code 404 if the repository does not exist.
     */
    @PutMapping("/{id}")
    public ResponseEntity<RepositoryDTO> updateRepository(@PathVariable Long id, @RequestBody RepositoryDTO repositoryDTO) {
        Optional<Repository> potentialRepository = repositoryRepository.findById(id);
        if (potentialRepository.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Repository repository = potentialRepository.get();
        repository.setUrl(repositoryDTO.getUrl());

        repositoryRepository.save(repository);

        return ResponseEntity.ok(RepositoryDTO.toDTO(repository));
    }

    /**
     * A method that deletes a repository. The method also deletes all secrets associated with the deleted repository.
     *
     * @param id the secret's id, passed as a path variable
     * @return Response entity with response code 204 if the repository is successfully deleted,
     *         response entity with response code 404 if the secret does not exist.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRepository(@PathVariable Long id) {
        Optional<Repository> potentialRepository = repositoryRepository.findById(id);
        if (potentialRepository.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        secretRepository.findByRepositories(potentialRepository.get())
                .forEach(secret -> {
                    ResponseEntity<Void> response = secretService.deleteSecret(secret.getId(), potentialRepository.get().getId());
                    if (response.getStatusCode() != HttpStatusCode.valueOf(204)) {
                        System.out.println("Error: " + response.getStatusCode());
                    } else {
                        System.out.println("Ok");
                    }
                });

        repositoryRepository.deleteById(id);

        return ResponseEntity.noContent().build();
    }
}
