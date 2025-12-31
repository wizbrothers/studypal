export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, subject } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages are required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const systemPrompt = `You are a friendly and encouraging tutor helping a middle school or high school student understand ${subject || 'their studies'}.

Your role:
1. Explain concepts in a way that's easy to understand for a young student
2. Use simple examples when helpful
3. Break down complex ideas into smaller parts
4. Be encouraging and supportive
5. Ask follow-up questions to check understanding
6. If the student seems confused, try explaining in a different way

Keep your responses concise but thorough. Use bullet points or numbered steps when it helps clarity.

Remember: You're having a conversation, so refer back to what was discussed earlier when relevant.`;

    // Convert messages to Claude format
    const claudeMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: systemPrompt,
        messages: claudeMessages
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', errorData);
      return res.status(500).json({ error: 'AI service error' });
    }

    const data = await response.json();

    // Extract the text from Claude's response
    const reply = data.content?.[0]?.text;

    if (!reply) {
      return res.status(500).json({ error: 'No response from AI' });
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Failed to get response' });
  }
}
