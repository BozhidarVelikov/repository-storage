sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel"
], (Controller, JSONModel) => {
	"use strict";

    const repositoriesPath = "/repositories";
    const selectedItemPath = "/selectedItem";
    const originalItemPath = "/originalItem";

    const editDialogId = "editDialog"

	return Controller.extend("ui5.repositorystorage.App", {
		onInit: function() {
            var model = new JSONModel({
                repositories: [
                    {
                        id: 1,
                        url: "asd",
                        secrets: [
                            {
                                secretKey: "key1",
                                secretValue: "value1",
                                status: "Created"
                            },
                            {
                                secretKey: "key2",
                                secretValue: "value2",
                                status: "Modified"
                            },
                            {
                                secretKey: "key3",
                                secretValue: "value3",
                                status: "Deleted"
                            },
                            {
                                secretKey: "key4",
                                secretValue: null,
                                status: "None"
                            }
                        ]
                    }
                ],
                selectedItem: {},
                originalItem: {}
            });

            this.getView().setModel(model);
        },

        onRepostiryTableEditRowPress: function (event) {
            var model = this.getView().getModel();
            var columnListItem = event.getSource().getParent().getParent();
            var repositoryModelPath = columnListItem.getBindingContext().getPath();
            var repositoryItem = model.getProperty(repositoryModelPath);

            model.setProperty(selectedItemPath, repositoryItem);

            var originalItem = Object.assign({}, repositoryItem);
            originalItem.secrets = Object.assign([], repositoryItem.secrets);
            model.setProperty(originalItemPath, originalItem);
            
            console.log("Edit pressed for:", repositoryItem);

            var dialog = this.byId(editDialogId);
            dialog.open();
        },

        onRepostiryTableDeleteRowPress: function (event) {
            var model = this.getView().getModel();
            var columnListItem = event.getSource().getParent().getParent();
            var repositoryModelPath = columnListItem.getBindingContext().getPath();
            // TODO: Use this to send request to the server
            var repositoryItem = model.getProperty(repositoryModelPath);

            // Item is located at /repositories/<index>
            var itemIndex = parseInt(repositoryModelPath.split("/")[2]);

            var repositories = model.getProperty(repositoriesPath);
            repositories.splice(itemIndex, 1);

            model.setProperty(repositoriesPath, repositories);

            console.log("Delete pressed for:", repositoryItem);
        },

        onEditDialogSavePress: function(event) {
            var model = this.getView().getModel();
            var selectedItem = model.getProperty(selectedItemPath);
            // TODO: Use this to send request to server

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