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
        data: {
            state: true,
            type: String
        }
    };

    constructor() {
        super();
        this.location = undefined;
        this.data = undefined;
        this.unsavedChanges = false;
    }

    firstUpdated() {
        this.$editorDiv = this.renderRoot.querySelector("#editor");
        this.$saveButton = this.renderRoot.querySelector("#saveButton");
        this.codemirror = CodeMirror(this.$editorDiv, {
            value: "No document selected",
            mode:  {name: "javascript", json: true},
            theme: "dracula",
            lineNumbers: true,
            gutter: true,
            lineWrapping: true,
            spellcheck: false,
            autocorrect: false,
            autocapitalize: false,
            readOnly: true
        });
        this.codemirror.on("change", () => {this.updateSaveButton();});
        this.noDocument = this.codemirror.getDoc();
    }

    setDocument(location, data) {
        this.data = data;
        this.location = location;
        this.codemirror.setOption("readOnly", false);
    }

    closeDocument() {
        this.location = undefined;
        this.data = undefined;
        this.codemirror.setOption("readOnly", true);
        this.codemirror.refresh();
        this.updateSaveButton();
    }

    updated() {
        let document;
        if (this.data === undefined) {
            document = this.noDocument;
        } else {
            let string = JSON.stringify(this.data, null, 2);
            document = CodeMirror.Doc(string, {name: "javascript", json: true});
        }
        this.codemirror.swapDoc(document);
        this.codemirror.refresh();
    }

    hasUnsavedChanges() {
        if(this.location === undefined) {
            return false;
        }
        let originalString  = JSON.stringify(this.data, null, 2);
        let documentString = undefined;
        try {
            let document = this.codemirror.getDoc();
            documentString = document.getValue();
        } catch (err) {
            // This error seems to have no effect. This is just to silence it.
        }
        return originalString !== documentString;
    }

    updateSaveButton() {
        this.$saveButton.disabled = !this.hasUnsavedChanges();
    }


    saveDocument() {
        let hasChanges = this.hasUnsavedChanges();
        if(!hasChanges) {
            return;
        }

        let documentString = undefined;
        try {
            let document = this.codemirror.getDoc();
            documentString = document.getValue();
        } catch (err) {
            // This error seems to have no effect. This is just to silence it.
        }
        if(documentString === undefined) {
            return;
        }
        try {
            this.data = JSON.parse(documentString)
        } catch (err) {
            this.emitEvent("parse-error", err);
            return;
        }
        if(this.location.startsWith("message/")) {
            this.emitEvent("save-message", documentString);
        } else if(this.location.startsWith("state/")) {
            this.emitEvent("save-state", documentString);
        }

        this.updateSaveButton();
    }

    emitEvent(name, data) {
        console.log(name);
        const event = new CustomEvent(`dial-editor:${name}`, {
            detail: data,
            bubbles: true,
            composed: true,
            cancelable: true,
        });
        this.dispatchEvent(event);
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

        let disableCloseButton = this.data === undefined;
        let disableSaveButton = this.data === undefined || !this.unsavedChanges;

        return html`
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/codemirror.min.css">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/theme/dracula.min.css">
            <div id="menu">
                <sl-tooltip placement="right" content="Save">
                    <sl-button id="saveButton" variant="default" ?disabled=${disableSaveButton} @click=${this.saveDocument} outline><sl-icon name="floppy" label="Save"></sl-icon></sl-button>
                </sl-tooltip>
                <sl-tooltip placement="right" content="Discard">
                    <sl-button variant="default" ?disabled=${disableCloseButton} outline  @click=${this.closeDocument}><sl-icon name="x-lg" label="Discard"></sl-icon></sl-button>
                </sl-tooltip>
            </div>
            <div id="editor"></div>
        `;
    }
}
customElements.define('dial-editor', DialEditor);
