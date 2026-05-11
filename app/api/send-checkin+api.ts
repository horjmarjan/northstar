import Anthropic from '@anthropic-ai/sdk';
import twilio from 'twilio';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const { goal, supporterName, supporterPhone, userName, progressSummary } = await request.json();

  if (!supporterPhone || !goal) {
    return Response.json({ error: 'supporterPhone and goal are required' }, { status: 400 });
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: `You write warm, personal SMS check-in messages on behalf of a goal-tracking app.
The message is sent to a friend or family member asking them to check in with their loved one.
Keep it under 160 characters, conversational, warm. No hashtags, no emojis unless natural.`,
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

  const content = message.content[0];
  if (content.type !== 'text') {
    return Response.json({ error: 'failed to generate message' }, { status: 500 });
  }

  const smsText = content.text.trim().replace(/^["']|["']$/g, '');

  const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  try {
    await twilioClient.messages.create({
      body: smsText,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: supporterPhone,
    });
  } catch (err: any) {
    return Response.json({ error: `SMS failed: ${err.message}` }, { status: 500 });
  }

  return Response.json({ sent: true, preview: smsText });
}
