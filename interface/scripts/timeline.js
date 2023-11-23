import {css, html, LitElement} from '../libraries/lit-core.js';

class ScreenResolution {
    constructor() {
        this.base = {
            dpi: 96,
            dpcm: 96 / 2.54,
        };
    }
    ie() {
        return Math.sqrt(screen.deviceXDPI * screen.deviceYDPI) / this.base.dpi;
    }
    dppx() {
        // devicePixelRatio: Webkit (Chrome/Android/Safari), Opera (Presto 2.8+), FF 18+
        return typeof window == 'undefined' ? 0 : +window.devicePixelRatio || this.ie() || 0;
    }
    dpcm() {
        return this.dppx() * this.base.dpcm;
    }
    dpi() {
        return this.dppx() * this.base.dpi;
    }
}


class DialTimeline extends LitElement {

    constructor() {
        super();
        this.nodes = [];
        this.colorTransitions = {}
        this.messages = [];
        this.time = 0;
        this.statisticsEnabled = false;
        this.filterMessages = {
            matchSource: false,
            matchTarget: false
        };
        this.selectedAlgorithm = undefined;

        this.viewport = {
            screenResolution: new ScreenResolution(),
            zoom: 1.0,
            offset: {
                x: 0,
                y: 0,
            },
            size: {
                height: 0,
                width: 0,
            },
            clipping: {
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
            }
        };
        this.config = {};
    }


    setTopology(topology) {
        this.nodes = topology.nodes;
        this.renderCanvas();
    }

    setColorTransitions(colors) {
        this.colorTransitions = colors;
        this.renderCanvas();
    }

    setSelectedAlgorithm(algorithm) {
        this.selectedAlgorithm = algorithm;
        this.renderCanvas();
    }

    enableStatistics(bool) {
        this.statisticsEnabled = bool;
        this.renderCanvas();
    }

    enableMessageFiltering(sourceFiltering, targetFiltering) {
        this.filterMessages.matchSource = sourceFiltering;
        this.filterMessages.matchTarget = targetFiltering;
        this.renderCanvas();
    }

    setMessages(messages) {
        this.messages = messages;
        this.messages.sort(
            function(a, b) {
                if (a.receiveTime === b.receiveTime) {
                    return b.receiveTheta < a.receiveTheta ? 1 : -1;
                }
                return a.receiveTime > b.receiveTime ? 1 : -1;
            }
        );
        this.renderCanvas();
    }

    setTime(time, theta) {
        this.time = time;
        this.renderCanvas();
    }

    emitEvent(name, data) {
        console.log(name);
        const event = new CustomEvent(`dial-timeline:${name}`, {
            detail: data,
            bubbles: true,
            composed: true,
            cancelable: true,
        });
        this.dispatchEvent(event);
    }


    firstUpdated() {
        this.$timelineContainer = this.renderRoot.getElementById("timeline-container");
        this.$canvas = this.renderRoot.getElementById("timeline-canvas");
        this.$context = this.$canvas.getContext("2d");
        this.config = {
            messageSize: 8,
            messageBorderColor: window.getComputedStyle(this.$timelineContainer).getPropertyValue('--sl-color-neutral-400'),
            messageBorderSelectedColor: window.getComputedStyle(this.$timelineContainer).getPropertyValue('--sl-color-sky-500'),
        };
        this.renderCanvas();
    }

    static styles = css`
      :host {
        
      }
      
      div {
        height: 100%;
        width: 100%;
        background-color: var(--sl-color-neutral-0);
      }
      
      canvas {
        height: 100%;
        width: 100%;
        box-sizing: border-box;
      }
    `;

    findEarliestTime() {
        let t = Infinity;
        this.messages.forEach(msg => {
            if (msg.emitTime < t) {
                t = msg.emitTime;
            }
        });
        return t;
    }

    drawCanvas() {
        if(this.$context === undefined) {
            return;
        }
        let ctx = this.$context;

        ctx.translate(this.viewport.offset.x, this.viewport.offset.y);


        let earliestTime = this.findEarliestTime();
        let historyBars = {};
        let lastChangeTime = {};
        let lastChangeColor = {};

        Object.keys(this.colorTransitions).forEach((timeStr) => {
            let time = Number(timeStr.split("/")[0]);
            if(time > this.time) {
                return;
            }
            Object.keys(this.colorTransitions[timeStr]).forEach(address => {
                let color = this.colorTransitions[timeStr][address];
                if (!(address in historyBars)) {
                    historyBars[address] = [];
                    lastChangeTime[address] = earliestTime;
                    lastChangeColor[address] = "#ffffff";
                } else {
                    historyBars[address].push({
                       start: lastChangeTime[address],
                       end: time,
                       color: lastChangeColor[address]
                    });
                    lastChangeColor[address] = color;
                    lastChangeTime[address] = time;
                }
            });
        });
        Object.keys(historyBars).forEach(address => {
            historyBars[address].push({
                start: lastChangeTime[address],
                end: this.time,
                color: lastChangeColor[address]
            });
        });

        let barHeight = 50;
        let barSpacing = 0.5 * barHeight;
        let timeUnitWidth = 60;
        let barIndex = 0;
        let addressToIndexMapping = {}

        Object.keys(historyBars).forEach(address => {
            ctx.strokeStyle = this.config.messageBorderColor;
            let yPos = barIndex * barHeight + (barIndex + 1) * barSpacing;
            addressToIndexMapping[address] = barIndex;
            historyBars[address].forEach(bar => {
               ctx.fillStyle = bar.color;
               ctx.fillRect(bar.start * timeUnitWidth, yPos, timeUnitWidth * (bar.end - bar.start), barHeight);
               ctx.strokeRect(bar.start * timeUnitWidth, yPos, timeUnitWidth * (bar.end - bar.start), barHeight);
            });
            ctx.font = "30px Arial";
            ctx.fillStyle = this.config.messageBorderColor;
            ctx.fillText(address, 20, yPos + 2*barHeight/3);
            barIndex += 1;
        });

        console.log(Object.keys(historyBars));
        this.messages.forEach(msg => {
            console.log(`${msg.sourceAlgorithm} -> ${msg.targetAlgorithm}`);
            let xStart = msg.emitTime * timeUnitWidth;
            let xEnd = msg.receiveTime * timeUnitWidth;
            let yStart = addressToIndexMapping[msg.sourceAlgorithm] * barHeight + (addressToIndexMapping[msg.sourceAlgorithm] + 1) * barSpacing + 0.5 * barHeight;
            let yEnd = addressToIndexMapping[msg.targetAlgorithm] * barHeight + (addressToIndexMapping[msg.sourceAlgorithm] + 1) * barSpacing + 0.5 * barHeight;
            if (isNaN(xStart) || isNaN(xEnd) || isNaN(yStart) || isNaN(yEnd)) {
                return;
            }
            ctx.beginPath();
            ctx.moveTo(xStart, yStart);
            ctx.lineTo(xEnd, yEnd);
            ctx.stroke();
            console.log(`${xStart}/${yStart} -> ${xEnd}/${yEnd}`);
        });

    }


    renderCanvas() {
        if(this.$canvas === undefined) {
            return;
        }

        // Resize Canvas
        this.$canvas.width  = Math.ceil(this.$canvas.offsetWidth * this.viewport.screenResolution.dppx());
        this.$canvas.height = Math.ceil(this.$canvas.offsetHeight * this.viewport.screenResolution.dppx());

        // Calculate Viewport
        this.drawCanvas();

        // Calculate Clipping

        // Calculate StateBars
        // Draw StateBars

        // Calculate MessageArrows
        // Calculate MessageCircles
        // Draw Arrows
        // Draw Circles
        // requestAnimationFrame(() => {this.renderCanvas();});
    }

    render() {
        return html`
            <div id="timeline-container">
                <canvas id="timeline-canvas"></canvas>
            </div>
        `;
    }
}
customElements.define('dial-time', DialTimeline);
