import jwt from "jsonwebtoken";
import { MongoClient } from "mongodb";

let cachedClient = null;

async function getDB() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "POST only" });
    }

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token" });
    }

    const { email } = jwt.verify(token, process.env.JWT_SECRET);
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    const client = await getDB();
    const db = client.db();
    const chats = db.collection("chats");

    // Save user message
    await chats.insertOne({
      email,
      role: "user",
      content: message,
      createdAt: new Date()
    });

    // Load last 10 messages as context
    const history = await chats
      .find({ email })
      .sort({ createdAt: 1 })
      .limit(10)
      .toArray();

    const prompt = history.map(m => m.content).join("\n");

    const keys = [
      process.env.OPENAI_API_KEY_1,
      process.env.OPENAI_API_KEY_2
    ];

    let reply = "";

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
            input: prompt
          })
        });

        const data = await r.json();
        if (!r.ok) continue;

        for (const item of data.output || []) {
          for (const c of item.content || []) {
            if (c.type === "output_text") {
              reply += c.text;
            }
          }
        }

        if (reply) break;
      } catch {
        continue;
      }
    }

    if (!reply) {
      return res.status(500).json({ error: "AI unavailable" });
    }

    await chats.insertOne({
      email,
      role: "assistant",
      content: reply,
      createdAt: new Date()
    });

    res.status(200).json({ reply });

  } catch (err) {
    console.error("CHAT ERROR:", err);
    res.status(500).json({ error: "Server crash" });
  }
}
