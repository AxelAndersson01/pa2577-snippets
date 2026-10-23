const express = require('express');
const os = require('os');
const { flesch } = require('./flesch');

const app = express();
app.use(express.json());

// Used by Kubernetes readiness/liveness probes.
app.get('/health', (req, res) => res.send('ok'));

// Score how easy one text is to read.
app.post('/api/readability', (req, res) => {
  const text = req.body?.text;
  if (typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'text must be a non-empty string' });
  }

  const result = flesch(text);
  if (result.score === null) {
    return res.status(400).json({ error: 'text contains no words' });
  }

  console.log(`scored ${result.words} words: ${result.score}`);
  // which pod scored the text
  res.json({ pod: os.hostname(), ...result });
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => console.log(`readability listening on ${port}`));
