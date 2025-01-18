/*! micro-bmark - MIT License (c) 2020 Paul Miller, 2010-2016 Mathias Bynens, John-David Dalton, Robert Kieffer from JSLitmus.js */
// @ts-nocheck
// TODO: remove ^
import { utils } from './index.js';
const { benchmarkRaw } = utils;

const _c = String.fromCharCode(27);
const red = _c + '[31m';
const green = _c + '[32m';
const gray = _c + '[2;37m';
const blue = _c + '[34m';
const reset = _c + '[0m';

// Tables stuff
const NN = `${gray}│${reset}`;
const CH = `${gray}─${reset}`;
const LR = `${gray}┼${reset}`;
const RN = `${gray}├${reset}`;
const NL = `${gray}┤${reset}`;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const stripAnsi = (str: string) => str.replace(/\x1b\[\d+(;\d+)*m/g, '');
const joinBorders = (str: string) =>
  str
    .replaceAll(`${CH}${NN}${CH}`, `${CH}${LR}${CH}`)
    .replaceAll(`${CH}${NN}`, `${CH}${NL}`)
    .replaceAll(`${NN}${CH}`, `${RN}${CH}`);

const pad = (s, len, end = true) => {
  const diff = len - stripAnsi(s).length;
  if (diff <= 0) return s;
  const padding = ' '.repeat(diff);
  return end ? s + padding : padding + s;
};
function drawHeader(sizes, fields) {
  console.log(fields.map((name, i) => `${capitalize(name).padEnd(sizes[i])} `).join(NN));
}
function drawSeparator(sizes, changed) {
  // border for previous line: space if not changed, CH if changed
  const sep = sizes.map((_, i) => (changed[i] ? CH : ' ').repeat(sizes[i] + 1));
  console.log(joinBorders(sep.join(NN)));
}
function printRow(values, prev, sizes, selected) {
  // If previous (parent) dimension changed, consider next dimension changed too
  const changed = values.map((i) => true);
  const lastSelected = selected.length;
  for (let i = 0, p = false; i < lastSelected; i++) {
    const c = p || !prev || values[i] !== prev[i];
    changed[i] = c;
    if (c) p = true;
  }
  const sel = changed.slice(0, lastSelected);
  const toNotDraw =
    sel.length < 2 ? true : sel.slice(0, sel.length - 1).every((i) => !i) && !!sel[sel.length - 1];
  if (!toNotDraw) drawSeparator(sizes, changed);
  // actual line
  // NOTE: we padStart statistics for easier comparison
  const line = values.map((val, i) =>
    pad(!changed[i] ? ' ' : val, sizes[i] + 1, i < selected.length)
  );
  console.log(line.join(NN));
  return values;
}

const percent = (value, baseline, rev = false) => {
  if (baseline === 0n) return `${gray}N/A${reset}`;
  const changeScaled = ((value - baseline) * 100n) / baseline;
  const sign = changeScaled > 0n ? '+' : changeScaled < 0n ? '' : '';
  const integerPart = changeScaled / 1n;
  let decimalPart = (changeScaled % 1n).toString();
  if (decimalPart.startsWith('-')) decimalPart = decimalPart.slice(1);
  // Ensure two digits for decimal part
  decimalPart = decimalPart.padStart(0, '0');
  const formattedPercent = `${sign}${integerPart}%`;
  let color;
  if (changeScaled > 0n) color = rev ? green : red;
  else if (changeScaled < 0n) color = rev ? red : green;
  else color = gray;
  return `${color}${formattedPercent}${reset}`;
};

// complex queries: noble|stable,1KB|8KB -> matches if (noble OR stable) AND (1KB or 8KB).
// looks at each dimension, returns true if at least one matched
function filterValues(fields, keywords) {
  if (!keywords) return true;
  if (typeof keywords === 'string') keywords = keywords.split(',');
  if (!Array.isArray(fields)) fields = [];
  for (const k of keywords) {
    const parts = k.split('|');
    let found = false;
    for (const f of fields) {
      for (const p of parts) if (f.includes(p)) found = true;
    }
    if (!found) return false;
  }
  return true;
}

const isCli = 'process' in globalThis;
function matrixOpts(opts) {
  const env = isCli ? process.env : {};
  return {
    // Add default opts from env (can be overriden!)
    filter: env.MBENCH_FILTER ? env.MBENCH_FILTER : undefined, // filter by keywords
    // override order and list of dimensions. disables defaults!
    dims: env.MBENCH_DIMS ? env.MBENCH_DIMS.split(',') : undefined,
    jsonOnly: !!+env.MBENCH_JSON,
    dryRun: !!+env.MBENCH_DRY_RUN, // don't bench, just print table (for debug)
    ...opts,
  };
}

async function compare(title: string, dimensions: any, libs: any, opts: any): void {
  const {
    libDims = ['name'],
    defaults = {},
    dims,
    filter,
    filterObj = () => true,
    jsonOnly,
    dryRun,
    patchArgs, // patch arguments (very hacky way for decryption)
    samples: defSamples = 10, // default sample value
  } = matrixOpts(opts);
  for (const ld of libDims) {
    if (dimensions[ld] !== undefined)
      throw new Error('Dimensions is static and dynamic at same time: ' + ld);
  }
  if (!jsonOnly) console.log(title); // Title
  // Collect dynamic dimensions
  let dynDimensions = {};
  for (const dim of libDims) dynDimensions[dim] = new Set();
  const stack = Object.entries(libs).map(([key, value]) => ({
    value,
    path: [key],
  }));
  while (stack.length > 0) {
    // - const { value, path } = stack.pop();
    const { value, path } = stack.shift();
    const dimIndex = path.length - 1;
    dynDimensions[libDims[dimIndex]].add(path[path.length - 1]);
    // Add children to stack if it's an object and we haven't hit libDims depth
    if (typeof value === 'object' && value !== null && path.length < libDims.length) {
      for (const [key, child] of Object.entries(value)) {
        if (['options', 'samples'].includes(key)) continue;
        stack.push({ value: child, path: [...path, key] });
      }
    }
  }
  dynDimensions = Object.fromEntries(
    Object.entries(dynDimensions).map(([dim, values]) => [dim, Array.from(values)])
  );
  // Select dimensions
  let selected = dims; // Either overriden by option
  if (selected === undefined) {
    // Or just list dimensions.concat(dynDimensions) without defaults
    selected = [...Object.keys(dimensions), ...Object.keys(dynDimensions)].filter(
      (i) => defaults[i] === undefined
    );
  }
  // always add dimensions without defaults (otherwise we don't know value!)
  const allDims = Object.keys(dynDimensions).concat(Object.keys(dimensions));
  const allDimsReq = allDims.filter((i) => defaults[i] === undefined);
  for (const d of allDimsReq) if (!selected.includes(d)) selected.push(d);
  // Multi-dimensional iterator
  const values = selected.map((i) =>
    dimensions[i] !== undefined ? Object.keys(dimensions[i]) : dynDimensions[i]
  );
  if (!jsonOnly) {
    console.log(
      `Available dimensions: ${allDims
        .map((i) => {
          const flags = [
            dynDimensions[i] !== undefined ? 'dyn' : undefined,
            defaults[i] !== undefined ? 'default' : undefined,
          ].filter((i) => !!i);
          return `${i}${flags.length ? `(${flags.join(', ')})` : ''}`;
        })
        .join(', ')}`
    );
    console.log(
      'Values',
      allDims
        .map(
          (i) =>
            `${i}(${(dimensions[i] !== undefined
              ? Object.keys(dimensions[i])
              : dynDimensions[i]
            ).join(', ')})`
        )
        .join(', ')
    );
    console.log('Selected: ', selected.join(', '));
  }
  // selected dimensions column size
  const sizes = selected.map((i, j) =>
    [i, ...values[j]].reduce((acc, i) => Math.max(acc, i.length), 0)
  );
  // Static columns with statistics
  const extraDims = {
    'Ops/sec': 10,
    'Per op': 10,
    // 'Diff %': 6,
    'Diff %': 8,
    Variability: 22,
  };
  sizes.push(...Object.values(extraDims));
  if (!jsonOnly) drawHeader(sizes, selected.concat(Object.keys(extraDims)));
  const indices = selected.map((i) => 0); // current value indices
  let prevValues;
  let baselineOps;
  let baselinePerOps;
  const res = [];
  main: while (true) {
    const curValues = indices.map((i, j) => values[j][i]);
    if (filterValues(curValues, filter)) {
      const obj = {
        ...defaults,
        ...Object.fromEntries(curValues.map((v, i) => [selected[i], v])),
      };
      // get samples/options
      const lib = libDims.reduce((acc, i) => (acc === undefined ? undefined : acc[obj[i]]), libs);
      // Ugly without continue, but I have no idea howto handle carry then.
      if (lib !== undefined && filterObj(obj)) {
        let options = {};
        let samples = defSamples;
        for (let i = 0, o = libs; i < libDims.length && o; i++) {
          if (o.options !== undefined) options = o.options;
          if (o.samples !== undefined) samples = o.samples;
          o = o[obj[libDims[i]]];
        }
        let args = Object.keys(dimensions)
          .map((i) => dimensions[i][obj[i]])
          .concat(options);
        if (patchArgs) args = patchArgs(args, obj);
        const currSamples = typeof samples === 'function' ? samples(...args, lib) : samples;
        const { stats, perSecStr, perSec, perItemStr } = dryRun
          ? {
              stats: { mean: 0n },
              perSec: 0n,
              perSecStr: '',
              perItemStr: '0ns',
            }
          : await benchmarkRaw(currSamples, () => lib(...args));
        if (baselineOps === undefined && baselinePerOps === undefined) {
          baselineOps = perSec;
          baselinePerOps = stats.mean;
        }
        if (jsonOnly) res.push({ ...obj, stats, perSec });
        else {
          prevValues = printRow(
            curValues.concat([
              `${green}${perSecStr}${reset}`,
              `${blue}${perItemStr}${reset}/op`,
              // `${percent(perSec, baselineOps, true)}`,
              `${percent(stats.mean, baselinePerOps)}`,
              `${stats.rme >= 1 ? stats.formatted : ''}`,
            ]),
            prevValues,
            sizes,
            selected
          );
        }
      }
    }
    // Carry propogation
    for (let pos = indices.length - 1; pos >= 0; pos--) {
      indices[pos]++;
      if (indices[pos] < values[pos].length) break; // No carry needed
      if (pos <= 0) break main;
      indices[pos] = 0; // Reset this position and carry to next
      baselineOps = undefined;
      baselinePerOps = undefined;
    }
  }
  // Close table (looks cleaner this way)
  drawSeparator(
    sizes,
    sizes.map((i) => true)
  );
  // NOTE: these done in compact format, so in case of multiple things we can just split by lines to parse
  if (jsonOnly) {
    console.log(
      JSON.stringify({ name: title, data: res }, (k, v) => {
        if (typeof v === 'bigint') return { __BigInt__: v.toString(10) };
        return v;
      })
    );
  }
}

export default compare;
export { compare };
