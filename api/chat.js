export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message missing" });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: message }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    // 🚨 IMPORTANT: SHOW REAL GEMINI ERROR
    if (!response.ok) {
      return res.status(response.status).json({
        error: "Gemini API error",
        details: data
      });
    }

    if (!data.candidates || !data.candidates[0]) {
      return res.status(500).json({
        error: "Gemini returned no candidates",
        raw: data
      });
    }

    const reply = data.candidates[0].content.parts[0].text;
    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(500).json({
      error: "Server crash",
      message: err.message
    });
  }
}
