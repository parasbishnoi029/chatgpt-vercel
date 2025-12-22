// Simple in-memory storage (per server instance)
const sessions = {};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "POST only" });
    }

    const { message, sessionId } = req.body;
    if (!message || !sessionId) {
      return res.status(400).json({
        error: "message and sessionId required"
      });
    }

    // Init memory for this session
    if (!sessions[sessionId]) {
      sessions[sessionId] = [];
    }

    // Add user message to memory
    sessions[sessionId].push({
      role: "user",
      content: message
    });

    // Keep last 10 messages only
    sessions[sessionId] = sessions[sessionId].slice(-10);

    const keys = [
      process.env.OPENAI_API_KEY_1,
      process.env.OPENAI_API_KEY_2
    ];

    for (const key of keys) {
      if (!key) continue;

      try {
        const response = await fetch(
          "https://api.openai.com/v1/responses",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${key}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "gpt-4.1-mini",
              input: sessions[sessionId] // ✅ MEMORY HERE
            })
          }
        );

        const data = await response.json();
        if (!response.ok) {
          console.error("OpenAI error:", data);
          continue;
        }

        let reply = "";
        for (const item of data.output ?? []) {
          for (const c of item.content ?? []) {
            if (c.type === "output_text") {
              reply += c.text;
            }
          }
        }

        if (reply) {
          // Save assistant reply to memory
          sessions[sessionId].push({
            role: "assistant",
            content: reply
          });

          return res.status(200).json({ reply });
        }
      } catch (err) {
        console.error("Key failed:", err);
      }
    }

    return res.status(500).json({ error: "AI unavailable" });

  } catch (err) {
    console.error("Server crash:", err);
    return res.status(500).json({ error: "Server crash" });
  }
}
