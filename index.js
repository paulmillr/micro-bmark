const red = '\x1b[31m';
const green = '\x1b[32m';
const blue = '\x1b[34m';
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
      return v > 100000;
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

const [μs, ms, sec] = [10n ** 3n, 10n ** 6n, 10n ** 9n];
const formatter = Intl.NumberFormat('en-US');

// duration formatter
function formatD(mean) {
  let perItemStr = mean.toString();
  let symbol = 'ns';
  if (mean > μs) {
    symbol = 'μs';
    perItemStr = (mean / μs).toString();
  }
  if (mean > ms) {
    symbol = 'ms';
    perItemStr = (mean / ms).toString();
  }
  return perItemStr + symbol;
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

  const times = new Array(samples);
  const start = getTime();
  for (let i = 0; i < samples; i++) {
    const sampleStart = getTime();
    const val = callback(i);
    if (val instanceof Promise) await val;
    times[i] = getTime() - sampleStart;
  }
  const total = getTime() - start;
  const mean = total / BigInt(samples); // per item
  times.sort((a, b) => Number(a - b));
  const min = times[0];
  const max = times[samples - 1];

  const _a = times.reduce((a, b) => a + (b - mean) ** 2n);
  const variance = Number(_a) / samples - 1;
  const sd = Math.sqrt(variance);

  // Compute the standard error of the mean
  // a.k.a. the standard deviation of the sampling distribution of the sample mean
  const sem = sd / Math.sqrt(samples);
  const df = samples - 1; // degrees of freedom
  const critical = tTable[Math.round(df) || 1] || tTable.infinity; // critical value
  const moe = sem * critical; // margin of error
  const rme = (moe / Number(mean)) * 100 || 0; // relative margin of error
  const perItemStr = formatD(mean);
  const perSec = formatter.format(sec / mean);
  let str = `${label} `;
  if (initial) {
    str += perItemStr;
  } else {
    str += `x ${green}${perSec}${reset} ops/sec @ ${blue}${perItemStr}${reset}/op`;
  }
  if (rme >= 1) {
    str += ` ${red}± ${rme.toFixed(2)}% (min: ${formatD(min)}, max: ${formatD(max)})${reset}`;
  }
  console.log(str);
  times.length = 0;
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

exports.getTime = getTime;
exports.logMem = logMem;
exports.mark = mark;
exports.run = run;
