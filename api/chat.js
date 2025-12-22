export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "POST only" });
    }

    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

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
              input: message
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          console.error("OpenAI error:", data);
          continue; // try next key
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
