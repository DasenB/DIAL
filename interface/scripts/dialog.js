import {css, html, LitElement} from '../libraries/lit-core.js';


class DialDialog extends LitElement {

    constructor() {
        super();
        this.dialogData = [];
    }

    firstUpdated() {
        this.$dialog = this.renderRoot.querySelector("sl-dialog");
        this.$dialog.addEventListener("sl-after-hide", () => {
            if(this.dialogData.length > 0) {
                this.showDialog();
            }
        });
        this.$dialog.addEventListener('sl-request-close', event => {
            if (event.detail.source === 'overlay') {
                event.preventDefault();
            }
        });

        this.defaultActions = {
            close: {
                title: "Close",
                handler: () => {
                    this.closeDialog();
                }
            },
            reload: {
                title: "Reload Page",
                handler: () => {
                    window.location.reload();
                }
            }
        };
    }
    pushDialogToQueue(data) {
        this.dialogData.push(data);
    }

    closeDialog(data) {
        this.$dialog.hide();
    }

    showDialog() {
        if(this.dialogData.length === 0) {
           console.error("Can not display dialog. No DialDialogData-Object is available.");
           return;
        }
        let dialogObject = this.dialogData.shift();
        this.$dialog.label = dialogObject.title;
        this.$dialog.innerHTML = dialogObject.text;

        dialogObject.actions.forEach(action => {
            let button = document.createElement("sl-button");
            button.slot = "footer";
            button.innerHTML = action.title;
            button.onclick = action.handler;
            this.$dialog.appendChild(button);
        });
        this.$dialog.show();
    }




    static styles = css`
      :host {
        box-sizing: border-box;
        display: block;
        position: absolute;
        overflow: hidden;
      }
      
      sl-dialog::part(close-button) {
        display: none;
      }
    `;

    render() {
        return html`
            <sl-dialog label="Error Dialog">
                This dialog will not close when you click on the overlay.
                <sl-button slot="footer" variant="primary">Close</sl-button>
            </sl-dialog>
        `;
    }
}
customElements.define('dial-dialog', DialDialog);




