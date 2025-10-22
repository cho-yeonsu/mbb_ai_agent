import { fileSearchTool, Agent, Runner, withTrace } from "@openai/agents";

export const config = { runtime: "nodejs" };

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const VS_ID = process.env.VS_ID;
const WF_ID = process.env.WF_ID;

const fileSearch = fileSearchTool([VS_ID]);

const agent = new Agent({
  name: "MBB Research Agent",
  instructions: `
당신은 MBB(맥킨지·BCG·베인) AI 인사이트를 분석하는 리서치 에이전트다.
답변은 ‘사람이 읽기 좋은 보고서 요약’으로 작성한다.
- 개조식으로 쓰되, 각 문장 끝에 [1], [2]로 출처 표시
- 아래에 **출처** 목록 작성
- 숫자, 백분율, 금액은 한국어 자연스럽게 표현
- Markdown 포맷 유지
`,
  model: "gpt-5",
  tools: [fileSearch],
  modelSettings: {
    reasoning: { effort: "medium", summary: "auto" },
    store: true,
  },
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY missing" });

  try {
    const { message } = await readBody(req);
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message (string) required" });
    }

    const runner = new Runner({
      traceMetadata: { __trace_source__: "agent-builder", workflow_id: WF_ID },
      apiKey: OPENAI_API_KEY,
    });

    const result = await withTrace("MBB AI", async () => {
      const output = await runner.run(agent, [
        { role: "user", content: [{ type: "input_text", text: message }] },
      ]);
      return output.finalOutput ?? "";
    });

    res.status(200).json({ answer: result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "unknown error" });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch (err) {
        reject(err);
      }
    });
  });
}
