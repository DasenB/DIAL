
const main_template = document.createElement("template");
main_template.innerHTML = `
   <style>
        #container {
            height: 100%;
            width: 100%;
            position: absolute;
            background-color: darkmagenta;
        }
    </style>
    <div id="container">
        
    </div>
`;

class MainApplication extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(main_template.content.cloneNode(true));
        this.bus = new MessageBus();
    }

    prev() {
        if (this.playPressed) {
            return;
        }
        this.nextPrevCounter -= 1;
        this.$timeline.setNextStepIndicator(this.nextPrevCounter);
        if (this.running === false) {
            this.run();
        }
    }

}
customElements.define('dial-main', MainApplication);