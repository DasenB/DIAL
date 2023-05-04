
// All ( Processes, Instances, MessageUUIDs)
// Process: ProcessAddress -> ( Instances, NeighborProcesses, Incomming_MessageUUIDs, Outgoing_MessageUUIDs)
// (Program: ProgramAddress -> ( Instances, MessageUUIDs ))
// Instance: InstanceAddress -> ( Context, MessageUUIDs )
// Message: UUID -> Message
// Context -> Editor
// Message -> Editor


class API {

    constructor(host, port) {
        this.host = host;
        this.port = port;
    }

    loadPath(path) {
        return fetch(`https://${this.host}:${this.port}/${path}`).then(response => {
                return response.json().catch(reason => {
                    throw new Error("Failed to decode API response to json.", { cause: reason});
                });
            }).catch(reason => {
                throw new Error("Failed to load data from the API.", { cause: reason});
            });
    }


    nextStep() {
        return this.loadPath("next").catch(reason => {
            throw new Error("Can not load next step from the API.", {cause: reason});
        }).then(data => {
            return new Promise( (resolve, reject) => {
                const getProcessAddress = function (address) {
                    const addressArray = address.split("/");
                    return addressArray[0] + "/" + addressArray[1];
                }
                data.consumed_message.source = getProcessAddress(data.consumed_message.source);
                data.consumed_message.target = getProcessAddress(data.consumed_message.target);
                data.produced_messages.forEach(message => {
                    message.source = getProcessAddress(message.source);
                    message.target = getProcessAddress(message.target);
                });
                resolve(data);
            }).catch(reason => {
                throw new Error("Failed to parse API-response for next step.", {cause: reason});
            });
        });
    }

    prevStep() {
        return this.loadPath("prev").catch(reason => {
            throw new Error("Can not load previous step from the API.", {cause: reason});
        }).then(data => {
            return new Promise( (resolve, reject) => {
                const getProcessAddress = function (address) {
                    const addressArray = address.split("/");
                    return addressArray[0] + "/" + addressArray[1];
                }
                data.reverted_message.source = getProcessAddress(data.reverted_message.source);
                data.reverted_message.target = getProcessAddress(data.reverted_message.target);
                data.removed_messages.forEach(message => {
                    message.source = getProcessAddress(message.source);
                    message.target = getProcessAddress(message.target);
                });
                resolve(data);
            }).catch(reason => {
                throw new Error("Failed to parse API-response for previous step.", {cause: reason});
            });
        })
    }
}
