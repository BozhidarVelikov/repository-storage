sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "./utils/HttpUtils"
], (Controller, JSONModel, MessageBox, MessageToast, HttpUtils) => {
    "use strict";

    const repositoriesPath = "/repositories";
    const selectedItemPath = "/selectedItem";
    const originalItemPath = "/originalItem";

    const editDialogId = "editDialog";

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
            })
            .catch(_ => {
                MessageBox.error("Failed to fetch repositories!");
            });

            this.getView().setModel(model);
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

        onEditDialogSavePress: async function (event) {
            var model = this.getView().getModel();
            var originalRepository = model.getProperty(originalItemPath);
            var repository = model.getProperty(selectedItemPath);

            var success = true;

            if (repository.isNew) {
                // Create repository, and then add its secrets.

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
                    .catch(error => {
                        MessageBox.error("Failed to create secret " + secret.secretKey + "!");

                        success = false;
                    });
                });
                
                if (success) {
                    MessageBox.success("Repository created successfully!");
                } else {
                    MessageBox.error("Repository created but an error occured while adding secrets!");
                }
            } else {
                // Delete secrets first, in case user added secrets with keys that were just deleted.
                // After this, create new secrets and update old ones.
                // Finally, update the reposiroty url if needed.

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
            var secretListItem = event.getSource().getParent().getParent();
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
