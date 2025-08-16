import mark, { utils } from './src/index.ts';
(async () => {
  utils.setMaxRunTime(1);
  await mark('printing', () => Promise.resolve(0));
  await mark('base', () => Promise.resolve(1));
  await mark('sqrt', () => Math.sqrt(2));
  await mark('init', () => Math.sqrt(3));
})();
