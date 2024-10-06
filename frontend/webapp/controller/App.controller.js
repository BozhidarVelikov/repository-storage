sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "ui5/repositorystorage/utils/Constants",
    "ui5/repositorystorage/utils/HttpUtils",
    "ui5/repositorystorage/utils/RepositoryUtils",
], (Controller, JSONModel, MessageBox, MessageToast, Constants, HttpUtils, RepositoryUtils) => {
    "use strict";

    return Controller.extend("ui5.repositorystorage.controller.App", {
        /**
         * Called when the controller is instantiated.
         * 
         * Sets up the initial model.
         * 
         * @public
         */
        onInit: function () {
            var model = new JSONModel({
                repositories: [],
                selectedItem: {},
                originalItem: {},
                selectedRepositoryId: null,
                selectedKeyId: null
            });

            // Load repository data from endpoint
            HttpUtils.sendGetRequest(Constants.REPOSITORY_ENDPOINT_LIST)
            .then(data => {
                data.forEach(repository => {
                    repository.secrets.forEach((secret) => {
                        secret.status = Constants.STATUS_NONE;
                        secret.isNew = false;
                    });
                    repository.isNew = false;
                });
                model.setProperty(Constants.REPOSITORIES_PATH, data);

                this.resetSelectedIds(model, data);
            })
            .catch(error => {
                console.log(error);
                MessageBox.error("Failed to fetch repositories!");
            });

            this.getView().setModel(model);
        },

        /**
         * Resets the model properties selectedRepositoryId and selectedKeyId.
         * 
         * If at least one repository is present, the value of selectedRepositoryId is set
         * to the id of the first repository in the list.
         * If at least one secret is present in the first repository, the value of selectedKeyId
         * is set to the id of the first secret key in the list.
         * 
         * @public
         */
        resetSelectedIds: function(model, repositories) {
            if (repositories.length > 0) {
                model.setProperty(Constants.SELECTED_REPOSITORY_ID_PATH, repositories[0].id);

                if (repositories[0].secrets.length > 0) {
                    model.setProperty(Constants.SELECTED_KEY_ID_PATH, repositories[0].secrets[0].id);
                } else {
                    model.setProperty(Constants.SELECTED_KEY_ID_PATH, null);
                }
            } else {
                model.setProperty(Constants.SELECTED_REPOSITORY_ID_PATH, null);
                model.setProperty(Constants.SELECTED_KEY_ID_PATH, null);
            }
        },

        /**
         * Executes the logic of the "Verify Secret" button.
         * 
         * Resets the "Verify Secret" dialog's values.
         * 
         * @public
         */
        onVerifySecretButtonPress: function() {
            var model = this.getView().getModel();
            var repositories = model.getProperty(Constants.REPOSITORIES_PATH);
            this.resetSelectedIds(model, repositories);

            var selectedItem;
            if (repositories.length > 0) {
                selectedItem = repositories[0];
            } else {
                selectedItem = null;
            }

            model.setProperty(Constants.SELECTED_ITEM_PATH, selectedItem);

            var secretValueInput = this.byId(Constants.VERIFY_DIALOG_SECRET_VALUE_INPUT_ID);
            secretValueInput.setValue("");

            var dialog = this.byId(Constants.VERIFY_DIALOG_ID);
            dialog.open();
        },

        /**
         * Executes the logic when a new repository is selected from the repository 
         * dropdown on "Verify Secret" dialog.
         * 
         * Sets the selected secret to the first secret of the newly-selected repository.
         * 
         * @public
         */
        onRepositoryChange: function(event) {
            var model = this.getView().getModel();
            var repositories = model.getProperty(Constants.REPOSITORIES_PATH);
            var selectedKey = event.getParameter("selectedItem").getKey();
            
            if (repositories.length > 0) {
                for (var i = 0; i < repositories.length; i++) {
                    if (repositories[i].id == selectedKey) {
                        model.setProperty(Constants.SELECTED_ITEM_PATH, repositories[i]);

                        if (repositories[i].secrets.length > 0) {
                            model.setProperty(Constants.SELECTED_KEY_ID_PATH, repositories[i].secrets[0].id);
                        } else {
                            model.setProperty(Constants.SELECTED_KEY_ID_PATH, null);
                        }

                        break;
                    }
                }
            } else {
                model.setProperty(Constants.SELECTED_KEY_ID_PATH, null);
            }
        },

        /**
         * Executes the logic of the "Verify" button on "Verify Secret" dialog.
         * 
         * Verifies that the selected rpository and secret are not null and sends a
         * POST request to the server to verify the secret.
         * 
         * @public
         */
        onVerifySecretDialogVerifyPress: function() {
            var model = this.getView().getModel();
            var selectedRepository = model.getProperty(Constants.SELECTED_ITEM_PATH);
            var selectedKeyId = model.getProperty(Constants.SELECTED_KEY_ID_PATH);
            var enteredSecretValue = this.byId(Constants.VERIFY_DIALOG_SECRET_VALUE_INPUT_ID).getValue();

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

                    fetch(Constants.SECRET_ENDPOINT_VERIFY, {
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

        /**
         * Executes the logic of the "Cancel" button on "Verify Secret" dialog.
         * 
         * Closes the "Verify Secret" dialog.
         * 
         * @public
         */
        onVerifySecretDialogCancelPress: function (event) {
            var dialog = this.byId(Constants.VERIFY_DIALOG_ID);
            dialog.close();
        },

        /**
         * Executes the logic of the "Add repository" button.
         * 
         * Creates a new repository and sets the model's property selectedItem to it.
         * Opens the "Edit Repository" dialog.
         * 
         * @public
         */
        onRepositoryAddButtonPress: function () {
            var model = this.getView().getModel();

            var newRepository = {
                id: 0,
                url: "",
                secrets: [],
                isNew: true
            }

            model.setProperty(Constants.SELECTED_ITEM_PATH, newRepository);

            var dialog = this.byId(Constants.EDIT_DIALOG_ID);
            dialog.open();
        },

        /**
         * Executes the logic of the "Edit" button on each repository row.
         * 
         * Copies the repository in selectedItem.
         * Opens the "Edit Repository" dialog.
         * 
         * @public
         */
        onRepostiryTableEditRowPress: function (event) {
            var model = this.getView().getModel();
            var columnListItem = event.getSource().getParent().getParent();
            var repositoryModelPath = columnListItem.getBindingContext().getPath();
            var repositoryItem = model.getProperty(repositoryModelPath);

            model.setProperty(Constants.SELECTED_ITEM_PATH, repositoryItem);

            // Copy the original repository and each secret in it
            var originalItem = Object.assign({}, repositoryItem);
            var secrets = [];
            repositoryItem.secrets.forEach(secret => {
                secrets.push(Object.assign({}, secret));
            });
            originalItem.secrets = secrets;
            model.setProperty(Constants.ORIGINAL_ITEM_PATH, originalItem);

            var dialog = this.byId(Constants.EDIT_DIALOG_ID);
            dialog.open();
        },

        /**
         * Executes the logic of the "Delete" button on each repository row.
         * 
         * Sends a DELETE request to the server to delete the desired repository and all its secrets.
         * 
         * @public
         */
        onRepostiryTableDeleteRowPress: function (event) {
            var model = this.getView().getModel();
            var columnListItem = event.getSource().getParent().getParent();
            var repositoryModelPath = columnListItem.getBindingContext().getPath();
            var repositoryItem = model.getProperty(repositoryModelPath);

            HttpUtils.sendDeleteRequest(Constants.REPOSITORY_ENDPOINT_DELETE.replace("{id}", repositoryItem.id))
            .then(_ => {
                // Repository is located at /repositories/<index>
                var itemIndex = parseInt(repositoryModelPath.split("/")[2]);

                // Remove repository from model
                var repositories = model.getProperty(Constants.REPOSITORIES_PATH);
                repositories.splice(itemIndex, 1);

                model.setProperty(Constants.REPOSITORIES_PATH, repositories);

                MessageToast.show("Repository deleted successfully!");
            })
            .catch(_ => {
                MessageBox.error("Failed to delete repository!");
            });
        },

        /**
         * Executes the logic of the "Save" button on "Edit Repository" dialog.
         * 
         * Validates the repository and either creates new repository or updates an existing one.
         * Closes the "Edit Repository" dialog.
         * 
         * @public
         */
        onEditDialogSavePress: async function (event) {
            var model = this.getView().getModel();
            var originalRepository = model.getProperty(Constants.ORIGINAL_ITEM_PATH);
            var repository = model.getProperty(Constants.SELECTED_ITEM_PATH);

            if (!RepositoryUtils.validateRepository(repository, model)) {
                return;
            }

            if (repository.isNew) {
                await RepositoryUtils.createNewRepository(repository, model);
                repository.isNew = false;
            } else {
                await RepositoryUtils.updateExistingRepository(repository, originalRepository, model);
            }

            model.setProperty(Constants.SELECTED_ITEM_PATH, repository);

            var dialog = this.byId(Constants.EDIT_DIALOG_ID);
            dialog.close();
        },

        /**
         * Executes the logic of the "Cancel" button on "Edit Repository" dialog.
         * 
         * Reverts back the changed repository.
         * Closes the "Edit Repository" dialog.
         * 
         * @public
         */
        onEditDialogCancelPress: function (event) {
            var model = this.getView().getModel();
            var originalItem = model.getProperty(Constants.ORIGINAL_ITEM_PATH);

            // Revert changes back
            model.setProperty(Constants.SELECTED_ITEM_PATH + "/url", originalItem.url);
            model.setProperty(Constants.SELECTED_ITEM_PATH + "/secrets", originalItem.secrets);

            // NOTE: This also works, in a real project, I will use the one with the better performance
            // var dialog = event.getSource().getParent().getParent();
            var dialog = this.byId(Constants.EDIT_DIALOG_ID);
            dialog.close();
        },

        /**
         * Executes the logic of the "Esc" keyboard button on "Edit Repository" dialog.
         * 
         * Executes the "Cancel" button press logic.
         * 
         * @public
         */
        onEditDialogEscapePress: function(promise) {
            this.onEditDialogCancelPress();

            promise.resolve();
        },

        /**
         * Executes the logic of the "Add Secret" button on "Edit Repository" dialog.
         * 
         * Creates a new secret object and adds it to the repository.
         * 
         * @public
         */
        onSecretAddButtonPress: function () {
            var model = this.getView().getModel();
            var selectedRepository = model.getProperty(Constants.SELECTED_ITEM_PATH);

            var newSecret = {
                id: 0,
                secretKey: "",
                secretValue: null,
                repositoryId: selectedRepository.id,
                status: Constants.STATUS_CREATED,
                isNew: true
            };

            selectedRepository.secrets.push(newSecret);

            model.setProperty(Constants.SELECTED_ITEM_PATH, selectedRepository);
        },

        /**
         * Executes when the user stops focusing a secret key input in "Edit Repository" dialog.
         * 
         * Validates the input field and sets the corresponding secret's key to the entered value.
         * 
         * @public
         */
        onSecretKeyInputChange: function (event) {
            var model = this.getView().getModel();
            var input = event.getSource();
            var inputContext = input.getBindingContext();

            var newSecret = inputContext.getObject();
            newSecret.secretKey = event.getParameter("value");

            var selectedItemSecrets = model.getProperty(Constants.SELECTED_ITEM_PATH + "/secrets");
            selectedItemSecrets.forEach(secret => {
                if (secret === newSecret) {
                    return;
                }

                if (secret.secretKey === newSecret.secretKey && secret.status !== Constants.STATUS_DELETED) {
                    MessageBox.error("Secret with this key already exists!"); // TODO: Focus field after closing the popup
                }
            });
        },

        /**
         * Executes when the user stops focusing a secret value input in "Edit Repository" dialog.
         * 
         * Validates the input field and sets the corresponding secret's value to the entered value.
         * 
         * @public
         */
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
            secret.status = secret.status === Constants.STATUS_CREATED ? secret.status : Constants.STATUS_MODIFIED;

            model.setProperty(Constants.SELECTED_ITEM_PATH + "/secrets/" + secretIndex, secret);
        },

        /**
         * Executes the logic of the "Delete" button on each secret row.
         * 
         * If the deleted secret is just created, remove it from the array.
         * Otherwise, set its status to deleted (this also hides it in the UI).
         * 
         * @public
         */
        onSecretDeleteRowPress: function (event) {
            var model = this.getView().getModel();
            var secretListItem = event.getSource().getParent();
            var secretModelPath = secretListItem.getBindingContext().getPath();

            var secret = model.getProperty(secretModelPath);
            if (secret.status === Constants.STATUS_CREATED) {
                // Item is located at /selectedItem/secrets/<index>
                var secretIndex = parseInt(secretModelPath.split("/")[3]);

                var selectedItemSecrets = model.getProperty(Constants.SELECTED_ITEM_PATH + "/secrets");
                selectedItemSecrets.splice(secretIndex, 1);

                model.setProperty(Constants.SELECTED_ITEM_PATH + "/secrets", selectedItemSecrets);
            } else {
                secret.status = Constants.STATUS_DELETED;
                model.setProperty(secretModelPath, secret);
            }
        }
    });
});
