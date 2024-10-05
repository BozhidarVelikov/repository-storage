sap.ui.define([], function() {
    "use strict";

    return {
        sendGetRequest: function(url) {
            return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error("Error fetching data");
                }

                return response.json();
            });
        },

        sendPostRequest: function(url, bodyObject) {
            return fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(bodyObject)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Error fetching data");
                }

                return response.json();
            });
        },

        sendPutRequest: function(url, bodyObject) {
            return fetch(url, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(bodyObject)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Error fetching data");
                }

                return response.json();
            });
        }, 

        sendDeleteRequest: function(url) {
            return fetch(url, {
                method: "DELETE",
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Error deleteing data");
                }

                return response;
            });
        }
    }
});