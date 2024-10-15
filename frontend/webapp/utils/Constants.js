sap.ui.define([], function() {
    "use strict";

    const ROOT_URL = "http://127.0.0.1:8080";
    const REPOSITORY_ENDPOINT = ROOT_URL + "/api/repository";
    const SECRET_ENDPOINT = ROOT_URL + "/api/secret";

    return {
        // Model paths
        REPOSITORIES_PATH: "/repositories",
        SECRETS_PATH: "/secrets",
        SELECTED_ITEM_PATH: "/selectedItem",
        ORIGINAL_ITEM_PATH: "/originalItem",
        SELECTED_REPOSITORY_ID_PATH: "/selectedRepositoryId",
        SELECTED_KEY_ID_PATH: "/selectedKeyId",
        EXISTING_SECRET_ID_PATH: "/existingSecretId",

        // Component ids
        EDIT_DIALOG_ID: "editDialog",
        SELECT_SECRET_DIALOG_ID: "selectSecretDialog",
        VERIFY_DIALOG_ID: "verifyDialog",
        VERIFY_DIALOG_SECRET_VALUE_INPUT_ID: "verifyDialogSecretValueInput",

        // Urls used for fetching data
        REPOSITORY_ENDPOINT_LIST: REPOSITORY_ENDPOINT + "/list",
        REPOSITORY_ENDPOINT_SAVE: REPOSITORY_ENDPOINT,
        REPOSITORY_ENDPOINT_UPDATE: REPOSITORY_ENDPOINT + "/{id}",
        REPOSITORY_ENDPOINT_DELETE: REPOSITORY_ENDPOINT + "/{id}",
        REPOSITORY_ENDPOINT_VERIFY: REPOSITORY_ENDPOINT + "/verify/{id}",

        SECRET_ENDPOINT_LIST: SECRET_ENDPOINT + "/list",
        SECRET_ENDPOINT_SAVE: SECRET_ENDPOINT,
        SECRET_ENDPOINT_UPDATE: SECRET_ENDPOINT + "/{id}",
        SECRET_ENDPOINT_ADD_TO_REPOSITORY: SECRET_ENDPOINT + "/addToRepository/{id}?repositoryId={repositoryId}",
        SECRET_ENDPOINT_DELETE: SECRET_ENDPOINT + "/{id}?repositoryId={repositoryId}",

        // Secret statuses
        STATUS_NONE: "None",
        STATUS_CREATED: "Created",
        STATUS_MODIFIED: "Modified",
        STATUS_ADDED: "Added",
        STATUS_DELETED: "Deleted"
    }
});