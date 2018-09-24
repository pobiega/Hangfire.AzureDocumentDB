// ReSharper disable UseOfImplicitGlobalInFunctionScope

/**
 * Remove TimedOut Server
 * @param {number} lastHeartbeat - the last heartbeat time
 */
function removedTimedOutServer(lastHeartbeat) {
    let response = getContext().getResponse();
    let filter = (doc) => doc.type === 1 && doc.last_heartbeat < lastHeartbeat;
    let deleted = 0;

    let result = __.filter(filter, (err, docs) => {
        if (err) throw err;

        if (docs.length === 0) {
            response.setBody(deleted);
            return;
        }

        while (docs.length > 0) {
            tryDeleteServer(docs.shift(), callback);
        }
    });

    if (!result.isAccepted) {
        response.setBody(deleted);
    }

    /**
     * Deletes the server 
     * @param {any} doc - the server document
     * @param {function} cb - the callback function to handle error and move to next server
     */
    function tryDeleteServer(doc, cb) {
        // If the request was accepted, callback will be called.
        // Otherwise report current count back to the caller, 
        // which will call the method again with remaining set of docs.
        __.deleteDocument(doc._self, {}, cb);
    }

    /**
    * Callback to handle after delete of document
    * @param {object} error - the error object
    */
    function callback(error) {
        if (error) throw error;

        // increment the counter
        deleted += 1;

        if (docs.length === 0) {
            response.setBody(deleted);
        } else {
            tryDeleteServer(docs.shift(), callback);
        }
    }
}