// ReSharper disable UseOfImplicitGlobalInFunctionScope

/**
 * Expiration manager to delete old expired documents
 * @param {number} type - The type of the document to delete
 * @param {number} expireOn - The unix timestamp to expire documents
 */
function deleteExpiredDocuments(type, expireOn) {
    let response = getContext().getResponse();
    let filter = (doc) => doc.type === type && doc.expire_on < expireOn;
    let deleted = 0;

    let result = __.filter(filter, {}, (error, docs) => {
        if (error) throw error;

        if (docs.length === 0) {
            response.setBody(deleted);
            return;
        }

        // capture the docs length
        let count = docs.length;

        while (docs.length > 0) {
            tryDeleteDocument(docs.shift(), callback);
        }

        // throw ERROR when counts don't match
        if (count !== deleted) {
            throw new Error("Unable to delete all the expired documents");
        }
    });

    if (!result) {
        response.setBody(deleted);
    }

    /**
     * Deletes the document 
     * @param {any} doc - the document
     * @param {function} cb - the callback function to handle error and move to next document
     */
    function tryDeleteDocument(doc, cb) {

        // if it is a RAW counter; then ignore
        if (doc.type === 4 && doc.counter_type === 1) {
            cb(undefined);
            return;
        }

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
            tryDeleteDocument(docs.shift(), callback);
        }
    }
}