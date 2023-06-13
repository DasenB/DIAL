
class Address {
    constructor(address_string) {
        const arr = address_string.split("/");
        this.str = address_string;
        this.node = arr[0];
        this.algorithm = arr[1];
        this.instance = arr[2];
    }
}