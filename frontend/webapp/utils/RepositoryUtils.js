sap.ui.define([
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "ui5/repositorystorage/utils/Constants",
    "ui5/repositorystorage/utils/HttpUtils"
], (MessageBox, MessageToast, Constants, HttpUtils) => {
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

                MessageToast.show("Repository created successfully!");
            })
            .catch(_ => {
                success = false;
            });

            if (!success || repository.id == 0) {
                MessageBox.error("Failed to create repository!");
                return;
            }

            // Create secrets
            repository.secrets.forEach((secret, index) => {
                if (secret.secretValue === null) {
                    secret.secretValue = "";
                }

                // Update the repository id of the secret
                secret.repositoryId = repository.id;

                HttpUtils.sendPostRequest(Constants.SECRET_ENDPOINT_SAVE, secret)
                .then(data => {
                    secret = data;
                    secret.secretValue = null;
                    secret.status = Constants.STATUS_NONE;
                    secret.isNew = false;

                    model.setProperty(Constants.SELECTED_ITEM_PATH + "/secrets/" + index, secret);

                    MessageToast.show("Secret created successfully!");
                })
                .catch(_ => {
                    MessageBox.error("Failed to create secret " + secret.secretKey + "!");

                    success = false;
                });
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
                    await HttpUtils.sendDeleteRequest(Constants.SECRET_ENDPOINT_DELETE.replace("{id}", secret.id))
                    .then(_ => {
                        var selectedItemSecrets = model.getProperty(Constants.SELECTED_ITEM_PATH + "/secrets");
                        selectedItemSecrets.splice(i, 1);

                        MessageToast.show("Secret deleted successfully!");
                    })
                    .catch(_ => {
                        MessageBox.error("Failed to delete secret" + secret.secretKey + "!");

                        success = false;
                    });
                }
            };

            // Create and update secrets
            repository.secrets.forEach((secret, index) => {
                if (secret.secretValue === null) {
                    return;
                }

                if (secret.status === Constants.STATUS_CREATED) {
                    HttpUtils.sendPostRequest(Constants.SECRET_ENDPOINT_SAVE, secret)
                    .then(data => {
                        secret = data;
                        secret.secretValue = null;
                        secret.status = Constants.STATUS_NONE;
                        secret.isNew = false;

                        model.setProperty(Constants.SELECTED_ITEM_PATH + "/secrets/" + index, secret);

                        MessageToast.show("Secret created successfully!");
                    })
                    .catch(_ => {
                        MessageBox.error("Failed to create secret " + secret.secretKey + "!");

                        success = false;
                    });
                } else if (secret.status === Constants.STATUS_MODIFIED) {
                    HttpUtils.sendPutRequest(Constants.SECRET_ENDPOINT_UPDATE.replace("{id}", secret.id), secret)
                    .then(data => {
                        secret = data;
                        secret.secretValue = null;
                        secret.status = Constants.STATUS_NONE;
                        secret.isNew = false;

                        model.setProperty(Constants.SELECTED_ITEM_PATH + "/secrets/" + index, secret);

                        MessageToast.show("Secret updated successfully!");
                    })
                    .catch(_ => {
                        MessageBox.error("Failed to update secret " + secret.secretKey + "!");

                        success = false;
                    });
                }
            });

            // Update repository
            if (repository.url !== originalRepository.url) {
                HttpUtils.sendPutRequest(Constants.REPOSITORY_ENDPOINT_UPDATE.replace("{id}", repository.id), repository)
                .then(data => {
                    repository.url = data.url;

                    MessageToast.show("Repository updated successfully!");
                })
                .catch(_ => {
                    MessageBox.error("Failed to update repository " + secret.secretKey + "!");
                });
            }

            if (success) {
                MessageBox.success("Repository updated successfully!");
            } else {
                MessageBox.error("Failed to update repository!");
            }
        }
    }
});