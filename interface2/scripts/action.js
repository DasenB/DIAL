
const action_template = document.createElement("template");
action_template.innerHTML = `
    <style>
    
        #container {
            width: 100%;
            font-family: Arial, Verdana, Helvetica, sans-serif;
            line-height: 20px;
            color: #722a2a;
            box-sizing: border-box;
            font-size: 14px;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }
        
        .link {
            color: #445fb8;
            cursor: pointer;
            background-color: #ffffff;
            border: 1px solid #445fb8;
            height: 30px;
            padding: 5px;
            box-sizing: border-box;
            border-radius: 10px;
            margin-left: 70px;
            width: max-content;
            max-width: 280px;
            text-overflow: ellipsis;
            white-space: nowrap;
            overflow: hidden; 
            font-family: Monaco, Menlo, monospace;
            font-size: 12px;
            -webkit-touch-callout:default;
            -webkit-user-select:text;
            -moz-user-select:text;
            -ms-user-select:text;
            user-select:text;
        }
        
        ::-moz-selection {
            background: yellow;
        }
    
        ::selection {
            background: yellow;
        }
        
        .address-header {
            height: 30px;
            box-sizing: border-box;
            margin-bottom: 5px;
        }
        
        .address-header:last-child {
            margin-bottom: 0;
        }
        
        .address-label {
            width: 65px;
            height: 30px;
            line-height: 30px;
            float: left;
        }
           
    </style>

    <div id="container"> 
        <div class="address-header">
           <div class="address-label">Source:</div>
           <div class="link" id="source"></div>
        </div>
        <div class="address-header">
           <div class="address-label">Target:</div>
           <div class="link" id="target"></div>
        </div>
        <div class="address-header">
           <div class="address-label">Message:</div>
           <div class="link" id="message"></div>
        </div>
    </div>
`;

class Action extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(action_template.content.cloneNode(true));
        this.$source = this.shadowRoot.querySelector('#source');
        this.$message = this.shadowRoot.querySelector('#message');
        this.$target = this.shadowRoot.querySelector('#target')

        this.$source.addEventListener("mousedown", (event) => this.onMouseDown(event));
        this.$message.addEventListener("mousedown", (event) => this.onMouseDown(event));
        this.$target.addEventListener("mousedown", (event) => this.onMouseDown(event));
    }

    onMouseDown(event) {
        event.stopPropagation();
    }

    static get observedAttributes() {
        return ['source-address', 'target-address', 'message-uuid', 'label-color'];
    }

    attributeChangedCallback(name, oldVal, newVal) {
        this[name] = newVal;
        this.render();
    }

    render() {
        this.$source.innerText = this['source-address'];
        this.$message.innerText = this['message-uuid'];
        this.$target.innerText = this['target-address'];

        const labels = this.shadowRoot.querySelectorAll(".address-label");
        labels.forEach(label => {
            label.style.color = this['label-color'];
        })
    }
}

customElements.define('dial-timeline-action', Action);
