

const timeline_template = document.createElement("template");
timeline_template.innerHTML = `
    <style>
    
        @import url(https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&display=swap);

        #container {
            scroll-behavior: smooth;
        }
        
        .action {
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
            background-color: #ffea00;
            box-shadow: 1px 16px 24px 8px rgba(0, 0, 0, 0.5);
            -webkit-box-shadow: 1px 16px 24px 8px rgba(0, 0, 0, 0.5);
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
            background-color: #ff69ba;
        }
        
        .step-indicator {
            display: block;
            height: 20px;
            background-color: coral;
            color: #ffffff;
            width: 20px;
            font-size: 15px;
            line-height: 20px;
            text-align: center;
            position: relative;
            margin-top: -5px;
            left: 100%;
            margin-left: -15px;
            border-radius: 10px;
            font-family: Fira Code, monospace;
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
            <div id="prev-button" class="control-button">
                <div class="step-indicator"></div>
            </div>
            <div id="play-button" class="control-button"></div>
            <div id="next-button" class="control-button">
                <div class="step-indicator"></div>
            </div>
            <div id="end-button" class="control-button"></div>
        </div>
    </div>
`;


class Timeline extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(timeline_template.content.cloneNode(true));

        // Select relevant DOM-Elements
        this.$pastQueue = this.shadowRoot.querySelector('#past-queue');
        this.$currentQueue = this.shadowRoot.querySelector('#current-queue');
        this.$futureQueue = this.shadowRoot.querySelector('#future-queue');
        this.$timeCursor = this.shadowRoot.querySelector('#time-cursor');
        this.$startButton = this.shadowRoot.querySelector('#start-button');
        this.$prevButton = this.shadowRoot.querySelector('#prev-button');
        this.$playButton = this.shadowRoot.querySelector('#play-button');
        this.$nextButton = this.shadowRoot.querySelector('#next-button');
        this.$endButton = this.shadowRoot.querySelector('#end-button');

        // Variables for the animation
        this.position = 0;
        this.animationProgress = 0;
        this.animationLastFrameTime = 0;
        this.animationQueue = [];
        this.currentAnimation = undefined;
        this.animationSpeed = 10; // TODO: Move to global config or distribute with event

        // Font color of action within the different queues
        this.pastQueueLabelColor = "#305b21";
        this.currentQueueLabelColor = "#8a892b";
        this.futureQueueLabelColor = "#67812e";

        // Make the futureQueue sortable
        new Sortable(this.$futureQueue, {
            multiDrag: true,
            selectedClass: 'sortable-selected',
            ghostClass: 'sortable-ghost',
            fallbackTolerance: 3,
            animation: 150,
            draggable: '.action',
        });

        // Create events for user interaction with the individual buttons
        const eventOptions = {
            bubbles: true,
            cancelable: true,
            composed: true,
        };
        const clickNextEvent = new CustomEvent('dial-timeline-clickNext', eventOptions);
        const clickPrevEvent = new CustomEvent('dial-timeline-clickPrev', eventOptions);
        const clickPlayPauseEvent = new CustomEvent('dial-timeline-clickPlayPause', eventOptions);
        this.$nextButton.addEventListener("click", event => {
            window.dispatchEvent(clickNextEvent);
        });
        this.$prevButton.addEventListener("click", event => {
            window.dispatchEvent(clickPrevEvent);
        });
        this.$playButton.addEventListener("click", event => {
            window.dispatchEvent(clickPlayPauseEvent);
        });

        this.setNextStepIndicator(0);
    }

    /**
     * Sets the position of the time-indicator within the timeline
     *
     * @param {number} start The initial offset of the timecursor within the action. (0 <= start <= 1)
     * @param {number} end The final offset of the timecursor within the action. (0 <= end <= 1)
     */
    animateTimeCursor(start, end) {
        if (start < 0 || start > 1) console.log("Invalid start parameter. Must be: 0 <= start <= 1");
        if (end < 0 || end > 1) console.log("Invalid end parameter. Must be: 0 <= end <= 1");
        if (start === end) console.log("Invalid animation interval: start == end");
        return new Promise((resolve, reject) => {
            // Cave: pushing to the animationQueue in the promise might lead to a race-condition.
            // As this has not yet been observed the additional effort is postponed until problems arise.
            this.animationQueue.push({start: start, end: end, resolvePromise: resolve});
            if (this.currentAnimation === undefined && this.animationQueue.length > 0) {
                this.animationLastFrameTime = Date.now();
                requestAnimationFrame(() => {
                    this.runAnimation();
                });
            }
        });
    }

    /**
     * Function that is called by requestAnimationFrame to execute the timeline-cursor-animation.
     */
    runAnimation() {
        // If no animation is currently running, select the next animation
        if (this.currentAnimation === undefined) {
            if (this.animationQueue.length === 0) {
                console.log("No animation available to run.");
                return;
            }
            this.currentAnimation = this.animationQueue.shift();
            this.animationProgress = 0;
        }

        // An action is moved from the future-queue into the current-queue while moving forward
        if (this.animationProgress === 0 && this.currentAnimation.start === 0) {
            const element = this.$futureQueue.firstElementChild;
            element.firstElementChild.setAttribute("label-color", this.currentQueueLabelColor);
            this.$currentQueue.appendChild(element);
        }

        // An action is moved from the past-queue into the current-queue while moving backward
        if (this.animationProgress === 0 && this.currentAnimation.start === 1) {
            const element = this.$pastQueue.lastElementChild;
            element.firstElementChild.setAttribute("label-color", this.currentQueueLabelColor);
            this.$currentQueue.appendChild(element);
        }

        // Calculate the new animation progress
        const current_frame_time = Date.now();
        const timeDelta = (current_frame_time - this.animationLastFrameTime)/1000;
        this.animationProgress += timeDelta * this.animationSpeed;
        this.animationLastFrameTime = current_frame_time;

        // An action is moved from the current-queue into the past-queue while moving forward
        if (this.animationProgress >= 1 && this.currentAnimation.end === 1) {
            const element = this.$currentQueue.firstElementChild;
            element.firstElementChild.setAttribute("label-color", this.pastQueueLabelColor);
            this.$timeCursor.style.transform = `translateY( 0px)`;
            this.$pastQueue.appendChild(element);
        }

        // An action is moved from the current-queue into the future-queue while moving backward
        if (this.animationProgress >= 1 && this.currentAnimation.end === 0) {
            const element = this.$currentQueue.firstElementChild;
            element.firstElementChild.setAttribute("label-color", this.pastQueueLabelColor);
            this.$timeCursor.style.transform = `translateY( 0px)`;
            this.$futureQueue.prepend(element);
        }

        // If the animation has >= 100% progress, finish it and start the next animation if available.
        if (this.animationProgress >= 1.0) {
            this.animationProgress = 0;
            this.currentAnimation.resolvePromise();
            this.currentAnimation = undefined;
            if (this.animationQueue.length > 0) {
                requestAnimationFrame(() => {
                    this.runAnimation();
                });
            }
            return;
        }

        // Draw the actual movement of the animation
        const totalHeight = 140;
        const startHeight = this.currentAnimation.start * totalHeight;
        const endHeight = this.currentAnimation.end * totalHeight;
        const deltaHeight = endHeight - startHeight;
        const yTranslation = startHeight + (deltaHeight * this.animationProgress);
        this.$timeCursor.style.transform = `translateY( ${yTranslation}px)`;
        // this.$timeCursor.scrollIntoView({
        //     block: "center",
        //     behavior: "smooth"
        // });
        requestAnimationFrame(() => {
            this.runAnimation();
        });
    }

    /**
     * Sets the markers on the next and prev buttons that indicate how many steps are still pending after the current
     * step.
     *
     * @param {number} x The number of steps being executed after the current step (negative: previous; positive: next)
     */
    setNextStepIndicator(x) {
        if (x === 0) {
            this.$prevButton.firstElementChild.style.display = "none";
            this.$nextButton.firstElementChild.style.display = "none";
        }
        if (x > 0) {
            this.$nextButton.firstElementChild.textContent = x.toString();
            this.$nextButton.firstElementChild.style.display = "block";
            this.$prevButton.firstElementChild.style.display = "none";
        }
        if (x < 0) {
            this.$prevButton.firstElementChild.textContent = Math.abs(x).toString();
            this.$prevButton.firstElementChild.style.display = "block";
            this.$nextButton.firstElementChild.style.display = "none";
        }

        this.shadowRoot.ownerDocument.documentElement.style.setProperty("--next-button-step-indicator-display", "block");
    }

    /**
     * Sets the position of the time-indicator within the timeline
     *
     * @param {number} x The position to use.
     */
    setPosition(x) {
        const all_actions = Array.from(this.shadowRoot.querySelectorAll(`.action`));
        if (x < 0 || x > all_actions.length) {
            console.log("Invalid position. The time-cursors position must be within the limits of the timeline."); // TODO: Display warning
            return;
        }
        this.position = x;
        const past_actions = all_actions.slice(0, x);
        const future_actions = all_actions.slice(x - all_actions.length);
        past_actions.forEach(element => {
            element.firstElementChild.setAttribute("label-color", this.pastQueueLabelColor);
            this.$pastQueue.appendChild(element);
        });
        future_actions.forEach(element => {
            element.firstElementChild.setAttribute("label-color", this.futureQueueLabelColor);
            this.$futureQueue.appendChild(element);
        });
    }

    /**
     * Appends a new action to the future part of the timeline.
     *
     * @param {string} source The source of the message consumed in the action.
     * @param {string} target The address of the process executing the action.
     * @param {string} message_uuid The UUID of the message consumed in the action.
     */
    addAction(source, target, message_uuid) {
        let action = document.createElement( 'div');
        action.innerHTML = `<dial-timeline-action source-address="${source}" target-address="${target}" message-uuid="${message_uuid}" label-color="${this.futureQueueLabelColor}"></dial-timeline-action>`
        action.setAttribute("class", "list-group-item action");
        action.setAttribute("class", "list-group-item action");
        action.setAttribute("id", message_uuid);
        this.$futureQueue.appendChild(action);
    }

    /**
     * Removes an action with a given UUID from the timeline.
     *
     * @param {string} message_uuid The UUID of the message that should be removed.
     */
    removeAction(message_uuid) {
        let action = this.shadowRoot.getElementById(message_uuid);
        if (action === null) {
            console.log(`Can not remove action with unknown UUID: ${message_uuid}`);
            return;
        }
        action.style.transformOrigin = `bottom center`;
        console.log(action.style.marginTop);
        action.animate(
            [
                { transform: `scaleY(1)`, opacity: "1", marginTop: `0`},
                { transform: `scaleY(0)`, opacity: "1", marginTop: `-${action.clientHeight + 10}`}
            ],
            {
                duration: 300,
                iterations: 1,
            }
        ).finished.then( () => {
            action.remove();
        });
    }
}

customElements.define('dial-timeline', Timeline);