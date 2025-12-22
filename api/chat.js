// Simple in-memory session store
const sessions = {};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { message, sessionId } = req.body;
  if (!message || !sessionId) {
    return res.status(400).json({ error: "message & sessionId required" });
  }

  // Init memory for this user
  if (!sessions[sessionId]) {
    sessions[sessionId] = [];
  }

  // Add user message
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
    try {
      const r = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: sessions[sessionId]   // ✅ MEMORY SENT HERE
        })
      });

      const data = await r.json();
      if (!r.ok) continue;

      let reply = "";
      for (const item of data.output ?? []) {
        for (const c of item.content ?? []) {
          if (c.type === "output_text") reply += c.text;
        }
      }

      if (!reply) continue;

      // Save assistant reply to memory
      sessions[sessionId].push({
        role: "assistant",
        content: reply
      });

      return res.json({ reply });

    } catch {
      continue;
    }
  }

  res.status(500).json({ error: "AI unavailable" });
}
