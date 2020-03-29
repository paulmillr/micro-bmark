function time() {
  return process.hrtime.bigint();
}

function logMem() {
  const vals = Object.entries(process.memoryUsage()).map(([k, v]) => {
    return `${k}=${`${(v / 1e6).toFixed(1)}M`.padEnd(7)}`;
  });
  // console.log('RAM:', ...vals);
}

async function bench(label, samples, callback) {
  let initial = false;
  if (typeof label === 'function' && !samples && !callback) {
    callback = label;
    samples = 1;
    label = 'Initialized in';
    initial = true;
  }
  const [μs, ms, sec] = [1000n, 1000000n, 1000000000n];
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
  if (!initial) {
    str += `x ${perSec} ops/sec @ ${perItemStr}${symbol}/op`;
  } else {
    str += `${perItemStr}${symbol}`;
  }
  console.log(str);
}

exports.getTime = getTime;
exports.logMem = logMem;
exports.bench = bench;

