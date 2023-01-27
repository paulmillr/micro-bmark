const bench = require('.');
bench.mark('printing', () => Promise.resolve(0));

// Or, use as such:
const { mark, compare, run } = bench;

run(async () => {
  await mark('base', 100000, () => Promise.resolve(1));
  await mark('sqrt', 1000000, () => Math.sqrt(2));
  await compare('math', 1000000, {
    lib1: () => Math.sqrt(22),
    lib2: () => Math.sqrt(333)
  });

  bench.utils.logMem(); // Log current RAM
  console.log(bench.utils.getTime(), bench.utils.formatD(bench.utils.getTime())); // Get current time in nanoseconds
});
