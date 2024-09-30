package com.bvelikov.repository_storage.controller;

import com.bvelikov.repository_storage.dto.RepositoryDTO;
import com.bvelikov.repository_storage.exception.RepositoryNotFoundException;
import com.bvelikov.repository_storage.model.Repository;
import com.bvelikov.repository_storage.repository.RepositoryRepository;
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

    @GetMapping("/list")
    public List<RepositoryDTO> getAllRepositories() {
        List<Repository> repositories = repositoryRepository.findAll();

        List<RepositoryDTO> dtos = new ArrayList<>();
        repositories.forEach(repository -> {
            RepositoryDTO dto = new RepositoryDTO();
            dto.setId(repository.getId());
            dto.setUrl(repository.getUrl());

            dtos.add(dto);
        });

        return dtos;
    }

    @GetMapping("/{id}")
    public RepositoryDTO getRepositoryById(@PathVariable Long id) {
        Repository repository = repositoryRepository.findById(id)
                .orElseThrow(() -> new RepositoryNotFoundException("Repository not found with id: " + id));

        RepositoryDTO dto = new RepositoryDTO();
        dto.setId(repository.getId());
        dto.setUrl(repository.getUrl());

        return dto;
    }

    @PostMapping("/")
    public RepositoryDTO saveRepository(@RequestBody RepositoryDTO repositoryDTO) {
        Repository repository = new Repository();
        repository.setUrl(repositoryDTO.getUrl());

        Repository savedRepo = repositoryRepository.save(repository);
        repositoryDTO.setId(savedRepo.getId());

        return repositoryDTO;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRepository(@PathVariable Long id) {
        repositoryRepository.deleteById(id);

        return ResponseEntity.noContent().build();
    }
}
