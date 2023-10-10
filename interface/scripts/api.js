export class API {

    constructor(host, port) {
        this.host = host;
        this.port = port;
    }

    emitEvent(name, data) {
        const event = new CustomEvent(`dial-api:${name}`, {
            detail: data,
            bubbles: true,
            composed: true,
            cancelable: true,
        });
        document.querySelector("dial-simulator").dispatchEvent(event);
    }

    get(path) {
        const url = `https://${this.host}:${this.port}/${path}`;
        return new Promise((resolve, reject) => {
           fetch(url).then((response) => {
               response.json().then((body) => {
                   response.ok ? resolve(body) : reject(body)
               })
           }).catch((error) => {
               this.emitEvent("no-connection-to-backend", error);
               reject(error);
           });
        });
    }

    put(path, data) {
        const url = `https://${this.host}:${this.port}/${path}`;
        return new Promise((resolve, reject) => {
            fetch(url, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            }).then((response) => {
                response.json().then((body) => {
                    response.ok ? resolve(body) : reject(body)
                })
            }).catch((error) => {
                this.emitEvent("no-connection-to-backend", error);
                reject(error);
            });
        });
    }

    del(path) {
        const url = `https://${this.host}:${this.port}/${path}`;
        return new Promise((resolve, reject) => {
            fetch(url, {
                method: "DELETE"
            }).then((response) => {
                response.text().then((body) => {
                    response.ok ? resolve(body) : reject(body)
                })
            }).catch((error) => {
                reject(error);
            });
        });
    }


}