import {LitElement, html, css, unsafeCSS} from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';

class DialMessage extends LitElement {

    static properties = {

    };

    constructor() {
        super();
    }

    openTimeDialog() {
        this.renderRoot.getElementById("time-dialog").show();
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
      
      sl-icon-button[label="Move"]::part(base) {
        cursor: move !important;
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
        var randomColor = Math.floor(Math.random()*16777215).toString(16);

        return html`
            <style>
                .color-circle {
                    background-color: #${randomColor};
                }
            </style>
            <sl-dialog id="time-dialog" label="Change Time" class="dialog-focus">
                <sl-input autofocus label="Time" placeholder=""></sl-input>
                <sl-button slot="footer" variant="primary">Close</sl-button>
            </sl-dialog>
            
            <sl-card id="message-card">
                <div slot="header">
                    <div class="color-circle"></div>
                    <sl-tag>Δ = 10</sl-tag>
                    <div>
                        <sl-tooltip placement="bottom" content="Change Δ"><slot></slot><sl-icon-button name="list" label="Move"></sl-icon-button></sl-tooltip>
                        <sl-tooltip placement="bottom" content="Change Time"><sl-icon-button name="clock" label="Time" @click="${this.openTimeDialog}"></sl-icon-button></sl-tooltip>
                        <sl-tooltip placement="bottom" content="Edit Message"><sl-icon-button name="pencil" label="Edit"></sl-icon-button></sl-tooltip>
                        <sl-tooltip placement="bottom" content="Delete Message"><sl-icon-button name="trash3" label="Delete"></sl-icon-button></sl-tooltip>
                    </div>
                </div>
                <table>
                    <tr><th>Title</th><td>A sample message</td></tr>
                    <tr><th>Source</th><td>A/flooding/instance1</td></tr>
                    <tr><th>Target</th><td>B/flooding/instance1</td></tr>
                </table>
            </sl-card>
        `;
    }
}
customElements.define('dial-message', DialMessage);
