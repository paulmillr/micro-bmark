# micro-bmark

Benchmark your node.js projects with nanosecond resolution.

    npm install --save-dev micro-bmark

Features:

- As lightweight as possible to not interfere with benchmarked code
- No code for estimating running time - specify samples manually
- Colorful formatting
- Shows relative margin of error **only if it's high**

```
getPublicKey() x 6,072 ops/sec @ 164μs/op ± 8.22% (min: 143μs, max: 17ms)
sign x 4,980 ops/sec @ 200μs/op
signSync x 4,671 ops/sec @ 214μs/op
verify x 969 ops/sec @ 1ms/op
recoverPublicKey x 890 ops/sec @ 1ms/op
getSharedSecret aka ecdh x 585 ops/sec @ 1ms/op
```

![](https://user-images.githubusercontent.com/574696/184465244-b5784438-6af8-4a3d-abaa-03a0057768e6.png)

## Usage

```js
const bench = require('micro-bmark');
const {run, mark} = bench; // or bench.mark

run(async () => {
  await mark('base', () => Promise.resolve(1));
  await mark('sqrt', 10000, () => Math.sqrt(2));

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

MIT License

Copyright (c) 2020 Paul Miller (https://paulmillr.com), (c) 2010-2016 Mathias Bynens, John-David Dalton, (c) Robert Kieffer from JSLitmus.js
