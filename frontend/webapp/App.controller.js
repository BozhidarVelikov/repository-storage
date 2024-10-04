sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
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

	return Controller.extend("ui5.repositorystorage.App", {
		onInit: function() {
            var model = new JSONModel({
                repositories: [],
                selectedItem: {},
                originalItem: {}
            });

            // Load repository data from endpoint
            fetch(repositoryEndpointList)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error fetching data');
                }
                return response.json();
            })
            .then(data => {
                model.setProperty(repositoriesPath, data);
            })
            .catch(_ => {
                MessageBox.error("Failed to fetch repositories!");
            });

            this.getView().setModel(model);
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
            repositoryItem.secrets.forEach((secret) => {
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
                method: 'DELETE'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error deleteing data');
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

        onEditDialogSavePress: function(event) {
            var model = this.getView().getModel();
            var originalRepository = model.getProperty(originalItemPath);
            var repository = model.getProperty(selectedItemPath);

            var success = true;

            // Delete secrets
            originalRepository.secrets.forEach(secret => {
                var isDeletedSecret = !repository.secrets.some(s => {
                    return s.secretKey === secret.secretKey
                });

                if (isDeletedSecret) {
                    fetch(secretEndpointDelete.replace("{id}", secret.id), {
                        method: 'DELETE'
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Error deleteing data');
                        }
        
                        console.log("Secret " + secret.secretKey + " deleted successfully!");
                        MessageToast.show("Secret deleted successfully!");
                    })
                    .catch(_ => {
                        MessageBox.error("Failed to delete secret" + secret.secretKey + "!");

                        success = false;
                    });
                }
            });

            // Create and update secrets
            repository.secrets.forEach(secret => {
                if (secret.secretValue !== null) {
                    var isNewSecret = !originalRepository.secrets.some(s => {
                        return s.secretKey === secret.secretKey
                    });

                    if (!isNewSecret) {
                        // Update secret
                        fetch(secretEndpointUpdate.replace("{id}", secret.id), {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(secret)
                        })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Error updating data');
                            }

                            return response.json();
                        })
                        .then(data => {
                            secret = data;
                            secret.secretValue = null;
                
                            MessageToast.show("Secret updated successfully!");
                        })
                        .catch(_ => {
                            MessageBox.error("Failed to update secret " + secret.secretKey + "!");

                            success = false;
                        });
                    } else {
                        fetch(secretEndpointSave, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(secret)
                        })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Error creating data');
                            }

                            return response.json();
                        })
                        .then(data => {
                            secret = data;
                            secret.secretValue = null;
                
                            MessageToast.show("Secret created successfully!");
                        })
                        .catch(_ => {
                            MessageBox.error("Failed to create secret " + secret.secretKey + "!");

                            success = false;
                        });
                    }
                }
            });

            // Update repository
            if (repository.url !== originalRepository.url) {
                fetch(repositoryEndpointUpdate.replace("{id}", repository.id), {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(repository)
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Error updating data');
                    }

                    return response.json();
                })
                .then(data => {
                    repository = data;
        
                    MessageToast.show("Repository updated successfully!");
                })
                .catch(_ => {
                    MessageBox.error("Failed to update secret " + secret.secretKey + "!");
                    fetch(repositoryEndpointDelete.replace("{id}", repositoryItem.id), {
                        method: 'DELETE'
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Error deleteing data');
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

                        success = false;
                    });
                });
            }

            if (success) {
                MessageBox.success("Repository updated successfully!");
            } else {
                MessageBox.error("Failed to update repository!");
            }

            var dialog = this.byId(editDialogId);
            dialog.close();
        },

        onEditDialogCancelPress: function(event) {
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

        onSecretInputChange: function(event) {
            var input = event.getSource();
            var inputContext = input.getBindingContext();

            // Retrieve the secret item associated with the input
            var secret = inputContext.getObject();
            secret.secretValue = event.getParameter("value");
        },

        onSecretDeleteRowPress: function(event) {
            var model = this.getView().getModel();
            var secretListItem = event.getSource().getParent().getParent();
            var secretModelPath = secretListItem.getBindingContext().getPath();

            // Item is located at /selectedItem/secrets/<index>
            var secretIndex = parseInt(secretModelPath.split("/")[3]);

            var selectedItemSecrets = model.getProperty(selectedItemPath + "/secrets");
            selectedItemSecrets.splice(secretIndex, 1);

            model.setProperty(selectedItemPath + "/secrets", selectedItemSecrets);
        }
	});

});