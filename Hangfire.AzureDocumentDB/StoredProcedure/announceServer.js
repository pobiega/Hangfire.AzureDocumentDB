// ReSharper disable UseOfImplicitGlobalInFunctionScope

/**
 * Announce server
 * @param {Object} server - the server information
 */
function announceServer(server) {
    let response = getContext().getResponse();
    let filter = (doc) => doc.type === 1 && doc.server_id === server.server_id;

    let result = __.filter(filter, (err, docs) => {
        if (err) throw err;
        if (docs.length > 1) throw new Error("Found more than one server for :" + server.server_id);

        let doc;
        if (docs.length === 0) {
            doc = server;
        } else {
            doc = docs.shift();
            doc.last_heartbeat = server.last_heartbeat;
            doc.workers = server.workers;
            doc.queues = server.queues;
        }

        let upserResult = __.upsertDocument(__.getSelfLink(), doc, (error) => {
            if (error) throw error;
        });

        if (!upserResult) {
            throw new Error("Failed to create a server document");
        } else {
            response.setBody(true);
        }
    });

    if (!result.isAccepted) {
        throw new Error("The call was not accepted");
    }
}