export default function handler(req, res) {
  const logs = global.loginLogs || [];
  res.json(logs.slice().reverse());
}
