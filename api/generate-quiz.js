export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, subject } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Conversation messages are required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Build context from conversation
    const conversationContext = messages.map(m =>
      `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`
    ).join('\n\n');

    const prompt = `Based on the following tutoring conversation about ${subject || 'a topic'}, create a quiz to test the student's understanding.

CONVERSATION:
${conversationContext}

Create exactly 5 quiz questions based on what was discussed. Mix different question types:
- Multiple choice (provide 4 options labeled A, B, C, D)
- Fill in the blank (use ___ for the blank)
- Short answer (for math problems or brief responses)

Return ONLY a JSON array in this exact format, with no other text:
[
  {
    "type": "multiple_choice",
    "question": "What is...?",
    "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
    "correctAnswer": "B",
    "explanation": "Brief explanation of why this is correct"
  },
  {
    "type": "fill_blank",
    "question": "The process of ___ converts sunlight into energy.",
    "correctAnswer": "photosynthesis",
    "explanation": "Brief explanation"
  },
  {
    "type": "short_answer",
    "question": "What is 2 + 2?",
    "correctAnswer": "4",
    "explanation": "Brief explanation"
  }
]

Make the questions progressively more challenging. Focus on key concepts discussed in the conversation.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', errorData);
      return res.status(500).json({ error: 'AI service error' });
    }

    const data = await response.json();

    // Extract the text from Claude's response
    const text = data.content?.[0]?.text;

    if (!text) {
      return res.status(500).json({ error: 'No response from AI' });
    }

    // Parse the JSON from the response
    let cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const questions = JSON.parse(cleanedText);
      return res.status(200).json({ questions });
    } catch (parseError) {
      console.error('Failed to parse quiz response:', cleanedText);
      return res.status(500).json({ error: 'Failed to generate quiz questions' });
    }

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Failed to generate quiz' });
  }
}
