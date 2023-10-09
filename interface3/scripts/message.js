import {LitElement, html, css, nothing} from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';

class DialMessage extends LitElement {

    static properties = {
        messageId: {
            type: String
        },
        title: {
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
        theta: {
            type: Number
        },
        color: {
            type: String
        },
        received: {
            type: Boolean
        }
    };

    constructor() {
        super();
        this.received = false;
        this.title = "Example Title";
        this.sourceAddress = "SomeNode/Algorithm/Instance";
        this.targetAddress = "OtherNode/Algorithm/Instance";
        this.theta = 0;
        this.creationTime = "0/0";
        this.color = "#ff0000";
        this.messageId = undefined;
    }

    openTimeDialog(messageId) {
        this.renderRoot.getElementById("time-dialog").show();
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
                <sl-icon-button ?disabled=${this.received} name="binoculars" label="Highlight"></sl-icon-button>
            </sl-tooltip>
            <sl-tooltip placement="bottom" content="Change Δ">
                ${ !this.received ? html`<slot></slot>` : nothing}
                <sl-icon-button ?disabled=${this.received} name="list" label="Move" ></sl-icon-button>
            </sl-tooltip>
            <sl-tooltip placement="bottom" content="Change Time">
                <sl-icon-button ?disabled=${this.received} name="clock" label="Time" @click="${this.openTimeDialog}"></sl-icon-button>
            </sl-tooltip>
            <sl-tooltip placement="bottom" content="Edit Message">
                <sl-icon-button ?disabled=${this.received} name="pencil" @click="${this.editMessage}" label="Edit"></sl-icon-button>
            </sl-tooltip>
            <sl-tooltip placement="bottom" content="Delete Message">
                <sl-icon-button ?disabled=${this.received} name="trash3" label="Delete"></sl-icon-button>
            </sl-tooltip>
        `;

        return html`
            <style>
                ${this.received ? receivedStyle : nothing}
                
                .color-circle {
                    background-color: ${this.color};
                }
            </style>
            <sl-dialog id="time-dialog" label="Change Time" class="dialog-focus">
                <sl-input autofocus label="Time" placeholder=""></sl-input>
                <sl-button slot="footer" variant="primary">Set Time</sl-button>
            </sl-dialog>
            
            <sl-card id="message-card">
                <div slot="header">
                    <div class="color-circle"></div>
                    <sl-tag variant="primary">Δ = ${this.theta}</sl-tag>
                    <div>
                        ${! this.received ? cardButtons : cardButtons }
                    </div>
                </div>
                <table>
                    <tr><th>Title</th><td>${this.title}</td></tr>
                    <tr><th>Source</th><td>${this.sourceAddress}</td></tr>
                    <tr><th>Target</th><td>${this.targetAddress}</td></tr>
                    <tr><th>Creation Time</th><td>${this.creationTime}</td></tr>
                </table>
            </sl-card>
        `;
    }
}
customElements.define('dial-message', DialMessage);
