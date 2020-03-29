function getTime() {
  return process.hrtime.bigint();
}

function logMem() {
  const mapping = {
    heapTotal: 'heap', heapUsed: 'used', external: 'ext', arrayBuffers: 'arr'
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
  if (!samples) samples = 1;
  const [μs, ms, sec] = [10n ** 3n, 10n ** 6n, 10n ** 9n];
  const start = getTime();
  for (let i = 0; i < samples; i++) {
    let val = callback();
    if (val instanceof Promise) await val;
  }
  const end = getTime();
  const total = end - start;
  const perItem = total / BigInt(samples);

  let perItemStr = perItem.toString();
  let symbol = 'ns';
  if (perItem > μs) {
    symbol = 'μs';
    perItemStr = (perItem / μs).toString();
  }
  if (perItem > ms) {
    symbol = 'ms';
    perItemStr = (perItem / ms).toString();
  }

  const perSec = (sec / perItem).toString();
  let str = `${label} `;
  if (initial) {
    str += `${perItemStr}${symbol}`;
  } else {
    str += `x ${perSec} ops/sec @ ${perItemStr}${symbol}/op`;
  }
  console.log(str);
}

async function run(tries, callback) {
  if (typeof tries === 'function') {
    callback = tries;
    tries = undefined;
  }
  let log = '-------\nBenchmarking';
  if (tries) {
    if (!Array.isArray(tries)) {
      throw new TypeError('nano-bench.run: versions must be an array.');
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
