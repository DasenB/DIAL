import {css, html, LitElement} from '../libraries/lit-core.js';

export class DialGraphMessage {
    constructor(messageId, source, target, emitTime, emitTheta, receiveTime, receiveTheta, color, isLost, isSelfMessage) {
        this.messageId = messageId;
        this.source = source.split("/")[0];
        this.target = target.split("/")[0];
        this.sourceAlgorithm = source;
        this.targetAlgorithm = target;
        this.emitTime = emitTime;
        this.emitTheta = emitTheta;
        this.receiveTime = receiveTime;
        this.receiveTheta = receiveTheta;
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
    setSelectedAlgorithm(algorithm) {
        this.selectedAlgorithm = algorithm;
    }


    enableStatistics(bool) {
        this.statisticsEnabled = bool;
        this.forceRender();
    }

    enableMessageFiltering(sourceFiltering, targetFiltering) {
        this.filterMessages.matchSource = sourceFiltering;
        this.filterMessages.matchTarget = targetFiltering;
        this.forceRender();
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
                    return b.receiveTheta < a.receiveTheta ? 1 : -1;
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

    emitEvent(name, data) {
        console.log(name);
        const event = new CustomEvent(`dial-graph:${name}`, {
            detail: data,
            bubbles: true,
            composed: true,
            cancelable: true,
        });
        this.dispatchEvent(event);
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
        this.statisticsEnabled = false;
        this.filterMessages = {
            matchSource: false,
            matchTarget: false
        };
    }


    firstUpdated() {
        this.$graphContainer = this.renderRoot.getElementById("graph-container");
        this.config = {
            messageSize: 8,
            messageBorderColor: window.getComputedStyle(this.$graphContainer).getPropertyValue('--sl-color-neutral-400'),
            messageBorderSelectedColor: window.getComputedStyle(this.$graphContainer).getPropertyValue('--sl-color-sky-500'),
            selfMessageStartAngle: Math.PI/4,
            selfMessageEndAngle: Math.PI/4,
        };

        this.config.visjsOptions = {
            nodes: {
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
            edges: {
                smooth: false,
                selectionWidth: 0,
                width: 1.4,
                arrows: {
                    to: {
                        enabled: true,
                        scaleFactor: 0.5,
                    },
                },
                selfReference: {
                    size: 20,
                    angle: Math.PI/4,
                }
            },
            physics: {
                barnesHut: {
                    springLength: 105,
                    springConstant: 0.025,
                    gravitationalConstant: -5000
                }
            },
            layout: {
                randomSeed: 0
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

    getIntersectionLineEllipse(line_start, line_end, ellipse) {
        // line.start must be inside the ellipse and line.end must be outside
        // Cave: This check has been tested completely.
        if(line_start.x === line_end.x && line_start.y === line_end.y) {
            return undefined;
        }
        if(line_start.x < ellipse.left || line_start.x > ellipse.right) {
            return undefined;
        }
        if(line_start.y < ellipse.top || line_start.y > ellipse.bottom) {
            return undefined;
        }
        if( line_end.x >= ellipse.left && line_end.x <= ellipse.right &&
            line_end.y >= ellipse.bottom && line_end.y <= ellipse.top) {
            return undefined;
        }
        let vec_line = line_end.clone().subtract(line_start);
        let angle = vec_line.horizontalAngle();
        let a = (ellipse.right - ellipse.left)/2;
        let b = (ellipse.bottom - ellipse.top)/2;
        let insideRoot =
            (a*a)*Math.pow(Math.sin(angle),2)+
            (b*b)*Math.pow(Math.cos(angle),2);
        let r = (a * b) / Math.sqrt(insideRoot);
        let scaled_line = vec_line.normalize().multiplyScalar(r);
        let intersection = line_start.clone().add(scaled_line);
        return intersection;
    }

    getEdge(message) {
        const center_start = new Victor.fromObject(this.network.getPosition(message.source));
        const center_end = new Victor.fromObject(this.network.getPosition(message.target));
        const source_ellipse = this.network.getBoundingBox(message.source);
        const target_ellipse = this.network.getBoundingBox(message.target);
        let start_pos = this.getIntersectionLineEllipse(center_start, center_end, source_ellipse);
        if(start_pos === undefined) {
            start_pos = center_start;
        }
        let end_pos = this.getIntersectionLineEllipse(center_end, center_start, target_ellipse);
        if(end_pos === undefined) {
            end_pos = center_end;
        }
        return {
            start: start_pos,
            end: end_pos
        }
    }

    getMessageCirclePositionOnCircle(message, progress) {
        const node_center = new Victor.fromObject(this.network.getPosition(message.source));
        const node_ellipse = this.network.getBoundingBox(message.source);
        const line_start = node_center;
        const line_end = node_center.clone().add(new Victor(1000, -1000));
        const path_center = this.getIntersectionLineEllipse(line_start, line_end, node_ellipse);
        // TODO: Implement proper way to find start and end position of the path.
        // As this requires to find the intersection between a circle and an ellipse this is rather complicated.
        // Until then multiplying by 0.75 is a simple workaround.
        const progress_angle = Math.PI * 2 * progress * 0.75;
        const path_radius = this.config.visjsOptions.edges.selfReference.size;
        const radius_vec = new Victor.fromArray([0, path_radius]);
        const rotated_radius_vec = radius_vec.clone().rotateBy(progress_angle);
        const position = path_center.clone().add(rotated_radius_vec);
        return position;
    }

    getMessageCirclePositionOnLine(message, progress) {
        const edge = this.getEdge(message);
        // this.getEdge(message);
        const pos_start = new Victor.fromObject(edge.start);
        const pos_end = new Victor.fromObject(edge.end);
        const vec_edge = pos_end.clone().subtract(pos_start);
        if (message.isLost) {
            progress *= 0.5;
        }
        const vec_progress = vec_edge.clone().multiplyScalar(progress);
        let position = pos_start.clone().add(vec_progress);
        return position;
    }

    getMessageCircle(message) {
        if (message.emitTime >= this.time) {
            return undefined;
        }
        if ((message.receiveTime < this.time)) {
            return undefined;
        }

        const progress = (this.time - message.emitTime) / (message.receiveTime - message.emitTime);
        let position;
        if(message.isSelfMessage || message.source === message.target) {
            position = this.getMessageCirclePositionOnCircle(message, progress);
        } else {
            position = this.getMessageCirclePositionOnLine(message, progress);
        }

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

        let fontSize = 22;
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
        // Which Algorithm is a message pending for with source:AlgoX, target:AlgoY??? (target??..!)

        context.textAlign = "right";
        context.fillText(statistics.total_send_messages, width - numberOffset, pos.y + lineHeight * 1);
        context.fillText(statistics.total_received_messages, width - numberOffset, pos.y + lineHeight * 2);
        context.fillText(statistics.total_pending_messages, width - numberOffset, pos.y + lineHeight * 3);
        context.fillText(statistics.selected_send_messages, width - numberOffset, pos.y + lineHeight * 6);
        context.fillText(statistics.selected_received_messages, width - numberOffset, pos.y + lineHeight * 7);
        context.fillText(statistics.selected_pending_messages, width - numberOffset, pos.y + lineHeight * 8);
    }

    draw(context) {
        this.messages.reverse();
        this.messages.forEach(msg => {

            if(this.filterMessages.matchTarget || this.filterMessages.matchSource) {
                let sourceMatchesFilter = msg.sourceAlgorithm.endsWith("/" + this.selectedAlgorithm) || !this.filterMessages.matchSource;
                let targetMatchesFilter = msg.targetAlgorithm.endsWith("/" + this.selectedAlgorithm)  || !this.filterMessages.matchTarget;
                if (!targetMatchesFilter || !sourceMatchesFilter) {
                    return;
                }
            }

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

        if(this.statisticsEnabled) {
            this.drawStatistics(context);
        }

    }

    render() {

        return html`
            <div id="graph-container"></div>
        `;
    }
}
customElements.define('dial-graph', DialGraph);
