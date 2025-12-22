import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

let client;
async function getDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
  }
  return client.db();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email & password required" });

  const db = await getDB();
  const users = db.collection("users");
  const logins = db.collection("login_logs");

  // ADMIN LOGIN
  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    await logins.insertOne({
      email,
      role: "admin",
      time: new Date()
    });

    const token = jwt.sign(
      { email, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({ token, role: "admin" });
  }

  // USER LOGIN / REGISTER
  let user = await users.findOne({ email });

  if (!user) {
    const hash = await bcrypt.hash(password, 10);
    await users.insertOne({
      email,
      password: hash,
      createdAt: new Date()
    });
  } else {
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Wrong password" });
  }

  await logins.insertOne({
    email,
    role: "user",
    time: new Date()
  });

  const token = jwt.sign(
    { email, role: "user" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token, role: "user" });
}
