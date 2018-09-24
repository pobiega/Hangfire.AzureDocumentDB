// ReSharper disable UseOfImplicitGlobalInFunctionScope

/**
 * Set the parameter for the job
 * @param {string} id - the job id
 * @param {string} name - the name of the parameter
 * @param {string} value - the value of the parameter
 */
function setJobParameter(id, name, value) {
    let response = getContext().getResponse();
    let filter = (doc) => doc.type === 2 && doc.id === id;

    let result = __.filter(filter, (err, docs) => {
        if (err) throw err;
        if (docs.length === 0) throw new Error("No job found for id :" + id);
        if (docs.length > 1) throw new Error("Found more than one job for id :" + id);

        let doc = docs.shift();

        // when the parameter is empty/null/undefiend
        if (doc.parameters === undefined || doc.parameters === null || doc.parameters.length === 0) {
            doc.parameters = [{ name: name, value: value }];
        } else {
            // try to find the parameter
            let parameter = docs.parameters.find(p => p.name === name);
            if (parameter) {
                parameter.value = value;
            } else {
                doc.parameters.push({ name: name, value: value });
            }
        }

        let replaceResult = __.replaceDocument(doc._self, doc, function (error) {
            if (error) throw error;
        });

        if (!replaceResult) throw new Error("Failed to set the parameter");
        else response.setBody(true);
    });

    if (!result) throw new Error("The call was not accepted");
}