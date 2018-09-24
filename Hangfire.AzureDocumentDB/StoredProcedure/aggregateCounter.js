// ReSharper disable UseOfImplicitGlobalInFunctionScope

/**
 * Delete documents
 * @param {Object} counter - the aggreated counter object
 * @param {Array<string>} rawCounterIds - Arrays of raw counter document ids to be deleted
 */
function aggregateCounter(counter, rawCounterIds) {
    if (typeof rawCounterIds === "string") rawCounterIds = JSON.parse(rawCounterIds);

    let response = getContext().getResponse();
    let filter = (doc) => rawCounterIds.indexOf(doc.id) > -1;
    let deleted = 0;

    // first upsert the counter document
    let result = __.upsertDocument(__.getSelfLink(), counter, (error) => {
        if (error) throw error;

        // now delete all the raw counter ids 
        let filterResult = __.filter(filter, {}, (err, docs) => {
            if (err) throw err;

            if (docs.length === 0) {
                response.setBody(deleted);
                return;
            }

            // check the filtered docs length wit the raw ids 
            if (docs.length !== rawCounterIds.length) {
                throw new Error("Filter doccuments is not equal then RAW counter");
            }

            // capture the docs length
            let count = docs.length;

            while (docs.length > 0) {
                tryDeleteDocument(docs.shift(), callback);
            }

            // check the deleted with actual count;
            if (deleted !== count) {
                throw new Error("Document deleted is less then the filtered");
            }
        });

        if (!filterResult) {
            response.setBody(deleted);
        }
    });

    if (!result) {
        throw new Error("Unable to upsert the aggregated counter object");
    }

    /**
     * Deletes the document 
     * @param {any} doc - the document
     * @param {function} cb - the callback to handle error and move to next document
     */
    function tryDeleteDocument(doc, cb) {
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