
const dial_template = document.createElement("template");
dial_template.innerHTML = `
   <style>
        #container {
            height: 100%;
            width: 100%;
            position: absolute;
        }
        
                
        #graph-view {
            background-color: aquamarine;
            height: 50%;
            width: calc(100% - var(--menu-width));
            left: 0;
            top: 0;
            position: absolute;
        }
        
        
        #navigator-view {
            background-color: blueviolet;
            height: 50%;
            width: calc(100% - var(--menu-width));
            position: absolute;
            left: 0;
            bottom: 0;
        }
        
        #timeline-view {
            background-color: #e0e0e0;
            height: 100%;
            width: var(--menu-width);
            position: absolute;
            right: 0;
        }
    </style>
    <div id="container">
        <div id="timeline-view">
<!--            <dial-timeline id="timeline"></dial-timeline>-->
        </div>
        <div id="graph-view">
            <dial-graph id="graph"></dial-graph>
        </div>
        <div id="navigator-view">
<!--            <dial-navigator id="navigator"></dial-navigator>-->
        </div>
        <dial-warning id="warning"></dial-warning>
    </div>
   
`;

class Dial extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(dial_template.content.cloneNode(true));
        this.$graph = this.shadowRoot.querySelector('#graph');

        this.time = 0;
        this.lastTime = 0;
        this.speed = 0.3;

        this.API = new API("localhost", 10101);
        this.API.getTopology().then(topology => {
            this.$graph.setTopology(topology);
        });

        this.messages = [];

        this.API.getMessages().then(data => {
            this.messages = data.messages;
            this.$graph.setMessages(data.messages);
            this.time = data.time;
            this.$graph.updateTime(data.time);
        });

        this.running = false;


        this.running = true;
        this.lastFrame = performance.now();
        this.draw();
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


    // preloadNext() {
    //     this.nextState =
    // }

    draw() {
        const currentTime = performance.now();
        const timeDifferenceSeconds = (currentTime - this.lastFrame) / 1000;
        this.lastFrame = currentTime;

        this.lastTime = this.time;
        this.time += timeDifferenceSeconds * this.speed;

        if (Math.floor(this.time) > Math.floor( this.lastTime )) {
            // this.API.nextStep().catch(reason => {
            //     return Promise.reject(reason);
            // }).then(data => {
            //     this.messages = this.messages.concat(data.new_messages);
            //     this.$graph.setMessages(this.messages);
            // });
        }

        if (this.$graph.updateTime !== undefined) {
            this.$graph.updateTime(this.time);
        }

        if (this.running) {
            requestAnimationFrame(() => {
                this.draw();
            });
        }
    }




}
customElements.define('dial-simulator', Dial);