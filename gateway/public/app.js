
function el(tag, text) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  return e;
}

function row(cell, values) {
  const tr = el('tr');
  tr.append(...values.map(v => el(cell, v)));
  return tr;
}

async function loadList() {
  const snippets = await (await fetch('/api/snippets')).json();
  document.getElementById('list').replaceChildren(...snippets.map(s => {
    const li = el('li', s.title + ' ');
    const del = el('button', 'Delete');
    del.onclick = async () => {
      await fetch('/api/snippets/' + s._id, { method: 'DELETE' });
      loadList();
    };
    li.append(del);
    return li;
  }));
}

document.getElementById('add').onsubmit = async (e) => {
  e.preventDefault();
  const form = e.target;
  const res = await fetch('/api/snippets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: form.elements.title.value, text: form.elements.text.value }),
  });
  if (!res.ok) return alert((await res.json()).error);
  form.reset();
  loadList();
};

document.getElementById('analyse').onclick = async () => {
  const a = await (await fetch('/api/analysis')).json();
  document.getElementById('summary').textContent =
    `Average readability: ${a.averageScore ?? '–'}. Top words: ` +
    a.topWords.map(w => `${w.word} (${w.count})`).join(', ');
  document.getElementById('results').replaceChildren(
    row('th', ['Snippet', 'Readability', 'Words', 'wordfreq pod', 'readability pod']),
    ...a.snippets.map(s => {
      if (!s.error) return row('td', [s.title, s.score, s.words, s.wordfreqPod, s.readabilityPod]);
      const tr = row('td', [s.title, s.error]);
      tr.className = 'error';
      return tr;
    }),
  );
};

loadList();
