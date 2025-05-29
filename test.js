import mark, { utils } from './index.js';
(async () => {
  utils.setMaxRunTime(1);
  await mark('printing', () => Promise.resolve(0));
  await mark('base', () => Promise.resolve(1));
  await mark('sqrt', () => Math.sqrt(2));
  await mark('init', () => Math.sqrt(3));
})();
