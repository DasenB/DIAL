import {LitElement, html, css, nothing} from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';
class DialCardGroup extends LitElement {

    static properties = {
        title: {
            attribute: "title",
            reflect: true,
            type: Number
        }
    };

    constructor() {
        super();
        this.title = undefined;
    }

    static styles = css`
      sl-card {
        margin-left: 5px;
        margin-right: 5px;
        margin-top: 10px;
        margin-bottom: 10px;
        --padding: 15px;
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
                <sl-tag variant="primary">${"" + this.title}</sl-tag>
            </div>`;
        if (this.title === undefined) {
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
