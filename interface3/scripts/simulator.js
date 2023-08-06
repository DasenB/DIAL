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
      
      sl-tab::part(base) {
        //color: var(--sl-color-neutral-0);
        font-size: var(--sl-font-size-medium);
        font-weight: var(--sl-font-weight-semibold);
      }
      sl-tab-panel::part(base) {
        padding: 0;
      }
      sl-tab-group {
        --indicator-color: var(--sl-color-blue-900);
        //--track-color: var(--sl-color-blue-900);
        --track-width: 5px;
      }
      sl-tab-group::part(base) {
        background-color: var(--sl-color-neutral-0);
        
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
      
      dial-timeline {
        height: calc(100% - 60.5px);
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
                    <sl-tab-group>
                        <sl-tab slot="nav" panel="general">Messages</sl-tab>
                        <sl-tab slot="nav" panel="custom">Node States</sl-tab>
                        <sl-tab-panel name="general"><dial-timeline></dial-timeline></sl-tab-panel>
                        <sl-tab-panel name="custom">TODO</sl-tab-panel>
                    </sl-tab-group>
                </div>
            </sl-split-panel>
        `;
    }
}
customElements.define('dial-simulator', DialSimulator);
