# micro-bmark

Benchmark your node.js projects with nanosecond resolution.

- Utilizes node.js `process.hrtime` for 1ns resolution
- Colorful formatting with nice units
- No dependencies, only ~150 lines of code: as lightweight as possible to not interfere with benchmarked code
- No code for estimating running time - specify samples manually
- Shows relative margin of error, min/max runs **only if it's high**

![](https://user-images.githubusercontent.com/574696/184465244-b5784438-6af8-4a3d-abaa-03a0057768e6.png)

## Usage

    npm install --save-dev micro-bmark

```js
import * as bench from 'micro-bmark';
await bench.mark('printing', () => Promise.resolve(0));
(async () => {
  await bench.mark('base', () => Promise.resolve(1));
  await bench.mark('sqrt', 10000, () => Math.sqrt(2));
  await bench.compare('math', 5000, {
    lib1: () => Math.sqrt(2),
    lib2: () => Math.sqrt(3)
  });
  // bench.utils.logMem(); // Log current RAM
  // console.log(bench.utils.getTime(), bench.utils.formatD(bench.utils.getTime())); // Get current time in nanoseconds
})();
```

Example output:

```
getPublicKey() x 6,072 ops/sec @ 164μs/op ± 8.22% (min: 143μs, max: 17ms)
sign x 4,980 ops/sec @ 200μs/op
signSync x 4,671 ops/sec @ 214μs/op
verify x 969 ops/sec @ 1ms/op
recoverPublicKey x 890 ops/sec @ 1ms/op
getSharedSecret aka ecdh x 585 ops/sec @ 1ms/op
```

- `await bench.run(args?, callback)`: Runs bunch of suites. Not required
- `await bench.mark(label?, samples?, callback)`: Measures callback (can be async) `samples` times
- `await bench.compare(label, samples, map)`: mark, but compares runs between object values
    - `map`: `{ a: () => {}, b: () => {} }`
- `bench.utils.logMem(): undefined`: Logs memory usage
- `bench.utils.getTime(): bigint`: Returns current time in bigint.

## License

MIT License

Copyright (c) 2020 Paul Miller (https://paulmillr.com), (c) 2010-2016 Mathias Bynens, John-David Dalton, (c) Robert Kieffer from JSLitmus.js
