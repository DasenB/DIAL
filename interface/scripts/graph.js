
const graphView_template = document.createElement("template");
graphView_template.innerHTML = `
    <style>
    
        #container {
            height: 100%;
            width: 100%;
        }
       
        
    </style>
    <div id="container"></div>
`;

class DialMessage {
    constructor(obj) {
        this.source = obj.source;
        this.target = obj.target;
        this.data = obj.data;
        this.uuid = obj.uuid;
        this.color = obj.color;
    }

}

class MessageIndicator {
    constructor(to, from, number) {
        this.target_node = to;
        this.source_node = from;
        this.number = number;
        this.selected = false;
        this.boundingBox = null;
    }
}

class MessageTransferAnimation {
    constructor(message) {
        this.message = message;
        this.progress = 0;
        this.timestamp = Date.now();
    }
}

class GraphView extends HTMLElement {

    nodes = ["A", "B", "C", "D"];
    links = [["A", "B"], ["A", "C"], ["C", "C"]];

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(graphView_template.content.cloneNode(true));
        this.$container = this.shadowRoot.querySelector("#container");
        this.messageIndicators = {};
        this.skipClickEvent = false;
        this.receiveAnimations = [];
        this.emitAnimations = [];
        this.animationSpeed = 0.2;

        this.messageIndicatorConfig = {
            width: 5,
            height: 15,
            distance: 15,
            position: 0.5,
            arrowLength: 30,
            arrowHeadLength: 8,
            arrow_head_angle: 75
        };


        var nodes = new vis.DataSet([
            {id: 1, label: 'Node 1'},
            {id: 2, label: 'Node 2'},
            {id: 3, label: 'Node 3'},
            {id: 4, label: 'Node 4'},
            {id: 5, label: 'Node 5'}
        ]);

        // create an array with edges
        var edges = new vis.DataSet([
            {from: 1, to: 3},
            {from: 1, to: 2},
            {from: 2, to: 4},
            {from: 2, to: 5}
        ]);
        // provide the data in the vis format
        this.topology = {
            nodes: nodes,
            edges: edges
        };
        const options = {
            "edges": {
                "smooth": false
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
        }

        // Create Message indicator objects
        edges.forEach((edge) => {
            const indicator_from_to = new MessageIndicator(edge.to, edge.from, 0);
            const indicator_to_from = new MessageIndicator(edge.to, edge.from, 0);
            indicator_from_to.number = Math.floor(Math.random() * 10);
            indicator_to_from.number = Math.floor(Math.random() * 100);
            const from_to_key = "from=" + edge.from + "_to=" + edge.to;
            const to_from_key = "from=" + edge.to + "_to=" + edge.from;
            this.messageIndicators[from_to_key] = indicator_from_to;
            this.messageIndicators[to_from_key] = indicator_to_from;
        });

        this.network = new vis.Network(this.$container, this.topology, options);
        this.$canvas = this.shadowRoot.querySelector("canvas");


        this.network.on("afterDrawing", (context) => this.draw(context, this));
        this.network.on('click', (event) => this.onClick(event), false);
        this.network.on('selectEdge', (event) => this.onSelectEdge(event), false);
        // this.network.on('selectNode', (event) => this.network.unselectAll, false);

        window.addEventListener("receiveMessage", (event) => this.onReceiveMessage(event));
        window.addEventListener("emitMessage", (event) => this.onEmitMessage(event));
    }

    animateTransferMessage() {
        const current_frame_time = Date.now();

        // Move receive transfers forward
        this.receiveAnimations.forEach(receiveAnimation => {
            const t = current_frame_time - receiveAnimation.timestamp;
            const tInSeconds = t / 1000;
            receiveAnimation.timestamp = current_frame_time;
            receiveAnimation.progress += tInSeconds * this.animationSpeed;
        });
        // Remove finished receive transfers
        this.receiveAnimations = this.receiveAnimations.filter(item => {
            return item.progress <= 1;
        });

        // Move emit transfers forward
        this.emitAnimations.forEach(emitAnimation => {
            const t = current_frame_time - emitAnimation.timestamp;
            const tInSeconds = t / 1000;
            emitAnimation.timestamp = current_frame_time;
            emitAnimation.progress += tInSeconds * this.animationSpeed;
        });
        // Remove emit receive transfers
        this.emitAnimations = this.emitAnimations.filter(item => {
            if(item.progress <= 1) {
                return true;
            } else {
                const messageIndicatorKey = "from=" + item.message.source + "_to=" + item.message.target;
                this.messageIndicators[messageIndicatorKey].number += 1;
                return false;
            }
        });

        // Run animation if necessary
        this.network.redraw();
        if (this.receiveAnimations.length > 0 || this.emitAnimations.length > 0) {
            requestAnimationFrame(() => {
                this.animateTransferMessage();
            });
        }
    }

    onReceiveMessage(event) {
        const message = event.detail;
        const receiveAnimation = new MessageTransferAnimation(message);
        this.receiveAnimations.push(receiveAnimation);
        const messageIndicatorKey = "from=" + message.source + "_to=" + message.target;
        this.messageIndicators[messageIndicatorKey].number -= 1;
        requestAnimationFrame(() => {
            this.animateTransferMessage();
        });
    }

    onEmitMessage(event) {
        const message = event.detail;
        const emitAnimation = new MessageTransferAnimation(message);
        this.emitAnimations.push(emitAnimation);
        requestAnimationFrame(() => {
            this.animateTransferMessage();
        });
    }

    drawMessageBox(context, vectors, messageIndicator) {
        if (messageIndicator.number === 0) {
            messageIndicator.boundingBox = new Path2D();
            return;
        }

        const indicatorWidth = 15 + (Math.floor(Math.log10(messageIndicator.number))) * this.messageIndicatorConfig.width;
        const indicatorDistance = Math.max(this.messageIndicatorConfig.distance, (indicatorWidth/2) + 5);

        var vec_scale_to_distance  = new Victor(indicatorDistance, indicatorDistance);
        var boxCenter = vectors.edge_center.clone().add(vectors.edge_direction.clone().normalize().multiply(vec_scale_to_distance).rotateToDeg(vectors.edge_direction.angleDeg() + 90));
        var boxCorner = new Victor(boxCenter.x - (indicatorWidth / 2), boxCenter.y - (this.messageIndicatorConfig.height / 2));
        var boxArrowEnd = boxCenter.clone().add(vectors.edge_direction.normalize().multiply(vectors.vec_scale_arrow));
        var boxArrowTip1 = boxArrowEnd.clone().add(vectors.edge_direction.clone().normalize().multiply(vectors.vec_scale_arrow_tip).rotateToDeg(vectors.edge_direction.angleDeg() + 90 + this.messageIndicatorConfig.arrow_head_angle));
        var boxArrowTip2 = boxArrowEnd.clone().add(vectors.edge_direction.clone().normalize().multiply(vectors.vec_scale_arrow_tip).rotateToDeg(vectors.edge_direction.angleDeg() - (90 + this.messageIndicatorConfig.arrow_head_angle)));

        const originalStrokeStyle = context.strokeStyle;
        const originalFillStyle = context.fillStyle;
        const originalLineWidth  = context.lineWidth;

        // Modify style of selected message indicators
        if (messageIndicator.selected === true) {
            context.lineWidth = 2.5;
        } else {
            context.lineWidth = 1;
        }

        // Draw arrow base
        context.beginPath();
        context.moveTo(boxArrowEnd.x, boxArrowEnd.y);
        context.lineTo(boxCenter.x, boxCenter.y);
        context.stroke();

        // Draw arrow tip
        context.beginPath();
        context.moveTo(boxArrowTip1.x, boxArrowTip1.y);
        context.lineTo(boxArrowEnd.x, boxArrowEnd.y);
        context.lineTo(boxArrowTip2.x, boxArrowTip2.y);
        context.stroke();

        // Draw Box
        const box = new Path2D();
        context.fillStyle = '#ffffff';
        box.rect(boxCorner.x, boxCorner.y, indicatorWidth, this.messageIndicatorConfig.height);
        context.fill(box);
        context.stroke(box);

        // Draw Text
        context.font = "10px Monaco";
        context.textAlign = "center";
        context.fillStyle = '#000000';
        context.fillText(messageIndicator.number.toString(), boxCenter.x, boxCenter.y);
        context.stroke();

        messageIndicator.boundingBox = box;

        context.strokeStyle = originalStrokeStyle;
        context.fillStyle = originalFillStyle;
        context.lineWidth = originalLineWidth;
    }

    onClick(event) {
        if (this.skipClickEvent === true) {
            this.skipClickEvent = false;
            return
        }
        const context = this.$canvas.getContext("2d");
        for (var key in this.messageIndicators) {
            const messageIndicator = this.messageIndicators[key];
            if (context.isPointInPath(messageIndicator.boundingBox, event.pointer.canvas.x, event.pointer.canvas.y)) {
                messageIndicator.selected = true;
                this.network.unselectAll();
            } else {
                messageIndicator.selected = false;
            }
        }
    }

    onSelectEdge(event) {

        // Unselect all other message indicators
        for (var key in this.messageIndicators) {
            const messageIndicator = this.messageIndicators[key];
            messageIndicator.selected = false;
        }

        // Prevent the next Click-Event that follows on an onSelectEdge-Event
        this.skipClickEvent = true;

        event.edges.forEach((edgeID) => {
            const nodeIDs = this.network.getConnectedNodes(edgeID);
            if (nodeIDs.length !== 2) {
                this.network.unselectAll();
            }
            const from_to_key = "from=" + nodeIDs[0] + "_to=" + nodeIDs[1];
            const to_from_key = "from=" + nodeIDs[1] + "_to=" + nodeIDs[0];

            this.messageIndicators[from_to_key].selected = true;
            this.messageIndicators[to_from_key].selected = true;
        });


    }

    draw(context, graphView) {
        // Draw MessageIndicators
        graphView.topology.edges.forEach(edge => {
            // Common vectors
            const vec_scale_to_position = new Victor(graphView.messageIndicatorConfig.position, graphView.messageIndicatorConfig.position);
            const vec_scale_arrow = new Victor(graphView.messageIndicatorConfig.arrowLength, graphView.messageIndicatorConfig.arrowLength);
            const vec_scale_arrow_tip = new Victor(graphView.messageIndicatorConfig.arrowHeadLength, graphView.messageIndicatorConfig.arrowHeadLength);
            const vec_start = new Victor.fromObject(graphView.network.getPosition(edge.from));
            const vec_end = new Victor.fromObject(graphView.network.getPosition(edge.to));
            const vec_position = vec_start.clone();
            const vec_direction = vec_end.clone().subtract(vec_start);
            const vec_edge_center = vec_position.clone().add(vec_direction.clone().multiply(vec_scale_to_position));

            const vectors = {
                edge_direction: vec_direction,
                edge_center: vec_edge_center,
                vec_scale_arrow_tip: vec_scale_arrow_tip,
                vec_scale_arrow: vec_scale_arrow
            }

            const from_to_key = "from=" + edge.from + "_to=" + edge.to;
            const to_from_key = "from=" + edge.to + "_to=" + edge.from;

            graphView.drawMessageBox(context, vectors, graphView.messageIndicators[from_to_key]);
            vectors.edge_direction.invert()
            graphView.drawMessageBox(context, vectors, graphView.messageIndicators[to_from_key]);
        });

        // Store original context configuration
        const originalStrokeStyle = context.strokeStyle;
        const originalFillStyle = context.fillStyle;
        const originalLineWidth = context.lineWidth;

        // Draw Receive-MessageTransfers
        graphView.receiveAnimations.forEach(receiveAnimation => {
            const vec_start = new Victor.fromObject(graphView.network.getPosition(receiveAnimation.message.source));
            const vec_end = new Victor.fromObject(graphView.network.getPosition(receiveAnimation.message.target));
            const direction = vec_end.clone().subtract(vec_start);
            const scaledDirection = direction.clone().multiplyScalar(0.5 + (receiveAnimation.progress * 0.5));
            const position = vec_start.clone().add(scaledDirection);

            let radius = 10;
            if (receiveAnimation.progress < 0.1) {
                radius = 100 * receiveAnimation.progress;
            } else if (receiveAnimation.progress > 0.9) {
                radius = 100 * (1 - receiveAnimation.progress);
            }

            // Include the message-transfer in the selection of its corresponding indicator
            const key = "from=" + receiveAnimation.message.source + "_to=" + receiveAnimation.message.target;
            const messageIndicator = graphView.messageIndicators[key];
            if (messageIndicator === undefined) {
                context.lineWidth = 1;
            } else if (messageIndicator.selected === true) {
                context.lineWidth = 2.5;
            } else {
                context.lineWidth = 1;
            }
            context.beginPath();
            context.arc(position.x, position.y, radius, 0, 2 * Math.PI);
            context.fillStyle = receiveAnimation.message.color;
            context.fill();
            context.stroke();
        });

        // Draw Emit-MessageTransfers
        graphView.emitAnimations.forEach(emitAnimation => {
            const vec_start = new Victor.fromObject(graphView.network.getPosition(emitAnimation.message.source));
            const vec_end = new Victor.fromObject(graphView.network.getPosition(emitAnimation.message.target));
            const direction = vec_end.clone().subtract(vec_start);
            const scaledDirection = direction.clone().multiplyScalar(emitAnimation.progress * 0.5);
            const position = vec_start.clone().add(scaledDirection);

            let radius = 10;
            if (emitAnimation.progress < 0.1) {
                radius = 100 * emitAnimation.progress;
            } else if (emitAnimation.progress > 0.9) {
                radius = 100 * (1 - emitAnimation.progress);
            }

            // Include the message-transfer in the selection of its corresponding indicator
            const key = "from=" + emitAnimation.message.source + "_to=" + emitAnimation.message.target;
            const messageIndicator = graphView.messageIndicators[key];
            if (messageIndicator === undefined) {
                context.lineWidth = 1;
            } else if (messageIndicator.selected === true) {
                context.lineWidth = 2.5;
            } else {
                context.lineWidth = 1;
            }
            context.beginPath();
            context.arc(position.x, position.y, radius, 0, 2 * Math.PI);
            context.fillStyle = emitAnimation.message.color;
            context.fill();
            context.stroke();
        });

        // Restore original context configuration
        context.strokeStyle = originalStrokeStyle;
        context.fillStyle = originalFillStyle;
        context.lineWidth = originalLineWidth;

    }


}

customElements.define('dial-graph', GraphView);
