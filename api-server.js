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
const crypto  = require('crypto');
const jwt     = require('jsonwebtoken');
const Anthropic = require('@anthropic-ai/sdk').default;
const Redis   = require('ioredis');

const app = express();
app.use(express.json({ limit: '2mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'northstar-dev-secret-change-in-prod';
const MAX_USERS  = 10;

// ── Redis client ───────────────────────────────────────────────────────────
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});
redis.on('error', (err) => console.error('Redis error:', err.message));

// Redis helpers
async function readAuth() {
  const raw = await redis.get('auth:users');
  return raw ? JSON.parse(raw) : { users: {} };
}
async function writeAuth(d) {
  await redis.set('auth:users', JSON.stringify(d));
}
async function getUserData(userId, key) {
  const raw = await redis.get(`data:${userId}:${key}`);
  return raw ? JSON.parse(raw) : null;
}
async function setUserData(userId, key, value) {
  await redis.set(`data:${userId}:${key}`, JSON.stringify(value));
}
async function clearUserData(userId) {
  const keys = await redis.keys(`data:${userId}:*`);
  if (keys.length) await redis.del(...keys);
}

// CORS — must be before all routes
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Health check ──────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', app: 'NorthStar API' }));

// ── Password helpers ───────────────────────────────────────────────────────
function hashPassword(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}
function newSalt() { return crypto.randomBytes(16).toString('hex'); }

// ── Auth middleware ────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Auth routes ────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username?.trim() || !password?.trim())
    return res.status(400).json({ error: 'Username and password are required' });

  const auth  = await readAuth();
  const users = auth.users || {};

  if (Object.keys(users).length >= MAX_USERS)
    return res.status(403).json({ error: 'Beta is full — maximum testers reached' });

  const lc = username.trim().toLowerCase();
  if (Object.values(users).some(u => u.username === lc))
    return res.status(409).json({ error: 'Username already taken' });

  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const id   = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const salt = newSalt();
  users[id]  = { id, username: lc, salt, hash: hashPassword(password, salt), createdAt: new Date().toISOString() };
  await writeAuth({ users });

  const token = jwt.sign({ id, username: lc }, JWT_SECRET, { expiresIn: '90d' });
  res.json({ token, userId: id, username: lc });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username?.trim() || !password?.trim())
    return res.status(400).json({ error: 'Username and password are required' });

  const { users } = await readAuth();
  const user = Object.values(users || {}).find(u => u.username === username.trim().toLowerCase());
  if (!user || hashPassword(password, user.salt) !== user.hash)
    return res.status(401).json({ error: 'Invalid username or password' });

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '90d' });
  res.json({ token, userId: user.id, username: user.username });
});

// ── User-scoped storage ────────────────────────────────────────────────────
app.get('/api/storage/:key', requireAuth, async (req, res) => {
  const value = await getUserData(req.user.id, req.params.key);
  res.json({ value });
});

app.post('/api/storage/:key', requireAuth, async (req, res) => {
  await setUserData(req.user.id, req.params.key, req.body.value);
  res.json({ ok: true });
});

app.delete('/api/storage', requireAuth, async (req, res) => {
  await clearUserData(req.user.id);
  res.json({ ok: true });
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Generate plan ──────────────────────────────────────────────────────────
app.post('/api/generate-plan', requireAuth, async (req, res) => {
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

    const raw  = message.content[0].text;
    const text = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(text);
    const nsId = `ns${Date.now()}`;

    const milestones = parsed.milestones.map((m, i) => ({
      id: `m${i}_${Date.now()}`,
      northStarId: nsId,
      title: m.title,
      description: m.description,
      order: i,
      completed: false,
      tasks: m.tasks.map((t, j) => ({
        id: `t${i}${j}_${Date.now()}`,
        milestoneId: `m${i}_${Date.now()}`,
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

// ── SMS check-in (supporters) ─────────────────────────────────────────────
app.post('/api/send-checkin', requireAuth, async (req, res) => {
  const { goal, supporterName, supporterPhone, userName, progressSummary } = req.body;
  if (!supporterPhone || !goal)
    return res.status(400).json({ error: 'supporterPhone and goal are required' });

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: `You write warm, personal SMS check-in messages on behalf of a goal-tracking app.
The message is sent to a friend or family member asking them to check in with their loved one.
Keep it under 160 characters, conversational, warm. No hashtags. Return only the message text.`,
      messages: [{
        role: 'user',
        content: `Write an SMS to ${supporterName} asking them to check in with ${userName || 'their friend'}.
Goal: "${goal}"
Progress so far: ${progressSummary || 'just getting started'}
The message should feel personal, not automated. Mention the goal briefly.`,
      }],
    });

    const msgText = message.content[0].text.trim().replace(/^["']|["']$/g, '');

    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({
      body: msgText,
      from: process.env.TWILIO_PHONE_NUMBER,
      to:   supporterPhone,
    });

    res.json({ sent: true, preview: msgText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── AI accountability nudge ────────────────────────────────────────────────
app.post('/api/send-accountability', requireAuth, async (req, res) => {
  const { goal, why, nextStep, nextTask, userPhone, userName } = req.body;
  if (!userPhone || !goal)
    return res.status(400).json({ error: 'userPhone and goal are required' });

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: `You write short, energising SMS accountability messages for someone working toward a personal goal.
Be warm, direct, and specific. Under 160 characters. No hashtags. Return only the message text.`,
      messages: [{
        role: 'user',
        content: `Write an SMS nudge for ${userName || 'someone'}.
North Star: "${goal}"
Why it matters: "${why || ''}"
Most important next step: "${nextStep || ''}"
Specific task to act on: "${nextTask || ''}"
Remind them of their next step and encourage them to take one action today.`,
      }],
    });

    const msgText = message.content[0].text.trim().replace(/^["']|["']$/g, '');

    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({
      body: msgText,
      from: process.env.TWILIO_PHONE_NUMBER,
      to:   userPhone,
    });

    res.json({ sent: true, preview: msgText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`NorthStar API running on port ${PORT}`));
