export const config = { runtime: "edge" };

const GEMINI_MODEL = "gemini-2.5-pro";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;

const REASON_PROMPT = `You are a senior web designer and developer. Given a page description, think deeply about:
- Overall layout and visual hierarchy
- Color scheme and typography choices  
- Key sections and their content
- CSS techniques and interactions to use
- Any potential pitfalls to avoid

After thinking, output a concise technical specification (NOT code) that another developer would use to implement the page. Keep the spec focused and actionable.`;

export default async function handler(req) {
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" },
        });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }

    let body;
    try {
        body = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const { prompt } = body;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return new Response(JSON.stringify({ error: "prompt is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const geminiResp = await fetch(`${GEMINI_URL}&key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [
                {
                    role: "user",
                    parts: [{ text: REASON_PROMPT + "\n\nPage description: " + prompt.trim() }],
                },
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192
            },
        }),
    });

    if (!geminiResp.ok) {
        const errBody = await geminiResp.json().catch(() => ({}));
        const msg = errBody.error?.message || `Gemini error ${geminiResp.status}`;
        return new Response(JSON.stringify({ error: msg }), {
            status: geminiResp.status,
            headers: { "Content-Type": "application/json" },
        });
    }

    // Transform Gemini's SSE stream into our typed SSE format:
    // data: {"t":"think","text":"..."} — for thought parts
    // data: {"t":"plan","text":"..."}  — for answer parts
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const reader = geminiResp.body.getReader();
            const decoder = new TextDecoder();
            let buf = "";

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buf += decoder.decode(value, { stream: true });
                    const lines = buf.split("\n");
                    buf = lines.pop();

                    for (const line of lines) {
                        if (!line.startsWith("data: ")) continue;
                        const raw = line.slice(6).trim();
                        if (raw === "[DONE]") continue;
                        try {
                            const json = JSON.parse(raw);
                            const parts = json.candidates?.[0]?.content?.parts ?? [];
                            for (const part of parts) {
                                if (!part.text) continue;
                                const type = part.thought ? "think" : "plan";
                                const payload = JSON.stringify({ t: type, text: part.text });
                                controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
                            }
                        } catch { /* skip malformed chunk */ }
                    }
                }
            } finally {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
            }
        },
    });

    return new Response(stream, {
        status: 200,
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Access-Control-Allow-Origin": "*",
        },
    });
}
