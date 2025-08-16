/*! micro-bmark - MIT License (c) 2020 Paul Miller, 2010-2016 Mathias Bynens, John-David Dalton, Robert Kieffer from JSLitmus.js */
const _c = String.fromCharCode(27);
const red = _c + '[31m';
const green = _c + '[32m';
const blue = _c + '[34m';
const reset = _c + '[0m';
const units = [
    { symbol: 'min', val: 60n * 10n ** 9n, threshold: 5n },
    { symbol: 's', val: 10n ** 9n, threshold: 10n },
    { symbol: 'ms', val: 10n ** 6n, threshold: 1n },
    { symbol: 'μs', val: 10n ** 3n, threshold: 1n },
    { symbol: 'ns', val: 0n, threshold: 1n },
];
const SECOND = units[1].val;
let MAX_RUN_TIME = 1n * SECOND; // 1 second
function setMaxRunTime(val) {
    if (!val || val < 0.1 || val > 600)
        throw new Error('must be between 0.1 and 600 sec');
    let tenth = BigInt(val * 10);
    MAX_RUN_TIME = tenth * SECOND / 10n;
}
function printOutput(...str) {
    // @ts-ignore
    console.log(...str);
}
function logMem() {
    const mapping = {
        heapTotal: 'heap',
        heapUsed: 'used',
        external: 'ext',
        arrayBuffers: 'arr',
    };
    // @ts-ignore
    const vals = Object.entries(process.memoryUsage())
        .filter((entry) => {
        const [k, v] = entry;
        return v > 100000 && k !== 'external';
    })
        .map((entry) => {
        const [k, v] = entry;
        return `${mapping[k] || k}=${`${(v / 1000000).toFixed(1)}mb`}`;
    });
    printOutput('RAM:', vals.join(' '));
}
// T-Distribution two-tailed critical values for 95% confidence.
// http://www.itl.nist.gov/div898/handbook/eda/section3/eda3672.htm
// prettier-ignore
const tTable = {
    '1': 12.706, '2': 4.303, '3': 3.182, '4': 2.776, '5': 2.571, '6': 2.447,
    '7': 2.365, '8': 2.306, '9': 2.262, '10': 2.228, '11': 2.201, '12': 2.179,
    '13': 2.16, '14': 2.145, '15': 2.131, '16': 2.12, '17': 2.11, '18': 2.101,
    '19': 2.093, '20': 2.086, '21': 2.08, '22': 2.074, '23': 2.069, '24': 2.064,
    '25': 2.06, '26': 2.056, '27': 2.052, '28': 2.048, '29': 2.045, '30': 2.042,
    'infinity': 1.96
};
const formatter = Intl.NumberFormat('en-US');
// duration formatter
function formatDuration(duration) {
    for (let i = 0; i < units.length; i++) {
        const { symbol, threshold, val } = units[i];
        if (duration >= val * threshold) {
            const div = val === 0n ? 1n : val;
            return (duration / div).toString() + symbol;
        }
    }
    throw new Error('Invalid duration ' + duration);
}
function calcSum(list, isBig = true) {
    // @ts-ignore
    return list.reduce((a, b) => a + b, (isBig ? 0n : 0));
}
function isFirstBig(list) {
    return list.length > 0 && typeof list[0] === 'bigint';
}
function calcMean(list) {
    const len = list.length;
    const isBig = isFirstBig(list);
    const tlen = isBig ? BigInt(len) : len;
    // @ts-ignore
    return calcSum(list, isBig) / tlen;
}
function calcDeviation(list) {
    const isBig = isFirstBig(list);
    const mean = calcMean(list);
    const square = isBig ? (a) => a ** 2n : (a) => a ** 2;
    // @ts-ignore
    const diffs = list.map((val) => square(val - mean));
    const variance = Number(calcSum(diffs, isBig)) / list.length - 1;
    return Math.sqrt(variance);
}
function calcCorrelation(x, y) {
    const isBig = isFirstBig(x);
    const checker = isBig ? (a) => typeof a === 'bigint' : (a) => typeof a === 'number';
    const err = `expected array of ${isBig ? 'bigints' : 'numbers'}`;
    if (!x.every(checker))
        throw new Error('x: ' + err);
    if (!y.every(checker))
        throw new Error('y: ' + err);
    const meanX = calcMean(x);
    const meanY = calcMean(y);
    const sum = calcSum(x.map((val, i) => (val - meanX) * (y[i] - meanY)), isBig);
    const observation = Number(sum) / (calcDeviation(x) * calcDeviation(y));
    return observation / (x.length - 1);
}
// Mutates array by sorting it
function calcStats(list) {
    list.sort((a, b) => Number(a - b));
    const samples = list.length;
    const mean = calcMean(list);
    const median = list[Math.floor(samples / 2)];
    const min = list[0];
    const max = list[samples - 1];
    // Compute the standard error of the mean
    // a.k.a. the standard deviation of the sampling distribution of the sample mean
    const sem = calcDeviation(list) / Math.sqrt(samples);
    const df = samples - 1; // degrees of freedom
    // @ts-ignore
    const critical = tTable[Math.round(df) || 1] || tTable.infinity; // critical value
    const moe = sem * critical; // margin of error
    const rme = (moe / Number(mean)) * 100 || 0; // relative margin of error
    const formatted = `${red}± ${rme.toFixed(2)}% (${formatDuration(min)}..${formatDuration(max)})${reset}`;
    return { rme, min, max, mean, median, formatted };
}
function getTime() {
    // @ts-ignore
    return process.hrtime.bigint();
}
async function benchmarkRaw(samples, callback) {
    if (samples == null) {
        samples = 2 ** 26;
    }
    else if (!Number.isSafeInteger(samples) || samples <= 0) {
        throw new Error('samples must be a number');
    }
    if (typeof callback !== 'function')
        throw new Error('callback must be a function');
    // List containing sample times
    // pre-allocating using `new Array(1_000_000)` is in some cases more efficient for
    // garbage collection than growing array size continuously.
    const measurements = [];
    let total = 0n;
    for (let i = 0; i < samples; i++) {
        const start = getTime();
        const val = callback(i);
        if (val instanceof Promise)
            await val;
        const stop = getTime();
        const diff = stop - start;
        measurements.push(diff);
        total += diff;
        if (total >= MAX_RUN_TIME)
            break;
    }
    const stats = calcStats(measurements);
    const perItemStr = formatDuration(stats.mean);
    const sec = units[1].val;
    const perSec = sec / stats.mean;
    const perSecStr = formatter.format(sec / stats.mean);
    return { stats, perSecStr, perSec, perItemStr, measurements };
}
export async function mark(label, samplesFN, callbackFN) {
    if (typeof label !== 'string')
        throw new Error('label must be a string');
    let samples;
    let callback;
    if (typeof samplesFN === 'function') {
        callback = samplesFN;
        samples = undefined;
    }
    else {
        if (typeof callbackFN !== 'function')
            throw new Error('callback must be a function');
        samples = samplesFN;
        callback = callbackFN;
    }
    const { stats, perSecStr, perItemStr, measurements } = await benchmarkRaw(samples, callback);
    let str = `${label} `;
    let perItemStrClr = `${blue}${perItemStr}${reset}`;
    if (samples === 1) {
        str += perItemStrClr;
    }
    else {
        str += `x ${green}${perSecStr}${reset} ops/sec @ ${perItemStrClr}/op`;
    }
    if (stats.rme >= 1)
        str += ` ${stats.formatted}`;
    printOutput(str);
    // Destroy the list, simplify the life for garbage collector
    measurements.length = 0;
    return;
}
export default mark;
export const utils = {
    getTime,
    setMaxRunTime,
    logMem,
    formatDuration,
    calcStats,
    calcDeviation,
    calcCorrelation,
    benchmarkRaw,
};
//# sourceMappingURL=index.js.map