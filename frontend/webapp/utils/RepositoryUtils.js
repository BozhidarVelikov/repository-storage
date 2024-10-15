sap.ui.define([
    "sap/m/MessageBox",
    "ui5/repositorystorage/utils/Constants",
    "ui5/repositorystorage/utils/HttpUtils"
], (MessageBox, Constants, HttpUtils) => {
    "use strict";

    return {
        /**
         * A method to validate a repository.
         * 
         * Verifies the repository url is unique and each of its secrets have a unique key.
         * 
         * @public
         */
        validateRepository: function(repository, model) {
            if (repository.url === null || repository.url === "") {
                MessageBox.error("Url shouldn't be empty!");
                return false;
            }

            // Verify repository url
            var numberOfRepositoriesWithEditedUrl = 0;
            var repositories = model.getProperty(Constants.REPOSITORIES_PATH);
            repositories.forEach(repo => {
                if (repo.url === repository.url) {
                    numberOfRepositoriesWithEditedUrl++;
                }
            });

            if (numberOfRepositoriesWithEditedUrl > 1 || (repository.isNew && numberOfRepositoriesWithEditedUrl === 1)) {
                MessageBox.error("A repository with this url already exists!");
                return false;
            }

            // Verify secrets
            var allSecrets = model.getProperty(Constants.SECRETS_PATH);
            var secretErrors = new Set();
            repository.secrets.forEach((secret, index) => {
                if (secret.secretValue === null) {
                    if (secret.status === Constants.STATUS_CREATED) {
                        secret.secretValue = "";
                        model.setProperty(Constants.SELECTED_ITEM_PATH + "/secrets/" + index, secret);
                    }
                }

                if (secret.secretKey === null || secret.secretKey === "") {
                    secretErrors.add("Secrets with an empty key are not allowed!");
                }

                for (var i = index + 1; i < repository.secrets.length; i++) {
                    // Deleted secrets are not a duplicate since they will be deleted before adding the new value
                    if (secret.secretKey === repository.secrets[i].secretKey
                        && secret.status !== Constants.STATUS_DELETED 
                        && repository.secrets[i].status !== Constants.STATUS_DELETED) {
                        secretErrors.add("Duplicate secret key found: \"" + secret.secretKey + "\"!");
                    }
                }

                allSecrets.forEach(s => {
                    if (s.secretKey === secret.secretKey && secret.status === Constants.STATUS_CREATED) {
                        secretErrors.add("You alredy have a secret with key " + secret.secretKey + "!");
                    }
                });
            });

            if (secretErrors.size > 0) {
                let errorMessage = "Found the following errors:\n";
                for (const secretError of secretErrors.values()) {
                    errorMessage += " \u2022 " + secretError + "\n";
                }

                MessageBox.error(errorMessage);

                return false;
            }

            return true;
        },

        /**
         * A method to create a new repository.
         * 
         * Sends a POST requets to create a repository and after it gets a response,
         * sends a POST requets for each secret of the new repository.
         * 
         * @public
         */
        createNewRepository: async function(repository, model) {
            // Create repository, and then add its secrets.
            var success = true;

            // Create repository
            await HttpUtils.sendPostRequest(Constants.REPOSITORY_ENDPOINT_SAVE, repository)
            .then(data => {
                repository.id = data.id;
                repository.url = data.url;

                var repositories = model.getProperty(Constants.REPOSITORIES_PATH);
                repositories.push(repository);
                model.setProperty(Constants.REPOSITORIES_PATH, repositories);
            })
            .catch(_ => {
                success = false;
            });

            if (!success || repository.id == 0) {
                MessageBox.error("Failed to create repository!");
                return;
            }

            // Create secrets
            var allSecrets = model.getProperty(Constants.SECRETS_PATH);
            repository.secrets.forEach((secret, index) => {
                if (secret.secretValue === null) {
                    secret.secretValue = "";
                }

                // Update the repository id of the secret
                secret.repositoryId = repository.id;

                if (secret.status === Constants.STATUS_ADDED) {
                    HttpUtils.sendPutRequest(Constants.SECRET_ENDPOINT_ADD_TO_REPOSITORY.replace("{id}", secret.id).replace("{repositoryId}", secret.repositoryId), null)
                    .then(data => {
                        secret = data;
                        secret.secretValue = null;
                        secret.status = Constants.STATUS_NONE;
                        secret.isNew = false;

                        model.setProperty(Constants.SELECTED_ITEM_PATH + "/secrets/" + index, secret);
                    })
                    .catch(_ => {
                        MessageBox.show("Failed to add secret " + secret.secretKey + "!");

                        success = false;
                    });

                    return;
                }

                HttpUtils.sendPostRequest(Constants.SECRET_ENDPOINT_SAVE, secret)
                .then(data => {
                    secret = data;
                    secret.secretValue = null;
                    secret.status = Constants.STATUS_NONE;
                    secret.isNew = false;

                    model.setProperty(Constants.SELECTED_ITEM_PATH + "/secrets/" + index, secret);

                    var newSecret = Object.assign({}, secret);
                    newSecret.repositoryId = 0;
                    allSecrets.push(newSecret);
                })
                .catch(_ => {
                    MessageBox.error("Failed to create secret " + secret.secretKey + "!");

                    success = false;
                });

                model.setProperty(Constants.SECRETS_PATH, allSecrets);
            });
                
            if (success) {
                MessageBox.success("Repository created successfully!");
            } else {
                MessageBox.error("Repository created but an error occured while adding secrets!");
            }
        },

        /**
         * A method to update an existing repository.
         * 
         * Sends a DELETE requets to for each deleted secret in the repository.
         * After this, sends a PUT requets for each updated secret and
         * a POST request for each newly-created secret in the new repository.
         * Finally, sends a PUT request to update the repository url if needed.
         * 
         * @public
         */
        updateExistingRepository: async function(repository, originalRepository, model) {
            // Delete secrets first, in case user added secrets with keys that were just deleted.
            // After this, create new secrets and update old ones.
            // Finally, update the reposiroty url if needed.
            var success = true;

            // Delete secrets
            for (var i = 0; i < repository.secrets.length; i++) {
                var secret = repository.secrets[i];
                if (secret.status === Constants.STATUS_DELETED) {
                    await HttpUtils.sendDeleteRequest(Constants.SECRET_ENDPOINT_DELETE.replace("{id}", secret.id).replace("{repositoryId}", repository.id))
                    .then(_ => {
                        var selectedItemSecrets = model.getProperty(Constants.SELECTED_ITEM_PATH + "/secrets");
                        selectedItemSecrets.splice(i, 1);
                    })
                    .catch(_ => {
                        MessageBox.error("Failed to delete secret" + secret.secretKey + "!");

                        success = false;
                    });
                }
            };

            // Create and update secrets
            var allSecrets = model.getProperty(Constants.SECRETS_PATH);
            for (var index = 0; index < repository.secrets.length; index++) {
                var secret = repository.secrets[index];

                if (secret.secretValue === null && secret.status !== Constants.STATUS_ADDED) {
                    return;
                }

                if (secret.status === Constants.STATUS_CREATED) {
                    await HttpUtils.sendPostRequest(Constants.SECRET_ENDPOINT_SAVE, secret)
                    .then(data => {
                        secret = data;
                        secret.secretValue = null;
                        secret.status = Constants.STATUS_NONE;
                        secret.isNew = false;

                        model.setProperty(Constants.SELECTED_ITEM_PATH + "/secrets/" + index, secret);

                        var newSecret = Object.assign({}, secret);
                        newSecret.repositoryId = 0;
                        allSecrets.push(newSecret);
                    })
                    .catch(_ => {
                        MessageBox.error("Failed to create secret " + secret.secretKey + "!");

                        success = false;
                    });
                } else if (secret.status === Constants.STATUS_MODIFIED) {
                    await HttpUtils.sendPutRequest(Constants.SECRET_ENDPOINT_UPDATE.replace("{id}", secret.id), secret)
                    .then(data => {
                        secret = data;
                        secret.secretValue = null;
                        secret.status = Constants.STATUS_NONE;
                        secret.isNew = false;

                        model.setProperty(Constants.SELECTED_ITEM_PATH + "/secrets/" + index, secret);
                    })
                    .catch(_ => {
                        MessageBox.error("Failed to update secret " + secret.secretKey + "!");

                        success = false;
                    });
                } else if (secret.status === Constants.STATUS_ADDED) {
                    await HttpUtils.sendPutRequest(Constants.SECRET_ENDPOINT_ADD_TO_REPOSITORY.replace("{id}", secret.id).replace("{repositoryId}", secret.repositoryId), null)
                    .then(data => {
                        secret = data;
                        secret.secretValue = null;
                        secret.status = Constants.STATUS_NONE;
                        secret.isNew = false;

                        model.setProperty(Constants.SELECTED_ITEM_PATH + "/secrets/" + index, secret);
                    })
                    .catch(_ => {
                        MessageBox.show("Failed to add secret " + secret.secretKey + "!");

                        success = false;
                    });
                }
            }

            // Update repository
            if (repository.url !== originalRepository.url) {
                HttpUtils.sendPutRequest(Constants.REPOSITORY_ENDPOINT_UPDATE.replace("{id}", repository.id), repository)
                .then(data => {
                    repository.url = data.url;
                })
                .catch(_ => {
                    MessageBox.error("Failed to update repository " + secret.secretKey + "!");
                });
            }

            // Remove secrets that aren't used by any repository
            var allRepositories = model.getProperty(Constants.REPOSITORIES_PATH);
            var repositorySecretKeys = new Set();
            allRepositories.forEach(repo => {
                repo.secrets.forEach(secret => {
                    repositorySecretKeys.add(secret.secretKey);
                });
            });

            var filteredSecrets = allSecrets.filter(secret => repositorySecretKeys.has(secret.secretKey));

            model.setProperty(Constants.SECRETS_PATH, filteredSecrets);

            if (success) {
                MessageBox.success("Repository updated successfully!");
            } else {
                MessageBox.error("Failed to update repository!");
            }
        }
    }
});