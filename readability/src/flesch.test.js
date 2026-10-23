const test = require('node:test');
const assert = require('node:assert');
const { syllables, flesch } = require('./flesch');

test('syllables', () => {
  assert.strictEqual(syllables('the'), 1);
  assert.strictEqual(syllables('make'), 1); // silent e
  assert.strictEqual(syllables('readability'), 5);
});

test('flesch', () => {
  assert.deepStrictEqual(flesch('The cat sat on the mat.'), { score: 100, sentences: 1, words: 6, syllables: 6 }); // raw 116.1
  assert.strictEqual(flesch('Readability evaluation necessitates considerable deliberation.').score, 0); // raw ~-187
  assert.strictEqual(flesch('Kubernetes runs many copies of a service. The service spreads requests over the copies.').score, 54.7);
  assert.strictEqual(flesch('!!!').score, null);
});
