import fetch from "node-fetch";

const API_KEYS = [
  process.env.OPENAI_KEY_1,
  process.env.OPENAI_KEY_2
];

const conversations = {};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { message, sessionId } = req.body;
  if (!message || !sessionId) {
    return res.status(400).end();
  }

  if (!conversations[sessionId]) {
    conversations[sessionId] = [];
  }

  conversations[sessionId].push({ role: "user", content: message });
  conversations[sessionId] = conversations[sessionId].slice(-10);

  for (const key of API_KEYS) {
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: conversations[sessionId],
            stream: true
          })
        }
      );

      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked"
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullReply = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.replace("data: ", "");
            if (data === "[DONE]") break;
            const json = JSON.parse(data);
            const token = json.choices[0]?.delta?.content;
            if (token) {
              fullReply += token;
              res.write(token);
            }
          }
        }
      }

      conversations[sessionId].push({
        role: "assistant",
        content: fullReply
      });

      res.end();
      return;

    } catch (e) {
      continue;
    }
  }

  res.status(500).end();
}
