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
        this.reducedTimeline = false;
        this.timelineSorting = false;
        this.filterMessages = {
            matchSource: false,
            matchTarget: false
        };
        this.selectedAlgorithm = undefined;

        this.mouse = {
            dragStart: {
              x: 0,
              y: 0,
            },
            isDown: false,
            position: {
                x: 0,
                y: 0,
            }
        };
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

    enableTimelineSorting(value) {
        this.timelineSorting = value;
        this.drawCanvas();
    }

    enableReducedTimeline(value) {
        this.reducedTimeline = value;
        this.drawCanvas();
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

    mouseMoveWhilstDown(target, whileMove) {
        let f = (event) => {
            this.mouse.position.x = event.layerX;
            this.mouse.position.y = event.layerY;
            whileMove(event);
        };
        let endMove =  () => {
            this.viewport.offset = {
                x: this.viewport.offset.x + (this.mouse.position.x - this.mouse.dragStart.x) * this.viewport.screenResolution.dppx(),
                y: this.viewport.offset.y + (this.mouse.position.y - this.mouse.dragStart.y) * this.viewport.screenResolution.dppx(),
            };
            this.mouse.isDown = false;
            window.removeEventListener('mousemove', f);
            window.removeEventListener('mouseup', endMove);
        };
        target.addEventListener('mousedown', (event) => {
            this.mouse.isDown = true;
            this.mouse.dragStart.x = event.layerX;
            this.mouse.dragStart.y = event.layerY;
            event.stopPropagation();
            window.addEventListener('mousemove', f);
            window.addEventListener('mouseup', endMove);
        });
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
            messageSize: 10,
            messageBorderColor: window.getComputedStyle(this.$timelineContainer).getPropertyValue('--sl-color-neutral-400'),
            messageBorderSelectedColor: window.getComputedStyle(this.$timelineContainer).getPropertyValue('--sl-color-sky-500'),
            arrowColor: window.getComputedStyle(this.$timelineContainer).getPropertyValue('--sl-color-neutral-800'),
        };
        this.$canvas.addEventListener('wheel', (event) =>{
            let y = event.wheelDeltaY  * 0.0002;
            this.viewport.zoom += y;
            if (this.viewport.zoom < 0.01) {
                this.viewport.zoom = 0.01;
            }
            if (this.viewport.zoom > 5) {
                this.viewport.zoom = 5;
            }
            event.preventDefault();
            this.renderCanvas();
        }, false);
        this.mouseMoveWhilstDown(this.$canvas, (event) => {
            this.renderCanvas();
        });
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
        let screenResolutionScale = this.viewport.screenResolution.dppx();
        let earliestTime = this.findEarliestTime();

        let barHeight = 70;
        let barSpacing = 0.75 * barHeight;
        let timeUnitWidth = 100.0 * this.viewport.zoom;
        let barIndex = 0;

        ctx.translate(this.viewport.offset.x, this.viewport.offset.y);
        if(this.mouse.isDown) {
            ctx.translate(
                screenResolutionScale * (this.mouse.position.x - this.mouse.dragStart.x),
                screenResolutionScale * (this.mouse.position.y - this.mouse.dragStart.y)
            );
        }


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
                let splitAddress = address.split("/");
                let algorithm = splitAddress[1] + "/" + splitAddress[2];
                if(this.reducedTimeline) {
                    if(this.selectedAlgorithm !== algorithm) {
                        return;
                    }
                    address = splitAddress[0];
                }
                if (!(address in historyBars)) {
                    historyBars[address] = [];
                    lastChangeTime[address] = earliestTime;
                    lastChangeColor[address] = "#ffffff";
                }
                historyBars[address].push({
                   start: lastChangeTime[address],
                   end: time,
                   color: lastChangeColor[address]
                });
                lastChangeColor[address] = color;
                lastChangeTime[address] = time;
            });
        });

        Object.keys(historyBars).forEach(address => {
            historyBars[address].push({
                start: lastChangeTime[address],
                end: this.time,
                color: lastChangeColor[address]
            });
        });

        let drawExtraTimeUnit = true;
        this.messages.forEach(msg => {
            if (msg.receiveTime > this.time) {
                drawExtraTimeUnit = false;
            }
            let address = msg.targetAlgorithm;
            if(this.reducedTimeline) {
                address = msg.target;
            }
            if (!(address in historyBars)) {
                historyBars[address] = [
                    {
                        start: earliestTime,
                        end: this.time,
                        color: "#ffffff"
                    }
                ];
            }
        });

        if(drawExtraTimeUnit) {
            Object.keys(historyBars).forEach(address =>{
                let lastBarItem = historyBars[address].at(-1);
                historyBars[address].push({
                    start: lastBarItem.end,
                    end: lastBarItem.end + 0.2,
                    color: lastBarItem.color
                });
            });
        }


        let addressToIndexMapping = {}
        let historyBarsKeys = Object.keys(historyBars);
        if (this.timelineSorting) {
            historyBarsKeys.sort();
        }

        historyBarsKeys.forEach(address => {
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

        this.messages.forEach(msg => {
            let xStart = msg.emitTime * timeUnitWidth;
            let xEnd = msg.receiveTime * timeUnitWidth;
            let sourceAddress = msg.sourceAlgorithm;
            let targetAddress = msg.targetAlgorithm;
            if (this.reducedTimeline) {
                sourceAddress = msg.source;
                targetAddress = msg.target;
            }
            let sourceIndex = addressToIndexMapping[sourceAddress];
            let targetIndex = addressToIndexMapping[targetAddress];
            let yStart = (0.5 + sourceIndex) * barHeight + (sourceIndex + 1) * barSpacing;
            let yEnd = (0.5 + targetIndex) * barHeight + (targetIndex + 1) * barSpacing;


            if (isNaN(xStart) || isNaN(xEnd) || isNaN(yStart) || isNaN(yEnd)) {
                return;
            }

            let startVector = new Victor(xStart, yStart);
            let endVector = new Victor(xEnd, yEnd);
            let lineVector = endVector.clone().subtract(startVector);

            ctx.lineWidth = 2 * screenResolutionScale;
            ctx.strokeStyle = this.config.arrowColor;
            ctx.beginPath();

            if(!msg.isLost) {
                ctx.moveTo(xStart, yStart);
                ctx.lineTo(xEnd, yEnd);
            } else {
                let dashLength = 10 * screenResolutionScale;
                let noDashLength = 5 * screenResolutionScale;
                let lineLength = lineVector.length();
                let dashCount = Math.floor(lineLength / (dashLength + noDashLength));
                let dashVector = lineVector.clone().normalize().multiplyScalar(dashLength);
                let noDashVector = lineVector.clone().normalize().multiplyScalar(noDashLength);
                let position = startVector.clone();
                for (let i = 0; i < dashCount; i++) {
                    ctx.moveTo(position.x, position.y);
                    position = position.add(dashVector);
                    ctx.lineTo(position.x, position.y);
                    position = position.add(noDashVector);
                }
                ctx.moveTo(position.x, position.y);
                ctx.lineTo(endVector.x, endVector.y);

            }

            ctx.stroke();
            ctx.closePath();
            ctx.beginPath();
            ctx.arc(xEnd, yEnd, 3 * screenResolutionScale, 0, 2 * Math.PI);
            ctx.fillStyle = this.config.arrowColor;
            ctx.fill();
            ctx.closePath();


            if(msg.receiveTime >= this.time && msg.emitTime <= this.time) {
                ctx.globalAlpha = 0.8;
                let progress = (this.time - msg.emitTime) / (msg.receiveTime - msg.emitTime);
                let position = startVector.add(lineVector.clone().multiplyScalar(progress));

                let radius = this.config.messageSize * screenResolutionScale;
                if (progress < 0.1) {
                    radius = this.config.messageSize * (progress) * 10 * screenResolutionScale;
                } else if (progress > 0.9) {
                    radius = this.config.messageSize * (1 - progress) * 10 * screenResolutionScale;
                }
                if(msg.selected) {
                    radius = this.config.messageSize * screenResolutionScale;
                }
                radius += 5 * screenResolutionScale;


                ctx.beginPath();
                ctx.arc(position.x, position.y, radius, 0, 2 * Math.PI);
                ctx.fillStyle = msg.color;
                ctx.fill();
                ctx.lineWidth = 1 * screenResolutionScale;
                ctx.strokeStyle = this.config.messageBorderColor;
                if(msg.isLost) {
                    ctx.strokeStyle = this.config.messageBorderColor;
                    ctx.moveTo(position.x + Math.cos(0.25 * Math.PI) * radius, position.y + Math.sin(0.25 * Math.PI) * radius);
                    ctx.lineTo(position.x + Math.cos(1.25 * Math.PI) * radius, position.y + Math.sin(1.25 * Math.PI) * radius);
                    ctx.moveTo(position.x + Math.cos(0.75 * Math.PI) * radius, position.y + Math.sin(0.75 * Math.PI) * radius);
                    ctx.lineTo(position.x + Math.cos(1.75 * Math.PI) * radius, position.y + Math.sin(1.75 * Math.PI) * radius);
                }
                ctx.stroke();
                ctx.closePath();
                ctx.globalAlpha = 1.0;
            }
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
