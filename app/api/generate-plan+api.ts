import Anthropic from '@anthropic-ai/sdk';
import { Milestone } from '../../lib/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const { goal, why } = await request.json();

  if (!goal?.trim()) {
    return Response.json({ error: 'goal is required' }, { status: 400 });
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You are a life coach and strategic planner. When given a person's North Star goal,
you create a clear, motivating action plan broken into milestones and concrete tasks.
Be specific, practical, and encouraging. Return ONLY valid JSON with no markdown.`,
    messages: [
      {
        role: 'user',
        content: `North Star Goal: "${goal}"
Why this matters: "${why}"

Create an action plan with 4-5 milestones, each with 2-3 specific tasks.

Return JSON in exactly this shape:
{
  "milestones": [
    {
      "title": "Milestone title",
      "description": "1-2 sentence description of what achieving this looks like",
      "tasks": [
        { "title": "Specific action item" },
        { "title": "Specific action item" }
      ]
    }
  ]
}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    return Response.json({ error: 'unexpected response' }, { status: 500 });
  }

  let parsed: { milestones: Array<{ title: string; description: string; tasks: Array<{ title: string }> }> };
  try {
    parsed = JSON.parse(content.text);
  } catch {
    return Response.json({ error: 'failed to parse plan' }, { status: 500 });
  }

  const northStarId = `ns_${Date.now()}`;
  const milestones: Milestone[] = parsed.milestones.map((m, i) => ({
    id: `ms_${Date.now()}_${i}`,
    northStarId,
    title: m.title,
    description: m.description,
    order: i,
    completed: false,
    tasks: m.tasks.map((t, j) => ({
      id: `task_${Date.now()}_${i}_${j}`,
      milestoneId: `ms_${Date.now()}_${i}`,
      title: t.title,
      completed: false,
      order: j,
    })),
  }));

  return Response.json({ northStarId, milestones });
}
