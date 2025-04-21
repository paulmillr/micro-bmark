import mark from './index.js';
mark('printing', () => Promise.resolve(0));
(async () => {
  await mark('base', 100000, () => Promise.resolve(1));
  await mark('sqrt', 1000000, () => Math.sqrt(2));
  await mark('init', 1, () => Math.sqrt(3));
})();
