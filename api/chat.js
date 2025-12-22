export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message required" });
  }

  const API_KEYS = [
    process.env.OPENAI_API_KEY_1,
    process.env.OPENAI_API_KEY_2
  ];

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
            input: message
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Key failed:", data);
        continue; // 🔁 try next key
      }

      // ✅ CORRECT TEXT EXTRACTION
      let reply = "";
      for (const item of data.output || []) {
        for (const content of item.content || []) {
          if (content.type === "output_text") {
            reply += content.text;
          }
        }
      }

      if (!reply) {
        console.error("No text from key:", data);
        continue;
      }

      // ✅ SUCCESS
      return res.status(200).json({ reply });

    } catch (err) {
      console.error("Request failed, trying next key", err);
      continue;
    }
  }

  // ❌ All keys failed
  return res.status(500).json({
    error: "All ChatGPT API keys failed"
  });
}
