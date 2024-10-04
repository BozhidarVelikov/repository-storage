sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
], (Controller, JSONModel, MessageBox, MessageToast) => {
    "use strict";

    const repositoriesPath = "/repositories";
    const selectedItemPath = "/selectedItem";
    const originalItemPath = "/originalItem";

    const editDialogId = "editDialog";

    // Urls used for fetching data
    const rootUrl = "http://127.0.0.1:8080"; // I couldn't figure out how to use an environment variable

    const repositoryEndpoint = rootUrl + "/api/repository";
    const repositoryEndpointList = repositoryEndpoint + "/list";
    const repositoryEndpointGetById = repositoryEndpoint + "/{id}";
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
            fetch(repositoryEndpointList)
            .then(response => {
                if (!response.ok) {
                    throw new Error("Error fetching data");
                }

                return response.json();
            })
            .then(data => {
                data.forEach(repository => {
                    repository.secrets.forEach((secret) => {
                        secret.status = statusNone;
                        secret.isNew = false;
                    });
                });
                model.setProperty(repositoriesPath, data);
            })
            .catch(_ => {
                MessageBox.error("Failed to fetch repositories!");
            });

            this.getView().setModel(model);
        },

        onRepositoryAddButtonPress: function () {
            
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

            fetch(repositoryEndpointDelete.replace("{id}", repositoryItem.id), {
                method: "DELETE",
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Error deleteing data");
                }

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

            // Delete secrets
            for (var i = 0; i < repository.secrets.length; i++) {
                var secret = repository.secrets[i];
                if (secret.status === statusDeleted) {
                    // Delete secret
                    await fetch(secretEndpointDelete.replace("{id}", secret.id), {
                        method: "DELETE",
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error("Error deleteing data");
                        }

                        var selectedItemSecrets = model.getProperty(selectedItemPath + "/secrets");
                        selectedItemSecrets.splice(i, 1);

                        console.log("Secret " + secret.secretKey + " deleted successfully!");
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
                    // Create secret
                    fetch(secretEndpointSave, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(secret)
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error("Error creating data");
                        }

                        return response.json();
                    })
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
                    // Update secret
                    fetch(secretEndpointUpdate.replace("{id}", secret.id), {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(secret)
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error("Error updating data");
                        }

                        return response.json();
                    })
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
                fetch(repositoryEndpointUpdate.replace("{id}", repository.id), {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(repository),
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Error updating data");
                    }

                    return response.json();
                })
                .then(data => {
                    repository.url = data.url;

                    MessageToast.show("Repository updated successfully!");
                })
                .catch(_ => {
                    MessageBox.error("Failed to update secret " + secret.secretKey + "!");
                });
            }

            if (success) {
                MessageBox.success("Repository updated successfully!");
            } else {
                MessageBox.error("Failed to update repository!");
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
