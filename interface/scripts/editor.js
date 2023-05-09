
const editor_template = document.createElement("template");
editor_template.innerHTML = `
    <style>
    
        #container {
            height: calc(100% - 25px);
            width: 100%;
            box-sizing: border-box;
        }
        
        #editor {
            overflow: scroll;
            height: 100%;
        }
        
        .CodeMirror {
            width: 100%;
            height: 100% !important;
        }
        
        ::-moz-selection {
            background: yellow;
        }
    
        ::selection {
            background: yellow;
        }
        
    </style>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/codemirror.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/theme/dracula.min.css">
    <div id="container">
        <div id="editor"></div>
    </div>
`;

class Editor extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(editor_template.content.cloneNode(true));
        this.$editorDiv = this.shadowRoot.querySelector("#editor");
        this.$address = this.shadowRoot.querySelector("#address");

        this.codemirror = CodeMirror(this.$editorDiv, {
            value: "Test Test Test",
            mode:  {name: "javascript", json: true},
            theme: "dracula",
            lineNumbers: true,
            gutter: true
        });
        document.addEventListener("DOMContentLoaded", event => {
            this.codemirror.refresh();
        }, false);
    }

    loadContent(address, content) {
        this.codemirror.getDoc().setValue(content);
        this.codemirror.refresh();
    }


}
customElements.define('dial-editor', Editor);