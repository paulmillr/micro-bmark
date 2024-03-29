const red = '\x1b[31m';
const green = '\x1b[32m';
const blue = '\x1b[34m';
const cyan = '\x1b[36m';
const reset = '\x1b[0m';
function getTime() {
  return process.hrtime.bigint();
}

function logMem() {
  const mapping = {
    heapTotal: 'heap',
    heapUsed: 'used',
    external: 'ext',
    arrayBuffers: 'arr',
  };
  const vals = Object.entries(process.memoryUsage())
    .filter(([k, v]) => {
      return v > 100000 && k !== 'external';
    })
    .map(([k, v]) => {
      return `${mapping[k] || k}=${`${(v / 1000000).toFixed(1)}mb`}`;
    });
  console.log('RAM:', vals.join(' '));
}

// T-Distribution two-tailed critical values for 95% confidence.
// http://www.itl.nist.gov/div898/handbook/eda/section3/eda3672.htm
// prettier-ignore
const tTable = {
  '1':  12.706, '2':  4.303, '3':  3.182, '4':  2.776, '5':  2.571, '6':  2.447,
  '7':  2.365,  '8':  2.306, '9':  2.262, '10': 2.228, '11': 2.201, '12': 2.179,
  '13': 2.16,   '14': 2.145, '15': 2.131, '16': 2.12,  '17': 2.11,  '18': 2.101,
  '19': 2.093,  '20': 2.086, '21': 2.08,  '22': 2.074, '23': 2.069, '24': 2.064,
  '25': 2.06,   '26': 2.056, '27': 2.052, '28': 2.048, '29': 2.045, '30': 2.042,
  'infinity': 1.96
};

const [μs, ms, sec, min] = [10n ** 3n, 10n ** 6n, 10n ** 9n, 60n * 10n ** 9n];
const formatter = Intl.NumberFormat('en-US');

// duration formatter
function formatD(duration) {
  let perItemStr = duration.toString();
  let symbol = 'ns';
  if (duration > μs) {
    symbol = 'μs';
    perItemStr = (duration / μs).toString();
  }
  if (duration > ms) {
    symbol = 'ms';
    perItemStr = (duration / ms).toString();
  }
  if (duration > 10n * sec) {
    symbol = 's';
    perItemStr = (duration / sec).toString();
  }
  if (duration > 5n * min) {
    symbol = 'min';
    perItemStr = (duration / min).toString();
  }
  return perItemStr + symbol;
}

function calcSum(list) {
  return list.reduce((a, b) => a + b);
}
function calcMean(list) {
  return calcSum(list) / BigInt(list.length);
}
function calcDeviation(list) {
  const mean = calcMean(list);
  const differences = list.reduce((a, b) => a + (b - mean) ** 2n);
  const variance = Number(differences) / list.length - 1;
  return Math.sqrt(variance);
}
function calcCorrelation(x, y) {
  const meanX = calcMean(x);
  const meanY = calcMean(y);
  const res1 = x.map((val, i) => (val - meanX) * (y[i] - meanY));
  const observation = Number(calcSum(res1)) / (calcDeviation(x) * calcDeviation(y));
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
  const critical = tTable[Math.round(df) || 1] || tTable.infinity; // critical value
  const moe = sem * critical; // margin of error
  const rme = (moe / Number(mean)) * 100 || 0; // relative margin of error
  const formatted = `${red}± ${rme.toFixed(2)}% (min: ${formatD(min)}, max: ${formatD(
    max
  )})${reset}`;
  // return { rme, min: Number(min), max: Number(max), mean: Number(mean), median: Number(median), formatted }
  return { rme, min, max, mean, median, formatted };
}

async function mark(label, samples, callback) {
  let initial = false;
  if (typeof label === 'function' && !samples && !callback) {
    callback = label;
    samples = 1;
    label = 'Initialized:';
    initial = true;
  }
  if (typeof label === 'string' && typeof samples === 'function') {
    callback = samples;
    samples = 1;
  }
  if (samples == null) samples = 1;
  if (typeof samples !== 'number' || samples <= 0) throw new Error('samples must be a number');

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
  const perItemStr = formatD(stats.mean);
  const perSec = formatter.format(sec / stats.mean);
  let str = `${label} `;
  if (initial) {
    str += perItemStr;
  } else {
    str += `x ${green}${perSec}${reset} ops/sec @ ${blue}${perItemStr}${reset}/op`;
  }
  if (stats.rme >= 1) str += ` ${stats.formatted}`;
  console.log(str);
  // Destroy the list, simplify the life for garbage collector
  list.length = 0;
}

const LEAF_N = '├─';
const LEAF_L = '└─';
async function compare(title, samples, cases) {
  console.log(title);
  const len = Object.keys(cases).length;
  const isLast = (i) => i === len - 1;
  let index = 0;
  for (const [lib, fn] of Object.entries(cases)) {
    const prefix = isLast(index++) ? LEAF_L : LEAF_N;
    await mark(`${prefix}${cyan}${lib}${reset}`, samples, fn);
  }
}

async function run(tries, callback) {
  if (typeof tries === 'function') {
    callback = tries;
    tries = undefined;
  }
  let log = '-------\nBenchmarking';
  if (tries) {
    if (!Array.isArray(tries)) {
      throw new TypeError('micro-bmark.run: versions must be an array');
    }
    for (const params of tries) {
      const args = Array.isArray(params) ? params : [params];
      console.log(`${log} ${JSON.stringify(args)}...`);
      await callback(...args);
    }
  } else {
    console.log(log);
    await callback();
  }
}

exports.mark = mark;
exports.compare = compare;
exports.run = run;
exports.utils = { getTime, logMem, formatD, calcStats, calcDeviation, calcCorrelation };
