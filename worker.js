const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SYSTEM = `Bạn là YAMTAM IO — trợ lý AI của dự án YAMTAM ENGINE.
YAMTAM ENGINE là một agent operating system cho Claude Code với 3.437 skills, 93 agents, 45 safety hooks, và Rust runtime (yamtam-rt).

QUAN TRỌNG: Luôn trả lời bằng TIẾNG VIỆT. Không dùng tiếng Anh, tiếng Hàn, hay ngôn ngữ khác trừ khi người dùng hỏi bằng ngôn ngữ đó.
Giữ câu trả lời ngắn gọn (2-4 câu). Trả lời trực tiếp, không vòng vo.`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method === 'POST' && url.pathname === '/api/chat') {
      if (!env.GROQ_API_KEY) {
        return new Response(
          JSON.stringify({ error: 'GROQ_API_KEY not configured in Worker env' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
        );
      }

      let body;
      try { body = await request.json(); }
      catch { return new Response('Bad JSON', { status: 400, headers: CORS }); }

      const messages = [
        { role: 'system', content: SYSTEM },
        ...(body.messages ?? []),
      ];

      const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 512,
          messages,
          stream: true,
        }),
      });

      if (!upstream.ok) {
        const err = await upstream.text();
        return new Response(err, { status: upstream.status, headers: CORS });
      }

      return new Response(upstream.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...CORS,
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
