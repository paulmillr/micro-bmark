/*! micro-bmark - MIT License (c) 2020 Paul Miller, 2010-2016 Mathias Bynens, John-David Dalton, Robert Kieffer from JSLitmus.js */
const _c = String.fromCharCode(27);
const red = _c + '[31m';
const green = _c + '[32m';
const blue = _c + '[34m';
const reset = _c + '[0m';
function getTime(): bigint {
  // @ts-ignore
  return process.hrtime.bigint();
}
function logMem(): void {
  const mapping: any = {
    heapTotal: 'heap',
    heapUsed: 'used',
    external: 'ext',
    arrayBuffers: 'arr',
  };
  // @ts-ignore
  const vals = Object.entries(process.memoryUsage())
    .filter((entry: any) => {
      const [k, v] = entry;
      return v > 100000 && k !== 'external';
    })
    .map((entry: any) => {
      const [k, v] = entry;
      return `${mapping[k] || k}=${`${(v / 1000000).toFixed(1)}mb`}`;
    });
  // @ts-ignore
  console.log('RAM:', vals.join(' '));
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
const units = [
  { symbol: 'min', val: 60n * 10n ** 9n, threshold: 5n },
  { symbol: 's', val: 10n ** 9n, threshold: 10n },
  { symbol: 'ms', val: 10n ** 6n, threshold: 1n },
  { symbol: 'μs', val: 10n ** 3n, threshold: 1n },
  { symbol: 'ns', val: 0n, threshold: 1n },
];
const formatter = Intl.NumberFormat('en-US');
// duration formatter
function formatDuration(duration: any): string {
  for (let i = 0; i < units.length; i++) {
    const { symbol, threshold, val } = units[i];
    if (duration >= val * threshold) {
      const div = val === 0n ? 1n : val;
      return (duration / div).toString() + symbol;
    }
  }
  throw new Error('Invalid duration ' + duration);
}
function calcSum<T extends number | bigint>(list: T[], isBig = true): T {
  // @ts-ignore
  return list.reduce((a, b) => a + b, (isBig ? 0n : 0) as T);
}
function isFirstBig<T extends number | bigint>(list: T[]): boolean {
  return list.length > 0 && typeof list[0] === 'bigint';
}
function calcMean<T extends number | bigint>(list: T[]): T {
  const len = list.length;
  const isBig = isFirstBig(list);
  const tlen = isBig ? BigInt(len) : len;
  // @ts-ignore
  return calcSum(list, isBig) / tlen;
}
function calcDeviation<T extends number | bigint>(list: T[]): number {
  const isBig = isFirstBig(list);
  const mean = calcMean(list);
  const square = isBig ? (a: bigint) => a ** 2n : (a: number) => a ** 2;
  // @ts-ignore
  const diffs = list.map((val) => square(val - mean));
  const variance = Number(calcSum(diffs, isBig)) / list.length - 1;
  return Math.sqrt(variance);
}
function calcCorrelation<T extends number | bigint>(x: T[], y: T[]): number {
  const isBig = isFirstBig(x);
  const checker = isBig ? (a: T) => typeof a === 'bigint' : (a: T) => typeof a === 'number';
  const err = `expected array of ${isBig ? 'bigints' : 'numbers'}`;
  if (!x.every(checker)) throw new Error('x: ' + err);
  if (!y.every(checker)) throw new Error('y: ' + err);

  const meanX = calcMean(x);
  const meanY = calcMean(y);
  const sum = calcSum(
    x.map((val, i) => (val - meanX) * (y[i] - meanY)),
    isBig
  );
  const observation = Number(sum) / (calcDeviation(x) * calcDeviation(y));
  return observation / (x.length - 1);
}
// Mutates array by sorting it
function calcStats<T extends number | bigint>(
  list: T[]
): { rme: number; min: T; max: T; mean: any; median: T; formatted: string } {
  list.sort((a, b) => Number(a - b));
  const samples = list.length;
  const mean: T = calcMean(list);
  const median = list[Math.floor(samples / 2)];
  const min = list[0];
  const max = list[samples - 1];
  // Compute the standard error of the mean
  // a.k.a. the standard deviation of the sampling distribution of the sample mean
  const sem = calcDeviation(list) / Math.sqrt(samples);
  const df = samples - 1; // degrees of freedom
  // @ts-ignore
  const critical: number = tTable[Math.round(df) || 1] || tTable.infinity; // critical value
  const moe = sem * critical; // margin of error
  const rme = (moe / Number(mean)) * 100 || 0; // relative margin of error
  const formatted = `${red}± ${rme.toFixed(2)}% (${formatDuration(min)}..${formatDuration(
    max
  )})${reset}`;
  return { rme, min, max, mean, median, formatted };
}

export type BenchStats = {
  stats: {
    rme: number;
    min: number | bigint;
    max: number | bigint;
    mean: number | bigint;
    median: number | bigint;
    formatted: string;
  };
  perSecStr: string;
  perSec: bigint;
  perItemStr: string;
  measurements: bigint[];
};
async function benchmarkRaw(samples: number, callback: Func): Promise<BenchStats> {
  if (!Number.isSafeInteger(samples) || samples <= 0) throw new Error('samples must be a number');
  if (typeof callback !== 'function') throw new Error('callback must be a function');
  // List containing sample times
  const list = new Array(samples);
  for (let i = 0; i < samples; i++) {
    const start = getTime();
    const val = callback(i);
    if (val instanceof Promise) await val;
    const stop = getTime();
    list[i] = stop - start;
  }
  const stats = calcStats(list);
  const perItemStr = formatDuration(stats.mean);
  const sec = units[1].val;
  const perSec = sec / stats.mean;
  const perSecStr = formatter.format(sec / stats.mean);
  return { stats, perSecStr, perSec, perItemStr, measurements: list };
}
export type Func = (iteration?: number) => {};
export function mark(label: string, samples: number, callback: Func): Promise<undefined>;
export function mark(label: string, callback: Func): Promise<undefined>;
export async function mark(
  label: string,
  samplesFN: number | Func,
  callbackFN?: Func
): Promise<BenchStats | undefined> {
  if (typeof label !== 'string') throw new Error('label must be a string');
  let samples: number;
  let callback: Func;
  if (typeof samplesFN === 'function') {
    callback = samplesFN;
    samples = 1;
  } else {
    if (samplesFN == null) samplesFN = 1;
    if (typeof callbackFN !== 'function') throw new Error('callback must be a function');
    samples = samplesFN;
    callback = callbackFN;
  }
  const { stats, perSecStr, perItemStr, measurements } = await benchmarkRaw(samples, callback);
  let str = `${label} `;
  if (samples === 1) {
    str += perItemStr;
  } else {
    str += `x ${green}${perSecStr}${reset} ops/sec @ ${blue}${perItemStr}${reset}/op`;
  }
  if (stats.rme >= 1) str += ` ${stats.formatted}`;
  // @ts-ignore
  console.log(str);
  // Destroy the list, simplify the life for garbage collector
  measurements.length = 0;
  return;
}

export default mark;
export const utils: {
  getTime: typeof getTime;
  logMem: typeof logMem;
  formatDuration: typeof formatDuration;
  calcStats: typeof calcStats;
  calcDeviation: typeof calcDeviation;
  calcCorrelation: typeof calcCorrelation;
  benchmarkRaw: typeof benchmarkRaw;
} = {
  getTime,
  logMem,
  formatDuration,
  calcStats,
  calcDeviation,
  calcCorrelation,
  benchmarkRaw,
};
