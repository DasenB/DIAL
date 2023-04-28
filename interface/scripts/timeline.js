

const timeline_template = document.createElement("template");
timeline_template.innerHTML = `
    <style>
    
        .action {
            /*background-color: #fffcba;*/
            /*background-color: #ff93b0;*/
            /*background-color: yellow;*/
            background-color: #d4ff7d;
            width: calc(100% - 20px);
            font-family: Arial, Verdana, Helvetica, sans-serif;
            line-height: 1.8;
            padding: 15px;
            box-sizing: border-box;
            margin: 10px;
        }
        
        #future-queue .action {
            cursor: move !important;
        }
        
        #past-queue .action {
            /*background: #f5a630 !important;*/
            background-color: #5bda97;
            color: #2f2f2f;
        }
      
        #past-queue {
            margin-bottom: -9px;
        }
        
        #future-queue .action:first-child {
            margin-top: 5px;
        }
        
        #past-queue .action:last-child {
            margin-bottom: 5px;
        }
        
        #current-queue .action {
            background-color: #ecff46;
        }
        
        #current-queue {
            position: relative;
            z-index: 10;
        }
        
        #current-queue .action:first-child {
            margin-top: 5px;
        }
        
        #time-cursor {
            border-bottom: 2px solid #ecff46;
            position: relative;
            z-index: 1;
        }
        
        #time-cursor::after {
            display: block;
            content: " ";
            width: 0px;
            height: 0px;
            border-style: solid;
            border-width: 10px 0 10px 15px;
            border-color: transparent transparent transparent #ecff46;
            margin-bottom: -11px;
        }
        
        
        .sortable-selected {
            background: #e6f3ff;
        }
        
        .sortable-chosen {
            background: #e6f3ff !important;
            box-shadow: 1px 16px 24px -12px rgba(0, 0, 0, 0.5);
            -webkit-box-shadow: 1px 16px 24px -12px rgba(0, 0, 0, 0.5);
        }
        
        .link {
            color: #445fb8;
            cursor: pointer;
            background-color: #ffffff;
            border: 1px solid #445fb8;
            height: 30px;
            line-height: 20px;
            padding: 5px;
            box-sizing: border-box;
            border-radius: 10px;
            display:inline-block
        }
        
        #action-queue {
            width: 100%;
            height: calc( 100vh - 80px);
            /*background: yellow;*/
            background-color: #11ff5c;
            overflow-y: scroll;
        }
        
        #control-menu {
            width: 100%;
            height: 80px;
            position: absolute;
            /*background-color: deeppink;*/
            /*background-color: #445fb8;*/
            /*background-color: #00adcc;*/
            /*background-color: #00ff8c;*/
            background-color: #0080ff;
            /*background-color: #bf00ff;*/
            /*background-color: #ff0088;*/
            bottom: 0;
        }
        
        .control-button {
            aspect-ratio: 1 / 1;
            width: calc(15%);
            margin: 2.5%;
            background-repeat: no-repeat;
            background-position: center;
            background-size: 50%;
            background-origin: content-box;
            float: left;
            background-color: white;
            border-radius: 50px;
            cursor: pointer;
            position: relative;
            top: 50%;
            transform: translateY(calc(-65%));
        }
        
        .control-button:active {
            background-color: #d21079;
        }
        
        #start-button {
            background-image: url( 'assets/svg/start.svg' );
        }
        
        #prev-button {
            background-image: url( 'assets/svg/previous.svg' );
        }
        
        #play-button {
            background-image: url( 'assets/svg/play.svg' );
        }
        
        #next-button {
            background-image: url( 'assets/svg/next.svg' );
        }
        
        #end-button {
            background-image: url( 'assets/svg/end.svg' );
        }
        
    </style>
    
    <div id="container">
        <div id="action-queue">
            <div id="past-queue" class="list-group"></div>
            <div id="time-cursor"></div>
            <div id="current-queue" class="list-group"></div>
            <div id="future-queue" class="list-group"></div>
        </div>
        <div id="control-menu">
            <div id="start-button" class="control-button"></div>
            <div id="prev-button" class="control-button"></div>
            <div id="play-button" class="control-button"></div>
            <div id="next-button" class="control-button"></div>
            <div id="end-button" class="control-button"></div>
        </div>
    </div>
`;

function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}


class Timeline extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(timeline_template.content.cloneNode(true));
        this.$pastQueue = this.shadowRoot.querySelector('#past-queue');
        this.$currentQueue = this.shadowRoot.querySelector('#current-queue');
        this.$futureQueue = this.shadowRoot.querySelector('#future-queue');
        this.$timeCursor = this.shadowRoot.querySelector('#time-cursor');
        this.position = 0;
        this.animationProgress = 0;
        this.animationLastFrameTime = 0;
        this.animationSpeed = 10; // Move to global config or distribute with event
        this.pastQueueLabelColor = "#305b21";
        this.currentQueueLabelColor = "#8a892b";
        this.futureQueueLabelColor = "#67812e";


        this.addAction("Process A", "Process 1", uuidv4());
        this.addAction("Process B", "Process 2", uuidv4());
        this.addAction("Process C", "Process Testing a really long name", uuidv4());
        this.addAction("Process D", "Process Testing an even way longer name", uuidv4());
        this.addAction("Process E", "Process 5", uuidv4());
        this.addAction("Process F", "Process 6", uuidv4());
        this.addAction("Process G", "Process 7", uuidv4());
        this.addAction("Process H", "Process 8", uuidv4());
        this.addAction("Process I", "Process 9", uuidv4());
        this.addAction("Process J", "Process 0", uuidv4());
        this.addAction("Process K", "Process 11", uuidv4());
        this.addAction("Process L", "Process 12", uuidv4());
        this.addAction("Process M", "Process 13", uuidv4());
        this.addAction("Process N", "Process 14", uuidv4());
        this.addAction("Process O", "Process 15", uuidv4());

        const pUUID =  uuidv4();
        this.addAction("Process P", "Process 6", pUUID);
        this.removeAction(pUUID);


        new Sortable(this.$futureQueue, {
            multiDrag: true, // Enable multi-drag
            selectedClass: 'sortable-selected', // The class applied to the selected items
            ghostClass: 'sortable-ghost',
            fallbackTolerance: 3, // So that we can select items on mobile
            animation: 150,
            draggable: '.action',
        });


        window.addEventListener("timelineStartAction", (event) => this.startAction(event));
        window.addEventListener("timelineFinishAction", (event) => this.finishAction(event));

        this.setPosition(2);

    }

    startAction(event) {
        if (this.animationProgress !== 0) {
            console.log("Can not start a new animation before the last animation finieshed.");
            return;
        }
        const element = this.$futureQueue.firstElementChild;
        element.firstElementChild.setAttribute("label-color", this.currentQueueLabelColor);
        this.$currentQueue.appendChild(this.$futureQueue.firstElementChild);
        requestAnimationFrame(() => {
            this.animationLastFrameTime = Date.now();
            this.animateTimecursorStart();
        });
    }

    animateTimecursorStart() {
        const current_frame_time = Date.now();
        const timeDelta = (current_frame_time - this.animationLastFrameTime)/1000;
        this.animationProgress += timeDelta * this.animationSpeed;
        this.animationLastFrameTime = current_frame_time;

        if (this.animationProgress > 1.0 || this.animationProgress < 0) {
            this.animationProgress = 0;
            return;
        }

        this.$timeCursor.style.transform = "translateY(" + (this.animationProgress * 70) + "px)";
        requestAnimationFrame(() => {
            this.animateTimecursorStart();
        });
    }

    finishAction(event) {
        if (this.animationProgress !== 0) {
            console.log("Can not start a new animation before the last animation finieshed.");
            return;
        }
        requestAnimationFrame(() => {
            this.animationLastFrameTime = Date.now();
            this.animateTimecursorFinish();
        });
    }

    animateTimecursorFinish() {
        const current_frame_time = Date.now();
        const timeDelta = (current_frame_time - this.animationLastFrameTime)/1000;
        this.animationProgress += timeDelta * this.animationSpeed;
        this.animationLastFrameTime = current_frame_time;

        if (this.animationProgress > 1.0 || this.animationProgress < 0) {
            const element = this.$currentQueue.firstElementChild;
            element.firstElementChild.setAttribute("label-color", this.pastQueueLabelColor);
            this.$pastQueue.appendChild(element);
            this.$timeCursor.style.transform = "translateY(0px)";
            this.animationProgress = 0;
            return;
        }

        this.$timeCursor.style.transform = "translateY(" + ( 70 + (this.animationProgress * 70)) + "px)";
        requestAnimationFrame(() => {
            this.animateTimecursorFinish();
        });
    }

    setPosition(x) {
        const all_actions = this.shadowRoot.querySelectorAll(`.action`);
        if (x > all_actions.length || x < 0) {
            console.log("invalid");
            return
        }

        this.position = x;
        const y = all_actions.length - x;

        const past_actions = this.shadowRoot.querySelectorAll(`.action:nth-child(-n+${x})`);
        const future_actions = this.shadowRoot.querySelectorAll(`.action:nth-last-child(-n+${y})`);

        past_actions.forEach(element => {
            element.firstElementChild.setAttribute("label-color", this.pastQueueLabelColor);
            this.$pastQueue.appendChild(element);
        })
        future_actions.forEach(element => {
            element.firstElementChild.setAttribute("label-color", this.futureQueueLabelColor);
            this.$futureQueue.appendChild(element);
        })

    }

    addAction(source, target, message_uuid) {
        var action = document.createElement( 'div');
        // action.innerHTML = `<span class='link'>${target}</span> received Message <span class='link'>${message_uuid}</span> from <span class='link'>${source}</span>`
        action.innerHTML = `<dial-timeline-action source-address="${target}" target-address="${source}" message-uuid="${message_uuid}" label-color="red"></dial-timeline-action>`
        action.setAttribute("class", "list-group-item action");
        action.setAttribute("id", message_uuid);
        this.$futureQueue.appendChild(action);
    }

    removeAction(message_uuid) {
        var action = this.shadowRoot.getElementById(message_uuid);
        action.remove();
    }



}
customElements.define('dial-timeline', Timeline);