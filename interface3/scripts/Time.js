
class ThetaTime {
    constructor(time, theta) {
        this.time = time;
        this.theta = theta;
    }

    compare(a, b) {
        if (b === undefined) {
            b = this;
        }
        if (a.time === undefined && b.time === undefined) {
            return 0;
        }
        if (a.time === undefined && b.time !== undefined) {
            return -1;
        }
        if (a.time !== undefined && b.time === undefined) {
            return 1;
        }
        if (a.time === b.time) {
            return a.theta - b.theta;
        }
        return a.time - b.time;
    }
}