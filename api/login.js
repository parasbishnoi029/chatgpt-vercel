import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password required"
      });
    }

    const db = await getDB();
    const users = db.collection("users");
    const logs = db.collection("login_logs");

    // 🔐 ADMIN LOGIN (FIXED)
    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = jwt.sign(
        { email, role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      await logs.insertOne({
        email,
        role: "admin",
        time: new Date()
      });

      return res.json({ token, role: "admin" });
    }

    // 🔍 CHECK USER
    const user = await users.findOne({ email });

    // 🆕 NEW USER → REGISTER
    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);

      await users.insertOne({
        email,
        password: hashedPassword,
        createdAt: new Date()
      });

      await logs.insertOne({
        email,
        role: "user",
        time: new Date(),
        action: "register"
      });

      const token = jwt.sign(
        { email, role: "user" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({ token, role: "user", newUser: true });
    }

    // 🔑 EXISTING USER → VERIFY PASSWORD
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({
        error: "Incorrect password"
      });
    }

    await logs.insertOne({
      email,
      role: "user",
      time: new Date(),
      action: "login"
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
