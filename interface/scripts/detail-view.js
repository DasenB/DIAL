import {css, html, LitElement, nothing} from '../libraries/lit-core.js';
// import {Sortable} from "https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js";
class DialDetailView extends LitElement {

    static properties = {
        messages: {
            state: true,
            hashChanged: () => {return true;}
        },
        states: {
          state: true,
          hashChanged: () => {return true;}
        },
        time: {
            state: true,
            hashChanged: (newTime, oldTime) => {
              return Math.floor(newTime) !== oldTime;
            },
        },
        theta: {
            state: true,
        },
        editingEnabled: {
            state: true,
            type: Boolean
        },
    };

    constructor() {
        super();
        this.sortables = [];
        this.messages = {};
        this.states = {};
        this.time = 0;
        this.theta = 0;
        this.editingEnabled = true;
    }


    emitEvent(name, data) {
        console.log(name);
        const event = new CustomEvent(`detail-view:${name}`, {
            detail: data,
            bubbles: true,
            composed: true,
            cancelable: true,
        });
        this.dispatchEvent(event);
    }


    setMessages(messages) {
        this.messages = messages;
        this.requestUpdate();
    }

    setStates(states) {
        this.states = states;
        this.requestUpdate();
    }

    allowModifications(bool) {
        this.editingEnabled = bool;
    }

    setProgress(frontendTime, frontendTheta, backendTime, backendTheta) {
        if((frontendTime % 1) !== 0) {
            frontendTheta = Infinity;
        }
        if(frontendTheta === undefined) {
            frontendTheta = 0;
        }
        this.time = Math.floor(frontendTime);
        this.theta = frontendTheta;
        this.backendTime = backendTime;
        this.backendTheta = backendTheta;
    }


    static styles = css`
      :host {
        position: absolute;
        display: block;
        box-sizing: border-box;
        overflow: scroll;
        width: 100%;       
        height: 100%;
        min-width: 400px;
      }

      sl-tab::part(base) {
        font-size: var(--sl-font-size-medium);
        font-weight: var(--sl-font-weight-semibold);
      }
      
      
      sl-tab-group {
        --indicator-color: var(--sl-color-blue-900);
        --track-width: 5px;
      }
      sl-tab-group::part(tabs) {
        background-color: var(--sl-color-neutral-0);
      }

      sl-tab-group::part(body) {
        //background-color: var(--sl-color-neutral-0);
        padding-left: 10px;
        padding-right: 10px;
        height: calc(100% - 60.5px);
        width: 100%;
        top: 60.5px;
        position: absolute;
        overflow: scroll;
      }

      sl-tab-panel::part(base) {
        padding: 0;
      }
      
      dial-card-group dial-message, dial-card-group dial-state {
        border: solid 4px transparent;
        display: inline-block;
        box-sizing: border-box;
        border-radius: var(--sl-border-radius-medium);
      }

      .past-messages {
        //background-color: red;
      }

      .selected {
        border-color: var(--sl-color-sky-500);
        background-color: var(--sl-color-sky-500);
      }

    `;

    render() {
        let messageView = [];
        let sortedTimeKeys = Object.keys(this.messages).sort(
            (a, b) => {
                return  Number(a) - Number(b);
            });
        let isFirstMessage = true;
        sortedTimeKeys.forEach(time => {
            let pastMessages = [];
            let currentMessages = [];
            let futureMessages = [];
            this.messages[time].forEach(msg => {
                let wasCreated =
                    (msg.creation_time <= this.time)
                    ||
                    (msg.creation_time === this.time && msg.creation_theta <= this.theta);
                if (!wasCreated && msg.parent !== 'None') {
                    return;
                }
                let wasReceived =
                    (msg.arrival_time < this.time)
                    ||
                    (msg.arrival_time === this.time && msg.arrival_theta <= this.theta);
                let processedByBackend =
                    (msg.arrival_time < this.backendTime)
                    ||
                    (msg.arrival_time === this.backendTime && msg.arrival_theta <= this.backendTheta)
                    ||
                    (isFirstMessage && this.backendTime !== null);
                isFirstMessage = false;

                let messageView = html`
                    <dial-message 
                            messageId="${msg.id}"
                            titleStr="${msg.title}" 
                            color="${msg.color}" 
                            sourceAddress="${msg.source}"
                            targetAddress="${msg.target}"
                            theta="${msg.arrival_theta}"
                            time="${msg.arrival_time}"
                            creationTime="${msg.creation_time + "/" + msg.creation_theta}"
                            ?received=${wasReceived}
                            ?disableEditing=${!this.editingEnabled || processedByBackend}
                            ?isLost=${msg.is_lost === "True"}
                            class="${msg.selected ? "selected": "" }"
                    ></dial-message>
                `;

                if (wasReceived) {
                    pastMessages.push(messageView);
                } else if (processedByBackend) {
                    currentMessages.push(messageView);
                } else {
                    futureMessages.push(messageView);
                }
            });

            if(pastMessages.length + futureMessages.length + currentMessages.length === 0) {
                return;
            }
            let cardGroup = html`
            <dial-card-group headline="t = ${time}">
                <div class="past-messages">
                    ${pastMessages}
                </div>
                <div class="current-messages">
                    ${currentMessages}
                </div>
                <div class="future-messages">
                    ${futureMessages}
                </div>
            </dial-card-group>
            `;
            messageView.push(cardGroup);
        });

        let stateView = html`
            <dial-card-group headline="flooding/example1">
                <dial-state></dial-state>
                <dial-state></dial-state>
            </dial-card-group>
            <dial-card-group headline="echo/test_instance">
                <dial-state></dial-state>
                <dial-state></dial-state>
                <dial-state></dial-state>
            </dial-card-group>
        `
        stateView =  [];

        let states = {};
        if(this.states.colors !== undefined) {
            Object.keys(this.states.colors).forEach(time => {
                if(Number(time.split("/")[0]) > this.time) {
                    return;
                }
                Object.keys(this.states.colors[time]).forEach(instanceAddress => {
                    let splitAddress = instanceAddress.split("/");
                    let stateGroup = splitAddress[1] + "/" + splitAddress[2];
                    if (states[stateGroup] === undefined) {
                      states[stateGroup] = {};
                    }
                    let neighborString = this.states.neighbors[time][instanceAddress].replace(/'/g, '"');
                    states[stateGroup][splitAddress[0]] = {
                        address: instanceAddress,
                        color: this.states.colors[time][instanceAddress],
                        neighbors: JSON.parse(neighborString)
                    }
                });
            });
        }

        Object.keys(states).forEach(stateAddress => {
            let stateElements = [];
            Object.keys(states[stateAddress]).forEach(node => {
                let address = states[stateAddress][node].address;
                let color = states[stateAddress][node].color;
                let neighbors = states[stateAddress][node].neighbors;
                stateElements.push(html`
                <dial-state color="${color}" address="${address}" neighbors="${JSON.stringify(neighbors)}"></dial-state>
                `);
            });

            let cardGroup = html`
               <dial-card-group headline="${stateAddress}">
                   ${stateElements}
               </dial-card-group>
            `;
            stateView.push(cardGroup);
        });

        return html`
            <sl-tab-group>
                <sl-tab slot="nav" panel="general">Messages</sl-tab>
                <sl-tab slot="nav" panel="custom">Node States</sl-tab>
                <sl-tab-panel name="general">
                    ${messageView}
                </sl-tab-panel>
                <sl-tab-panel name="custom">
                    ${stateView}
                </sl-tab-panel>
            </sl-tab-group>
        `;
    }
}
customElements.define('dial-detail-view', DialDetailView);
