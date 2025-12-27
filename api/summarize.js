export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, style } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    let styleInstruction = '';
    switch (style) {
      case 'bullets':
        styleInstruction = 'Format the summary as bullet points.';
        break;
      case 'eli5':
        styleInstruction = 'Explain it like I\'m 5 years old. Use simple words and fun examples.';
        break;
      case 'detailed':
        styleInstruction = 'Provide a detailed summary with key concepts explained.';
        break;
      default:
        styleInstruction = 'Format the summary as clear bullet points.';
    }

    const prompt = `You are a study assistant helping students understand their study materials.

Summarize the following text for a student. ${styleInstruction}

Keep the summary concise but make sure to include all the key points and important information.

Text to summarize:
${text}

Summary:`;

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
            temperature: 0.5,
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
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!summary) {
      return res.status(500).json({ error: 'No response from AI' });
    }

    return res.status(200).json({ summary });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Failed to generate summary' });
  }
}
