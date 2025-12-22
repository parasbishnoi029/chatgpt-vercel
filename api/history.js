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
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).end();

    const { email } = jwt.verify(token, process.env.JWT_SECRET);

    const client = await getDB();
    const db = client.db();
    const chats = db.collection("chats");

    const history = await chats
      .find({ email })
      .sort({ createdAt: 1 })
      .toArray();

    res.status(200).json(history);
  } catch {
    res.status(500).json({ error: "History load failed" });
  }
}
