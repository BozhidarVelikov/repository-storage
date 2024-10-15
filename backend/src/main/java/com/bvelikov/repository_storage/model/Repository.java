package com.bvelikov.repository_storage.model;

import jakarta.persistence.*;

import java.util.Set;

@Entity
@Table(name = "repositories")
public class Repository {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String url;

    @ManyToMany
    @JoinTable(
            name = "repository_secrets",
            joinColumns = @JoinColumn(name = "repository_id"),
            inverseJoinColumns = @JoinColumn(name = "secret_id")
    )
    private Set<Secret> secrets;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public Set<Secret> getSecrets() {
        return secrets;
    }

    public void setSecrets(Set<Secret> secrets) {
        this.secrets = secrets;
    }
}
