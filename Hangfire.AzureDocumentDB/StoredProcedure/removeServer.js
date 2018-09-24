// ReSharper disable UseOfImplicitGlobalInFunctionScope

/**
 * Remove Server
 * @param {string} id - the server id
 */
function removeServer(id) {
    let response = getContext().getResponse();
    let filter = (doc) => doc.type === 1 && doc.server_id === id;

    let result = __.filter(filter, (err, docs) => {
        if (err) throw err;
        if (docs.length === 0) throw new Error("No server found for id :" + id);
        if (docs.length > 1) throw new Error("Found more than one server for id :" + id);

        let doc = docs.shift();
        let deleteResult = __.deleteDocument(doc._self, function (error) {
            if (error) throw error;
        });

        if (!deleteResult) {
            throw new Error("Failed to remove the server");
        } else {
            response.setBody(true);
        }
    });

    if (!result.isAccepted) {
        throw new Error("The call was not accepted");
    }
}