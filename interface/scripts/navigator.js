
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

class NavigatorLocation {
    constructor(address, type) {
        this.address = address;
        this.type = type;
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
        this.stackPosition = 0;

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

    refresh() {
        const currentLocation = this.locationStack[this.stackPosition - 1];
        const scrollPosition = this.$table.getScrollPosition();
        this.openLocation(currentLocation).then(() => {
            this.$table.setScrollPosition(scrollPosition);
        });
    }

    openLocation(location) {
        if (this.api === undefined) {
            console.error("navigator.setAddress() is used before call to navigator.init!");
        }

        if (this.stackPosition < this.locationStack.length) {
            this.locationStack.splice(this.stackPosition + 1);
        }
        this.locationStack.push(location)
        this.stackPosition += 1;

        if(location.type === "root") {
            return this.setRootInfo();
        }
        if (location.type === "process") {
            return this.setProcessInfo(location.address);
        }
        if (location.type === "instance") {
            return this.setInstanceInfo(location.address);
        }
        if (location.type === "context") {
            return this.setContextInfo(location.address);
        }
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
                            const address = event.target.innerText;
                            const loc = new NavigatorLocation(address, "process");
                            this.openLocation(loc);
                        }
                    },
                    {
                        "title": "Programs",
                        "data": data.programs,
                        "clickHandler": (event) => {
                            const address = event.target.innerText;
                            const loc = new NavigatorLocation(address, "program");
                            this.openLocation(loc);
                        }
                    },
                    {
                        "title": "Instances",
                        "data": data.instances,
                        "clickHandler": (event) => {
                            const address = event.target.innerText;
                            const loc = new NavigatorLocation(address, "instance");
                            this.openLocation(loc);
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
                            const address = event.target.innerText;
                            const loc = new NavigatorLocation(address, "message");
                            this.openLocation(loc);
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
                            const address = event.target.innerText;
                            const loc = new NavigatorLocation(address, "message");
                            this.openLocation(loc);
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
        this.showTable();
        const addr = new Address(instance);
        return this.api.loadPath(`navigator/instance/${addr.host}:${addr.port}/${addr.process}/${addr.program}/${addr.instance}`).catch(reason => {
            throw new Error("Failed to load data for setInstanceInfo.", {cause: reason});
        }).then(data => {
            const tableData = {
                "title": instance,
                "tables": [
                    {
                        "title": "Program",
                        "data": data.program,
                        "clickHandler": (event) => {
                            const address = event.target.innerText;
                            const loc = new NavigatorLocation(address, "program");
                            this.openLocation(loc);
                        }
                    },
                    {
                        "title": "Context",
                        "data": data.context,
                        "clickHandler": (event) => {
                            const address = event.target.innerText;
                            const loc = new NavigatorLocation(address, "context");
                            this.openLocation(loc);
                        }
                    },
                    {
                        "title": "Silblings",
                        "data": data.silblings,
                        "clickHandler": (event) => {
                            const address = event.target.innerText;
                            const loc = new NavigatorLocation(address, "instance");
                            this.openLocation(loc);
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
                            const address = event.target.innerText;
                            const loc = new NavigatorLocation(address, "message");
                            this.openLocation(loc);
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
                            const address = event.target.innerText;
                            const loc = new NavigatorLocation(address, "message");
                            this.openLocation(loc);
                        }
                    }
                ]
            };
            this.$table.displayData(tableData);
        });
    }

    setMessageInfo(message) {
        console.log(message);
    }

    setContextInfo(context) {

        this.showEditor();
        const addr = new Address(context);
        return this.api.loadPath(`navigator/context/${addr.host}:${addr.port}/${addr.process}/${addr.program}/${addr.instance}`).catch(reason => {
            throw new Error("Failed to load data for setContextInfo.", {cause: reason});
        }).then(data => {
            console.log(data);
            this.$editor.loadContent(context, JSON.stringify(data, null, 4));
        });

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
                            const address = event.target.innerText;
                            const loc = new NavigatorLocation(address, "process");
                            this.openLocation(loc);
                        }
                    },
                    {
                        "title": "Programs",
                        "data": data.programs,
                        "clickHandler": (event) => {
                            const address = event.target.innerText;
                            const loc = new NavigatorLocation(address, "program");
                            this.openLocation(loc);
                        }
                    },
                    {
                        "title": "Instances",
                        "data": data.instances,
                        "clickHandler": (event) => {
                            const address = event.target.innerText;
                            const loc = new NavigatorLocation(address, "instance");
                            this.openLocation(loc);
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
                            const address = event.target.innerText;
                            const loc = new NavigatorLocation(address, "message");
                            this.openLocation(loc);
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
                            const address = event.target.innerText;
                            const loc = new NavigatorLocation(address, "message");
                            this.openLocation(loc);
                        }
                    }
                ]
            };
            this.$table.displayData(tableData);
        });
    }

}

customElements.define('dial-navigator', Navigator);
