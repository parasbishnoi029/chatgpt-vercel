export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message required" });
  }

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: message }] }
        ]
      })
    }
  );

  const data = await r.json();

  if (!r.ok) {
    return res.status(r.status).json({
      error: "Gemini API error",
      details: data
    });
  }

  return res.status(200).json({
    reply: data.candidates[0].content.parts[0].text
  });
}
