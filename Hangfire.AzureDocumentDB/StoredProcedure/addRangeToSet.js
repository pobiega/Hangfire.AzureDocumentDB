// ReSharper disable UseOfImplicitGlobalInFunctionScope

/**
 * Add To Set
 * @param {Array<object>} sets - An array of sets
 */
function addRangeToSet(sets) {
    var index = 0;

    if (sets.length === 0) {
        getContext().getResponse().setBody(0);
        return;
    }

    getContext().getResponse().setBody(sets.length);

    // create the first document - and then the callback will loop through each
    createDocument(sets[index], callback);

    /**
     * Creates the set document 
     * @param {any} set - the set document
     * @param {any} cb - the callback to handle
     */
    function createDocument(set, cb) {
        var isAccepted = __.upsertDocument(__.getSelfLink(), set, cb);
        if (!isAccepted) {
            getContext().getResponse().setBody(index);
        }
    }

    /**
     * Callback to handle after upser
     * @param {object} err - the error object
     */
    function callback(err) {
        if (err) throw err;

        index += 1;

        if (index >= sets.length) {
            getContext().getResponse().setBody(index);
            return;
        } else {
            createDocument(sets[index], callback);
        }
    }
}