
const warning_template = document.createElement("template");
warning_template.innerHTML = `
    <style>
        @import url(https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&display=swap);
                  
        #container {
            width: 100%;
            height: 100%;
            position: absolute;
            z-index: 100;
            font-family: Arial, Verdana, Helvetica, sans-serif;
            background-color: rgba(35,76,93,0.6);
            display: none;
            
            box-sizing: border-box;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }
        
        #box {
            height: 200px;
            width: 400px;
            background-color: #22232a;
            padding: 10px;
            box-sizing: border-box;
            position: absolute;
            top: 50%;
            left: 50%;
            margin-left: -200px;
            margin-top: -100px;
            color: #f8f8f2;
            font-family:Fira Code, monospace;
            font-size: 18px;   
        }
        
        #text {
            width: 100%;
            height: calc(100% - 40px);
            display: flex;
            justify-content: center;
            align-items: center; 
            vertical-align: middle; 
            text-align: center; 
            border: #f8f8f2 1px dashed;
            box-sizing: border-box;
        }
        
        #ok {
            width: 100%;
            height: 30px;
            border: 1px #f8f8f2 solid;
            line-height: 30px;
            text-align: center;
            cursor: pointer;
            margin-top: 10px;
            box-sizing: border-box;
        }
        
        #ok:hover{
            color: #22232a;
            background-color: #f8f8f2;
        }
        
        ::-moz-selection {
            background: yellow;
        }
    
        ::selection {
            background: yellow;
        }
        
        
    </style>
    <div id="container"> 
        <div id="box">
            <div id="text">
               Can not contact the server.
            </div>
            <div id="ok">OK</div>
        </div>
    </div>
`;

class Warning extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(warning_template.content.cloneNode(true));
        this.$container = this.shadowRoot.querySelector('#container');
        this.$text= this.shadowRoot.querySelector('#text');
        this.$ok = this.shadowRoot.querySelector('#ok');


        this.messageQueue = [];
        this.isVisible = false;

        this.$ok.addEventListener("mousedown", (event) => this.confirmWarning(event));
    }

    displayText(text) {
        this.$text.innerText = text;
        this.$container.style.display = 'block';
        this.isVisible = true;
    }

    confirmWarning(event) {
        event.stopPropagation();
        if (this.messageQueue.length === 0) {
            this.$container.style.display = 'none';
            this.isVisible = false;
        } else {
            this.displayText(this.messageQueue.shift());
        }
    }

    alert(text) {
        this.messageQueue.push(text);
        if (this.isVisible === false) {
            this.displayText(this.messageQueue.shift())
        }
    }

}

customElements.define('dial-warning', Warning);
