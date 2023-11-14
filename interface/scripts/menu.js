import {css, html, LitElement} from '../libraries/lit-core.js';

class DialMenu extends LitElement {

    static properties = {
        timeIndicator: {
            attribute: false,
            type: String
        },
        instancesAddresses: {
            state: true
        }
    };


    constructor() {
        super();

        let savedSpeed = Number(this.getCookie("dial-menu-speed"));
        if (savedSpeed === undefined || isNaN(savedSpeed)) {
            savedSpeed = 1.0;
            this.setCookie("dial-menu-speed", savedSpeed);
        }

        let savedStatisticsState = this.getCookie("dial-menu-statistics-state");
        if (savedStatisticsState === undefined) {
            savedStatisticsState = false;
            this.setCookie("dial-menu-statistics-state", savedStatisticsState);
        } else {
            savedStatisticsState = savedStatisticsState === "true";
        }

        let savedMatchSource = this.getCookie("dial-menu-match-source");
        if (savedMatchSource === undefined) {
            savedMatchSource = false;
            this.setCookie("dial-menu-match-source", savedMatchSource);
        } else {
            savedMatchSource = savedMatchSource === "true";
        }

        let savedMatchTarget = this.getCookie("dial-menu-match-target");
        if (savedMatchTarget === undefined) {
            savedMatchTarget = false;
            this.setCookie("dial-menu-match-target", savedMatchTarget);
        } else {
            savedMatchTarget = savedMatchTarget === "true";
        }

        let savedSelectedView = this.getCookie("dial-menu-selected-view");
        if (savedSelectedView === undefined || savedSelectedView === null) {
            savedSelectedView = "graph";
            this.setCookie("dial-menu-selected-view", savedMatchTarget);
        }


        this.selectedView = savedSelectedView;
        this.speed = savedSpeed;
        this.statisticsState = savedStatisticsState;
        this.matchSource = savedMatchSource;
        this.matchTarget = savedMatchTarget;
        this.timeIndicator = undefined;
        this.instancesAddresses = [];
    }

    handleSelectedViewChange(view) {
        this.selectedView = view;
        this.setCookie("dial-menu-selected-view", view);
        this.emitEvent("change-view", {
            view: view
        });
        if(view === "graph") {
            this.$timeSelectItem.checked = false;
        }
        if(view === "time") {
            this.$graphSelectItem.checked = false;
        }
    }

    setCookie(name, value) {
        let date = new Date();
        date.setTime(date.getTime() + (14 * 24 * 60 * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = name + "=" + value + "; " + expires + "; path=/; SameSite=Strict";
    }

    getCookie(name) {
        name = name + "=";
        const cDecoded = decodeURIComponent(document.cookie); //to be careful
        const cArr = cDecoded .split('; ');
        let res;
        cArr.forEach(val => {
            if (val.indexOf(name) === 0) res = val.substring(name.length);
        });
        return res;

    }

    firstUpdated() {
        this.$speedSelector = this.renderRoot.querySelector("#speed-input");
        this.$instanceSelector = this.renderRoot.querySelector("#instance-input");
        this.$playPauseIcon = this.renderRoot.querySelector("sl-tooltip[content='Play/Pause'] sl-button sl-icon");

        this.$fastBackwardButton = this.renderRoot.querySelector("sl-tooltip[content='Fast Backward'] sl-button");
        this.$stepBackwardButton = this.renderRoot.querySelector("sl-tooltip[content='Step Backward'] sl-button");
        this.$playPauseButton = this.renderRoot.querySelector("sl-tooltip[content='Play/Pause'] sl-button");
        this.$stepForwardButton = this.renderRoot.querySelector("sl-tooltip[content='Step Forward'] sl-button");
        this.$fastForwardButton = this.renderRoot.querySelector("sl-tooltip[content='Fast Forward'] sl-button");

        this.$graphSelectItem = this.renderRoot.querySelector("#graph-view-selection-item");
        this.$timeSelectItem = this.renderRoot.querySelector("#time-view-selection-item");

        this.handleSpeedChange();
        this.handleConfigToggleStatistic();
        this.handleConfigToggleMessageFiltering();
        this.handleSelectedViewChange(this.selectedView);
    }

    setTimeIndicator(time, theta) {
        if (theta != undefined && Number.isInteger(time)) {
            this.timeIndicator = `${time}/${theta}`
        } else {
            this.timeIndicator = `${time.toFixed(2)}`;
        }
    }

    setPlayState(state) {
        if (state) {
            this.$playPauseIcon.name = "pause";
        } else {
            this.$playPauseIcon.name = "play";
        }
    }

    setInstanceAddresses(instanceAddresses) {
        this.instancesAddresses = instanceAddresses;
        if(this.$instanceSelector.value === "") {
            this.$instanceSelector.value = this.instancesAddresses[0];
            this.handleInstanceChange();
        }
    }

    setCanMoveForward(state) {
        this.$playPauseButton.disabled = !state;
        this.$stepForwardButton.disabled = !state;
        this.$fastForwardButton.disabled = !state;
    }

    setCanMoveBackward(state) {
        this.$stepBackwardButton.disabled = !state;
        this.$fastBackwardButton.disabled = !state;
    }


    emitEvent(name, data) {
        console.log(name);
        const event = new CustomEvent(`dial-menu:${name}`, {
            detail: data,
            bubbles: true,
            composed: true,
            cancelable: true,
        });
        this.dispatchEvent(event);
    }

    handleReset() {
        this.emitEvent("reset");
    }

    handleFastBackward() {
        this.emitEvent("fast-backward");
    }

    handleStepBackward() {
        this.emitEvent("step-backward");
    }

    handlePlayPause() {
        this.emitEvent("play-pause");
    }

    handleStepForward() {
        this.emitEvent("step-forward");
    }

    handleFastForward() {
        this.emitEvent("fast-forward");
    }

    handleSpeedChange() {
        this.speed = this.$speedSelector.value;
        this.setCookie("dial-menu-speed", this.speed);
        this.emitEvent("change-speed", {
            speed: this.$speedSelector.value
        });
    }

    handleInstanceChange() {
        let value = this.$instanceSelector.value;
        if (value === undefined) {
            return;
        }
        if(!value.includes("/")) {
            return;
        }
        this.emitEvent("change-instance", {
            instance: this.$instanceSelector.value
        });
    }

    handleConfigToggleStatistic() {
        this.setCookie("dial-menu-statistics-state", this.statisticsState);
        this.emitEvent("toggle-statistics", {
            state: this.statisticsState
        });
    }

    handleConfigToggleMessageFiltering() {
        this.setCookie("dial-menu-match-source", this.matchSource);
        this.setCookie("dial-menu-match-target", this.matchTarget);
        this.emitEvent("toggle-filter-messages", {
            sourceFiltering: this.matchSource,
            targetFiltering: this.matchTarget
        });
    }

    static styles = css`
      :host {
        box-sizing: border-box;
        display: block;
        position: absolute;
        bottom: 0;
        background-color: var(--sl-color-teal-200);
        width: 100%;
        padding-left: 10px;
        padding-right: 10px;
        white-space: nowrap;
        overflow: visible;
        height: 80px;
      }
      
      :host > * {
        display: inline-block;
        vertical-align: top;
        box-sizing: border-box;
      }
      
      :host > :not(sl-divider) {
        margin-top: 5px;
      }
      
      #speed-input {
        width: 140px;
      }
      
      #instance-input {
        width: calc(100% - 140px - 99px - 120px - 300px - 10px - 130px);
        min-width: 150px;
        overflow: visible !important;
      }

      #time-indicator {
        width: 120px;
      }
      
      #time-indicator_units {
        height: 25px;
        line-height: 25px;
      }
      
      #time-indicator_value {
        width: 100%;
        margin-top: 1px;
        background-color: var(--sl-color-neutral-200);
        color: var(--sl-color-gray-950);
        text-align: center;
        font-size: var(--sl-font-size-x-large);
        font-weight: var(--sl-font-weight-light);
        border-radius: var(--sl-border-radius-medium);
        border-color: var(--sl-color-neutral-300);
        border-width: var(--sl-input-border-width);
        border-style: solid;
        height: 39px;
        box-sizing: border-box;
      }
      
      #control-label {
        position: relative;
        margin-top: -2px !important;
        padding-bottom: 4px;
      }
      
      #control-buttons {
        width: 280px;
        box-sizing: border-box;
      }
      
      #control-section > * {
        position: relative;
        margin-top: -2.5px;
        box-sizing: border-box;
      }

      #control-section:first-child {
        height: 30px;
        margin-top: 7px;
      }

      #config-button {
        width: 90px;
      }

      #config-label {
        position: relative;
        margin-top: 0.5px !important;
        padding-bottom: 1.5px;
      }
    
    `;

    render() {
        let instanceOptions = [];
        this.instancesAddresses.forEach(address => {
           let instanceOption = html`<sl-option value="${address}">${address}</sl-option>`;
            instanceOptions.push(instanceOption);
        });

        return html`
                <div id="control-section">
                    <div id="control-label">Controls</div>
                    <sl-button-group label="Control Buttons" id="control-buttons">
                        <sl-tooltip content="Reset" >
                            <sl-button @click=${this.handleReset}><sl-icon name="arrow-counterclockwise" label="Reset"></sl-icon></sl-button>
                        </sl-tooltip>
                        <sl-tooltip content="Fast Backward">
                            <sl-button @click=${this.handleFastBackward}><sl-icon name="skip-backward" label="Fast Backward"></sl-icon></sl-button>
                        </sl-tooltip>
                        <sl-tooltip content="Step Backward">
                            <sl-button @click=${this.handleStepBackward}><sl-icon name="skip-start" label="Step Backward"></sl-icon></sl-button>
                        </sl-tooltip>
                        <sl-tooltip content="Play/Pause">
                            <sl-button @click=${this.handlePlayPause}><sl-icon name="play" label="Play/Pause"></sl-icon></sl-button>
                        </sl-tooltip>
                        <sl-tooltip content="Step Forward">
                            <sl-button @click=${this.handleStepForward}><sl-icon name="skip-end" label="Step Forward"></sl-icon></sl-button>
                        </sl-tooltip>
                        <sl-tooltip content="Fast Forward">
                            <sl-button @click=${this.handleFastForward}><sl-icon name="skip-forward" label="Step Forward"></sl-icon></sl-button>
                        </sl-tooltip>
                    </sl-button-group>
                </div>
                <sl-divider vertical></sl-divider>
                <div id="time-indicator">
                    <div id="time-indicator_units">t/Δ</div>
                    <div id="time-indicator_value">${this.timeIndicator}</div>
                </div>
                <sl-divider vertical></sl-divider>
                <sl-input @sl-change=${this.handleSpeedChange} label="Speed" id="speed-input" type="number" value="${this.speed}" min="0.1" max="9.9" step="0.1">
                    <sl-icon name="speedometer" slot="prefix"></sl-icon>
                </sl-input>
                <sl-divider vertical></sl-divider>
                <sl-select @sl-change=${this.handleInstanceChange} placement="top" id="instance-input" label="Instance" placeholder="Select Instance" clearable>
                    <sl-icon name="paint-bucket" slot="prefix"></sl-icon>
                    ${instanceOptions}
                </sl-select>
                <sl-divider vertical></sl-divider>
                <div id="config-section">
                    <div id="config-label">Settings</div>
                    <sl-dropdown>
                        <sl-button id="config-button" slot="trigger" caret><sl-icon name="gear"></sl-icon></sl-button>
                        <sl-menu>
                            <sl-menu-item type="checkbox" id="graph-view-selection-item" ?checked=${this.selectedView === "graph"} @click="${() => {this.handleSelectedViewChange("graph");}}">Graph View</sl-menu-item>
                            <sl-menu-item type="checkbox" id="time-view-selection-item" ?checked=${this.selectedView === "time"} @click="${() => {this.handleSelectedViewChange("time");}}">Time View</sl-menu-item>
                            <sl-divider></sl-divider>
                            <sl-menu-item type="checkbox" ?checked=${this.statisticsState} @click=${ () => {this.statisticsState = !this.statisticsState; this.handleConfigToggleStatistic();}}>Show Statistics</sl-menu-item>
                            <sl-divider></sl-divider>
                            <sl-menu-label>Filter Messages</sl-menu-label>
                            <sl-menu-item type="checkbox" ?checked=${this.matchSource} @click=${() => {this.matchSource = !this.matchSource; this.handleConfigToggleMessageFiltering()}}>Match Source Instance</sl-menu-item>
                            <sl-menu-item type="checkbox" ?checked=${this.matchTarget} @click=${() => {this.matchTarget = !this.matchTarget; this.handleConfigToggleMessageFiltering()}}>Match Target Instance</sl-menu-item>
                        </sl-menu>
                    </sl-dropdown> 
                </div>


        `;
    }
}
customElements.define('dial-menu', DialMenu);
