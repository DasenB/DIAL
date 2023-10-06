
export function CompareTime(a, b) {

    if (a.time === null && b.time === null) {
        return 0;
    }
    if (a.time === null && b.time !== null) {
        return -1;
    }
    if (a.time !== null && b.time === null) {
        return 1;
    }
    if (Number(a.time) === Number(b.time)) {
        return Number(a.theta) - Number(b.theta);
    }
    return Number(a.time) - Number(b.time);
}
