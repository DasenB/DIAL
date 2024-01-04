import {css, html, LitElement} from '../libraries/lit-core.js';

class DialState extends LitElement {

    static properties = {
        address: {
            type: String
        },
        color: {
            type: String
        },
        neighbors: {
            type: Array
        },
    };

    constructor() {
        super();
        this.address = "Node/Algorithm/Instance";
        this.color = "#ffffff";
        this.neighbors = [];
    }

    emitEvent(name, data) {
        console.log(name);
        const event = new CustomEvent(`state:${name}`, {
            detail: data,
            bubbles: true,
            composed: true,
            cancelable: true,
        });
        this.dispatchEvent(event);
    }

    highlightState() {
        this.emitEvent("highlight", this.address);
    }

    editState() {
        this.emitEvent("edit", this.address);
    }

    static styles = css`
      :host {
        width: 100%;
      }

      #state-card {
        width: 100%;
        min-width: 350px;
      }

      #state-card [slot='header'] {
        display: flex;
        align-items: center;
        justify-content: space-between;
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

      td > sl-tag {
        margin-top: 0px;
        margin-bottom: 0px;
        margin-left: 5px;
        margin-right: 0px;
      }
      
    `;

    render() {
        return html`
            <style>
                .color-circle {
                    background-color: ${this.color};
                }
            </style>
            
            <sl-card id="state-card">
                <div slot="header">
                    <div class="color-circle"></div>
                    <sl-tag variant="primary">Node ${this.address.split("/")[0]}</sl-tag>
                    <div>
                        <sl-tooltip placement="bottom" content="Highlight State">
                            <sl-icon-button name="binoculars" label="Highlight" @click="${this.highlightState}" ></sl-icon-button>
                        </sl-tooltip>
                        <sl-tooltip placement="bottom" content="Edit State" @click="${this.editState}">
                            <sl-icon-button name="pencil" label="Edit"></sl-icon-button>
                        </sl-tooltip>
                    </div>
                </div>
                <table>
                    <tr><th>Address</th><td>${this.address}</td></tr>
                    <tr><th>Neighbors</th><td>
                        ${this.neighbors.map((neighbor) =>
                                html`<sl-tag>${neighbor}</sl-tag>`
                        )}
                    </td></tr>
                </table>
            </sl-card>
        `;
    }
}
customElements.define('dial-state', DialState);
