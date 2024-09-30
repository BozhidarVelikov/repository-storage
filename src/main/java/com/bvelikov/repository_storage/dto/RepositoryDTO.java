package com.bvelikov.repository_storage.dto;

import com.bvelikov.repository_storage.dto.enums.RepositoryType;

public class RepositoryDTO {
    private Long id;
    private String url;
    private RepositoryType type;

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

    public RepositoryType getType() {
        return type;
    }

    public void setType(RepositoryType type) {
        this.type = type;
    }
}
