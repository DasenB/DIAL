
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
        const url = `https://${this.host}:${this.port}/${path}`;
        return fetch(url).then(response => {
                return response.json();
            }).catch(reason => {
                if (reason.message === "Load failed") {
                    const err = new Error(`Failed to load api ${url}.`, {cause: reason});
                    console.error(err.message);
                }
            });
    }

    postPath(path, data) {
        const url = `https://${this.host}:${this.port}/${path}`;
        return fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }).catch(reason => {
            if (reason.message === "Load failed") {
                const err = new Error(`Failed to load api ${url}.`, {cause: reason});
                console.error(err.message);
            }
        });
    }


    nextStep() {
        return this.loadPath("next").then(data => {
            return new Promise( (resolve, reject) => {
                data.consumed_message.source = new Address(data.consumed_message.source);
                data.consumed_message.target = new Address(data.consumed_message.target);
                data.produced_messages.forEach(message => {
                    message.source = new Address(message.source);
                    message.target = new Address(message.target);
                });
                resolve(data);
            });
        });
    }

    prevStep() {
        return this.loadPath("prev").then(data => {
            return new Promise( (resolve, reject) => {
                data.reverted_message.source = new Address(data.reverted_message.source);
                data.reverted_message.target = new Address(data.reverted_message.target);
                data.removed_messages.forEach(message => {
                    message.source = new Address(message.source);
                    message.target = new Address(message.target);
                });
                resolve(data);
            });
        })
    }


    loadGraphTopology() {
        return Promise.all([
            this.loadPath("topology"),
            this.loadPath("messages")
        ]).then(data => {
            const processes = Object.keys(data[0].processes).map(key => {
                return {id: key, label: key};
            });
            var messageCount = {};

            data[1].messages.forEach(message => {
                if (message.consumed === true) {
                    return;
                }
                message.source = new Address(message.source);
                message.target = new Address(message.target);
                const key = "from=" + message.source.process + "_to=" + message.target.process;
                if (messageCount[key] === undefined) {
                    messageCount[key] = 0;
                }
                messageCount[key] += 1;
            });

            const edges = data[0].edges.map(item => {
                return {from: item.A, to: item.B}
            });
            const indicators = data[0].edges.flatMap(item => {
                const from_to_key = "from=" + item.A + "_to=" + item.B;
                const to_from_key = "from=" + item.B + "_to=" + item.A;
                const from_to_count = messageCount[from_to_key] ?? 0
                const to_from_count = messageCount[to_from_key] ?? 0
                return [{from: item.A, to: item.B, number: from_to_count}, {
                    from: item.B,
                    to: item.A,
                    number: to_from_count
                }];
            });

            const response = {
                "processes": processes,
                "edges": edges,
                "indicators": indicators
            };
            return response;
        });
    }

    updateOrder(uuids){
        return this.postPath("reorder", uuids);
    }
}
