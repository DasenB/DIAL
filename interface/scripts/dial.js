
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
        this.$graphView = this.shadowRoot.querySelector('#graph-view');
        this.$graph = this.shadowRoot.querySelector('#graph');
        this.$timelineView = this.shadowRoot.querySelector('#timeline-view');
        this.$timeline = this.shadowRoot.querySelector('#timeline');
        this.$warning = this.shadowRoot.querySelector('#warning');
        this.$editorView = this.shadowRoot.querySelector('#editor-view');
        this.$editor = this.shadowRoot.querySelector('#editor');
        this.$navigator = this.shadowRoot.querySelector('#navigator');
        this.API = new API("localhost", 10101);

        this.loadEditorOverview();
        this.loadTimelineMessages();
        this.loadGraphTopology();

        const eventOptions = {
            bubbles: true,
            cancelable: true,
            composed: true,
        };

        this.nextPrevCounter = 0;
        this.running = false;
        this.playPressed = false;


        window.addEventListener("dial-timeline-clickNext", event => {
            this.next();
        });
        window.addEventListener("dial-timeline-clickPrev", event => {
            this.prev();
        });
        window.addEventListener("dial-timeline-clickJumpToEnd", event => {
            this.jumpToEnd();
        });
        window.addEventListener("dial-timeline-clickJumpToStart", event => {
            this.jumpToStart();
        });

        window.addEventListener("dial-timeline-clickPlayPause", event => {
            if (this.playPressed) {
                this.playPressed = false;
            } else {
                this.playPressed = true;
                this.nextPrevCounter = 0;
                this.$timeline.setNextStepIndicator(this.nextPrevCounter);
                if (!this.running) {
                    this.run();
                }
            }
        });

        window.addEventListener("dial-timeline-reordered", event => {
            const order = this.$timeline.getActionOrder();
            console.log(order);
        });

    }


    prev() {
        if (this.playPressed) {
            return;
        }
        this.nextPrevCounter -= 1;
        this.$timeline.setNextStepIndicator(this.nextPrevCounter);
        if (this.running === false) {
            this.run();
        }
    }

    next() {
        if (this.playPressed) {
            return;
        }
        this.nextPrevCounter += 1;
        this.$timeline.setNextStepIndicator(this.nextPrevCounter);
        if (this.running === false) {
            this.run();
        }
    }

    jumpToEnd() {
        fetch("https://localhost:10101/jump_to_end").then(() => {
            this.loadGraphTopology();
            this.loadTimelineMessages();
            this.loadEditorOverview();
            this.stop();
        });
    }

    jumpToStart() {
        fetch("https://localhost:10101/jump_to_start").then(() => {
            this.loadGraphTopology();
            this.loadTimelineMessages();
            this.loadEditorOverview();
            this.stop();
        });
    }

    runNext() {
        let apiResponse = undefined;

        return this.API.nextStep().catch((reason) => {
            console.warn(reason);
            this.$warning.displayText("Can not load the next step.");
            this.stop();
            return { then: () => {}};
        }).then( (data) => {
            apiResponse = data;
            return this.$timeline.animateTimeCursor(0, 0.5).catch((reason) => {
                console.warn(reason);
            });
        }).then(() => {
            return this.$graph.receiveMessage(apiResponse.consumed_message, false).catch((reason) => {
                console.warn("Can not run receive-animation for message:", apiResponse.consumed_message);
            });
        }).then(() => {
            apiResponse.produced_messages.forEach(message => {
                this.$timeline.addAction(message.source, message.target, message.uuid);
            });
            const promiseArray = [];
            apiResponse.produced_messages.forEach(message => {
                const emitPromise = this.$graph.emitMessage(message, false).catch((reason) => {
                    console.warn("Can not run emit-animation for message:", message)
                });
                promiseArray.push(emitPromise);
            });
            return Promise.allSettled(promiseArray);
        }).then(() => {
            return this.$timeline.animateTimeCursor(0.5, 1).catch((reason) => {
                console.warn(reason);
            });
        });
    }

    runPrev() {
        let apiResponse = undefined;
        return this.API.prevStep().catch((reason) => {
            console.warn(reason);
            this.$warning.displayText("Failed to load previous step.");
            this.stop();
            return { then: () => {}};
        }).then(data => {
            apiResponse = data;
            return this.$timeline.animateTimeCursor(1, 0.5).catch((reason) => {
                console.warn(reason);
            });
        }).then(() => {
            const promiseArray = [];
            apiResponse.removed_messages.forEach(message => {
                const emitPromise = this.$graph.emitMessage(message, true).catch((reason) => {
                    console.warn("Can not run emit-animation for message:", message)
                }).then((reason) => {
                    this.$timeline.removeAction(message.uuid);
                });
                promiseArray.push(emitPromise);
            });
            return Promise.allSettled(promiseArray);
        }).then(() => {
            return this.$graph.receiveMessage(apiResponse.reverted_message, true).catch(() => {
                console.warn("Can not run receive-animation for message:", apiResponse.reverted_message);
            });
        }).then(() => {
            return this.$timeline.animateTimeCursor(0.5, 0).catch((reason) => {
                console.warn(reason);
            });
        });
    }
    
    run() {
        // Do nothing if the simulation is already running
        if (this.running) {
            return;
        }
        // Run the animation forward if the play-button is pressed.
        if (this.playPressed === true) {
            this.running = true;
            this.nextPrevCounter = 0;
            this.runNext().then(() => {
                this.running = false;
                if (this.playPressed === true || this.nextPrevCounter !== 0) {
                    this.run();
                }
            });
            return;
        }
        // Run the animation forward if the next-button was pressed more often than the previous-button
        if(this.nextPrevCounter > 0) {
            this.running = true;
            this.nextPrevCounter -= 1;
            this.runNext().then(() => {
                this.running = false;
                if (this.playPressed === true || this.nextPrevCounter !== 0) {
                    this.run();
                }
            });
        }
        // Run the animation backwards if the previous-button was pressed more often than the next-button
        if(this.nextPrevCounter < 0) {
            this.running = true;
            this.nextPrevCounter += 1;
            this.runPrev().then(() => {
                this.running = false;
                if (this.playPressed === true || this.nextPrevCounter !== 0) {
                    this.run();
                }
            });
        }
        // Update the count indicator next to the previous- and next-button
        this.$timeline.setNextStepIndicator(this.nextPrevCounter);
    }

    stop() {
        this.running = false;
        this.nextPrevCounter = 0;
        this.$timeline.setNextStepIndicator(this.nextPrevCounter);
        this.playPressed = false;
        this.$timeline.setPlayButtonState(false);
    }

    loadGraphTopology() {
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
            this.$graph.initializeGraph(edges, processes, indicators);
        });
    }

    loadTimelineMessages() {
        Promise.all([
            fetch("https://localhost:10101/messages").then(response => response.json())
        ]).then(data => {
            this.$timeline.removeAllActions();
            data[0].messages.forEach(message => {
                this.$timeline.addAction(message.source, message.target, message.uuid)
            });
            this.$timeline.setPosition(data[0].position);
            this.$timeline.setPosition(data[0].position);
        });
    }

    loadEditorProcess(processAddress) {
        const tableData = {
            "title": "Simulator",
            "tables": [
                {
                    "title": "Processes",
                    "data": ["asd", "ofo"]
                },
                {
                    "title": "Programs",
                    "data": ["lala", "lop", "lilp"]
                }]
        };
        this.$navigator.display(tableData);
    }

    loadEditorOverview() {
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
                        "data": processes,
                        "clickHandler": this.loadEditorProcess
                    },
                    {
                        "title": "Programs",
                        "data": programs,
                        "clickHandler": this.loadEditorProcess
                    },
                    {
                        "title": "Instances",
                        "data": instances,
                        "clickHandler": this.loadEditorProcess
                    },
                    {
                        "title": "Messages",
                        "data": messages,
                        "clickHandler": this.loadEditorProcess
                    }
                ]
            };
            this.$navigator.display(tableData);
        });
    }





}
customElements.define('dial-simulator', Dial);