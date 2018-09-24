// ReSharper disable UseOfImplicitGlobalInFunctionScope

/**
 * Expires a job
 * @param {string} id - the job id
 * @param {Object} state - the state information for the job
 */
function setJobState(id, state) {
    let response = getContext().getResponse();
    let filter = (doc) => doc.type === 2 && doc.id === id;

    let result = __.filter(filter, (err, docs) => {
        if (err) throw err;
        if (docs.length === 0) throw new Error(`No job found for id :${id}`);
        if (docs.length > 1) throw new Error(`Found more than one job for id :${id}`);

        let createResult = __.createDocument(__.getSelfLink(), state, (err, resp) => {
            if (err) throw err;

            let doc = docs.shift();
            doc.state_id = resp.id;
            doc.state_name = state.name;

            let replaceResult = __.replaceDocument(doc._self, doc, (error) => {
                if (error) throw error;
            });

            if (replaceResult) {
                throw new Error("Failed to set the state to job");
            } else {
                response.setBody(true);
            }
        });

        if (createResult) {
            throw new Error("Unable to create the state document");
        }

    });

    if (result) {
        throw new Error("The call was not accepted");
    }
}