import { MongoClient } from "mongodb";
import jwt from "jsonwebtoken";

let client;
async function getDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
  }
  return client.db("brainAura");
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "POST only" });
    }

    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    const db = await getDB();
    const logs = db.collection("login_logs");

    /* 🔐 ADMIN LOGIN */
   if (email === process.env.ADMIN_EMAIL) {
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Wrong admin password" });
  }

  await logs.insertOne({
    email,
    role: "admin",
    time: new Date()
  });

  return res.json({
    token: "admin-token",
    role: "admin"
  });
}


    /* 👤 NORMAL USER LOGIN (EMAIL ONLY) */
    await logs.insertOne({
      email,
      role: "user",
      time: new Date()
    });

    const token = jwt.sign(
      { email, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ token, role: "user" });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
