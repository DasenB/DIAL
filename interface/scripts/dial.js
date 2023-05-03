
const dial_template = document.createElement("template");
dial_template.innerHTML = `
   <style>
        #container {
            height: 100%;
            width: 100%;
            position: absolute;
        }
        
                
        #graph-view {
            background-color: aquamarine;
            height: 70%;
            width: calc(100% - var(--menu-width));
            left: 0;
            top: 0;
            position: absolute;
        }
        
        
        #editor-view {
            background-color: blueviolet;
            height: 30%;
            width: calc(100% - var(--menu-width));
            position: absolute;
            left: 0;
            bottom: 0;
        }
        
        #timeline-view {
            background-color: #e0e0e0;
            height: 100%;
            width: var(--menu-width);
            position: absolute;
            right: 0;
        }
    </style>
    <div id="container">
        <div id="timeline-view">
            <dial-timeline id="timeline"></dial-timeline>
        </div>
        <div id="graph-view">
            <dial-graph id="graph"></dial-graph>
        </div>
        <div id="editor-view">
<!--            <dial-editor id="editor"></dial-editor>-->
            <dial-table id="navigator"></dial-table>
        </div>
        <dial-warning id="warning"></dial-warning>
    </div>
   
`;

class Dial extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(dial_template.content.cloneNode(true));
        this.$grapView = this.shadowRoot.querySelector('#graph-view');
        this.$grap = this.shadowRoot.querySelector('#graph');
        this.$timelineView = this.shadowRoot.querySelector('#timeline-view');
        this.$timeline = this.shadowRoot.querySelector('#timeline');
        this.$warning = this.shadowRoot.querySelector('#warning');
        this.$editorView = this.shadowRoot.querySelector('#editor-view');
        this.$editor = this.shadowRoot.querySelector('#editor');
        this.$navigator = this.shadowRoot.querySelector('#navigator');

        this.editorLoadSimulator();
        this.timelineLoadMessages();
        this.graphLoadTopology();

        const eventOptions = {
            bubbles: true,
            cancelable: true,
            composed: true,
        };

        this.nextPrevCounter = 0;
        this.running = false;


        window.addEventListener("dial-timeline-clickNext", event => {
            this.next();
        });
        window.addEventListener("dial-timeline-clickPrev", event => {
            this.prev();
        });

        window.addEventListener("dial-timeline-clickPlayPause", event => {
            // this.$timeline.removeAction();
            // this.$grap.

        })

    }


    prev() {
        this.nextPrevCounter -= 1;
        this.$timeline.setNextStepIndicator(this.nextPrevCounter);
        if (this.running === false) {
            this.runSimulation();
        }
    }

    next() {
        this.nextPrevCounter += 1;
        this.$timeline.setNextStepIndicator(this.nextPrevCounter);
        if (this.running === false) {
            this.runSimulation();
        }
    }

    runSimulation() {

        if(this.nextPrevCounter > 0) {
            this.running = true;
            this.nextPrevCounter -= 1;

            let apiResponse = undefined;

            Promise.all([
                fetch("https://localhost:10101/next").then(response => response.json()),
                this.$timeline.animateTimeCursor(0, 0.5)
            ]).then(data => {
                const getProcessAddress = function (address) {
                    const addressArray = address.split("/");
                    return addressArray[0] + "/" + addressArray[1];
                }
                apiResponse = data[0];
                apiResponse.consumed_message.source = getProcessAddress(apiResponse.consumed_message.source);
                apiResponse.consumed_message.target = getProcessAddress(apiResponse.consumed_message.target);
                apiResponse.produced_messages.forEach(message => {
                    message.source = getProcessAddress(message.source);
                    message.target = getProcessAddress(message.target);
                });
                return new Promise(function (resolve, reject) {
                    setTimeout(resolve, 1000);
                })
            }).then(() => {
                return this.$grap.receiveMessage(apiResponse.consumed_message, false);
            }).catch(() => {
                console.log("Can not animate receive for messages from outside of the topology");
            }).then(() => {
                apiResponse.produced_messages.forEach(message => {
                    this.$timeline.addAction(message.source, message.target, message.uuid);
                });
                const promiseArray = [];
                apiResponse.produced_messages.forEach(message => {
                    promiseArray.push(this.$grap.emitMessage(message, false));
                });
                return Promise.allSettled(promiseArray);
            }).then(() => {
                return this.$timeline.animateTimeCursor(0.5, 1);
            }).then(() => {
                this.running = false;
                if (this.nextPrevCounter !== 0) {
                    this.runSimulation();
                }
            });
        }

        if(this.nextPrevCounter < 0) {
            this.running = true;
            this.nextPrevCounter += 1;

            let apiResponse = undefined;

            Promise.all([
                fetch("https://localhost:10101/prev").then(response => response.json()),
                this.$timeline.animateTimeCursor(1, 0.5)
            ]).then(data => {
                apiResponse = data[0];
                const getProcessAddress = function (address) {
                    const addressArray = address.split("/");
                    return addressArray[0] + "/" + addressArray[1];
                }
                apiResponse.reverted_message.source = getProcessAddress(apiResponse.reverted_message.source);
                apiResponse.reverted_message.target = getProcessAddress(apiResponse.reverted_message.target);
                apiResponse.removed_messages.forEach(message => {
                    message.source = getProcessAddress(message.source);
                    message.target = getProcessAddress(message.target);
                });
                return new Promise(function (resolve, reject) {
                    setTimeout(resolve, 100);
                })
            }).then(() => {
                const promiseArray = [];
                apiResponse.removed_messages.forEach(message => {
                    promiseArray.push(this.$grap.emitMessage(message, true));
                });
                return Promise.allSettled(promiseArray);
            }).then(() => {
                return this.$grap.receiveMessage(apiResponse.reverted_message, true);
            }).catch(() => {
                console.log("Can not animate emit for messages from outside of the topology");
            }).then(() => {
                return this.$timeline.animateTimeCursor(0.5, 0);
            }).then(() => {
                this.running = false;
                if (this.nextPrevCounter !== 0) {
                    this.runSimulation();
                }
            });
        }

        this.$timeline.setNextStepIndicator(this.nextPrevCounter);

    }

    graphLoadTopology() {
        Promise.all([
            fetch("https://localhost:10101/topology").then(response => response.json()),
            fetch("https://localhost:10101/messages").then(response => response.json())
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
                return [{from: item.A, to: item.B, number: from_to_count}, {from: item.B, to: item.A, number: to_from_count}];
            });
            this.$grap.initializeGraph(edges, processes, indicators);
        });
    }

    timelineLoadMessages() {
        Promise.all([
            fetch("https://localhost:10101/messages").then(response => response.json())
        ]).then(data => {
            data[0].messages.forEach(message => {
                this.$timeline.addAction(message.source, message.target, message.uuid)
            });
            this.$timeline.setPosition(data[0].position);
            this.$timeline.setPosition(data[0].position);
        });
    }

    editorLoadSimulator() {
        Promise.all([
            fetch("https://localhost:10101/topology").then(response => response.json()),
            fetch("https://localhost:10101/messages").then(response => response.json()),
            fetch("https://localhost:10101/program_details/").then(response => response.json()),
            fetch("https://localhost:10101/programs").then(response => response.json())
        ]).then(data => {
            const processes = Object.keys(data[0].processes);
            var instances = [];
            Object.keys(data[2]).forEach(key => {
                instances = instances.concat(data[2][key].instances);
            });
            var messages = data[1].messages.map(message => {
                return message.uuid;
            });
            messages.splice(0, data[1].position);
            const programs = Object.keys(data[3]);

            const tableData = {
                "title": "Simulator",
                "tables": [
                    {
                        "title": "Processes",
                        "data": processes
                    },
                    {
                        "title": "Programs",
                        "data": programs
                    },
                    {
                        "title": "Instances",
                        "data": instances
                    },
                    {
                        "title": "Messages",
                        "data": messages
                    }
                ]
            };
            this.$navigator.display(tableData);
        });
    }





}
customElements.define('dial-simulator', Dial);