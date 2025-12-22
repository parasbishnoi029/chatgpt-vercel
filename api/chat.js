import fetch from "node-fetch";

const conversations = {};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { message, sessionId } = req.body;
  if (!message || !sessionId) {
    return res.status(400).json({ error: "Missing message or sessionId" });
  }

  // 🧠 Memory
  if (!conversations[sessionId]) {
    conversations[sessionId] = [];
  }

  conversations[sessionId].push(message);
  conversations[sessionId] = conversations[sessionId].slice(-10);

  const prompt = conversations[sessionId].join("\n");

  /* =====================================================
     🔵 TRY CHATGPT FIRST (SILENT)
     ===================================================== */
  if (process.env.OPENAI_KEY_1) {
    try {
      const openaiRes = await fetch(
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

      if (openaiRes.ok) {
        const data = await openaiRes.json();
        if (data.output_text) {
          conversations[sessionId].push(data.output_text);
          return res.status(200).json({ reply: data.output_text });
        }
      }
    } catch (e) {
      console.log("ChatGPT failed, switching to Gemini");
    }
  }

  /* =====================================================
     🟢 FALLBACK TO GEMINI (FREE)
     ===================================================== */
  try {
    const geminiRes = await fetch(
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

    const data = await geminiRes.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      console.error("Gemini error:", data);
      return res.status(500).json({ error: "AI unavailable" });
    }

    conversations[sessionId].push(reply);
    return res.status(200).json({ reply });

  } catch (err) {
    console.error("Gemini fetch failed:", err);
    return res.status(500).json({ error: "AI unavailable" });
  }
}
