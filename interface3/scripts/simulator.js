import {css, html, LitElement} from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';
import {API} from "../scripts/api.js";
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
    }

    firstUpdated() {
        this.$graph = this.renderRoot.querySelector("dial-graph");
        this.$menu = this.renderRoot.querySelector("dial-menu");
        this.setupEventHandlers();

        // Cave: This is a race condition that need to be fixed (but attempt below did not work as expected)
        this.loadTopology();
        this.loadTime();
        this.loadMessages();

        // // TODO: Repair problem that leads to the initial time always being 0/0 even if backend time is already way further
        // this.loadTopology()
        //     .then(() => {
        //         return this.loadTime;
        //     }).then(() => {
        //         return this.loadMessages();
        //     }).then( () => {
        //         this.updateMessages();
        //         this.updateTime();
        //     }
        // );
    }

    setupEventHandlers() {
        document.addEventListener("dial-menu:reset", (e) => {
            this.api.get("reset").then(response => {
                this.isFetchingData = false;
                this.isRunning = false;
                this.loadTopology();
                this.loadTime();
                this.loadMessages();
            });
        });

        document.addEventListener("dial-menu:play-pause", (e) => {
            if(this.isRunning) {
                this.isRunning = false;
                this.time.animationTime.lastFrame = undefined;
            } else {
                this.run(true);
            }
        });

        document.addEventListener("dial-menu:change-speed", (e) => {
            this.speed = e.detail.speed;
        });

        document.addEventListener("dial-menu:step-forward", (e) => {
            this.api.get(`step-forward/1`).then(response => {
                this.isFetchingData = false;
                this.isRunning = false;
                this.loadTime();
                this.loadMessages();
                this.updateMessages();
                this.updateTime();
            });
        });
    }


    run(start) {
        if(start) {
            this.isRunning = true;
        }

        // Update Time
        const current_frame_time = Date.now();
        if (this.time.animationTime.lastFrame === undefined) {
            this.time.animationTime.lastFrame = current_frame_time;
        }
        const time_since_last_frame = (current_frame_time - this.time.animationTime.lastFrame) / 1000;
        this.time.animationTime.lastFrame = current_frame_time;
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
            this.$graph.setTopology({
                nodes: new vis.DataSet(nodes),
                edges: new vis.DataSet(edges),
            });
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

    updateMessages() {
        const graphMessages = [];
        Object.keys(this.messages).forEach(t => {
            this.messages[t].forEach(msg => {
                const graphMessage = new DialGraphMessage(
                    msg.id,
                    msg.source.split("/")[0],
                    msg.target.split("/")[0],
                    msg.creation_time,
                    msg.arrival_time,
                    msg.arrival_theta,
                    msg.color,
                    msg.is_lost == "True",
                    msg.self_message == "True"
                );
                graphMessages.push(graphMessage);
            });
        });
        this.$graph.setMessages(graphMessages);
    }

    updateTime() {
        this.$graph.setTime(this.time.frontendTime.time);
        this.time.frontendTime.time = Number(this.time.frontendTime.time); // TODO After fixing the problem at its root
        this.$menu.setTimeIndicator(this.time.frontendTime.time, this.time.frontendTime.theta);
    }

    updateState() {
        console.log("UpdateState");
    }

    timeForward(time) {
        this.api.get(`time-forward/${time}`).then(response => {
            this.time.backendTime.time = Number(response.time);
            this.time.backendTime.theta = Number(response.theta);
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
                this.isRunning = false;
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

    loadStates() {
        this.api.get("states").then(states => {
            // console.log(states);
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
        `;
    }
}
customElements.define('dial-simulator', DialSimulator);
