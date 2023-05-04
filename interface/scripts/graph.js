
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
    constructor(message, resolvePromise, reversed) {
        this.message = message;
        this.progress = 0;
        this.timestamp = Date.now();
        this.resolvePromise = resolvePromise;
        this.reversed = reversed;
    }
}

class GraphView extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(graphView_template.content.cloneNode(true));

        // Select relevant DOM-Elements
        this.$container = this.shadowRoot.querySelector("#container");

        // Set configurations that determine the look of the indicators and of the animations
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

        // Variables related to the animation and display (reinitialized in initializeGraph())
        this.messageIndicators = {};
        this.skipClickEvent = false;
        this.receiveAnimations = [];
        this.emitAnimations = [];

    }

    /**
     * Provides the component with information about the topology and creates the graph.
     * This does not happen in the constructor as information about the topology might not be available at load time
     * and might also change and thus require a reinitialization.
     * @param {Object[]} edges The connection between nodes.
     * @param {Object[]} nodes The nodes of the network.
     * @param {Object} nodes The nodes of the network.
     */
    initializeGraph(edges, nodes, indicators) {
        // Reset the indicators and animations
        this.messageIndicators = {};
        this.skipClickEvent = false;
        this.receiveAnimations = [];
        this.emitAnimations = [];

        // Create the topology
        this.topology = {
            nodes: new vis.DataSet(nodes),
            edges: new vis.DataSet(edges)
        };

        // Create Message indicator objects for all edges to store their numbers of pending messages
        edges.forEach((edge) => {
            const indicator_from_to = new MessageIndicator(edge.to, edge.from, 0);
            const indicator_to_from = new MessageIndicator(edge.to, edge.from, 0);
            indicator_from_to.number = 0;
            indicator_to_from.number = 0;
            const from_to_key = "from=" + edge.from + "_to=" + edge.to;
            const to_from_key = "from=" + edge.to + "_to=" + edge.from;
            this.messageIndicators[from_to_key] = indicator_from_to;
            this.messageIndicators[to_from_key] = indicator_to_from;
        });

        // Set message indicator-values to the values specified in the parameter "indicators"
        indicators.forEach(indicator => {
            const key = "from=" + indicator.from + "_to=" + indicator.to;
            this.messageIndicators[key].number = indicator.number;
        });

        // Set config for visjs that generates the graph
        const visjsOptions = {
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

        // Create the graph and save a reference to the resulting canvas for later use
        this.network = new vis.Network(this.$container, this.topology, visjsOptions);
        this.$canvas = this.shadowRoot.querySelector("canvas");

        // Add event handlers to events produced by the visjs graph.
        this.network.on("afterDrawing", (context) => this.draw(context));
        this.network.on('click', (event) => this.onClick(event), false);
        this.network.on('selectEdge', (event) => this.onSelectEdge(event), false);
    }

    /**
     * Starts an animation of a message being received by a node.
     *
     * @param {Object} message The message that is being received.
     * @param {boolean} reversed Boolean indicating that the animation should be run backwards.
     * @return {Promise} A promise that resolves after the animation finished.
     */
    receiveMessage(message, reversed) {
        return new Promise((resolve, reject) => {
            const receiveAnimation = new MessageTransferAnimation(message, reversed);
            receiveAnimation.reversed = reversed;
            receiveAnimation.resolvePromise = resolve;
            const messageIndicatorKey = "from=" + message.source + "_to=" + message.target;
            if (!(messageIndicatorKey in this.messageIndicators)) {
                const err = new Error("Can not run receive animation for unknown edge.")
                reject(err);
                return;
            }
            this.receiveAnimations.push(receiveAnimation);
            if (!reversed) {
                this.messageIndicators[messageIndicatorKey].number -= 1;
            }
            requestAnimationFrame(() => {
                this.runMessageTransferAnimation();
            });
        });
    }

    /**
     * Starts an animation of a message being send by a node.
     *
     * @param {Object} message The message that is being send.
     * @param {boolean} reversed Boolean indicating that the animation should be run backwards.
     * @return {Promise} A promise that resolves after the animation finished.
     */
    emitMessage(message, reversed) {
        return new Promise((resolve, reject) => {
            const emitAnimation = new MessageTransferAnimation(message, reversed);
            emitAnimation.reversed = reversed;
            emitAnimation.resolvePromise = resolve;
            const messageIndicatorKey = "from=" + message.source + "_to=" + message.target;
            if (!(messageIndicatorKey in this.messageIndicators)) {
                const err = new Error("Can not run emit animation for unknown edge.")
                reject(err);
                return;
            }
            this.emitAnimations.push(emitAnimation);
            if (reversed) {
                this.messageIndicators[messageIndicatorKey].number -= 1;
            }
            requestAnimationFrame(() => {
                this.runMessageTransferAnimation();
            });
        });
    }

    /**
     * Function to run the animation that visualizes traveling messages being send and received.
     */
    runMessageTransferAnimation() {
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
            if (item.progress <= 1) {
                return true;
            } else {
                if (item.reversed) {
                    const messageIndicatorKey = "from=" + item.message.source + "_to=" + item.message.target;
                    this.messageIndicators[messageIndicatorKey].number += 1;
                }
                item.resolvePromise();
                return false;
            }
        });

        // Move emit transfers forward
        this.emitAnimations.forEach(emitAnimation => {
            const t = current_frame_time - emitAnimation.timestamp;
            const tInSeconds = t / 1000;
            emitAnimation.timestamp = current_frame_time;
            emitAnimation.progress += tInSeconds * this.animationSpeed;
        });

        // Remove finished emit transfers
        this.emitAnimations = this.emitAnimations.filter(item => {
            if(item.progress <= 1) {
                return true;
            } else {
                if (!item.reversed) {
                    const messageIndicatorKey = "from=" + item.message.source + "_to=" + item.message.target;
                    this.messageIndicators[messageIndicatorKey].number += 1;
                }
                item.resolvePromise();
                return false;
            }
        });

        // Run animation if necessary
        this.network.redraw();
        if (this.receiveAnimations.length > 0 || this.emitAnimations.length > 0) {
            requestAnimationFrame(() => {
                this.runMessageTransferAnimation();
            });
        }
    }

    /**
     * Function to draw a MessageIndicator for a edge displaying how many messages are currently traveling on that edge.
     *
     * @param {Object} context The 2D-context of the visjs canvas.
     * @param {Object} vectors An object containing all the vectors needed to draw a message indicator.
     * @param {Object} messageIndicator The MessageIndicator-Object that should be drawn.
     */
    drawMessageIndicator(context, vectors, messageIndicator) {

        // Do not draw a message indicator for edges without messages traveling along them.
        if (messageIndicator.number === 0) {
            messageIndicator.boundingBox = new Path2D();
            return;
        }

        // Calculate the dimensions based on the configuration and on the length of the text inside the box.
        const indicatorWidth = 15 + (Math.floor(Math.log10(messageIndicator.number))) * this.messageIndicatorConfig.width;
        const indicatorDistance = Math.max(this.messageIndicatorConfig.distance, (indicatorWidth/2) + 5);
        var vec_scale_to_distance  = new Victor(indicatorDistance, indicatorDistance);
        var boxCenter = vectors.edge_center.clone().add(vectors.edge_direction.clone().normalize().multiply(vec_scale_to_distance).rotateToDeg(vectors.edge_direction.angleDeg() + 90));
        var boxCorner = new Victor(boxCenter.x - (indicatorWidth / 2), boxCenter.y - (this.messageIndicatorConfig.height / 2));
        var boxArrowEnd = boxCenter.clone().add(vectors.edge_direction.normalize().multiply(vectors.vec_scale_arrow));
        var boxArrowTip1 = boxArrowEnd.clone().add(vectors.edge_direction.clone().normalize().multiply(vectors.vec_scale_arrow_tip).rotateToDeg(vectors.edge_direction.angleDeg() + 90 + this.messageIndicatorConfig.arrow_head_angle));
        var boxArrowTip2 = boxArrowEnd.clone().add(vectors.edge_direction.clone().normalize().multiply(vectors.vec_scale_arrow_tip).rotateToDeg(vectors.edge_direction.angleDeg() - (90 + this.messageIndicatorConfig.arrow_head_angle)));

        // Save the current canvas drawing config to prevent unwanted side effects in the visjs internal drawing.
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

        // Update the bounding box of the MessageIndicator-Object
        messageIndicator.boundingBox = box;

        // Reset the drawing configuration of the canvas to the initial one.
        context.strokeStyle = originalStrokeStyle;
        context.fillStyle = originalFillStyle;
        context.lineWidth = originalLineWidth;
    }


    /**
     * Function that gets called when clicking onto the canvas and checks if a message indicator was selected.
     *
     * @param {Object} event The event generated by visjs (https://visjs.github.io/vis-network/docs/network/#Events)
     */
    onClick(event) {
        // Skip click-events that happen after a onSelectEdge-event as they are handled in their own function.
        if (this.skipClickEvent === true) {
            this.skipClickEvent = false;
            return
        }

        // Check for all MessageIndicator-Objects if the click happened within their bounding-box
        const context = this.$canvas.getContext("2d");
        for (const key in this.messageIndicators) {
            const messageIndicator = this.messageIndicators[key];
            if (context.isPointInPath(messageIndicator.boundingBox, event.pointer.canvas.x, event.pointer.canvas.y)) {
                messageIndicator.selected = true;
                this.network.unselectAll();
            } else {
                messageIndicator.selected = false;
            }
        }
    }

    /**
     * Function that gets called when clicking onto an edge and selects all MessageIndicator-objects belonging to that
     * edge.
     *
     * @param {Object} event The event generated by visjs (https://visjs.github.io/vis-network/docs/network/#Events)
     */
    onSelectEdge(event) {

        // Unselect all message indicators
        for (var key in this.messageIndicators) {
            const messageIndicator = this.messageIndicators[key];
            messageIndicator.selected = false;
        }

        // Prevent the next Click-Event that follows on an onSelectEdge-Event
        this.skipClickEvent = true;

        // Find all message indicators along the edge and highlight them
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

    /**
     * Function that gets called after visjs finished drawing and is responsible for drawing custom elements like the
     * animation of message transfers.
     *
     * @param {Object} context The 2D-context to use for rendering.
     */
    draw(context) {

        // Draw MessageIndicators
        this.topology.edges.forEach(edge => {
            // Vectors common for both MessageIndicators along a edge
            const vec_scale_to_position = new Victor(this.messageIndicatorConfig.position, this.messageIndicatorConfig.position);
            const vec_scale_arrow = new Victor(this.messageIndicatorConfig.arrowLength, this.messageIndicatorConfig.arrowLength);
            const vec_scale_arrow_tip = new Victor(this.messageIndicatorConfig.arrowHeadLength, this.messageIndicatorConfig.arrowHeadLength);
            const vec_start = new Victor.fromObject(this.network.getPosition(edge.from));
            const vec_end = new Victor.fromObject(this.network.getPosition(edge.to));
            const vec_position = vec_start.clone();
            const vec_direction = vec_end.clone().subtract(vec_start);
            const vec_edge_center = vec_position.clone().add(vec_direction.clone().multiply(vec_scale_to_position));

            // Create the object containing the vectors
            const vectors = {
                edge_direction: vec_direction,
                edge_center: vec_edge_center,
                vec_scale_arrow_tip: vec_scale_arrow_tip,
                vec_scale_arrow: vec_scale_arrow
            }

            // Draw both MessageIndicators
            const from_to_key = "from=" + edge.from + "_to=" + edge.to;
            const to_from_key = "from=" + edge.to + "_to=" + edge.from;
            this.drawMessageIndicator(context, vectors, this.messageIndicators[from_to_key]);
            vectors.edge_direction.invert()
            this.drawMessageIndicator(context, vectors, this.messageIndicators[to_from_key]);
        });

        // Store original context configuration
        const originalStrokeStyle = context.strokeStyle;
        const originalFillStyle = context.fillStyle;
        const originalLineWidth = context.lineWidth;

        // Draw Receive-MessageTransfers
        this.receiveAnimations.forEach(receiveAnimation => {
            // Calculate vectors that determine the position of the message
            let vec_start = new Victor.fromObject(this.network.getPosition(receiveAnimation.message.source));
            let vec_end = new Victor.fromObject(this.network.getPosition(receiveAnimation.message.target));
            const direction = vec_end.clone().subtract(vec_start);

            let p = receiveAnimation.progress;
            if (receiveAnimation.reversed) {
                p = 1 - p;
            }

            let scaledDirection = direction.clone().multiplyScalar(0.5 + (p * 0.5));
            const position = vec_start.clone().add(scaledDirection);

            // Make the message grow/shrink at the beginning/end of an animation
            let radius = 10;
            if (receiveAnimation.progress < 0.1) {
                radius = 100 * receiveAnimation.progress;
            } else if (receiveAnimation.progress > 0.9) {
                radius = 100 * (1 - receiveAnimation.progress);
            }

            // Visually include the message in the selection of its corresponding indicator by adjusting the line-width
            const key = "from=" + receiveAnimation.message.source + "_to=" + receiveAnimation.message.target;
            const messageIndicator = this.messageIndicators[key];
            if (messageIndicator === undefined) {
                context.lineWidth = 1;
            } else if (messageIndicator.selected === true) {
                context.lineWidth = 2.5;
            } else {
                context.lineWidth = 1;
            }

            // Draw the message
            context.beginPath();
            context.arc(position.x, position.y, radius, 0, 2 * Math.PI);
            context.fillStyle = receiveAnimation.message.color;
            context.fill();
            context.stroke();

            if (receiveAnimation.reversed) {
                context.beginPath();
                context.moveTo(position.x, position.y);
                const cross_length = radius * Math.sin(Math.PI * 0.25);
                context.lineTo(position.x + cross_length, position.y + cross_length);
                context.moveTo(position.x, position.y);
                context.lineTo(position.x + cross_length, position.y - cross_length);
                context.moveTo(position.x, position.y);
                context.lineTo(position.x - cross_length, position.y + cross_length);
                context.moveTo(position.x, position.y);
                context.lineTo(position.x - cross_length, position.y - cross_length);
                context.stroke();
            }
        });

        // Draw Emit-MessageTransfers
        this.emitAnimations.forEach(emitAnimation => {
            // Calculate vectors that determine the position of the message
            const vec_start = new Victor.fromObject(this.network.getPosition(emitAnimation.message.source));
            const vec_end = new Victor.fromObject(this.network.getPosition(emitAnimation.message.target));
            const direction = vec_end.clone().subtract(vec_start);
            let p = emitAnimation.progress;
            if (emitAnimation.reversed) {
                p = 1 - p;
            }
            let scaledDirection = direction.clone().multiplyScalar(p * 0.5);
            const position = vec_start.clone().add(scaledDirection);

            // Make the message grow/shrink at the beginning/end of an animation
            let radius = 10;
            if (emitAnimation.progress < 0.1) {
                radius = 100 * emitAnimation.progress;
            } else if (emitAnimation.progress > 0.9) {
                radius = 100 * (1 - emitAnimation.progress);
            }

            // Visually include the message in the selection of its corresponding indicator by adjusting the line-width
            const key = "from=" + emitAnimation.message.source + "_to=" + emitAnimation.message.target;
            const messageIndicator = this.messageIndicators[key];
            if (messageIndicator === undefined) {
                context.lineWidth = 1;
            } else if (messageIndicator.selected === true) {
                context.lineWidth = 2.5;
            } else {
                context.lineWidth = 1;
            }

            // Draw the message
            context.beginPath();
            context.arc(position.x, position.y, radius, 0, 2 * Math.PI);
            context.fillStyle = emitAnimation.message.color;
            context.fill();
            context.stroke();

            if (emitAnimation.reversed) {
                context.beginPath();
                context.moveTo(position.x, position.y);
                const cross_length = radius * Math.sin(Math.PI * 0.25);
                context.lineTo(position.x + cross_length, position.y + cross_length);
                context.moveTo(position.x, position.y);
                context.lineTo(position.x + cross_length, position.y - cross_length);
                context.moveTo(position.x, position.y);
                context.lineTo(position.x - cross_length, position.y + cross_length);
                context.moveTo(position.x, position.y);
                context.lineTo(position.x - cross_length, position.y - cross_length);
                context.stroke();
            }
        });

        // Restore original context configuration
        context.strokeStyle = originalStrokeStyle;
        context.fillStyle = originalFillStyle;
        context.lineWidth = originalLineWidth;
    }
}

customElements.define('dial-graph', GraphView);
