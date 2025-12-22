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

    // DB
    const client = await getDB();
    const db = client.db();
    const chats = db.collection("chats");

    await chats.insertOne({
      email,
      role: "user",
      content: message,
      createdAt: new Date()
    });

    // OpenAI (NON‑STREAMING)
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY_1}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: message
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);
      return res.status(500).json({ error: "OpenAI failed" });
    }

    // Extract text safely
    let reply = "";
    for (const item of data.output || []) {
      for (const c of item.content || []) {
        if (c.type === "output_text") {
          reply += c.text;
        }
      }
    }

    if (!reply) reply = "No response from AI";

    await chats.insertOne({
      email,
      role: "assistant",
      content: reply,
      createdAt: new Date()
    });

    return res.status(200).json({ reply });

  } catch (err) {
    console.error("CHAT ERROR:", err);
    return res.status(500).json({ error: "Server crash" });
  }
}
