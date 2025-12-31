export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { notes, subject, cardCount } = req.body;

  if (!notes) {
    return res.status(400).json({ error: 'Notes are required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  // Determine card range based on user selection
  let cardRange = '5-15';
  if (cardCount === '20-30') {
    cardRange = '20-30';
  } else if (cardCount === '30-50') {
    cardRange = '30-50';
  }

  try {
    const prompt = `You are a study assistant helping students create flashcards.

Given the following study notes about ${subject || 'a topic'}, create ${cardRange} flashcards.

Each flashcard should have:
- A clear question or term on the front
- A concise but complete answer or definition on the back

Return ONLY a JSON array in this exact format, with no other text:
[
  {"front": "Question or term here", "back": "Answer or definition here"},
  {"front": "Question or term here", "back": "Answer or definition here"}
]

Study notes:
${notes}`;

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
    // Remove markdown code blocks if present
    let cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const flashcards = JSON.parse(cleanedText);
      return res.status(200).json({ flashcards });
    } catch (parseError) {
      console.error('Failed to parse AI response:', cleanedText);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Failed to generate flashcards' });
  }
}
