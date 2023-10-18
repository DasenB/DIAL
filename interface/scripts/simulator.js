import {css, html, LitElement} from '../libraries/lit-core.js';
import {API} from "../scripts/api.js";
import {CompareTime} from "../scripts/time.js";
import {DialGraphMessage} from "../scripts/graph.js";

class DialSimulator extends LitElement {

    constructor() {
        super();
        this.api = new API("localhost", 10101);
        this.time = {
            backendTime: {
                time: null,
                theta: null
            },
            frontendTime: {
                time: 0,
                theta: 0
            },
            animationTime: {
                lastFrame: undefined,
            }
        };
        this.speed = 0.5;
        this.messages = {};
        this.isRunning = false;
        this.isFetchingData = false;
        this.topology = {
            nodes: [],
            edges: [],
        };
        this.states = {};
        this.instanceUsedForStateColor = undefined;
    }

    updateView(selectCurrentMessage) {
        this.isFetchingData = false;
        this.stop();
        Promise.all([
            this.loadTime(),
            this.loadMessages(),
            this.loadStates(),
        ]).then(response => {
            Object.keys(this.messages).forEach(t => {
                this.messages[t].forEach((msg, index) => {
                    msg.selected =
                        (parseInt(this.time.frontendTime.time) === parseInt(t)) &&
                        (parseInt(this.time.frontendTime.theta) === parseInt(index));
                });
            });
            this.updateMessages();
            this.updateTime();
            this.updateStates();
        });
    }

    firstUpdated() {
        this.$graph = this.renderRoot.querySelector("dial-graph");
        this.$menu = this.renderRoot.querySelector("dial-menu");
        this.$dialog = this.renderRoot.querySelector("dial-dialog");
        this.$detailView = this.renderRoot.querySelector("dial-detail-view");
        this.$editor = this.renderRoot.querySelector("dial-editor");
        this.setupEventHandlers();

        this.loadTopology().then(() => {
            this.updateView();
        });
    }

    setupEventHandlers() {

        let discardUnsavedChangesDialog = {
            title: "Unsaved Changes",
            text: "The editor has unsaved changes that will be lost.",
            actions: [
                {
                    title: "Continue Editing",
                    handler: () => {
                        this.$dialog.closeDialog();
                    }
                },
                {
                    title: "Discard Changes",
                    handler: () => {
                        this.$editor.closeDocument();
                        this.$dialog.closeDialog();
                    }
                }
            ]
        };

        document.addEventListener("dial-menu:reset", (e) => {
            this.api.get("reset").then(response => {
                this.loadTopology().then(() => {
                    this.updateView();
                });
            });
        });

        document.addEventListener("dial-menu:play-pause", (e) => {
            if(this.$editor.hasUnsavedChanges()) {
                this.$dialog.pushDialogToQueue(discardUnsavedChangesDialog);
                this.$dialog.showDialog();
                return;
            }

            if(this.isRunning) {
                this.stop();
                this.time.animationTime.lastFrame = undefined;
            } else {
                this.run(true);
            }
        });

        document.addEventListener("dial-menu:change-speed", (e) => {
            this.speed = e.detail.speed;
        });

        document.addEventListener("dial-menu:change-instance", (e) => {
            this.instanceUsedForStateColor = e.detail.instance;
            this.updateStates();
        });

        document.addEventListener("dial-menu:fast-forward", (e) => {
            if(this.$editor.hasUnsavedChanges()) {
                this.$dialog.pushDialogToQueue(discardUnsavedChangesDialog);
                this.$dialog.showDialog();
                return;
            }
            this.api.get(`time-forward/100`).then(response => {
                this.updateView();
            });
        });

        document.addEventListener("dial-menu:fast-backward", (e) => {
            if(this.$editor.hasUnsavedChanges()) {
                this.$dialog.pushDialogToQueue(discardUnsavedChangesDialog);
                this.$dialog.showDialog();
                return;
            }
            this.api.get(`time-backward/100`).then(response => {
                this.updateView();
            });
        });

        document.addEventListener("dial-api:no-connection-to-backend", (e) => {
            let dialogData = {
                title: "API Error",
                text: "Can not connect to the HTTP-API provided by the python simulator.<br><br> Make sure the backend is accessible under the following address: <a href='https://localhost:10101'>https://localhost:10101</a>",
                actions: [
                    this.$dialog.defaultActions.reload
                ]
            }
            this.$dialog.pushDialogToQueue(dialogData);
            this.$dialog.showDialog();
        });

        document.addEventListener("dial-menu:step-forward", (e) => {
            if(this.$editor.hasUnsavedChanges()) {
                this.$dialog.pushDialogToQueue(discardUnsavedChangesDialog);
                this.$dialog.showDialog();
                return;
            }
            if(this.time.frontendTime.theta === undefined && this.time.backendTime.time !== null) {
                this.time.frontendTime.time = this.time.backendTime.time;
                this.time.frontendTime.theta = this.time.backendTime.theta;
                this.updateView();
                return;
            }
            this.api.get(`step-forward/1`).then(response => {
                this.updateView();
            });
        });

        document.addEventListener("dial-menu:step-backward", (e) => {
            if(this.$editor.hasUnsavedChanges()) {
                this.$dialog.pushDialogToQueue(discardUnsavedChangesDialog);
                this.$dialog.showDialog();
                return;
            }
            this.api.get(`step-backward/1`).then(response => {
                this.updateView();
            });
        });

        document.addEventListener("message:edit", (e) => {
            if(this.$editor.hasUnsavedChanges()) {
                this.$dialog.pushDialogToQueue(discardUnsavedChangesDialog);
                this.$dialog.showDialog();
                return;
            }
            this.api.get(`message/${e.detail}`).then(response => {
                this.$editor.setDocument("message/" + e.detail, response)
            });
        });

        document.addEventListener("message:highlight", (e) => {
            Object.keys(this.messages).forEach(t => {
                this.messages[t].forEach(msg => {
                    msg.selected = msg.id === e.detail;
                });
            });
            this.updateMessages();
        });

        document.addEventListener("message:reschedule", (e) => {
            console.log(e.detail);
            this.api.get(`reschedule/${e.detail.id}/${e.detail.newTime}/${e.detail.newTheta}`).then(response => {
                this.updateView();
            });
        });
    }

    stop() {
        this.$menu.setPlayState(false);
        this.isRunning = false;
        this.$detailView.allowModifications(true);
    }

    run(start) {
        if(start) {
            this.$menu.setPlayState(true);
            this.isRunning = true;
            this.$detailView.allowModifications(false);
        }

        // Update Time
        const current_frame_time = Date.now();
        if (this.time.animationTime.lastFrame === undefined) {
            this.time.animationTime.lastFrame = current_frame_time;
        }
        const time_since_last_frame = (current_frame_time - this.time.animationTime.lastFrame) / 1000;
        this.time.animationTime.lastFrame = current_frame_time;
        const oldFrontendTime = this.time.frontendTime.time;
        const oldFrontendTheta = this.time.frontendTime.theta;
        const newFrontendTime = this.time.frontendTime.time + (time_since_last_frame * this.speed);
        this.time.frontendTime.time = newFrontendTime;
        this.time.frontendTime.theta = undefined;

        // Find Messages that need to be processed
        if (this.time.backendTime === null && this.time.frontendTime.time >= Math.min(...Object.keys(this.messages))) {
            this.stepForward(1);
            this.isFetchingData = true;
        } else if (this.time.frontendTime.time >= this.time.backendTime.time) {
            this.timeForward(1);
            this.isFetchingData = true;
            this.time.frontendTime.time = this.time.backendTime.time;
            this.time.frontendTime.theta = this.time.backendTime.theta;
        }

        let secondChanged = Math.floor(Number(oldFrontendTime)) !== Math.floor(Number(newFrontendTime));
        let thetaChanged = this.time.frontendTime.theta !== oldFrontendTheta;
        if (thetaChanged === undefined) {
            thetaChanged = false;
        }
        if(secondChanged === undefined) {
            secondChanged = false;
        }

        if(secondChanged || thetaChanged) {
            this.updateStates();
        }


        this.updateTime();

        // Run animation if necessary
        if (this.isRunning && !this.isFetchingData) {
            requestAnimationFrame(() => {
                if(this.isRunning) {
                    this.run();
                }
            });
        }
    }

    loadTopology() {
        return this.api.get("topology").then(response => {
            const nodes = response.nodes.map(node => ({
                id: node,
                label: node
            }));
            const edges = response.edges.map(edge => ({
                from: edge[0],
                to: edge[1]
            }));
            this.topology = {
                nodes: new vis.DataSet(nodes),
                edges: new vis.DataSet(edges),
            }
            this.$graph.setTopology(this.topology);
        });
    }

    loadMessages() {
        return this.api.get("messages").then(response => {
            this.messages = response.messages;
            this.updateMessages();
        });
    }

    loadTime() {
        return this.api.get("messages").then(response => {
            this.time.backendTime.time = response.time;
            this.time.frontendTime.theta = response.theta;
            if (response.time != null) {
                this.time.frontendTime.time = response.time;
                this.time.frontendTime.theta = response.theta;
            } else {
                let creationTimes = Object.values(response.messages).map(msgArray => msgArray.flatMap(msg => msg.creation_time));
                this.time.frontendTime.time = Math.min(...creationTimes.map(timeArray => Math.min(...timeArray)));
                this.time.frontendTime.theta = 0;
            }
            this.updateTime();
        });
    }

    loadStates() {
        return this.api.get("states").then(states => {
            this.states = states;
            // this.updateStates();
        });
    }

    updateStates() {
        console.log("update state");
        let instances = new Set();
        let nodeColors = {};

        Object.keys(this.states).forEach(timeTuple => {
            let addressString = Object.keys(this.states[timeTuple])[0];
            let color = this.states[timeTuple][addressString];
            let splitTimeTuple = timeTuple.split("/");
            let splitAddress = addressString.split("/");
            let time = {
                time: splitTimeTuple[0],
                theta: splitTimeTuple[1]
            }
            let address = {
                node: splitAddress[0],
                algorithm: splitAddress[1],
                instance: splitAddress[2],
            }
            let instance = address.algorithm + "/" + address.instance;
            instances.add(instance);
            if(this.instanceUsedForStateColor === undefined) {
                this.instanceUsedForStateColor = instance;
                this.$menu.setInstanceAddresses(instance);
            }
            if(CompareTime(this.time.frontendTime, time) >= 0 && this.instanceUsedForStateColor === instance) {
                nodeColors[address.node] = color;
            }
        });

        let instanceArray = Array.from(instances);
        this.$menu.setInstanceAddresses(instanceArray);

        this.topology.nodes.forEach(node => {
            this.$graph.setNodeColor(node.id, nodeColors[node.id]);
        });

    }


    updateMessages() {
        const graphMessages = [];
        Object.keys(this.messages).forEach(t => {
            this.messages[t].forEach(msg => {
                let graphMessage = new DialGraphMessage(
                    msg.id,
                    msg.source.split("/")[0],
                    msg.target.split("/")[0],
                    msg.creation_time,
                    msg.arrival_time,
                    msg.arrival_theta,
                    msg.color,
                    msg.is_lost === "True",
                    msg.self_message === "True"
                );
                if (msg.selected !== undefined) {
                    graphMessage.selected = msg.selected;
                }
                graphMessages.push(graphMessage);
            });
        });
        this.$detailView.setMessages(this.messages);
        this.$graph.setMessages(graphMessages);
    }

    updateTime() {
        this.time.frontendTime.time = Number(this.time.frontendTime.time); // TODO After fixing the problem at its root
        this.$graph.setTime(this.time.frontendTime.time);
        this.$menu.setTimeIndicator(this.time.frontendTime.time, this.time.frontendTime.theta);
        this.$detailView.setProgress(
            this.time.frontendTime.time,
            this.time.frontendTime.theta,
            this.time.backendTime.time,
            this.time.backendTime.theta
        );
    }

    timeForward(time) {
        this.api.get(`time-forward/${time}`).then(response => {
            this.time.backendTime.time = Number(response.time);
            this.time.backendTime.theta = Number(response.theta);
            this.loadStates();
            if (response.actions.length > 0) {
                this.api.get("messages").then(messages => {
                    this.messages = messages.messages;
                    this.isFetchingData = false;
                    this.updateMessages();
                    if(this.isRunning) {
                        this.run();
                    }
                });
            } else {
                this.stop();
                this.isFetchingData = false;
                this.time.frontendTime.time = Number(response.time);
                this.time.frontendTime.theta = Number(response.theta);
                this.updateTime();
            }
        });
    }

    stepForward(steps) {
        this.api.get(`step-forward/${steps}`).then(response => {
            this.time.backendTime.time = Number(response.time);
            this.time.backendTime.theta = Number(response.theta);
            this.loadStates();
            this.api.get("messages").then(messages => {
                this.messages = messages.messages;
                this.isFetchingData = false;
                this.updateMessages();
                if(this.isRunning) {
                    this.run();
                }
            });
        });
    }



    static styles = css`
      :host {
        box-sizing: border-box;
        display: block;
        position: absolute;
        overflow: hidden;
      }
      sl-split-panel {
        height: 100%;
        width: 100%;
        position: relative;
        --divider-width: 20px;
      }
      sl-split-panel::part(divider) {
        background-color: var(--sl-color-neutral-200);
      }
      
      #horizontal-split { --max: 700px; }
      #vertical-split { --max: calc(80% - 10px); }
      #graph-container {
        position: relative;
      }
      #editor-container {
        background-color: aqua;
        position: relative;
      }
      #timeline-container {
        background-color: var(--sl-color-blue-900);
        position: relative;
      }
      dial-detail-view {
        height: 100%;
      }
      dial-graph {
        display: block;
        position: absolute;
        height: calc(100% - 80px) !important;
        width: 100%;
      }
    `;

    render() {
        return html`
            <sl-split-panel id="horizontal-split" primary="end" snap="10px 340px" position=25>
                <sl-icon slot="divider" name="grip-vertical"></sl-icon>
                <div slot="start">
                    <sl-split-panel id="vertical-split" vertical primary="end" snap="10px 50% 80%" position=20>
                        <sl-icon slot="divider" name="grip-horizontal"></sl-icon>
                        <div slot="start" id="graph-container">
                            <dial-menu></dial-menu>
                            <dial-graph></dial-graph>
                        </div>
                        <div slot="end" id="editor-container">
                            <dial-editor></dial-editor>
                        </div>
                    </sl-split-panel>
                </div>
                <div slot="end" id="timeline-container">
                    <dial-detail-view></dial-detail-view>
                </div>
            </sl-split-panel>
            <dial-dialog></dial-dialog>
        `;
    }
}
customElements.define('dial-simulator', DialSimulator);
