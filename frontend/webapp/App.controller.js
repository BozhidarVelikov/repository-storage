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
                                status: "Created",
                                statusSchema: "Success"
                            },
                            {
                                secretKey: "key2",
                                secretValue: "value2",
                                status: "Modified",
                                statusSchema: "Warning"
                            },
                            {
                                secretKey: "key3",
                                secretValue: "value3",
                                status: "Deleted",
                                statusSchema: "Error"
                            },
                            {
                                secretKey: "key4",
                                secretValue: null,
                                status: "None",
                                statusSchema: "None"
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
            var columnListItem = event.getSource().getParent().getParent();
            var itemModelPath = columnListItem.getBindingContext().getPath();
            var model = this.getView().getModel();
            var rowData = model.getProperty(itemModelPath);

            model.setProperty(selectedItemPath, rowData);

            var originalItem = Object.assign({}, rowData);
            model.setProperty(originalItemPath, originalItem);
            
            console.log("Edit pressed for:", rowData);

            var dialog = this.byId(editDialogId);
            dialog.open();
        },

        onRepostiryTableDeleteRowPress: function (event) {
            var columnListItem = event.getSource().getParent().getParent();
            var itemModelPath = columnListItem.getBindingContext().getPath();
            var model = this.getView().getModel();
            // TODO: Use this to send request to the server
            var rowData = model.getProperty(itemModelPath);

            // Item is located at /repositories/<index>
            var itemIndex = parseInt(itemModelPath.split("/")[2]);

            var repositories = model.getProperty(repositoriesPath);
            repositories.splice(itemIndex);

            model.setProperty(repositoriesPath, repositories);

            console.log("Delete pressed for:", rowData);
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

            // NOTE: This also works, in a real project, I will use the one with the better performance
            // var dialog = event.getSource().getParent().getParent();
            var dialog = this.byId(editDialogId);
            dialog.close();
        }
	});

});