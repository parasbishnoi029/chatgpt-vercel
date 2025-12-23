import { MongoClient } from "mongodb";

let cachedClient = null;
let cachedDb = null;

async function connectDB() {
  if (cachedDb) return cachedDb;

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  cachedClient = client;
  cachedDb = client.db("brainAura");

  return cachedDb;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    const db = await connectDB();
    const logs = db.collection("login_logs");

    // 🔐 ADMIN LOGIN
    if (email === process.env.ADMIN_EMAIL) {
      if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Wrong admin password" });
      }

      await logs.insertOne({
        email,
        role: "admin",
        time: new Date()
      });

      return res.status(200).json({ role: "admin" });
    }

    // 👤 NORMAL USER LOGIN
    await logs.insertOne({
      email,
      role: "user",
      time: new Date()
    });

    return res.status(200).json({ role: "user" });

  } catch (err) {
    console.error("LOGIN API ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
