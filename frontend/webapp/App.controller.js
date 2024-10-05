sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "./utils/HttpUtils"
], (Controller, JSONModel, MessageBox, MessageToast, HttpUtils) => {
    "use strict";

    // Model paths
    const repositoriesPath = "/repositories";
    const selectedItemPath = "/selectedItem";
    const originalItemPath = "/originalItem";
    const selectedRepositoryIdPath = "/selectedRepositoryId";
    const selectedKeyIdPath = "/selectedKeyId";

    const editDialogId = "editDialog";
    const verifyDialogId = "verifyDialog";
    const verifyDialogSecretValueInputId = "verifyDialogSecretValueInput";

    // Urls used for fetching data
    const rootUrl = "http://127.0.0.1:8080"; // I couldn't figure out how to use an environment variable

    const repositoryEndpoint = rootUrl + "/api/repository";
    const repositoryEndpointList = repositoryEndpoint + "/list";
    const repositoryEndpointSave = repositoryEndpoint;
    const repositoryEndpointUpdate = repositoryEndpoint + "/{id}";
    const repositoryEndpointDelete = repositoryEndpoint + "/{id}";

    const secretEndpoint = rootUrl + "/api/secret";
    const secretEndpointVerify = secretEndpoint + "/verify";
    const secretEndpointSave = secretEndpoint;
    const secretEndpointUpdate = secretEndpoint + "/{id}";
    const secretEndpointDelete = secretEndpoint + "/{id}";

    // Secret statuses
    const statusNone = "None";
    const statusCreated = "Created";
    const statusModified = "Modified";
    const statusDeleted = "Deleted";

    return Controller.extend("ui5.repositorystorage.App", {
        onInit: function () {
            var model = new JSONModel({
                repositories: [],
                selectedItem: {},
                originalItem: {},
                selectedRepositoryId: null,
                selectedKeyId: null
            });

            // Load repository data from endpoint
            HttpUtils.sendGetRequest(repositoryEndpointList)
            .then(data => {
                data.forEach(repository => {
                    repository.secrets.forEach((secret) => {
                        secret.status = statusNone;
                        secret.isNew = false;
                    });
                    repository.isNew = false;
                });
                model.setProperty(repositoriesPath, data);

                this.resetSelectedIds(model, data);
            })
            .catch(error => {
                console.log(error);
                MessageBox.error("Failed to fetch repositories!");
            });

            this.getView().setModel(model);
        },

        resetSelectedIds: function(model, repositories) {
            if (repositories.length > 0) {
                model.setProperty(selectedRepositoryIdPath, repositories[0].id);

                if (repositories[0].secrets.length > 0) {
                    model.setProperty(selectedKeyIdPath, repositories[0].secrets[0].id);
                } else {
                    model.setProperty(selectedKeyIdPath, null);
                }
            } else {
                model.setProperty(selectedRepositoryIdPath, null);
                model.setProperty(selectedKeyIdPath, null);
            }
        },

        onVerifySecretButtonPress: function() {
            var model = this.getView().getModel();
            var repositories = model.getProperty(repositoriesPath);
            this.resetSelectedIds(model, repositories);

            var selectedItem;
            if (repositories.length > 0) {
                selectedItem = repositories[0];
            } else {
                selectedItem = null;
            }

            model.setProperty(selectedItemPath, selectedItem);

            var secretValueInput = this.byId(verifyDialogSecretValueInputId);
            secretValueInput.setValue("");

            var dialog = this.byId(verifyDialogId);
            dialog.open();
        },

        onRepositoryChange: function(event) {
            var model = this.getView().getModel();
            var repositories = model.getProperty(repositoriesPath);
            var selectedKey = event.getParameter("selectedItem").getKey();
            
            if (repositories.length > 0) {
                for (var i = 0; i < repositories.length; i++) {
                    if (repositories[i].id == selectedKey) {
                        model.setProperty(selectedItemPath, repositories[i]);

                        if (repositories[i].secrets.length > 0) {
                            model.setProperty(selectedKeyIdPath, repositories[i].secrets[0].id);
                        } else {
                            model.setProperty(selectedKeyIdPath, null);
                        }

                        break;
                    }
                }
            } else {
                model.setProperty(selectedKeyIdPath, null);
            }
        },

        onVerifySecretDialogVerifyPress: function() {
            var model = this.getView().getModel();
            var selectedRepository = model.getProperty(selectedItemPath);
            var selectedKeyId = model.getProperty(selectedKeyIdPath);
            var enteredSecretValue = this.byId(verifyDialogSecretValueInputId).getValue();

            if (selectedRepository === null) {
                MessageBox.error("Please choose a repository!");
                return;
            }

            if (selectedKeyId === null) {
                MessageBox.error("Please choose a secret!");
                return;
            }

            for (var i = 0; i < selectedRepository.secrets.length; i++) {
                if (selectedRepository.secrets[i].id == selectedKeyId) {
                    var selectedSecretCopy = Object.assign(selectedRepository.secrets[i]);
                    selectedSecretCopy.secretValue = enteredSecretValue;

                    fetch(secretEndpointVerify, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(selectedSecretCopy)
                    })
                    .then(response => {
                        if (response.ok) {
                            MessageBox.success("Secret value is correct!");
                        } else {
                            MessageBox.error("Secret value is wrong!");
                        }
                    })
                    .catch(error => {
                        console.log(error);
                        MessageBox.show("An error occurred while verifying secret!");
                    });

                    break;
                }
            }
        },

        onVerifySecretDialogCancelPress: function (event) {
            var dialog = this.byId(verifyDialogId);
            dialog.close();
        },

        onRepositoryAddButtonPress: function () {
            var model = this.getView().getModel();

            var newRepository = {
                id: 0,
                url: "",
                secrets: [],
                isNew: true
            }

            model.setProperty(selectedItemPath, newRepository);

            var dialog = this.byId(editDialogId);
            dialog.open();
        },

        onRepostiryTableEditRowPress: function (event) {
            var model = this.getView().getModel();
            var columnListItem = event.getSource().getParent().getParent();
            var repositoryModelPath = columnListItem.getBindingContext().getPath();
            var repositoryItem = model.getProperty(repositoryModelPath);

            model.setProperty(selectedItemPath, repositoryItem);

            // Copy the original repository and each secret in it
            var originalItem = Object.assign({}, repositoryItem);
            var secrets = [];
            repositoryItem.secrets.forEach(secret => {
                secrets.push(Object.assign({}, secret));
            });
            originalItem.secrets = secrets;
            model.setProperty(originalItemPath, originalItem);

            var dialog = this.byId(editDialogId);
            dialog.open();
        },

        onRepostiryTableDeleteRowPress: function (event) {
            var model = this.getView().getModel();
            var columnListItem = event.getSource().getParent().getParent();
            var repositoryModelPath = columnListItem.getBindingContext().getPath();
            var repositoryItem = model.getProperty(repositoryModelPath);

            HttpUtils.sendDeleteRequest(repositoryEndpointDelete.replace("{id}", repositoryItem.id))
            .then(_ => {
                // Repository is located at /repositories/<index>
                var itemIndex = parseInt(repositoryModelPath.split("/")[2]);

                // Remove repository from model
                var repositories = model.getProperty(repositoriesPath);
                repositories.splice(itemIndex, 1);

                model.setProperty(repositoriesPath, repositories);

                MessageToast.show("Repository deleted successfully!");
            })
            .catch(_ => {
                MessageBox.error("Failed to delete repository!");
            });
        },

        validateRepository: function(repository, model) {
            // Verify repository url
            var numberOfRepositoriesWithEditedUrl = 0;
            var repositories = model.getProperty(repositoriesPath);
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
                    if (secret.status === statusCreated) {
                        secret.secretValue = "";
                        model.setProperty(selectedItemPath + "/secrets/" + index, secret);
                    }
                }

                if (secret.secretKey === null || secret.secretKey === "") {
                    secretErrors.add("Secrets with an empty key are not allowed!");
                }

                for (var i = index + 1; i < repository.secrets.length; i++) {
                    // Deleted secrets are not a duplicate since they will be deleted before adding the new value
                    if (secret.secretKey === repository.secrets[i].secretKey
                        && secret.status !== statusDeleted 
                        && repository.secrets[i].status !== statusDeleted) {
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

        createNewRepository: async function(repository, model) {
            // Create repository, and then add its secrets.
            var success = true;

            // Create repository
            await HttpUtils.sendPostRequest(repositoryEndpointSave, repository)
            .then(data => {
                repository.id = data.id;
                repository.url = data.url;

                var repositories = model.getProperty(repositoriesPath);
                repositories.push(repository);
                model.setProperty(repositoriesPath, repositories);

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

                HttpUtils.sendPostRequest(secretEndpointSave, secret)
                .then(data => {
                    secret = data;
                    secret.secretValue = null;
                    secret.status = statusNone;
                    secret.isNew = false;

                    model.setProperty(selectedItemPath + "/secrets/" + index, secret);

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

        updateExistingRepository: async function(repository, originalRepository, model) {
            // Delete secrets first, in case user added secrets with keys that were just deleted.
            // After this, create new secrets and update old ones.
            // Finally, update the reposiroty url if needed.
            var success = true;

            // Delete secrets
            for (var i = 0; i < repository.secrets.length; i++) {
                var secret = repository.secrets[i];
                if (secret.status === statusDeleted) {
                    await HttpUtils.sendDeleteRequest(secretEndpointDelete.replace("{id}", secret.id))
                    .then(_ => {
                        var selectedItemSecrets = model.getProperty(selectedItemPath + "/secrets");
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

                if (secret.status === statusCreated) {
                    HttpUtils.sendPostRequest(secretEndpointSave, secret)
                    .then(data => {
                        secret = data;
                        secret.secretValue = null;
                        secret.status = statusNone;
                        secret.isNew = false;

                        model.setProperty(selectedItemPath + "/secrets/" + index, secret);

                        MessageToast.show("Secret created successfully!");
                    })
                    .catch(_ => {
                        MessageBox.error("Failed to create secret " + secret.secretKey + "!");

                        success = false;
                    });
                } else if (secret.status === statusModified) {
                    HttpUtils.sendPutRequest(secretEndpointUpdate.replace("{id}", secret.id), secret)
                    .then(data => {
                        secret = data;
                        secret.secretValue = null;
                        secret.status = statusNone;
                        secret.isNew = false;

                        model.setProperty(selectedItemPath + "/secrets/" + index, secret);

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
                HttpUtils.sendPutRequest(repositoryEndpointUpdate.replace("{id}", repository.id), repository)
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
        },

        onEditDialogSavePress: async function (event) {
            var model = this.getView().getModel();
            var originalRepository = model.getProperty(originalItemPath);
            var repository = model.getProperty(selectedItemPath);

            if (!this.validateRepository(repository, model)) {
                return;
            }

            if (repository.isNew) {
                await this.createNewRepository(repository, model);
            } else {
                await this.updateExistingRepository(repository, originalRepository, model);
            }

            model.setProperty(selectedItemPath, repository);

            var dialog = this.byId(editDialogId);
            dialog.close();
        },

        onEditDialogCancelPress: function (event) {
            var model = this.getView().getModel();
            var originalItem = model.getProperty(originalItemPath);

            // Revert changes back
            model.setProperty(selectedItemPath + "/url", originalItem.url);
            model.setProperty(selectedItemPath + "/secrets", originalItem.secrets);

            // NOTE: This also works, in a real project, I will use the one with the better performance
            // var dialog = event.getSource().getParent().getParent();
            var dialog = this.byId(editDialogId);
            dialog.close();
        },

        onEditDialogEscapePress: function(promise) {
            this.onEditDialogCancelPress();

            promise.resolve();
        },

        onSecretAddButtonPress: function () {
            var model = this.getView().getModel();
            var selectedRepository = model.getProperty(selectedItemPath);
            var selectedRepositorySecrets = model.getProperty(
                selectedItemPath + "/secrets"
            );

            var newSecret = {
                id: 0,
                secretKey: "",
                secretValue: null,
                repositoryId: selectedRepository.id,
                status: statusCreated,
                isNew: true
            };

            selectedRepositorySecrets.push(newSecret);

            model.setProperty(selectedItemPath, selectedRepository);
        },

        onSecretKeyInputChange: function (event) {
            var model = this.getView().getModel();
            var input = event.getSource();
            var inputContext = input.getBindingContext();

            var newSecret = inputContext.getObject();
            newSecret.secretKey = event.getParameter("value");

            var selectedItemSecrets = model.getProperty(selectedItemPath + "/secrets");
            selectedItemSecrets.forEach(secret => {
                if (secret === newSecret) {
                    return;
                }

                if (secret.secretKey === newSecret.secretKey && secret.status !== statusDeleted) {
                    MessageBox.error("Secret with this key already exists!"); // TODO: Focus field after closing the popup
                }
            });
        },

        onSecretValueInputChange: function (event) {
            var model = this.getView().getModel();
            var input = event.getSource();
            var inputContext = input.getBindingContext();
            var secretModelPath = inputContext.getPath();

            // Item is located at /selectedItem/secrets/<index>
            var secretIndex = parseInt(secretModelPath.split("/")[3]);

            // Retrieve the secret item associated with the input
            var secret = inputContext.getObject();
            secret.secretValue = event.getParameter("value");
            secret.status = secret.status === statusCreated ? secret.status : statusModified;

            model.setProperty(selectedItemPath + "/secrets/" + secretIndex, secret);
        },

        onSecretDeleteRowPress: function (event) {
            var model = this.getView().getModel();
            var secretListItem = event.getSource().getParent();
            var secretModelPath = secretListItem.getBindingContext().getPath();

            var secret = model.getProperty(secretModelPath);
            if (secret.status === statusCreated) {
                // Item is located at /selectedItem/secrets/<index>
                var secretIndex = parseInt(secretModelPath.split("/")[3]);

                var selectedItemSecrets = model.getProperty(selectedItemPath + "/secrets");
                selectedItemSecrets.splice(secretIndex, 1);

                model.setProperty(selectedItemPath + "/secrets", selectedItemSecrets);
            } else {
                secret.status = statusDeleted;
                model.setProperty(secretModelPath, secret);
            }
        }
    });
});
