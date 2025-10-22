// api/chatkit/session.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const agentId = process.env.AGENT_ID;

  if (!apiKey || !agentId) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY or AGENT_ID" });
  }

  try {
    const r = await fetch("https://api.openai.com/v1/chatkit/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ agent_id: agentId })
    });

    const data = await r.json();
    res.status(200).json({ client_secret: data.client_secret });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create session" });
  }
}
