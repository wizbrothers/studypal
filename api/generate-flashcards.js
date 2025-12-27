export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { notes, subject } = req.body;

  if (!notes) {
    return res.status(400).json({ error: 'Notes are required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const prompt = `You are a study assistant helping students create flashcards. 
    
Given the following study notes about ${subject || 'a topic'}, create 5-10 flashcards.

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
            maxOutputTokens: 2048,
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
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
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
