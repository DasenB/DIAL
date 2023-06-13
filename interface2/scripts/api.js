
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

    getTopology() {
        return Promise.all([
            this.loadPath("topology")
        ]).then(data => {
            const nodes = data[0].nodes.map(node => {
                return {id: node, label: node};
            });

            const edges = data[0].edges.map(edge => {
                return {from: edge[0], to: edge[1]}
            });

            return {
                "nodes": nodes,
                "edges": edges
            };
        });
    }

    getMessages() {
        return Promise.all([
            this.loadPath("messages")
        ]).then(data => {
            data[0].messages.forEach(message => {
                message.source = new Address(message.source);
                message.target = new Address(message.target);
            });
            return data[0]
        });
    }

    nextStep() {
        return this.loadPath("next").then(data => {
            return new Promise( (resolve, reject) => {
                if(data === "No more messages to process.") {
                    reject(data);
                }
                data.processed_message.source = new Address(data.processed_message.source);
                data.processed_message.target = new Address(data.processed_message.target);
                data.new_messages.forEach(message => {
                    message.source = new Address(message.source);
                    message.target = new Address(message.target);
                });
                resolve(data);
            });
        });
    }
}
