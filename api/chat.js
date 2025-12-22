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

async function callOpenAI(apiKey, prompt) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt
    })
  });

  const data = await res.json();

  // 🔴 LOG EVERYTHING (CRITICAL)
  console.log("OPENAI STATUS:", res.status);
  console.log("OPENAI RESPONSE:", JSON.stringify(data));

  if (!res.ok) return null;

  let reply = "";
  for (const item of data.output ?? []) {
    for (const c of item.content ?? []) {
      if (c.type === "output_text") {
        reply += c.text;
      }
    }
  }

  return reply || null;
}

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });

    const { email } = jwt.verify(token, process.env.JWT_SECRET);
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    const client = await getDB();
    const chats = client.db().collection("chats");

    await chats.insertOne({ email, role: "user", content: message, createdAt: new Date() });

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

    let reply = null;
    for (const key of keys) {
      if (!key) continue;
      reply = await callOpenAI(key, prompt);
      if (reply) break;
    }

    if (!reply) {
      return res.status(500).json({ error: "AI unavailable (OpenAI failed)" });
    }

    await chats.insertOne({ email, role: "assistant", content: reply, createdAt: new Date() });

    res.json({ reply });

  } catch (e) {
    console.error("SERVER CRASH:", e);
    res.status(500).json({ error: "Server crash" });
  }
}
