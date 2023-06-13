
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


class GraphView extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(graphView_template.content.cloneNode(true));

        // Select relevant DOM-Elements
        this.$container = this.shadowRoot.querySelector("#container");

        this.topology = {
            nodes: [],
            edges: []
        };
        this.messages = [];
        this.time = 0;
    }

    setTopology(topology) {
        let nodes = topology.nodes;
        let edges = topology.edges;

        // Create the topology
        this.topology = {
            nodes: new vis.DataSet(nodes),
            edges: new vis.DataSet(edges)
        };

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
        this.network.redraw();
    }

    setMessages(messages) {
        this.messages = messages;
    }

    updateTime(time) {
        this.time = time;
        if (this.network !== undefined) {
            this.network.redraw();
        }
    }


    /**
     * Function that gets called after visjs finished drawing and is responsible for drawing custom elements like the
     * animation of message transfers.
     *
     * @param {Object} context The 2D-context to use for rendering.
     */
    draw(context) {
        if (this.messages.length === 0) {
            console.log("ASDSADASDASD");
            return;
        }

        // Store original context configuration
        const originalStrokeStyle = context.strokeStyle;
        const originalFillStyle = context.fillStyle;
        const originalLineWidth = context.lineWidth;

        // Calculate EmitTime for each message
        const emitTimes = {};
        emitTimes[this.messages[0].id] = 0;
        let counter = 1;
        this.messages.forEach(message => {
            message.children.forEach(child => {
                emitTimes[child] = counter;
            });
            counter += 1;
        });

        // Calculate progress for each message
        for (let i = 0; i < this.messages.length; i++) {
            let message = this.messages[i];
            let receiveTime = i + 1;
            let emitTime = emitTimes[message.id];
            message.progress = (this.time - emitTime) / (receiveTime - emitTime);
        }

        // Draw messages
        this.messages.forEach(message => {
            if(message.progress < 0.0 || message.progress > 1.0) {
                return;
            }

            let vec_start = new Victor.fromObject(this.network.getPosition(message.source.node));
            let vec_end = new Victor.fromObject(this.network.getPosition(message.target.node));
            const direction = vec_end.clone().subtract(vec_start);

                let scaledDirection = direction.clone().multiplyScalar(message.progress);
                const position = vec_start.clone().add(scaledDirection);

                // Make the message grow/shrink at the beginning/end of an animation
                let radius = 10;
                if (message.progress < 0.1) {
                    radius = 100 * message.progress;
                } else if (message.progress > 0.9) {
                    radius = 100 * (1 - message.progress);
                }

                // console.log(this.network.getSelection());
                // // Visually include the message in the selection of its corresponding indicator by adjusting the line-width
                // const key = "from=" + receiveAnimation.message.source.process + "_to=" + receiveAnimation.message.target.process;
                // const messageIndicator = this.messageIndicators[key];
                // if (messageIndicator === undefined) {
                //     context.lineWidth = 1;
                // } else if (messageIndicator.selected === true) {
                //     context.lineWidth = 2.5;
                // } else {
                //     context.lineWidth = 1;
                // }

                // Draw the message
                context.beginPath();
                context.arc(position.x, position.y, radius, 0, 2 * Math.PI);
                context.fillStyle = message.color;
                context.fill();
                context.stroke();

        });

        // Draw Receive-MessageTransfers
        // this.receiveAnimations.forEach(receiveAnimation => {
        //     // Calculate vectors that determine the position of the message
        //     let vec_start = new Victor.fromObject(this.network.getPosition(receiveAnimation.message.source.process));
        //     let vec_end = new Victor.fromObject(this.network.getPosition(receiveAnimation.message.target.process));
        //     const direction = vec_end.clone().subtract(vec_start);
        //
        //     let p = receiveAnimation.progress;
        //     if (receiveAnimation.reversed) {
        //         p = 1 - p;
        //     }
        //
        //     let scaledDirection = direction.clone().multiplyScalar(0.5 + (p * 0.5));
        //     const position = vec_start.clone().add(scaledDirection);
        //
        //     // Make the message grow/shrink at the beginning/end of an animation
        //     let radius = 10;
        //     if (receiveAnimation.progress < 0.1) {
        //         radius = 100 * receiveAnimation.progress;
        //     } else if (receiveAnimation.progress > 0.9) {
        //         radius = 100 * (1 - receiveAnimation.progress);
        //     }
        //
        //     // Visually include the message in the selection of its corresponding indicator by adjusting the line-width
        //     const key = "from=" + receiveAnimation.message.source.process + "_to=" + receiveAnimation.message.target.process;
        //     const messageIndicator = this.messageIndicators[key];
        //     if (messageIndicator === undefined) {
        //         context.lineWidth = 1;
        //     } else if (messageIndicator.selected === true) {
        //         context.lineWidth = 2.5;
        //     } else {
        //         context.lineWidth = 1;
        //     }
        //
        //     // Draw the message
        //     context.beginPath();
        //     context.arc(position.x, position.y, radius, 0, 2 * Math.PI);
        //     context.fillStyle = receiveAnimation.message.color;
        //     context.fill();
        //     context.stroke();
        //
        //     if (receiveAnimation.reversed) {
        //         context.beginPath();
        //         context.moveTo(position.x, position.y);
        //         const cross_length = radius * Math.sin(Math.PI * 0.25);
        //         context.lineTo(position.x + cross_length, position.y + cross_length);
        //         context.moveTo(position.x, position.y);
        //         context.lineTo(position.x + cross_length, position.y - cross_length);
        //         context.moveTo(position.x, position.y);
        //         context.lineTo(position.x - cross_length, position.y + cross_length);
        //         context.moveTo(position.x, position.y);
        //         context.lineTo(position.x - cross_length, position.y - cross_length);
        //         context.stroke();
        //     }
        // });

        // Restore original context configuration
        context.strokeStyle = originalStrokeStyle;
        context.fillStyle = originalFillStyle;
        context.lineWidth = originalLineWidth;
    }
}

customElements.define('dial-graph', GraphView);
