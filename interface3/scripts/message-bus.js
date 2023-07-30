
class MessageBus {

    constructor() {
        this.handlers = {};
    }


    publish(name, obj) {
        return new Promise(function (resolve) {
            if (!(name in this.handlers)) {
                return;
            }
            for (const handler in this.handlers[name]) {
                handler();
            }
            resolve();
        });
    }

    subscribe(name, handler) {
        if (!(name in this.handlers)) {
            this.handlers[name] = [];
        }
        this.handlers[name].push(handler);
    }

}
