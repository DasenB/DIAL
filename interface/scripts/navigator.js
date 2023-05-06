
const navigator_template = document.createElement("template");
navigator_template.innerHTML = `
    <style>
    
        #container {
            width: 100%;
            height: 100%;
            font-family: Arial, Verdana, Helvetica, sans-serif;
            line-height: 20px;
            color: #722a2a;
            box-sizing: border-box;
            font-size: 14px;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }
      
    </style>

    <div id="container"> 
        <dial-editor id="editor"></dial-editor>
        <dial-table id="table"></dial-table>
    </div>
`;

class LocationStackItem {
    constructor(type, location) {
        this.type = type;
        this.location = location;
    }

}

class Navigator extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(navigator_template.content.cloneNode(true));
        this.$container = this.shadowRoot.querySelector('#container');
        this.$editor = this.shadowRoot.querySelector('#editor');
        this.$table = this.shadowRoot.querySelector('#table');
        this.showNone();
        this.locationStack = [];
        this.locationStackPosition = 0;

        this.location = new Address("");
        const eventOptions = {
            bubbles: true,
            cancelable: true,
            composed: true,
        };
        const initEvent = new CustomEvent('dial-navigator-init', eventOptions);
        window.dispatchEvent(initEvent);
    }

    init(api) {
        this.api = api;
    }

    setAddress(location) {
        if (this.api === undefined) {
            console.error("navigator.setAddress() is used before call to navigator.init!");
        }
        this.location = new Address(location);
        if (this.location.type === "root") {
            this.setRootInfo();
        }
    }

    pushToLocationStack(location) {
        if (this.locationStackPosition < this.locationStack.length) {
            this.locationStack.splice(this.locationStackPosition + 1);
        }
        this.locationStackPosition += 1;
        this.locationStack.push(location);
    }

    showNone() {
        this.$table.remove();
        this.$editor.remove();
    }

    showTable() {
        this.$editor.remove();
        this.$container.appendChild(this.$table);
    }

    showEditor() {
        this.$table.remove();
        this.$container.appendChild(this.$editor);
    }

    setProcessInfo(process) {

        this.showTable();

        return this.api.loadPath(`navigator/process/${process}`).catch(reason => {
            throw new Error("Failed to load data for setProcessInfo.", {cause: reason});
        }).then(data => {
            const tableData = {
                "title": process,
                "tables": [
                    {
                        "title": "Neighbors",
                        "data": data.neighbors,
                        "clickHandler": (event) => {
                            this.setProcessInfo(event.target.innerText);
                        }
                    },
                    {
                        "title": "Programs",
                        "data": data.programs,
                        "clickHandler": (event) => {
                            this.setProgramInfo(event.target.innerText);
                        }
                    },
                    {
                        "title": "Instances",
                        "data": data.instances,
                        "clickHandler": (event) => {
                            this.setInstanceInfo(event.target.innerText);
                        }
                    },
                    {
                        "title": "Inbound Messages",
                        "data": data.incoming_messages.map(item => {
                            const sourceAddress = new Address(item.source);
                            const targetAddress = new Address(item.target);
                            const edgeStr = sourceAddress.process + " -> " + targetAddress.process;
                            return [item.uuid, edgeStr];
                        }),
                        "clickHandler": (event) => {
                            this.setMessageInfo(event.target.innerText);
                        }
                    },
                    {
                        "title": "Outbound Messages",
                        "data": data.outgoing_messages.map(item => {
                            const sourceAddress = new Address(item.source);
                            const targetAddress = new Address(item.target);
                            const edgeStr = sourceAddress.process + " -> " + targetAddress.process;
                            return [item.uuid, edgeStr];
                        }),
                        "clickHandler": (event) => {
                            this.setMessageInfo(event.target.innerText);
                        }
                    }
                ]
            };
            this.$table.displayData(tableData);
        });
    }

    setProgramInfo(program) {
        console.log(program);
    }

    setInstanceInfo(instance) {
        console.log(instance);
    }

    setMessageInfo(message) {
        console.log(message);
    }

    setRootInfo() {

        this.showTable();

        return this.api.loadPath("navigator").catch(reason => {
            throw new Error("Failed to load data for NavigatorOverview.", {cause: reason});
        }).then(data => {
            const tableData = {
                "title": "Simulator",
                "tables": [
                    {
                        "title": "Processes",
                        "data": data.processes,
                        "clickHandler": (event) => {
                            this.setProcessInfo(event.target.innerText);
                        }
                    },
                    {
                        "title": "Programs",
                        "data": data.programs,
                        "clickHandler": (event) => {
                            this.setProgramInfo(event.target.innerText);
                        }
                    },
                    {
                        "title": "Instances",
                        "data": data.instances,
                        "clickHandler": (event) => {
                            this.setInstanceInfo(event.target.innerText);
                        }
                    },
                    {
                        "title": "Past Messages",
                        "data": data.consumed_messages.map(item => {
                            const sourceAddress = new Address(item.source);
                            const targetAddress = new Address(item.target);
                            const edgeStr = sourceAddress.process + " -> " + targetAddress.process;
                            return [item.uuid, edgeStr];
                        }),
                        "clickHandler": (event) => {
                            this.setMessageInfo(event.target.innerText);
                        }
                    },
                    {
                        "title": "Future Messages",
                        "data": data.pending_messages.map(item => {
                            const sourceAddress = new Address(item.source);
                            const targetAddress = new Address(item.target);
                            const edgeStr = sourceAddress.process + " -> " + targetAddress.process;
                            return [item.uuid, edgeStr];
                        }),
                        "clickHandler": (event) => {
                            this.setMessageInfo(event.target.innerText);
                        }
                    }
                ]
            };
            this.$table.displayData(tableData);
        });
    }

}

customElements.define('dial-navigator', Navigator);
