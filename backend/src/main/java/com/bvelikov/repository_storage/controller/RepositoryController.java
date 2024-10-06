package com.bvelikov.repository_storage.controller;

import com.bvelikov.repository_storage.dto.RepositoryDTO;
import com.bvelikov.repository_storage.model.Repository;
import com.bvelikov.repository_storage.repository.RepositoryRepository;
import com.bvelikov.repository_storage.repository.SecretRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

@RestController()
@RequestMapping("/api/repository")
public class RepositoryController {
    @Autowired
    private RepositoryRepository repositoryRepository;

    @Autowired
    private SecretRepository secretRepository;

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

        secretRepository.findAllByRepository_Id(id).forEach(secret -> secretRepository.delete(secret));

        repositoryRepository.deleteById(id);

        return ResponseEntity.noContent().build();
    }
}
