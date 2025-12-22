export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).end();
  }

  // Streaming headers
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  // ========== TRY CHATGPT FIRST ==========
  try {
    const openaiRes = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: message,
          stream: true
        })
      }
    );

    if (openaiRes.ok && openaiRes.body) {
      const reader = openaiRes.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value));
      }

      res.end();
      return;
    }
  } catch (e) {
    console.log("ChatGPT failed, switching to Gemini");
  }

  // ========== FALLBACK TO GEMINI ==========
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }]
        })
      }
    );

    const data = await geminiRes.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      res.write("AI unavailable");
      res.end();
      return;
    }

    // Simulated streaming for Gemini
    for (const ch of reply) {
      res.write(ch);
      await new Promise(r => setTimeout(r, 10));
    }

    res.end();
  } catch {
    res.write("AI unavailable");
    res.end();
  }
}
