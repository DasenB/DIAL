
const editor_template = document.createElement("template");
editor_template.innerHTML = `
    <style>
    
        #container {
            height: 100%;
            width: 100%;
            box-sizing: border-box;
            padding: 10px;
        }
        
        #editor {
            overflow: scroll;
            height: calc(100% - 25px);
        }
        
        ::-moz-selection {
            background: yellow;
        }
    
        ::selection {
            background: yellow;
        }
        
        #menu-bar {
            height: 25px;
            width: 100%;
            background-color: deepskyblue;
        }
        
        #menu-bar>* {
            margin-right: 0px;
        }
        
        #menu-bar #address {
            color: #1c274f;
            height: 25px;
            margin-left: 20px;
            padding-left: 15px;
            padding-right: 15px;
            font-family: Monaco, Menlo, monospace;
            font-size: 13px;
            line-height: 25px;
            -webkit-touch-callout:default;
            -webkit-user-select:text;
            -moz-user-select:text;
            -ms-user-select:text;
            user-select:text;
            text-overflow: ellipsis;
            white-space: nowrap;
            overflow: hidden; 
        }
    
        #menu-bar .button {
            aspect-ratio: 1 / 1;
            height: calc(100%);
            background-repeat: no-repeat;
            background-position: center;
            background-size: 50%;
            background-origin: content-box;
            float: left;
            cursor: pointer;
        }
        
        #menu-bar .button:active {
            background-color: #1093e5;
        }
        
        #close-button {
            background-image: url( 'assets/svg/close.svg' );
            background-color: #fc5454;
        }
        
        #back-button {
            background-image: url( 'assets/svg/angle-left.svg' );
            background-color: #f6fc54;
        }
        #next-button {
            background-image: url( 'assets/svg/angle-right.svg' );
            background-color: #54fc89;
        }
        
    </style>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/codemirror.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/theme/dracula.min.css">
    <div id="container">
        <div id="menu-bar">
            <div class="button" id="close-button"></div>
            <div class="button" id="back-button"></div>
            <div class="button" id="next-button"></div>
            <div id="address">message#a23e3cc4-a7d0-48ab-b2fb-9621f00577a7</div>
        </div>
        <div id="editor"></div>
    </div>
`;

class Editor extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(editor_template.content.cloneNode(true));
        this.$closeButton = this.shadowRoot.querySelector("#close-button");
        this.$backButton = this.shadowRoot.querySelector("#back-button");
        this.$nextButton = this.shadowRoot.querySelector("#next-button");
        this.$editorDiv = this.shadowRoot.querySelector("#editor");
        this.codemirror = CodeMirror(this.$editorDiv, {
            value: "abcdee",
            mode:  {name: "javascript", json: true},
            theme: "dracula",
            lineNumbers: true,
            gutter: true
        });
        document.addEventListener("DOMContentLoaded", event => {
            this.codemirror.refresh();
        }, false);
        this.$closeButton.addEventListener("mousedown", (event) => this.onClose(event));
        this.$backButton.addEventListener("mousedown", (event) => this.onBack(event));
        this.$nextButton.addEventListener("mousedown", (event) => this.onNext(event));
    }

    open(address, content) {
        this.codemirror = CodeMirror(this.$editorDiv, {
            value: content,
            mode:  {name: "javascript", json: true},
            theme: "dracula",
            lineNumbers: true,
            gutter: true
        });
        this.codemirror.refresh();
    }

    onClose() {
        this.$editorDiv.removeChild(this.$editorDiv.firstElementChild);
        this.open("message#123", "\nfunction testScript(){\n\treturn 100;\n}\n")
    }

    onBack() {

    }

    onNext() {

    }

}
customElements.define('dial-editor', Editor);