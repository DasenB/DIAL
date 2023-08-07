import {LitElement, html, css, unsafeCSS} from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';
// import {Sortable} from "https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js";
class DialDetailView extends LitElement {

    static properties = {
        // minSize: {
        //     attribute: "min-size",
        //     reflect: true,
        //     type: Number
        // }
    };

    constructor() {
        super();
        this.sortables = [];
    }

    firstUpdated() {
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


    static styles = css`
      :host {
        position: absolute;
        display: block;
        box-sizing: border-box;
        overflow: scroll;
        width: 100%;       
        height: 100%;
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
        top: 60.5px;
        position: absolute;
        overflow: scroll;
      }

      sl-tab-panel::part(base) {
        padding: 0;
      }
      
      .chosen {
        border-color: var(--sl-color-sky-300);
        background-color: var(--sl-color-sky-300);
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

        const messageView = html`
            <dial-card-group headline="t=5">
                <div class="past-messages">
                    <dial-message received><div class="handle"></div></dial-message>
                    <dial-message received><div class="handle"></div></dial-message>
                    <dial-message received><div class="handle"></div></dial-message>
                </div>
                <div class="future-messages">
                <dial-message><div class="handle"></div></dial-message>
                <dial-message><div class="handle"></div></dial-message>
                <dial-message><div class="handle"></div></dial-message>
            </div>
            </dial-card-group>
            <dial-card-group headline="t=7">
                <dial-message><div class="handle"></div></dial-message>
            </dial-card-group>
            <dial-card-group headline="t=8">
                <dial-message><div class="handle"></div></dial-message>
                <dial-message><div class="handle"></div></dial-message>
            </dial-card-group>
            <dial-card-group headline="t=9">
                <dial-message><div class="handle"></div></dial-message>
                <dial-message><div class="handle"></div></dial-message>
            </dial-card-group>
        `

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
