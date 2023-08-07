import {LitElement, html, css, unsafeCSS} from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';

class DialSimulator extends LitElement {

    static properties = {
        // direction: {
        //     attribute: "direction",
        //     reflect: true,
        //     type: String
        // },
        // size: {
        //     attribute: "size",
        //     reflect: true,
        //     type: Number
        // },
        // minSize: {
        //     attribute: "min-size",
        //     reflect: true,
        //     type: Number
        // }
    };



    constructor() {
        super();
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
        background-color: var(--sl-color-amber-50);
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
