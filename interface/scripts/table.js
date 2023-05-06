
const table_template = document.createElement("template");
table_template.innerHTML = `
    <style>
        @import url(https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&display=swap);
        #container {
            height: 100%;
            width: 100%;
            box-sizing: border-box;
            padding: 10px;
        }
        
        #table-background {
            overflow: scroll;
            height: calc(100% - 25px);
            background-color: #202129;
        }
        
        table {
            width: 100%;
            background-color: #202129;
            color: #f8f8f2;
            font-family: Fira Code, monospace;
            border-collapse: collapse;
        }
        
        th {
            position: -webkit-sticky; /* Safari */
            position: sticky;
            top: 0;
            background-color: #000000;
            padding: 2px;
        }

        table tr:nth-child(even) {
            background-color: #2d2e33;
        }
        
        tr td:first-child {
            border-left: none;
            cursor: pointer;
        }
        
        tr td:last-child {
            border-right: none;
        }
        tr td:first-child:hover {
            background-color: deepskyblue;
        }
        
        td {
            padding: 10px;
            border: 1px solid #6a718f;
            -webkit-touch-callout:default;
            -webkit-user-select:text;
            -moz-user-select:text;
            -ms-user-select:text;
            user-select:text;
            text-overflow: ellipsis;
            white-space: nowrap;
            overflow: hidden; 
        }
        
        
        
        ::-moz-selection {
            background: yellow;
        }
    
        ::selection {
            background: yellow;
        }
        
        #menu-bar {
            height: 25px;
            width: 100%;
            background-color: deepskyblue;
        }
        
        #menu-bar>* {
            margin-right: 0px;
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
        <div id="table-background">
            <table id="instance-table">
                <tr><th>Instances</th></tr>
                <tr><td>flooding/15d8817f-a6ed-4e14-8a70-72630de7afa2</td></tr>
                <tr><td>flooding/0c208590-c284-4b5e-9a78-1363099ad962</td></tr>
                <tr><td>flooding/69acd20d-ba2a-4b32-a1c0-c52056fe0bd8</td></tr>
                <tr><td>termination/7e3670ee-ef06-49b5-94ac-3a68f7ea7643</td></tr>
                <tr><td>voting/28c3a8c8-136d-4678-97ec-dbb145ae8a37</td></tr>
            </table>
            <table id="process-table">
                <tr><th>Processes</th></tr>
                <tr><td>localhost:10101/Process 1</td></tr>
                <tr><td>localhost:10101/Process 2</td></tr>
                <tr><td>localhost:10101/Process 3</td></tr>
                <tr><td>localhost:10101/Process 4</td></tr>
                <tr><td>localhost:10101/Process 5</td></tr>
            </table>
            <table id="message-table">
                <tr><th colspan="2">Messages</th></tr>
                <tr><td>bf44a149-bc10-4e91-aba8-2b48ac152d53</td><td>Process 1 -> Process 4</td></tr>
                <tr><td>67b8b872-e0a0-4be1-98e8-182c872a8c03</td><td>Process 2 -> Process 3</td></tr>
                <tr><td>6cedc717-4057-4f09-8481-beb7d4ed342b</td><td>Process 3 -> Process 1</td></tr>
                <tr><td>b951a7e6-41f0-4987-b4d2-91a8574b5c6a</td><td>Process 4 -> Process 2</td></tr>
                <tr><td>d137f263-318a-460f-b2ea-d5e4845fe888</td><td>Process 5 -> Process 2</td></tr>
            </table>
        </div>
    </div>
`;

// All ( Processes, Instances, MessageUUIDs)
// Process: ProcessAddress -> ( Instances, NeighborProcesses, Incomming_MessageUUIDs, Outgoing_MessageUUIDs)
// (Program: ProgramAddress -> ( Instances, MessageUUIDs ))
// Instance: InstanceAddress -> ( Context, MessageUUIDs )
// Message: UUID -> Message
// Context -> Editor
// Message -> Editor

class Table extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(table_template.content.cloneNode(true));
        this.$tableBackground = this.shadowRoot.querySelector("#table-background");
        this.$address = this.shadowRoot.querySelector("#address");
    }


    displayData(obj) {
        this.$address.textContent = obj.title;
        this.$tableBackground.textContent = "";
        obj.tables.forEach(tableItem => {
            if (tableItem.data.length > 0) {
                let table = document.createElement("table");
                let headerRow = table.insertRow();
                let th = document.createElement("th");
                th.setAttribute("colspan", tableItem.data[0].length)
                th.innerText = tableItem.title;
                headerRow.appendChild(th);

                tableItem.data.forEach(rowItem => {
                    let row = table.insertRow();

                    if (Array.isArray(rowItem)) {
                        rowItem.forEach( cellItem => {
                            let td = document.createElement("td");
                            td.innerText = cellItem;
                            row.appendChild(td);
                        });
                    } else {
                        let td = document.createElement("td");
                        td.innerText = rowItem;
                        row.appendChild(td);
                    }

                    row.firstChild.addEventListener("click", event => {
                        tableItem.clickHandler(event);
                    })
                });
                this.$tableBackground.appendChild(table);
            }
        } );
    }


    open(type, address) {
        console.log(type + " " + address);
    }

}
customElements.define('dial-table', Table);