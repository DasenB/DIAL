import {LitElement, html, css, unsafeCSS} from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';
// import {Sortable} from "https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js";
class DialTimeline extends LitElement {

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
        var cardGroups = this.renderRoot.querySelectorAll("dial-card-group");
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
        padding-left: 10px;
        padding-right: 10px;
        padding-top: 5px;
        padding-bottom: 5px;
      }
      
      .chosen {
        border-color: var(--sl-color-sky-300);
        background-color: var(--sl-color-sky-300);
      }
      
      .ghost {
        opacity: 0;
      }
      
      dial-card-group dial-message {
        border: solid 4px transparent;
        display: inline-block;
        box-sizing: border-box;
        border-radius: var(--sl-border-radius-medium);
      }
      
      :host > dial-message {
        display: block;
        width: calc(100% - 10px) !important;
        margin-left: 5px;
        margin-top: 10px;
        margin-bottom: 20px;
      }

    `;

    render() {
        return html`
            <dial-card-group time=5>
                <dial-message><div class="handle"></div></dial-message>
                <dial-message><div class="handle"></div></dial-message>
                <dial-message><div class="handle"></div></dial-message>
            </dial-card-group>
            <dial-card-group time=8>
                <dial-message><div class="handle"></div></dial-message>
                <dial-message><div class="handle"></div></dial-message>
            </dial-card-group>
            <dial-card-group time=9>
                <dial-message><div class="handle"></div></dial-message>
                <dial-message><div class="handle"></div></dial-message>
            </dial-card-group>
            <dial-message><div class="handle"></div></dial-message>
            <dial-message><div class="handle"></div></dial-message>

        `;
    }
}
customElements.define('dial-timeline', DialTimeline);
