# micro-bmark

Benchmark your node.js projects with nanosecond resolution.

    npm install --save-dev micro-bmark

Outputs results in nice format:

```
getPublicKey x 2411 ops/sec @ 414μs/op
sign x 1823 ops/sec @ 548μs/op
verify x 251 ops/sec @ 3ms/op
```

## Usage

```js
const bench = require('micro-bmark');
const {run, mark} = bench; // or bench.mark

run(async () => {
  await mark('getPublicKey', () => {
    pub = secp.getPublicKey(priv);
  });

  await mark('sign', samples, async () => {
    await secp.sign(msg, priv, { canonical: true });
  });

  await mark('verify', samples, () => {
    secp.verify(signed, msg, pub);
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

