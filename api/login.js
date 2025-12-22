import jwt from "jsonwebtoken";

export default function handler(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).end();

  const token = jwt.sign({ email }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });

  res.json({ token });
}
