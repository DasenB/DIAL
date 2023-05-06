
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
            });
        });
    }

    prevStep() {
        return this.loadPath("prev").then(data => {
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
            });
        })
    }

    loadNavigatorOverview() {
        return Promise.all([
            this.loadPath("topology"),
            this.loadPath("messages"),
            this.loadPath("program_details/"),
            this.loadPath("programs")
        ]).then(data => {
            const processes = Object.keys(data[0].processes);
            var instances = [];
            Object.keys(data[2]).forEach(key => {
                instances = instances.concat(data[2][key].instances);
            });
            var messages = data[1].messages.map(message => {
                const source = new Address(message.source);
                const target = new Address(message.target);
                return [message.uuid, `${source.process} -> ${target.process}` ];
            });
            messages.splice(0, data[1].position);
            const programs = Object.keys(data[3]);

            const response = {
                "processes": processes,
                "programs": programs,
                "instances": instances,
                "messages": messages
            };
            return response;
        });
    }

    loadGraphTopology() {
        return Promise.all([
            this.loadPath("topology"),
            this.loadPath("messages")
        ]).then(data => {
            const processes = Object.keys(data[0].processes).map(key => {
                return {id: data[0].processes[key].address, label: data[0].processes[key].name}
            });
            var messageCount = {};
            for (let i = data[1].position; i < data[1].messages.length; i++) {
                const sourceProcessArr = data[1].messages[i].source.split("/");
                const targetProcessArr = data[1].messages[i].target.split("/");
                const sourceProcess = sourceProcessArr[0] + "/" + sourceProcessArr[1];
                const targetProcess = targetProcessArr[0] + "/" + targetProcessArr[1];

                const key = "from=" + sourceProcess + "_to=" + targetProcess;
                if (messageCount[key] === undefined) {
                    messageCount[key] = 0;
                }
                messageCount[key] += 1;
            }
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
