
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
            padding: 10px;
        }
        
        #menu-bar {
            height: 25px;
            width: 100%;
            background-color: deepskyblue;
        }
        
        #menu-bar>* {
            margin-right: 0px;
        }
        
        .disabled {
            background-color: #97919b !important;
            opacity: 0.3;
            cursor: default !important;
        }
        
        #menu-bar #address {
            color: #1c274f;
            height: 25px;
            margin-left: 20px;
            padding-left: 15px;
            padding-right: 15px;
            font-family: Monaco, Menlo, monospace;
            font-size: 13px;
            line-height: 25px;
            -webkit-touch-callout:default;
            -webkit-user-select:text;
            -moz-user-select:text;
            -ms-user-select:text;
            user-select:text;
            text-overflow: ellipsis;
            white-space: nowrap;
            overflow: hidden; 
        }
    
        #menu-bar .button {
            aspect-ratio: 1 / 1;
            height: calc(100%);
            background-repeat: no-repeat;
            background-position: center;
            background-size: 50%;
            background-origin: content-box;
            float: left;
            cursor: pointer;
        }
        
        #menu-bar .button:active {
            background-color: #1093e5;
        }
        
        #close-button {
            background-image: url( 'assets/svg/close.svg' );
            background-color: #fc5454;
        }
        
        #back-button {
            background-image: url( 'assets/svg/angle-left.svg' );
            background-color: #f6fc54;
        }
        
        #next-button {
            background-image: url( 'assets/svg/angle-right.svg' );
            background-color: #54fc89;
        }
        
    </style>

    <div id="container"> 
         <div id="menu-bar">
            <div class="button" id="close-button"></div>
            <div class="button" id="back-button"></div>
            <div class="button" id="next-button"></div>
            <div id="address">message#a23e3cc4-a7d0-48ab-b2fb-9621f00577a7</div>
        </div>
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
        this.$address = this.shadowRoot.querySelector("#address");
        this.$closeButton = this.shadowRoot.querySelector("#close-button");
        this.$backButton = this.shadowRoot.querySelector("#back-button");
        this.$nextButton = this.shadowRoot.querySelector("#next-button");

        this.showNone();

        this.locationStack = [];
        this.stackPosition = -1;

        const eventOptions = {
            bubbles: true,
            cancelable: true,
            composed: true,
        };
        const initEvent = new CustomEvent('dial-navigator-init', eventOptions);
        window.dispatchEvent(initEvent);

        this.$closeButton.addEventListener("mousedown", (event) => this.closeButtonClicked(event));
        this.$backButton.addEventListener("mousedown", (event) => this.backButtonClicked(event));
        this.$nextButton.addEventListener("mousedown", (event) => this.nextButtonClicked(event));
    }

    closeButtonClicked(event) {
        this.stackPosition = -1;
        this.locationStack = [];
        const loc = new NavigatorLocation("", "root");
        this.openLocation(loc);
    }

    nextButtonClicked(event) {
        if (this.stackPosition >= (this.locationStack.length - 1)) {
            return;
        }
        this.stackPosition += 1;
        const loc = this.locationStack[this.stackPosition];
        this.openLocation(loc, true)
    }

    backButtonClicked(event) {
        if (this.stackPosition <= 0) {
            return;
        }
        this.stackPosition -= 1;
        const loc = this.locationStack[this.stackPosition];
        this.openLocation(loc, true)
    }

    init(api) {
        this.api = api;
    }

    refresh() {
        const currentLocation = this.locationStack[this.stackPosition];
        const scrollPosition = this.$table.getScrollPosition();
        this.openLocation(currentLocation, true).then(() => {
            this.$table.setScrollPosition(scrollPosition);
        });
    }

    openLocation(location, keepStack) {
        if (this.api === undefined) {
            console.error("navigator.setAddress() is used before call to navigator.init!");
        }

        if (keepStack === undefined) {
            if (this.stackPosition < this.locationStack.length) {
                this.locationStack.splice(this.stackPosition + 1);
            }
            this.locationStack.push(location)
            this.stackPosition += 1;
        }

        if (this.stackPosition === (this.locationStack.length - 1)) {
            this.$nextButton.classList.add("disabled");
        } else {
            this.$nextButton.classList.remove("disabled");
        }

        if (this.stackPosition <= 0) {
            this.$backButton.classList.add("disabled");
        } else {
            this.$backButton.classList.remove("disabled");
        }

        if(location.type === "root") {
            this.$address.textContent = "Simulator";
            return this.setRootInfo();
        }
        if (location.type === "process") {
            this.$address.textContent = "Process " + location.address;
            return this.setProcessInfo(location.address);
        }
        if (location.type === "instance") {
            this.$address.textContent = "Instance " + location.address;
            return this.setInstanceInfo(location.address);
        }
        if (location.type === "context") {
            this.$address.textContent = "Context " + location.address;
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
