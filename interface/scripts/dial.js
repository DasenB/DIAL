
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
        
        
        #navigator-view {
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
        <div id="navigator-view">
            <dial-navigator id="navigator"></dial-navigator>
        </div>
        <dial-warning id="warning"></dial-warning>
    </div>
   
`;

class Dial extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(dial_template.content.cloneNode(true));
        // this.$graphView = this.shadowRoot.querySelector('#graph-view');
        this.$graph = this.shadowRoot.querySelector('#graph');
        // this.$timelineView = this.shadowRoot.querySelector('#timeline-view');
        this.$timeline = this.shadowRoot.querySelector('#timeline');
        this.$warning = this.shadowRoot.querySelector('#warning');
        // this.$editorView = this.shadowRoot.querySelector('#editor-view');
        this.$navigator = this.shadowRoot.querySelector('#navigator');

        this.API = new API("localhost", 10101);

        this.nextPrevCounter = 0;
        this.running = false;
        this.playPressed = false;
        this.loadViews();

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

        window.addEventListener("dial-navigator-init", event => {
            this.$navigator.init(this.API);
            this.$navigator.setAddress("");
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
            const order = this.$timeline.getFutureActionOrder();
            this.API.updateOrder(order).catch(reason => {
                this.$warning.displayText(reason);
            });
        });

        window.addEventListener("dial-timeline-startReorderDrag", event => {
            this.stop();
        });

    }

    loadViews() {
        Promise.all([
            // this.loadEditorOverview(),
            this.loadTimelineMessages(),
            this.loadGraphTopology()
        ]).catch(reason => {
            this.$warning.displayText("Can not connect to server.");
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
        this.API.loadPath("jump_to_end").catch(reason => {
            this.$warning.displayText("Failed to connect to server.");
        }).then(() => {
            this.loadViews();
            this.stop();
        });
    }

    jumpToStart() {
        this.API.loadPath("jump_to_start").catch(reason => {
            this.$warning.displayText("Failed to connect to server.");
        }).then(() => {
            this.loadViews();
            this.stop();
        });
    }

    runNext() {
        let apiResponse = undefined;

        return this.API.nextStep().catch((reason) => {
            console.warn(reason);
            this.$warning.displayText("Can not load next step.");
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
            this.$warning.displayText("Can not load previous step.");
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
        return this.API.loadGraphTopology().catch(reason => {
            throw new Error("Failed to load data for GraphTopology.", {cause: reason});
        }).then( data => {
            this.$graph.initializeGraph(data.edges, data.processes, data.indicators);
        });
    }

    loadTimelineMessages() {
        return this.API.loadPath("messages").catch(reason => {
            throw new Error("Failed to load data for TimelineMessages.", {cause: reason});
        }).then(data => {
            this.$timeline.removeAllActions();
            data.messages.forEach(message => {
                const source = new Address(message.source);
                const target = new Address(message.target);
                const source_str = source.process + "/" + source.program  + (source.instance === undefined ? "" : "#" + source.instance);
                const target_str = target.process + "/" + target.program + (target.instance === undefined ? "" : "#" + target.instance);
                this.$timeline.addAction(source_str, target_str, message.uuid)
            });
            this.$timeline.setPosition(data.position);
        });
    }




}
customElements.define('dial-simulator', Dial);