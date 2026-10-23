const express = require('express');
const os = require('os');

const app = express();
app.use(express.json());

// Used by Kubernetes readiness and liveness probes.
app.get('/health', (req, res) => res.send('ok'));

// Count each disntinct word in a text, case-insensitively.
app.post('/api/wordfreq', (req, res) => {
  const text = req.body?.text;
  if (typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'text must be a non-empty string' });
  }

  //  easy way to count distinct words: a Map from word to count
  const counts = new Map();
  const words = text.toLowerCase().match(/\p{L}+(?:'\p{L}+)*/gu) ?? [];
  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  console.log(`counted ${words.length} words (${counts.size} distinct) in ${text.length} chars`);
  // which pod counted what text
  res.json({ pod: os.hostname(), counts: Object.fromEntries(counts) });
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => console.log(`wordfreq listening on ${port}`));
