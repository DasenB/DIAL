import {css, html, LitElement, nothing} from '../libraries/lit-core.js';

class DialMessage extends LitElement {

    static properties = {
        messageId: {
            type: String
        },
        titleStr: {
            type: String
        },
        sourceAddress: {
            type: String
        },
        targetAddress: {
            type: String
        },
        creationTime: {
            type: String
        },
        time: {
            type: Number
        },
        theta: {
            type: Number
        },
        color: {
            type: String
        },
        received: {
            type: Boolean
        },
        disableEditing: {
            type: Boolean
        },
        isLost: {
            type: Boolean
        }
    };

    constructor() {
        super();
        this.received = false;
        this.disableEditing = false;
        this.isLost = false;
        this.titleStr = "Example Title";
        this.sourceAddress = "SomeNode/Algorithm/Instance";
        this.targetAddress = "OtherNode/Algorithm/Instance";
        this.theta = 0;
        this.time = 0;
        this.creationTime = "0/0";
        this.color = "#ff0000";
        this.messageId = undefined;
    }

    firstUpdated(t) {
        this.$dialog = this.renderRoot.getElementById("time-dialog");
        this.$timeInput = this.renderRoot.getElementById("time-input");
        this.$thetaInput = this.renderRoot.getElementById("theta-input");
    }

    openTimeDialog(messageId) {
        this.$dialog.show();
        console.log(messageId);
    }

    emitEvent(name, data) {
        console.log(name);
        const event = new CustomEvent(`message:${name}`, {
            detail: data,
            bubbles: true,
            composed: true,
            cancelable: true,
        });
        this.dispatchEvent(event);
    }

    editMessage() {
        this.emitEvent("edit", this.messageId);
    }

    highlightMessage() {
        this.emitEvent("highlight", this.messageId);
    }

    deleteMessage() {
        this.emitEvent("delete", this.messageId);
    }

    reschedule(event) {
        let time = this.$timeInput.value;
        if(time === "" || time === undefined) {
            time = this.time;
        }
        let theta = this.$thetaInput.value;
        if(theta === "" || theta === undefined) {
            theta = this.theta;
        }
        let data = {
            id: this.messageId,
            newTime: time,
            newTheta: theta,
        }
        this.$dialog.hide();
        this.$timeInput.value = "";
        this.$thetaInput.value = "";
        this.emitEvent("reschedule", data);
    }


    static styles = css`
      :host {
        width: 100%;  
      }

      #message-card {
        width: 100%;
        min-width: 350px;
      }

      #message-card [slot='header'] {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      sl-icon-button[label="Delete"]::part(base):hover {
        color: var(--sl-color-danger-500);
      }
      
      .color-circle {
        width: 30px;
        height: 30px;
        border-color: var(--sl-color-neutral-300);
        border-width: var(--sl-input-border-width);
        border-style: solid;
        border-radius: 15px;
        box-sizing: border-box;
      }
      
      .color-circle > * {
        display: none;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
      }
      
      td, th {
        border: solid transparent;
        text-align: left;
        background-clip: padding-box;
      }
      
      th {
        padding-right: 20px;
      }

      tr + tr > td {
        border-top-width: 10px;
      }

      slot:not([name])::slotted(*) {
        display: inline-block;
        opacity: 0.4;
        height: 32px;
        width: 32px;
        cursor: move;
        position: absolute;
      }
      
    `;

    render() {
        // var randomColor = "#" + Math.floor(Math.random()*16777215).toString(16);
        var receivedStyle = css`
          #message-card::part(base) {
            background-color: var(--sl-color-neutral-200);
          }
          #message-card {
            --border-color: var(--sl-color-neutral-300);
          }

          sl-icon-button:hover {
            cursor: not-allowed !important;
          }
        `

        let cardButtons = html`
            <sl-tooltip placement="bottom" content="Highlight Message">
                <sl-icon-button ?disabled=${this.received} name="binoculars" label="Highlight" @click="${this.highlightMessage}"></sl-icon-button>
            </sl-tooltip>
            <sl-tooltip placement="bottom" content="Change Time">
                <sl-icon-button ?disabled=${this.received || this.disableEditing} name="clock" label="Time" @click="${this.openTimeDialog}"></sl-icon-button>
            </sl-tooltip>
            <sl-tooltip placement="bottom" content="Edit Message">
                <sl-icon-button ?disabled=${this.received || this.disableEditing} name="pencil" @click="${this.editMessage}" label="Edit"></sl-icon-button>
            </sl-tooltip>
            <sl-tooltip placement="bottom" content="Delete Message">
                <sl-icon-button ?disabled=${this.received || this.disableEditing} name="trash3" label="Delete" @click="${this.deleteMessage}"></sl-icon-button>
            </sl-tooltip>
        `;

        let isLostStyle = css`
          .color-circle > * {
            height: 100%;
            width: 100%;
            display: inline-block !important;
            color: var(--sl-color-neutral-300);
          }
        `;

        return html`
            <style>
                ${this.received ? receivedStyle : nothing}
                ${this.isLost ? isLostStyle : nothing}
                
                .color-circle {
                    background-color: ${this.color};
                }
            </style>
            <sl-dialog id="time-dialog" label="Change Time" class="dialog-focus">
                <sl-input id="time-input" autofocus label="Time" placeholder="${this.time}"></sl-input>
                <sl-input id="theta-input" autofocus label="Theta" placeholder="${this.theta}"></sl-input>
                <sl-button slot="footer" variant="primary" @click="${this.reschedule}">Set Time</sl-button>
            </sl-dialog>
            
            <sl-card id="message-card">
                <div slot="header">
                    <div class="color-circle">
                        <sl-icon name="x-lg" class="is-los-cross"></sl-icon>
                    </div>
                    <sl-tag variant="primary">Δ = ${this.theta}</sl-tag>
                    <div>
                        ${! this.received ? cardButtons : cardButtons }
                    </div>
                </div>
                <table>
                    <tr><th>Title</th><td>${this.titleStr}</td></tr>
                    <tr><th>Source</th><td>${this.sourceAddress}</td></tr>
                    <tr><th>Target</th><td>${this.targetAddress}</td></tr>
                    <tr><th>ID</th><td>${this.messageId}</td></tr>
                    <tr><th>Creation Time</th><td>${this.creationTime}</td></tr>
                </table>
            </sl-card>
        `;
    }
}
customElements.define('dial-message', DialMessage);
