const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URL = process.env.MONGO_URL ?? 'mongodb://localhost:27017';
const WORDFREQ_URL = process.env.WORDFREQ_URL ?? 'http://localhost:3001';
const READABILITY_URL = process.env.READABILITY_URL ?? 'http://localhost:3002';

// The driver connects on first use and reconnects by itself,
// so the gateway can start before MongoDB is up 
const db = new MongoClient(MONGO_URL).db('snippets');
const snippets = db.collection('snippets');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Ready only when the database answers.
app.get('/health', async (req, res) => {
  await db.command({ ping: 1 });
  res.send('ok');
});

app.get('/api/snippets', async (req, res) => {
  res.json(await snippets.find().sort({ createdAt: -1 }).toArray());
});

app.post('/api/snippets', async (req, res) => {
  const { title, text } = req.body ?? {};
  // typeof checks also block NoSQL injection no matter what the user sends, only use the values as strings.
  if (typeof title !== 'string' || title.trim() === '' ||
      typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'title and text must be non-empty strings' });
  }
  const doc = { title: title.trim(), text, createdAt: new Date() };
  await snippets.insertOne(doc);
  console.log(`saved snippet ${doc._id} "${doc.title}"`);
  res.status(201).json(doc);
});

app.delete('/api/snippets/:id', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'invalid id' });
  }
  const { deletedCount } = await snippets.deleteOne({ _id: new ObjectId(req.params.id) });
  console.log(`delete ${req.params.id}: ${deletedCount ? 'done' : 'not found'}`);
  res.status(deletedCount ? 204 : 404).end();
});

async function callWorker(url, text) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res.json();
}

app.get('/api/analysis', async (req, res) => {
  const docs = await snippets.find().toArray();

  // Scatter: one request per snippet to each worker, all in parallel.
  // The Kubernetes Service spreads these requests over the worker replicas.
  const results = await Promise.all(docs.map(async (doc) => {
    try {
      const [wf, rd] = await Promise.all([
        callWorker(`${WORDFREQ_URL}/api/wordfreq`, doc.text),
        callWorker(`${READABILITY_URL}/api/readability`, doc.text),
      ]);
      return { id: doc._id, title: doc.title, counts: wf.counts, score: rd.score, words: rd.words,
               wordfreqPod: wf.pod, readabilityPod: rd.pod };
    } catch (err) {
      // One fail should not break the run 
      console.error(`analysis of ${doc._id} failed: ${err.message}`);
      return { id: doc._id, title: doc.title, error: err.message };
    }
  }));

  // Gather: merge word counts and average the scores.
  const totals = new Map();
  const scores = [];
  for (const r of results) {
    if (r.error) continue;
    for (const [word, n] of Object.entries(r.counts)) totals.set(word, (totals.get(word) ?? 0) + n);
    scores.push(r.score);
    delete r.counts; // per-snippet counts are only needed for the totals
  }
  const topWords = [...totals].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([word, count]) => ({ word, count }));
  const averageScore = scores.length ? Math.round(scores.reduce((a, b) => a + b) / scores.length * 10) / 10 : null;

  console.log(`analysed ${results.length} snippets, ${results.length - scores.length} failed`);
  res.json({ snippets: results, topWords, averageScore });
});

// JSON errors without stack traces
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: 'internal error' });
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => console.log(`gateway listening on ${port}`));
