export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, subject } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const prompt = `You are a friendly and encouraging tutor helping a middle school or high school student understand ${subject || 'their studies'}.

The student is asking: "${question}"

Please explain this in a way that:
1. Is easy to understand for a young student
2. Uses simple examples when helpful
3. Breaks down complex ideas into smaller parts
4. Is encouraging and supportive

Keep your response concise but thorough. If it helps, use bullet points or numbered steps.

Your explanation:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      return res.status(500).json({ error: 'AI service error' });
    }

    const data = await response.json();
    
    // Extract the text from Gemini's response
    const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!explanation) {
      return res.status(500).json({ error: 'No response from AI' });
    }

    return res.status(200).json({ explanation });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Failed to get explanation' });
  }
}
