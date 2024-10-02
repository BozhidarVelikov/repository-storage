sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel"
], (Controller, JSONModel) => {
	"use strict";

	return Controller.extend("ui5.repositorystorage.App", {
		onInit: function() {
            var model = new JSONModel({
                repositories: [
                    {
                        id: 1,
                        url: "asd"
                    }
                ],
                selectedItem: {}
            });

            this.getView().setModel(model);
        },

        onRepostiryTableEditRowPress: function (event) {
            const selectedItemPath = "/selectedItem"

            var columnListItem = event.getSource().getParent().getParent();
            var itemModelPath = columnListItem.getBindingContext().getPath();
            var model = this.getView().getModel();
            var rowData = model.getProperty(itemModelPath);

            model.setProperty(selectedItemPath, rowData)
            
            console.log("Edit pressed for:", rowData);

            var dialog = this.byId("editDialog");
            dialog.open();
        },

        onRepostiryTableDeleteRowPress: function (event) {
            const repositoriesPath = "/repositories"

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
            var dialog = this.byId("editDialog");
            dialog.close();
        },

        onEditDialogCancelPress: function(event) {
            var dialog = this.byId("editDialog");
            dialog.close();
        }
	});

});