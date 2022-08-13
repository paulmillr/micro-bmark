const bench = require('.');
const {run, mark} = bench; // or bench.mark

run(async () => {
  await mark('base', () => Promise.resolve(1));
  await mark('sqrt', 10000, () => Math.sqrt(2));

  // Log current RAM
  bench.logMem();

  // Get current time in nanoseconds
  bench.getTime();
});