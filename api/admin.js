import { logs } from "./login";

export default function handler(req, res) {
  res.json(logs.reverse());
}
