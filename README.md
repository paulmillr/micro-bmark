# nano-bench

Benchmark your node.js projects with nanosecond resolution.

    npm install --save-dev nano-bench

## Usage

```js
const bench = require('nano-bench');

bench.run(async () => {
  // Supports syncronous functions
  await bench.mark('array conversion', () => {
    new Array(65536).fill(1).map(a => a + a);
  });

  await bench.mark('array async', async () => {
    await Promise.resolve();
    new Array(65536).fill(2).map(a => a * a);
  });

  // Log current RAM
  bench.logMem();

  // Get current time in nanoseconds
  bench.getTime();
});
```

### `async bench.run(args?, callback)`

Runs bunch of suites. Not required.

### `async bench.mark(label?, samples?, callback)`

Measures callback (can be async) `samples` times.

### `bench.logMem(): undefined`

Logs memory usage

### `bench.getTime(): bigint`

Returns time in bigint.

## License

MIT License (c) 2020 Paul Miller (https://paulmillr.com)

