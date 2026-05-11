// Manually load .env.local since dotenv has issues in this environment
const fs = require('fs');
const path = require('path');
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  });
} catch (e) {}

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk').default;

const app = express();
app.use(express.json({ limit: '2mb' }));

// CORS — must be before all routes
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── File-based shared storage ──────────────────────────────────────────────
const DATA_FILE = path.join(__dirname, 'server-data.json');

function readData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; }
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data), 'utf8');
}

app.get('/api/storage/:key', (req, res) => {
  const data = readData();
  res.json({ value: data[req.params.key] ?? null });
});

app.post('/api/storage/:key', (req, res) => {
  const data = readData();
  data[req.params.key] = req.body.value;
  writeData(data);
  res.json({ ok: true });
});

app.delete('/api/storage', (req, res) => {
  writeData({});
  res.json({ ok: true });
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/generate-plan
app.post('/api/generate-plan', async (req, res) => {
  const { goal, why, miniGoals = [] } = req.body;
  if (!goal?.trim()) return res.status(400).json({ error: 'goal is required' });

  const hasMiniGoals = miniGoals.length > 0;

  const prompt = hasMiniGoals
    ? `North Star: "${goal}"
Why: "${why}"

The user already knows their key steps:
${miniGoals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

For each key step, generate 2 concrete tasks. Keep all text short.

Return ONLY this JSON:
{"milestones":[{"title":"exact key step title","description":"one short sentence","tasks":[{"title":"short task"},{"title":"short task"}]}]}`
    : `North Star: "${goal}"
Why: "${why}"

Generate 4 key steps with 2 tasks each. Keep titles under 8 words, descriptions under 15 words, task titles under 10 words.

Return ONLY this JSON:
{"milestones":[{"title":"step title","description":"short description","tasks":[{"title":"task"},{"title":"task"}]}]}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: `You are a life coach. Return ONLY valid compact JSON. No markdown, no extra text, no newlines in strings.`,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].text;
    const text = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(text);
    const nsId = `ns${Date.now()}`;

    const milestones = parsed.milestones.map((m, i) => ({
      id: `m${i}`,
      northStarId: nsId,
      title: m.title,
      description: m.description,
      order: i,
      completed: false,
      tasks: m.tasks.map((t, j) => ({
        id: `t${i}${j}`,
        milestoneId: `m${i}`,
        title: t.title,
        completed: false,
        order: j,
      })),
    }));

    res.json({ northStarId: nsId, milestones });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/send-checkin
app.post('/api/send-checkin', async (req, res) => {
  const { goal, supporterName, supporterPhone, userName, progressSummary } = req.body;
  if (!supporterPhone || !goal) {
    return res.status(400).json({ error: 'supporterPhone and goal are required' });
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: `You write warm, personal SMS check-in messages on behalf of a goal-tracking app.
The message is sent to a friend or family member asking them to check in with their loved one.
Keep it under 160 characters, conversational, warm. No hashtags. Return only the message text.`,
      messages: [
        {
          role: 'user',
          content: `Write an SMS to ${supporterName} asking them to check in with ${userName || 'their friend'}.
Goal: "${goal}"
Progress so far: ${progressSummary || 'just getting started'}

The message should feel personal, not automated. Mention the goal briefly.`,
        },
      ],
    });

    const smsText = message.content[0].text.trim().replace(/^["']|["']$/g, '');

    // Send via Twilio
    const twilio = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    await twilio.messages.create({
      body: smsText,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: supporterPhone,
    });

    res.json({ sent: true, preview: smsText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
