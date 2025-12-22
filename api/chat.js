import jwt from "jsonwebtoken";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db();
const chats = db.collection("chats");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).end();

  const { email } = jwt.verify(token, process.env.JWT_SECRET);
  const { message } = req.body;
  if (!message) return res.status(400).end();

  // Save user message
  await chats.insertOne({
    email,
    role: "user",
    content: message,
    createdAt: new Date()
  });

  // Load last 10 messages (memory)
  const history = await chats
    .find({ email })
    .sort({ createdAt: 1 })
    .limit(10)
    .toArray();

  const prompt = history.map(m => m.content).join("\n");

  // Streaming headers
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  const keys = [
    process.env.OPENAI_API_KEY_1,
    process.env.OPENAI_API_KEY_2
  ];

  // Try OpenAI keys one by one
  for (const key of keys) {
    if (!key) continue;

    try {
      const r = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: prompt,
          stream: true
        })
      });

      if (r.ok && r.body) {
        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let reply = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          reply += chunk;
          res.write(chunk);
        }

        // Save assistant reply
        await chats.insertOne({
          email,
          role: "assistant",
          content: reply,
          createdAt: new Date()
        });

        res.end();
        return;
      }
    } catch {
      continue; // try next key
    }
  }

  res.write("AI unavailable");
  res.end();
}
