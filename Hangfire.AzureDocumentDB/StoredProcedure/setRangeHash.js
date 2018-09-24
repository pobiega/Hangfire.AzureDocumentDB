// ReSharper disable UseOfImplicitGlobalInFunctionScope

/**
 * Remove key from Hash
 * @param {string} key - the key for the set
 * @param {Array<Object>} sources - the array of hash
 */
function setRangeHash(key, sources) {
    let response = getContext().getResponse();
    let filter = (doc) => doc.type === 6 && doc.key === key;
    let affected = 0;

    let result = __.filter(filter, (err, docs) => {
        if (err) throw err;

        sources.forEach(source => {
            let hash = docs.find(h => h.field === source.field);
            if (hash) {
                hash.value = source.value;
            } else {
                hash = source;
            }

            let upsertResult = __.upsertDocument(__.getSelfLink(), hash, (error) => {
                if (error) throw error;
                affected += 1;
            });

            if (!upsertResult) {
                throw new Error("Unable to merge the hash documents");
            }
        });

        response.setBody(affected);
    });

    if (!result.isAccepted) {
        throw new Error("The call was not accepted");
    }
}