export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message required" });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: message
    })
  });

  const data = await response.json();

  if (!response.ok) {
    return res.status(response.status).json({
      error: "OpenAI API error",
      details: data
    });
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
    return res.status(500).json({
      error: "No text returned",
      raw: data
    });
  }

  return res.status(200).json({ reply });
}
