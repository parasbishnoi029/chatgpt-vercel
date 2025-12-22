import { RateLimiterMemory } from "rate-limiter-flexible";
import jwt from "jsonwebtoken";
import { MongoClient } from "mongodb";

const limiter = new RateLimiterMemory({
  points: Number(process.env.RATE_LIMIT || 20),
  duration: 60
});

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db();
const chats = db.collection("chats");

const memory = {};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).end();

    const token = req.headers.authorization?.split(" ")[1];
    const user = jwt.verify(token, process.env.JWT_SECRET);

    await limiter.consume(user.email);

    const { message } = req.body;
    if (!message) return res.status(400).end();

    if (!memory[user.email]) memory[user.email] = [];
    memory[user.email].push({ role: "user", content: message });
    memory[user.email] = memory[user.email].slice(-10);

    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: memory[user.email].map(m => m.content).join("\n"),
        stream: true
      })
    });

    const reader = openaiRes.body.getReader();
    const decoder = new TextDecoder();
    let reply = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      reply += chunk;
      res.write(chunk);
    }

    memory[user.email].push({ role: "assistant", content: reply });

    await chats.insertOne({
      user: user.email,
      question: message,
      answer: reply,
      createdAt: new Date()
    });

    res.end();
  } catch (e) {
    res.status(429).json({ error: "Rate limit exceeded or auth failed" });
  }
}
