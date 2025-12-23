import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "POST only" });

  const { email, password } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  if (email === process.env.ADMIN_EMAIL) {
    if (password !== process.env.ADMIN_PASSWORD)
      return res.status(401).json({ error: "Wrong admin password" });

    await supabase.from("login_logs").insert({
      email,
      role: "admin"
    });

    return res.json({ role: "admin" });
  }

  await supabase.from("login_logs").insert({
    email,
    role: "user"
  });

  res.json({ role: "user" });
}
