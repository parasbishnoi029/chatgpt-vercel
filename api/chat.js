import fetch from "node-fetch";

const conversations = {};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { message, sessionId, provider } = req.body;
  if (!message || !sessionId || !provider) {
    return res.status(400).json({ error: "Missing data" });
  }

  if (!conversations[sessionId]) {
    conversations[sessionId] = [];
  }

  conversations[sessionId].push(message);
  conversations[sessionId] = conversations[sessionId].slice(-10);

  const prompt = conversations[sessionId].join("\n");

  try {
    // 🟢 GEMINI (FREE)
    if (provider === "gemini") {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      const d = await r.json();
      const reply = d.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!reply) {
        return res.status(500).json({ error: "Gemini failed" });
      }

      conversations[sessionId].push(reply);
      return res.status(200).json({ reply });
    }

    // 🔵 CHATGPT (PAID)
    if (provider === "openai") {
      const r = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_KEY_1}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4.1-mini",
            input: prompt
          })
        }
      );

      const d = await r.json();
      if (!d.output_text) {
        return res.status(500).json({ error: "OpenAI failed" });
      }

      conversations[sessionId].push(d.output_text);
      return res.status(200).json({ reply: d.output_text });
    }

    return res.status(400).json({ error: "Invalid provider" });

  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
}
