import {css, html, LitElement} from '../libraries/lit-core.js';
// import {Sortable} from "https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js";
class DialDetailView extends LitElement {

    static properties = {
        messages: {
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
        }
    };

    constructor() {
        super();
        this.sortables = [];
        this.messages = {};
        this.time = 0;
        this.theta = 0;
        // this.states = {};
    }

    // firstUpdated() {
    // }

    willUpdate() {
        // Remove old sortable-objects
        this.sortables.forEach(sortable => {
            sortable.destroy();
        });
        this.sortables = [];
        // CAVE: Should fix the problem but highlights another deeper problem
        // var futureMessages = this.renderRoot.querySelectorAll("dial-card-group .future-messages dial-message");
        // futureMessages.forEach(msg => {
        //    msg.remove();
        // });
    }

    updated() {
        // Create new sortable objects
        var cardGroups = this.renderRoot.querySelectorAll("dial-card-group .future-messages");
        cardGroups.forEach(cardGroup => {
            var sortable = Sortable.create(cardGroup, {
                ghostClass: 'ghost',
                chosenClass: "chosen",
                handle: ".handle",
            });
            this.sortables.push(sortable);
        });
    }

    setMessages(messages) {
        this.messages = messages;
    }

    setProgress(time, theta) {
        this.time = Math.floor(time);
        if((time % 1) !== 0) {
            theta = Infinity;
        }
        if(theta === undefined) {
            theta = 0;
        }
        this.theta = theta;
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
      
      .chosen {
        border-color: var(--sl-color-sky-500);
        background-color: var(--sl-color-sky-500);
      }
      
      .ghost {
        opacity: 0;
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

    `;

    render() {
        let messageView = [];
        let sortedTimeKeys = Object.keys(this.messages).sort(
            (a, b) => {
                return  Number(a) - Number(b);
            });

        sortedTimeKeys.forEach(time => {
            let pastMessages = [];
            let futureMessages = [];
            this.messages[time].forEach(msg => {
                let wasCreated = msg.creation_time <= this.time || (msg.creation_time === this.time && msg.creation_theta <= this.theta);
                if (!wasCreated) {
                    return;
                }
                let wasReceived = msg.arrival_time < this.time || (msg.arrival_time === this.time && msg.arrival_theta <= this.theta);
                let messageView = html`
                    <dial-message 
                            messageId="${msg.id}"
                            title="${msg.title}" 
                            color="${msg.color}" 
                            sourceAddress="${msg.source}"
                            targetAddress="${msg.target}"
                            theta="${msg.arrival_theta}"
                            creationTime="${msg.creation_time + "/" + msg.creation_theta}"
                            ?received=${wasReceived}
                    ><div class="handle"></div></dial-message>
                `;
                if (wasReceived) {
                    pastMessages.push(messageView);
                } else {
                    futureMessages.push(messageView);
                }
            });

            if(pastMessages.length + futureMessages.length === 0) {
                return;
            }
            let cardGroup = html`
            <dial-card-group headline="t = ${time}">
                <div class="past-messages">
                    ${pastMessages}
                </div>
                <div class="future-messages">
                    ${futureMessages}
                </div>
            </dial-card-group>
            `;
            messageView.push(cardGroup);
        });

        const stateView = html`
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
