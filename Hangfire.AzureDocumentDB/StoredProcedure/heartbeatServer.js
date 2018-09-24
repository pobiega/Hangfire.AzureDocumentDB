// ReSharper disable UseOfImplicitGlobalInFunctionScope

/**
 * Heartbest Server
 * @param {string} id - the server id
 * @param {number} heartbeat = the epoc time
 */
function heartbeatServer(id, heartbeat) {
    let response = getContext().getResponse();
    let filter = (doc) => doc.type === 1 && doc.server_id === id;

    let result = __.filter(filter, (err, docs) => {
        if (err) throw err;
        if (docs.length === 0) throw new Error("No server found for id :" + id);
        if (docs.length > 1) throw new Error("Found more than one server for :" + id);

        let doc = docs.shift();
        doc.last_heartbeat = heartbeat;

        let replaceResult = __.replaceDocument(doc._self, doc, (error) => {
            if (error) throw error;
        });

        if (!replaceResult) {
            throw new Error("Failed to update the sever heartbeat");
        } else {
            response.setBody(true);
        }
    });

    if (!result.isAccepted) {
        throw new Error("The call was not accepted");
    }
}