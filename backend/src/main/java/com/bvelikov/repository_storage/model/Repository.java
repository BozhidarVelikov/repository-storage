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

    public RepositoryType getRepositoryType() {
        String actualUrl = url;
        if (actualUrl.startsWith("http://")) {
            actualUrl = actualUrl.substring(7);
        } else if (actualUrl.startsWith("https://")) {
            actualUrl = actualUrl.substring(8);
        } else if (actualUrl.startsWith("git@")) {
            // SSH
            actualUrl = actualUrl.substring(4);
        }

        if (actualUrl.startsWith("github.com")) {
            return RepositoryType.GIT_HUB;
        }

        if (actualUrl.startsWith("gitlab.com")) {
            return RepositoryType.GIT_LAB;
        }

        if (actualUrl.startsWith("bitbucket.org")) {
            return RepositoryType.BIT_BUCKET;
        }

        return null;
    }
}
