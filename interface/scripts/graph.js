import {css, html, LitElement} from '../libraries/lit-core.js';

export class DialGraphMessage {
    constructor(messageId, source, target, emitTime, receiveTime, theta, color, isLost, isSelfMessage) {
        this.messageId = messageId;
        this.source = source;
        this.target = target;
        this.emitTime = emitTime;
        this.receiveTime = receiveTime;
        this.theta = theta;
        this.color = color;
        this.selected = false;
        this.isLost = isLost;
        this.isSelfMessage = isSelfMessage;
    }
}

class DialGraph extends LitElement {

    setTopology(topology) {
        this.topology = topology;
        this.topology.nodes.forEach(node => {
            if (node.color === undefined) {
                node.color = {
                    background: "#ffffff",
                    highlight: {
                        background: "#ffffff",
                    }
                };
            }
        });
        if (this.network === undefined) {
            this.initVisGraph();
        } else {
            this.network.setData(this.topology);
            this.network.redraw();
        }
    }

    setNodeColor(nodeId, color) {
        const node = this.topology.nodes.get(nodeId);
        if (node == null) {
            return;
        }
        if(color === undefined) {
            color = "#ffffff";
        }
        node.color = {
            background: color,
            highlight: {
                background: color
            }};
        this.topology.nodes.update(node);
    }


    forceRender() {
        if (this.network !== undefined) {
            this.network.redraw();
        } else {
            console.error("Can not force render graph: this.network === undefined");
        }
    }


    setMessages(messages) {
        this.messages = messages;
        this.messages.sort(
            function(a, b) {
                if (a.receiveTime === b.receiveTime) {
                    return b.theta < a.theta ? 1 : -1;
                }
                return a.receiveTime > b.receiveTime ? 1 : -1;
            });
        if (this.network !== undefined) {
            this.network.redraw();
        }
    }

    setTime(time, theta) {
        this.time = time;
        this.theta = theta;
        if (this.network !== undefined) {
            this.network.redraw();
        }
    }

    constructor() {
        super();
        this.topology = {
          nodes: new vis.DataSet([]),
          edges: new vis.DataSet([])
        };
        this.messages = [];
        this.time = 0;
        this.theta = undefined;
    }

    firstUpdated() {
        this.$graphContainer = this.renderRoot.getElementById("graph-container");
        this.config = {
            messageSize: 8,
            messageBorderColor: window.getComputedStyle(this.$graphContainer).getPropertyValue('--sl-color-neutral-400'),
            messageBorderSelectedColor: window.getComputedStyle(this.$graphContainer).getPropertyValue('--sl-color-sky-500')
        };

        this.config.visjsOptions = {
            "nodes": {
                color: {
                    border: this.config.messageBorderColor,
                    highlight: {
                        border: this.config.messageBorderSelectedColor
                    }
                },
                shape: "ellipse",
                borderWidth: 1.4,
                borderWidthSelected: 3,
                heightConstraint: {
                    minimum: 20,
                },
                widthConstraint: {
                    minimum: 20,
                },
            },
            "edges": {
                "smooth": false,
                "selectionWidth": 0,
                "width": 1.4
            },
            "physics": {
                "barnesHut": {
                    "springLength": 105,
                    "springConstant": 0.025,
                    "gravitationalConstant": -5000
                }
            },
            "layout": {
                "randomSeed": 0
            }
        };
    }

    initVisGraph() {
        if (this.network !== undefined) {
            this.network.destroy();
        }

        // Create the graph and save a reference to the resulting canvas for later use
        this.network = new vis.Network(this.$graphContainer, this.topology, this.config.visjsOptions);
        this.network.on("afterDrawing", (context) => this.draw(context));
        this.network.on('click', (event) => this.onClick(event), false);
    }

    onClick(event) {
        const clickPos = new Victor(event.pointer.canvas.x, event.pointer.canvas.y);
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
           }
        });
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
        if (message.emitTime >= this.time) {
            return undefined;
        }
        if ((message.receiveTime < this.time)) {
            return undefined;
        }
        // TODO: If Message is selected also draw it the moment it is being received
        const progress = (this.time - message.emitTime) / (message.receiveTime - message.emitTime);
        const pos_start = new Victor.fromObject(this.network.getPosition(message.source));
        const pos_end = new Victor.fromObject(this.network.getPosition(message.target));
        const vec_edge = pos_end.clone().subtract(pos_start);
        let   positional_progress = progress;
        if (message.isLost) {
            positional_progress *= 0.5;
        }
        const vec_progress = vec_edge.clone().multiplyScalar(positional_progress);
        const position = pos_start.clone().add(vec_progress);

        let radius = this.config.messageSize;
        if (progress < 0.1) {
            radius = this.config.messageSize * (progress) * 10;
        } else if (progress > 0.9) {
            radius = this.config.messageSize * (1 - progress) * 10;
        }
        if(message.selected) {
            radius = this.config.messageSize;
        }
        radius += 5;
        return {
            x: position.x,
            y: position.y,
            radius: radius
        }
    }

    draw(context) {
        this.messages.reverse();
        this.messages.forEach(msg => {
            const circle = this.getMessageCircle(msg);
            if (circle === undefined) {
                return;
            }
            // Save original drawing style
            const originalStrokeStyle = context.strokeStyle;
            const originalFillStyle = context.fillStyle;
            const originalLineWidth  = context.lineWidth;

            if(msg.selected) {
                context.strokeStyle = this.config.visjsOptions.nodes.color.highlight.border;
                context.lineWidth = this.config.visjsOptions.nodes.borderWidthSelected;
            } else {
                context.strokeStyle = this.config.visjsOptions.nodes.color.border;
                context.lineWidth = this.config.visjsOptions.nodes.borderWidth;
            }

            context.globalAlpha = 0.8;

            // Draw the message
            context.beginPath();
            context.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
            context.fillStyle = msg.color;
            // if(msg.isSelfMessage) {
            //     context.fillStyle = "#ff00ff";
            // }

            context.fill();
            context.stroke();

            if(msg.isLost) {
                context.moveTo(circle.x + Math.cos(0.25 * Math.PI) * circle.radius, circle.y + Math.sin(0.25 * Math.PI) * circle.radius);
                context.lineTo(circle.x + Math.cos(1.25 * Math.PI) * circle.radius, circle.y + Math.sin(1.25 * Math.PI) * circle.radius);
                context.stroke();
                context.moveTo(circle.x + Math.cos(0.75 * Math.PI) * circle.radius, circle.y + Math.sin(0.75 * Math.PI) * circle.radius);
                context.lineTo(circle.x + Math.cos(1.75 * Math.PI) * circle.radius, circle.y + Math.sin(1.75 * Math.PI) * circle.radius);
                context.stroke();
            }



            context.strokeStyle = originalStrokeStyle;
            context.fillStyle = originalFillStyle;
            context.lineWidth = originalLineWidth;
            context.globalAlpha = 1.0;

        });
        this.messages.reverse();
    }

    render() {

        return html`
            <div id="graph-container"></div>
        `;
    }
}
customElements.define('dial-graph', DialGraph);
