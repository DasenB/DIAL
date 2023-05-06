
class Address {
    constructor(address_string) {
        const arr = address_string.split("/");
        this.str = address_string;
        if (address_string === "") {
            this.type = "root";
            return;
        }

        if (arr.length >= 1) {
            this.type = "node-address";
            const nodeArr = arr[0].split(":");
            this.host = nodeArr[0];
            this.port = nodeArr[1];
        }
        if (arr.length >= 2) {
            this.type = "process-address";
            this.process = arr[1];
        }

        if (arr.length >= 3) {
            if (!arr[2].includes("#")) {
                this.type = "program-address";
                this.program = arr[2];
            } else {
                this.type = "instance-address";
                const instanceArr = arr[2].split("#");
                this.program = instanceArr[0];
                this.instance = instanceArr[1];
            }
        }

        if (arr.length > 3) {
            this.type = undefined;
        }
    }
}