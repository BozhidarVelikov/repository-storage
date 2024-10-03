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
    const repositoryEndpointUpdate = repositoryEndpoint;
    const repositoryEndpointDelete = repositoryEndpoint + "/{id}";

    const secretEndpoint = rootUrl + "/api/secret";
    const secretEndpointVerify = secretEndpoint + "/verify";
    const secretEndpointSave = secretEndpoint;
    const secretEndpointUpdate = secretEndpoint;
    const secretEndpointDelete = secretEndpoint;

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
            // TODO: Use this to send request to the server
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
            // TODO: Use this to send request to server
            var selectedItem = model.getProperty(selectedItemPath);

            // console.log(selectedItem);

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