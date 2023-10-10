import {css, html, LitElement, nothing} from '../libraries/lit-core.js';
class DialCardGroup extends LitElement {

    static properties = {
        headline: {
            attribute: "headline",
            reflect: true,
            type: String
        }
    };

    constructor() {
        super();
        this.headline = undefined;
    }

    static styles = css`
      sl-card {
        margin-left: 5px;
        margin-right: 5px;
        margin-top: 20px;
        margin-bottom: 20px;
        --padding: 15px;
        display: block;
        min-width: 400px;

      }

      div[slot="header"] {
        margin-left: 5px;
        margin-right: 5px;
        padding-top: 5px;
        padding-bottom: 5px;
      }
      
    `;

    render() {
        let header = html`
            <div slot="header">
                <sl-tag variant="primary">${"" + this.headline}</sl-tag>
            </div>`;
        if (this.headline === undefined) {
            header = nothing;
        }

        return html`
            <sl-card id="card-group">
                ${header}
                <slot></slot>
            </sl-card>
        `;
    }
}
customElements.define('dial-card-group', DialCardGroup);
