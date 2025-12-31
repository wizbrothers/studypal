export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image is required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Extract base64 data and media type from data URL
    const matches = image.match(/^data:(.+);base64,(.+)$/);

    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format. Please provide a base64 data URL.' });
    }

    const mediaType = matches[1];
    const base64Data = matches[2];

    // Validate media type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(mediaType)) {
      return res.status(400).json({ error: 'Unsupported image type. Please use JPEG, PNG, GIF, or WebP.' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data
                }
              },
              {
                type: 'text',
                text: `Please extract all the text from this image. This appears to be study notes or educational material.

Instructions:
- Extract ALL text visible in the image exactly as written
- Preserve the structure and formatting as much as possible (headings, bullet points, numbered lists)
- If there are diagrams or charts, describe what they show briefly
- If handwriting is hard to read, do your best to interpret it and note any uncertain words with [?]
- Return ONLY the extracted text, no additional commentary

Extracted text:`
              }
            ]
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
    const extractedText = data.content?.[0]?.text;

    if (!extractedText) {
      return res.status(500).json({ error: 'No text could be extracted from the image' });
    }

    return res.status(200).json({ text: extractedText });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Failed to extract text from image' });
  }
}
