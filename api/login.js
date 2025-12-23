const logs = []; // 🔴 IN-MEMORY STORE

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { email, password } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }

  // ADMIN
  if (email === "admin@brainaura.com") {
    if (password !== "admin123") {
      return res.status(401).json({ error: "Wrong admin password" });
    }

    logs.push({
      email,
      role: "admin",
      time: new Date()
    });

    return res.json({ role: "admin" });
  }

  // USER
  logs.push({
    email,
    role: "user",
    time: new Date()
  });

  return res.json({ role: "user" });
}

export { logs };
