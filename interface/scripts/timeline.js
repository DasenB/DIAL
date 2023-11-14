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
        this.screenResolution = new ScreenResolution();
        this.zoom = 1.0;
        this.scrolPosition = null;
        this.clipping = {
            lowerTime: undefined,
            upperTime: undefined,
        };
        this.size = {
            height: null,
            width: null,
        }
        this.config = {};
    }


    setTopology(topology) {
        this.nodes = topology.nodes;
    }

    setColorTransitions(colors) {
        this.colorTransitions = colors;
    }

    setSelectedAlgorithm(algorithm) {
        this.selectedAlgorithm = algorithm;
    }

    enableStatistics(bool) {
        this.statisticsEnabled = bool;
    }

    enableMessageFiltering(sourceFiltering, targetFiltering) {
        this.filterMessages.matchSource = sourceFiltering;
        this.filterMessages.matchTarget = targetFiltering;
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
    }

    setTime(time, theta) {
        this.time = time;
        this.draw();
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
        this.config = {
            messageSize: 8,
            messageBorderColor: window.getComputedStyle(this.$timelineContainer).getPropertyValue('--sl-color-neutral-400'),
            messageBorderSelectedColor: window.getComputedStyle(this.$timelineContainer).getPropertyValue('--sl-color-sky-500'),
        };
    }

    onClick(event) {
        const clickPos = new Victor(event.pointer.canvas.x, event.pointer.canvas.y);
        let selectedMessages = [];
        this.messages.forEach(msg => {
            const circle = this.getMessageCircle(msg);
            if (circle === undefined) {
                return;
            }
            const centerPos = new Victor(circle.x, circle.y);
            const distance = centerPos.distance(clickPos);
            msg.selected = distance <= circle.radius;
            if(msg.selected) {
                this.network.unselectAll();
                selectedMessages.push(msg.messageId);
            }
        });
        this.emitEvent("select-message", selectedMessages);
    }

    static styles = css`
      :host {
        
      }
      
      div {
        height: 100%;
        width: 100%;
        background-color: var(--sl-color-neutral-0);
      }
    `;


    getMessageCircle(message) {

    }

    drawStatistics(context) {
        let statistics = {
            total_received_messages: 0,
            total_send_messages: 0,
            total_pending_messages: 0,
            selected_received_messages: 0,
            selected_send_messages: 0,
            selected_pending_messages: 0,
        };

        this.messages.forEach(msg => {
            let wasSend = msg.emitTime < this.time || (msg.emitTime === this.time && msg.emitTheta < msg.theta);
            let wasReceived = msg.receiveTime < this.time || (msg.receiveTime === this.time && msg.receiveTheta < msg.theta);
            let isPending = wasSend && !wasReceived;
            let sourceAlgorithmSelected = msg.sourceAlgorithm.endsWith("/" + this.selectedAlgorithm);
            let targetAlgorithmSelected = msg.targetAlgorithm.endsWith("/" + this.selectedAlgorithm);

            if(wasSend) {
                statistics.total_send_messages += 1;
            }
            if(wasReceived) {
                statistics.total_received_messages += 1;
            }
            if(isPending) {
                statistics.total_pending_messages += 1;
            }

            if(wasSend && sourceAlgorithmSelected) {
                statistics.selected_send_messages += 1;
            }
            if(wasReceived && targetAlgorithmSelected) {
                statistics.selected_received_messages += 1;
            }
            if(isPending && targetAlgorithmSelected) {
                statistics.selected_pending_messages += 1;
            }
        });

        let fontSize = 15;
        if(this.screenResolution.dpi() >= 150) {
            fontSize *= 2;
        }

        let lineHeight = fontSize + 10;
        let pos = {
            x: 20,
            y: lineHeight,
        };
        let width = 480;
        let numberOffset = 10;

        context.setTransform();
        context.fillStyle = "rgba(0, 0, 0, 0.8)";
        context.fillRect(0, 0, width, 10 * lineHeight);
        context.font = `${fontSize}px Courier New`;
        context.fillStyle = "#f2f2f2";
        context.fillText("All Algorithms:", pos.x, pos.y + lineHeight * 0);
        context.fillText("  Send Messages:", pos.x, pos.y + lineHeight * 1);
        context.fillText("  Received Messages:", pos.x, pos.y + lineHeight * 2);
        context.fillText("  Pending Messages:", pos.x, pos.y + lineHeight * 3);
        context.fillText("Selected Algorithm:", pos.x, pos.y + lineHeight * 5);
        context.fillText("  Send Messages:", pos.x, pos.y + lineHeight * 6);
        context.fillText("  Received Messages:", pos.x, pos.y + lineHeight * 7);
        context.fillText("  Pending Messages:", pos.x, pos.y + lineHeight * 8);

        context.textAlign = "right";
        context.fillText(statistics.total_send_messages, width - numberOffset, pos.y + lineHeight * 1);
        context.fillText(statistics.total_received_messages, width - numberOffset, pos.y + lineHeight * 2);
        context.fillText(statistics.total_pending_messages, width - numberOffset, pos.y + lineHeight * 3);
        context.fillText(statistics.selected_send_messages, width - numberOffset, pos.y + lineHeight * 6);
        context.fillText(statistics.selected_received_messages, width - numberOffset, pos.y + lineHeight * 7);
        context.fillText(statistics.selected_pending_messages, width - numberOffset, pos.y + lineHeight * 8);
    }

    draw(context) {
        // Calculate Clipping

        // Calculate StateBars
        // Draw StateBars

        // Calculate MessageArrows
        // Calculate MessageCircles
        // Draw Arrows
        // Draw Circles
    }

    render() {
        return html`
            <div id="timeline-container"></div>
        `;
    }
}
customElements.define('dial-time', DialTimeline);
