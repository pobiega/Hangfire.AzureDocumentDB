// ReSharper disable UseOfImplicitGlobalInFunctionScope

/**
 * Add To Set
 * @param {string} key - the key of the set
 * @param {number} epoch - the unix time to expire on
 */
function expireSet(key, epoch) {
    var result = __.filter(function (doc) {
        return doc.type === 7 && doc.key === key;
    }, function (err, docs) {
        if (err) throw err;

        for (var index = 0; index < docs.length; index++) {
            var doc = docs[index];
            doc.expire_on = epoch;

            var isAccepted = __.replaceDocument(doc._self, function (error) {
                if (error) throw error;
            });

            if (!isAccepted) throw new Error("Failed to update the document expire_on");
        }

        getContext().getResponse().setBody(true);
    });

    if (!result.isAccepted) throw new Error("The call was not accepted");
}