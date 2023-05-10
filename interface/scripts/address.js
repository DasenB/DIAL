
class Address {
    constructor(address_string) {
        const arr = address_string.split("/");
        this.str = address_string;

        if (address_string === "") {
            this.type = "root";
            return;
        }

        if (arr.length >= 1) {
            this.type = "process-address";
            this.process = arr[0];
        }

        if (arr.length >= 2) {
            this.type = "program-address";
            this.program = arr[1];
        }

        if (arr.length >= 3) {
            this.type = "instance-address";
            this.instance = arr[2];
        }

        if (arr.length > 3) {
            this.type = undefined;
        }
    }
}