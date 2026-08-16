export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, system, type, prompt } = req.body;

    // IMAGE GENERATION
    if (type === 'image') {
      if (!process.env.STABILITY_API_KEY) {
        return res.status(500).json({ error: 'Stability API key not configured' });
      }
      const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          text_prompts: [
            { text: prompt, weight: 1 },
            { text: 'blurry, bad quality, distorted, ugly, watermark', weight: -1 }
          ],
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          samples: 1,
          steps: 30
        })
      });
      const data = await response.json();
      if (!response.ok) return res.status(500).json({ error: data.message || JSON.stringify(data) });
      return res.status(200).json({ image: data.artifacts[0].base64 });
    }

    // SCRIPT GENERATION
    if (type === 'script') {
      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(500).json({ error: 'Anthropic API key not configured' });
      }
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    // CHAT (Claude)
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Anthropic API key not configured' });
    }
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: system || '',
        messages: messages
      })
    });
    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message || 'Something went wrong' });
  }
}
