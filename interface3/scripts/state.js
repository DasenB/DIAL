import {LitElement, html, css, unsafeCSS} from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';

class DialState extends LitElement {

    static properties = {

    };

    constructor() {
        super();
    }



    static styles = css`
      :host {
        
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

      sl-tag {
        margin-top: 5px;
        margin-bottom: 0px;
        margin-left: 0px;
        margin-right: 0px;
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
            
            <sl-card id="state-card">
                <div slot="header">
                    <div class="color-circle"></div>
                    <sl-tag variant="primary">A/flooding/example_instance</sl-tag>
                    <div>
                        <sl-tooltip placement="bottom" content="Highlight Node">
                            <sl-icon-button name="binoculars" label="Highlight"></sl-icon-button>
                        </sl-tooltip>
                        <sl-tooltip placement="bottom" content="Edit state">
                            <sl-icon-button name="pencil" label="Edit"></sl-icon-button>
                        </sl-tooltip>
                    </div>
                </div>
                <table>
                    <tr><th>Address</th><td>A/flooding/example_instance</td></tr>
                    <tr><th>Neighbors</th><td>
                        <sl-tag>Node A</sl-tag>
                        <sl-tag>Node Start</sl-tag>
                        <sl-tag>Node Example</sl-tag>
                        <sl-tag>Node A Really Long Node Name</sl-tag>
                    </td></tr>
                </table>
            </sl-card>
        `;
    }
}
customElements.define('dial-state', DialState);
