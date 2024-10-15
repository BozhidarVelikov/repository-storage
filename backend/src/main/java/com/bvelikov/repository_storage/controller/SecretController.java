package com.bvelikov.repository_storage.controller;

import com.bvelikov.repository_storage.dto.SecretDTO;
import com.bvelikov.repository_storage.service.SecretService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController()
@RequestMapping("/api/secret")
public class SecretController {

    @Autowired
    private SecretService secretService;

    @GetMapping("/list")
    public ResponseEntity<List<SecretDTO>> getAllSecrets() {
        return secretService.getAllSecrets();
    }

    @PostMapping("")
    public ResponseEntity<SecretDTO> saveSecret(@RequestBody SecretDTO secretDTO) {
        return secretService.saveSecret(secretDTO);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SecretDTO> updateSecret(@PathVariable Long id,  @RequestBody SecretDTO secretDTO) {
        return secretService.updateSecret(id, secretDTO);
    }

    @PutMapping("/addToRepository/{id}")
    public ResponseEntity<SecretDTO> addSecretToRepository(@PathVariable Long id, @RequestParam Long repositoryId) {
        return secretService.addSecretToRepository(id, repositoryId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSecret(@PathVariable Long id, @RequestParam Long repositoryId) {
        return secretService.deleteSecret(id, repositoryId);
    }
}
