// ReSharper disable UseOfImplicitGlobalInFunctionScope

/**
 * Add To Set
 * @param {string} key - the key of the set
 */
function persistSet(key) {
    var result = __.filter(function (doc) {
        return doc.type === 7 && doc.key === key;
    }, function (err, docs) {
        if (err) throw err;

        for (var index = 0; index < docs.length; index++) {
            var doc = docs[index];
            delete doc.expire_on;

            var isAccepted = __.replaceDocument(doc._self, function (error) {
                if (error) throw error;
            });

            if (!isAccepted) throw new Error("Failed to presist set document");
        }

        getContext().getResponse().setBody(true);
    });

    if (!result.isAccepted) throw new Error("The call was not accepted");
}