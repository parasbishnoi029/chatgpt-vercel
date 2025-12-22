import fetch from "node-fetch";

const API_KEYS = [
  process.env.OPENAI_KEY_1,
  process.env.OPENAI_KEY_2
];

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

  for (const key of API_KEYS) {
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
            input: conversations[sessionId].join("\n")
          })
        }
      );

      // 🔴 CRITICAL CHECK
      if (!response.ok) {
        const errText = await response.text();
        console.error("OPENAI ERROR:", errText);
        continue;
      }

      const data = await response.json();

      if (!data.output_text) {
        console.error("NO OUTPUT:", data);
        continue;
      }

      conversations[sessionId].push(data.output_text);

      return res.status(200).json({
        reply: data.output_text
      });

    } catch (err) {
      console.error("FETCH ERROR:", err);
      continue;
    }
  }

  return res.status(500).json({
    error: "All API keys failed (billing or invalid key)"
  });
}
