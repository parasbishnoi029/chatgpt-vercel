import fetch from "node-fetch";

const conversations = {};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { message, sessionId } = req.body;
  if (!message || !sessionId) {
    return res.status(400).json({ error: "Missing data" });
  }

  if (!conversations[sessionId]) {
    conversations[sessionId] = [];
  }

  conversations[sessionId].push(message);
  conversations[sessionId] = conversations[sessionId].slice(-10);

  const prompt = conversations[sessionId].join("\n");

  /* =======================
     🔵 TRY CHATGPT FIRST
     ======================= */
  if (process.env.OPENAI_KEY_1) {
    try {
      const r = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_KEY_1}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: prompt
        })
      });

      const d = await r.json();
      console.log("OPENAI RESPONSE:", d);

      if (d.output_text) {
        conversations[sessionId].push(d.output_text);
        return res.status(200).json({ reply: d.output_text });
      }
    } catch (e) {
      console.log("OPENAI ERROR:", e);
    }
  }

  /* =======================
     🟢 FALLBACK TO GEMINI
     ======================= */
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const d = await r.json();
    console.log("GEMINI RESPONSE:", d);

    const reply =
      d.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      return res.status(500).json({
        error: "AI unavailable",
        gemini: d
      });
    }

    conversations[sessionId].push(reply);
    return res.status(200).json({ reply });

  } catch (e) {
    console.log("GEMINI ERROR:", e);
    return res.status(500).json({ error: "AI unavailable" });
  }
}
