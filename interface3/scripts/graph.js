import {LitElement, html, css, unsafeCSS} from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';

export class DialGraphMessage {
    constructor(messageId, source, target, emitTime, receiveTime, theta, color) {
        this.messageId = messageId;
        this.source = source;
        this.target = target;
        this.emitTime = emitTime;
        this.receiveTime = receiveTime;
        this.theta = theta;
        this.color = color;
        this.selected = false;
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
        })
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
        node.color = {
            background: color,
            highlight: {
                background: color
            }};
        this.topology.nodes.update(node);
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

    setTime(time) {
        this.time = time;
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
    }

    dummySetup() {
        const topology = {
            nodes: new vis.DataSet([
                {id: "A", label: 'A'},
                {id: "B", label: 'B'},
                {id: "C", label: 'C'},
                {id: "D", label: 'D'},
                {id: "E", label: 'E'}
            ]),
            edges: new vis.DataSet([
                {from: "A", to: "B"},
                {from: "C", to: "D"},
                {from: "A", to: "E"},
                {from: "A", to: "D"}
            ])
        };
        const messages = [
            new DialGraphMessage(1, "A", "B", -1, 2, 1, "#ff00ff"),
            new DialGraphMessage(1, "A", "B", -1.3, 2, 3, "#0000ff"),
            new DialGraphMessage(2, "C", "D", 2, 3, 0, "#00ffff"),
            new DialGraphMessage(3, "A", "B", 1, 2, 0, "#ffff00"),
            new DialGraphMessage(4, "C", "D", 0, 2, 2, "#00ffff"),
        ];

        this.setTopology(topology);
        this.setMessages(messages);
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
        this.dummySetup();

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
        if (message.emitTime > this.time) {
            return undefined;
        }
        if (message.receiveTime < this.time) {
            return undefined;
        }
        const progress = (this.time - message.emitTime) / (message.receiveTime - message.emitTime);
        const pos_start = new Victor.fromObject(this.network.getPosition(message.source));
        const pos_end = new Victor.fromObject(this.network.getPosition(message.target));
        const vec_edge = pos_end.clone().subtract(pos_start);
        const vec_progress = vec_edge.clone().multiplyScalar(progress);
        const position = pos_start.clone().add(vec_progress);

        let radius = this.config.messageSize;
        if (progress < 0.1) {
            radius = this.config.messageSize * (progress) * 10;
        } else if (progress > 0.9) {
            radius = this.config.messageSize * (1 - progress) * 10;
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

            // Draw the message
            context.beginPath();
            context.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
            context.fillStyle = msg.color;
            context.fill();
            context.stroke();

            context.strokeStyle = originalStrokeStyle;
            context.fillStyle = originalFillStyle;
            context.lineWidth = originalLineWidth;

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
