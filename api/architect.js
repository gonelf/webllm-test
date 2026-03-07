export const config = { runtime: "edge" };

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;

const ARCHITECT_PROMPT = `You are a Lead Software Architect. Your goal is to plan a web application based on user requirements.
CRITICAL RULES:
Respond ONLY in TOON format. No prose, no conversational filler.
Define the exact package.json dependencies and a list of all required file paths.
For each file, provide a brief "Logic Summary" instead of the full code.
DATA MODELLING RULES:
If the app involves recipes or ingredients, each ingredient must be modelled as { quantity: string, name: string, preparation?: string }.
Shopping lists must only use quantity + name fields, never preparation.
Use the following TOON Schema:
project: [name]
deps: [comma-separated packages]
files{path, type, logic}:
src/App.tsx, component, "Main entry with a sidebar and auth check"
src/hooks/useAuth.ts, hook, "Handles Firebase login and state"`;

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
                    parts: [{ text: ARCHITECT_PROMPT + "\n\nUser requirements: " + prompt.trim() }],
                },
            ],
            generationConfig: {
                temperature: 0.2, // Low temperature for consistent blueprint format
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
                                const payload = JSON.stringify({ text: part.text });
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
