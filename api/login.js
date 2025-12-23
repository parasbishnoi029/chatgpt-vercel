export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { email, password } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }

  if (email === "admin@brainaura.com") {
    if (password !== "admin123") {
      return res.status(401).json({ error: "Wrong admin password" });
    }
    return res.json({ role: "admin" });
  }

  return res.json({ role: "user" });
}
