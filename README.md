# micro-bmark

Benchmark your JS projects with nanosecond resolution.

- Utilizes `process.hrtime` for 1ns resolution
- Colorful formatting with nice units
- No dependencies, only ~150 lines of code: as lightweight as possible to not interfere with benchmarked code
- No code for estimating running time - specify samples manually
- Shows relative margin of error, min/max runs **only if it's high**

![](https://user-images.githubusercontent.com/574696/184465244-b5784438-6af8-4a3d-abaa-03a0057768e6.png)

## Usage

    npm install --save-dev micro-bmark

```js
import bench from 'micro-bmark';
(async () => {
  await bench('printing', () => Promise.resolve(0));
  await bench('base', () => Promise.resolve(1));
  await bench('sqrt', 10000, () => Math.sqrt(2));
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

## License

MIT License

Copyright (c) 2020 Paul Miller (https://paulmillr.com), (c) 2010-2016 Mathias Bynens, John-David Dalton, (c) Robert Kieffer from JSLitmus.js
