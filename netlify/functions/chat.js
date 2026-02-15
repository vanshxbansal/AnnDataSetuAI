/**
 * Netlify Function: proxy to AWS Bedrock Converse API.
 * POST body: { "message": "user text" }
 * Returns: { "response": "assistant text" }
 * Env: BEDROCK_API_KEY (required), BEDROCK_SYSTEM_PROMPT (optional; default below)
 */

const DEFAULT_SYSTEM_PROMPT = `You are AnnadataSetu.AI, an agricultural voice helpline for Indian farmers. Answers are spoken aloud, so they must be very short and easy to hear.

Rules:
- Reply in simple Hindi or Hinglish. Use easy, everyday words (aam bol-chal).
- Keep every answer SHORT: 2 to 4 sentences only. No long paragraphs or essays.
- One small tip or step per reply. If more is needed, say "agli baar" or give just 1–2 points.
- Do not invent weather, soil, or field details. If unsure, say so and suggest Krishi Vigyan Kendra or a local expert.
- No dangerous or overconfident advice.

Style: Short, clear, useful. Like a quick phone tip—not a lecture.`;

// Amazon Nova (first-party, serverless, no Marketplace) to avoid INVALID_PAYMENT_INSTRUMENT when no card on file
const MODEL_ID = 'amazon.nova-lite-v1:0';
const REGION = 'us-east-1';
const BEDROCK_URL = `https://bedrock-runtime.${REGION}.amazonaws.com/model/${MODEL_ID}/converse`;

function getSystemPrompt() {
  if (process.env.BEDROCK_SYSTEM_PROMPT) {
    return process.env.BEDROCK_SYSTEM_PROMPT;
  }
  try {
    const fs = require('fs');
    const path = require('path');
    const p = path.join(process.cwd(), 'system_prompt.txt');
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf8').trim();
    }
  } catch (_) {}
  return DEFAULT_SYSTEM_PROMPT;
}

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const apiKey = process.env.BEDROCK_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'BEDROCK_API_KEY not configured' }),
    };
  }

  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch (_) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const message = body && (body.message ?? body.query);
  if (!message || typeof message !== 'string') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing or invalid "message" field' }),
    };
  }

  const systemPrompt = getSystemPrompt();
  const payload = {
    system: [{ text: systemPrompt }],
    messages: [
      { role: 'user', content: [{ text: message.trim() }] },
    ],
    inferenceConfig: {
      maxTokens: 180,
      temperature: 0.4,
    },
  };

  try {
    const res = await fetch(BEDROCK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg = data.message || data.error || res.statusText || 'Bedrock request failed';
      return {
        statusCode: res.status >= 500 ? 502 : res.status,
        headers,
        body: JSON.stringify({ error: errMsg }),
      };
    }

    const output = data.output || data;
    const msg = output.message;
    const content = msg && msg.content;
    let text = '';
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block && typeof block.text === 'string') text += block.text;
      }
    }
    if (!text && msg && typeof msg.text === 'string') text = msg.text;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ response: text || 'No response from model.' }),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: err.message || 'Backend error' }),
    };
  }
};
