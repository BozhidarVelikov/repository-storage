package com.bvelikov.repository_storage.controller;

import com.bvelikov.repository_storage.dto.RepositoryDTO;
import com.bvelikov.repository_storage.exception.RepositoryNotFoundException;
import com.bvelikov.repository_storage.model.Repository;
import com.bvelikov.repository_storage.repository.RepositoryRepository;
import com.bvelikov.repository_storage.repository.SecretRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController()
@RequestMapping("/api/repository")
public class RepositoryController {
    @Autowired
    private RepositoryRepository repositoryRepository;

    @Autowired
    private SecretRepository secretRepository;

    @GetMapping("/list")
    public List<RepositoryDTO> getAllRepositories() {
        List<Repository> repositories = repositoryRepository.findAll();

        List<RepositoryDTO> dtos = new ArrayList<>();
        repositories.forEach(repository -> {
            dtos.add(RepositoryDTO.toDTO(repository));
        });

        return dtos;
    }

    @GetMapping("/{id}")
    public RepositoryDTO getRepositoryById(@PathVariable Long id) {
        Repository repository = repositoryRepository.findById(id)
                .orElseThrow(() -> new RepositoryNotFoundException("Repository not found with id: " + id));

        return RepositoryDTO.toDTO(repository);
    }

    @PostMapping("")
    public RepositoryDTO saveRepository(@RequestBody RepositoryDTO repositoryDTO) {
        Repository repository = RepositoryDTO.fromDTO(repositoryDTO);
        repository.setId(null);

        repository = repositoryRepository.save(repository);

        return RepositoryDTO.toDTO(repository);
    }

    @PutMapping("/{id}")
    public RepositoryDTO updateRepository(@PathVariable Long id, @RequestBody RepositoryDTO repositoryDTO) {
        Repository repository = repositoryRepository.findById(id)
                .map(existingRepository -> {
                    existingRepository.setUrl(repositoryDTO.getUrl());
                    return repositoryRepository.save(existingRepository);
                })
                .orElseThrow(() -> new RepositoryNotFoundException("Repository not found with id: " + id));

        return RepositoryDTO.toDTO(repository);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRepository(@PathVariable Long id) {
        secretRepository.findAllByRepository_Id(id).forEach(secret -> {
            secretRepository.delete(secret);
        });

        repositoryRepository.deleteById(id);

        return ResponseEntity.noContent().build();
    }
}
