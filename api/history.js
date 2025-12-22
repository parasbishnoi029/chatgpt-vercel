import jwt from "jsonwebtoken";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db();
const chats = db.collection("chats");

export default async function handler(req, res) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).end();

  const { email } = jwt.verify(token, process.env.JWT_SECRET);

  const history = await chats
    .find({ email })
    .sort({ createdAt: 1 })
    .toArray();

  res.json(history);
}
