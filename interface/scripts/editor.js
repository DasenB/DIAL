import {css, html, LitElement} from '../libraries/lit-core.js';

// import "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/codemirror.min.js"
// import "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/keymap/sublime.min.js"
// import "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/javascript/javascript.min.js"

class DialEditor extends LitElement {

    static properties = {
        location: {
            state: true,
            type: String
        },
        text: {
            state: true,
            type: String
        },
    };

    constructor() {
        super();
        this.noDocumentSelectedText = "No Document selected"
        this.location = undefined;
        this.text = undefined;
    }

    firstUpdated() {
        this.$editorDiv = this.renderRoot.querySelector("#editor");
        this.codemirror = CodeMirror(this.$editorDiv, {
            value: this.noDocumentSelectedText,
            mode:  {name: "javascript", json: true},
            theme: "dracula",
            lineNumbers: true,
            gutter: true,
            lineWrapping: true,
            spellcheck: false,
            autocorrect: false,
            autocapitalize: false
        });
    }

    setContent(location, data) {
        this.data = data;
        this.location = location;
    }

    updated() {
        let contentString = JSON.stringify(this.data, null, 2);
        try {
            let document = this.codemirror.getDoc();
            document.setValue(contentString);
        } catch (err) {
            // This error seems to have no effect. This is just to silence it.ss
        }
        this.codemirror.refresh();
    }


    static styles = css`
      :host {
        box-sizing: border-box;
        display: block;
        position: absolute;
        width: 100%;
        padding-left: 10px;
        padding-right: 10px;
        overflow: scroll;
        height: 100%;
        background-color: orange;
      }
      
      :host > * {
        box-sizing: border-box;
      }
      
      #menu {
        background-color: var(--sl-color-blue-300);
        background-color: var(--sl-color-neutral-600);
        background-color: var(--sl-color-neutral-700);
        //background-color: #414558;
        width: 60px;
        height: 100%;
        position: absolute;
        left: 0;
        padding-top: 10px;
        padding-bottom: 10px;
      }

      sl-button {
        left: 50%;
        transform: translateX(-50%);
        margin-bottom: 10px;
      }
      
      
      #editor {
        height: 100%;
        width: calc(100% - 60px);
        position: absolute;
        right: 0;
        overflow: scroll;
      }

      .CodeMirror {
        width: 100%;
        height: 100% !important;
        padding: 20px;
        line-height: 26px !important;
        font-size: var(--sl-font-size-medium);
        box-sizing: border-box;
      }
      
      sl-icon {
        color: var(--sl-color-neutral-100);
      }
      
    `;

    render() {
        // this.codemirror.refresh();

        return html`
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/codemirror.min.css">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/theme/dracula.min.css">
            <div id="menu">
                <sl-tooltip placement="right" content="Save">
                    <sl-button variant="default" outline><sl-icon name="floppy" label="Save"></sl-icon></sl-button>
                </sl-tooltip>
                <sl-tooltip placement="right" content="Discard">
                    <sl-button variant="default" outline><sl-icon name="x-lg" label="Discard"></sl-icon></sl-button>
                </sl-tooltip>
            </div>
            <div id="editor"></div>
        `;
    }
}
customElements.define('dial-editor', DialEditor);
