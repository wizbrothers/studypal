export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Validate URL format
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'Invalid URL. Please use http or https.' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Fetch the webpage content
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StudyPal/1.0; +https://studypal-murex.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      redirect: 'follow'
    });

    if (!pageResponse.ok) {
      return res.status(400).json({ error: `Could not fetch URL: ${pageResponse.status} ${pageResponse.statusText}` });
    }

    const contentType = pageResponse.headers.get('content-type') || '';

    // Only process HTML/text content
    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml')) {
      return res.status(400).json({ error: 'URL must point to a webpage (HTML content)' });
    }

    const htmlContent = await pageResponse.text();

    // Limit content size to avoid token limits
    const maxLength = 50000;
    const truncatedHtml = htmlContent.length > maxLength
      ? htmlContent.substring(0, maxLength) + '...[content truncated]'
      : htmlContent;

    // Use Claude to extract clean text from HTML
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
            content: `Extract the main content text from this webpage HTML. Focus on the article content, main text, and any educational or informational content. Ignore navigation menus, footers, ads, and other non-content elements.

Return ONLY the extracted text content in a clean, readable format. Preserve:
- Headings and subheadings
- Paragraph structure
- Bullet points and numbered lists
- Important facts and information

Do not include:
- HTML tags
- Navigation links
- Advertisement text
- Footer content
- Cookie notices

URL: ${url}

HTML Content:
${truncatedHtml}

Extracted content:`
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
      return res.status(500).json({ error: 'No text could be extracted from the URL' });
    }

    return res.status(200).json({ text: extractedText });

  } catch (error) {
    console.error('Error:', error);

    // Handle specific error types
    if (error.cause?.code === 'ENOTFOUND') {
      return res.status(400).json({ error: 'Could not reach the website. Please check the URL.' });
    }

    return res.status(500).json({ error: 'Failed to extract text from URL' });
  }
}
