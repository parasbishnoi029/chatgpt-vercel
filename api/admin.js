import { MongoClient } from "mongodb";

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
    const db = await getDB();
    const logs = db.collection("login_logs");

    const data = await logs
      .find({})
      .sort({ time: -1 })
      .limit(100)
      .toArray();

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to load admin data" });
  }
}
