export const config = { runtime: "edge" };

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "qwen-2.5-coder-32b-instruct";

const SYSTEM_PROMPT = `You are an expert web UI designer and developer. When given a description, you output a single, complete, self-contained HTML file.

Rules:
- Output ONLY raw HTML. No markdown, no code fences, no explanation.
- Include all CSS in a <style> tag inside <head>.
- Include all JavaScript in a <script> tag before </body>.
- Use modern, responsive design with beautiful, premium aesthetics (e.g., glassmorphism, gradients, modern typography, micro-animations, curated color palettes).
- Write perfectly structured, semantic HTML with correct CSS class naming conventions. 
- Avoid generic styling and basic default colors. Make the interface feel alive and stunning.
- Ensure your CSS selectors actually match your HTML elements structure (e.g., if CSS targets \`.hero h1\`, output \`<section class="hero"><h1>...\` not \`<div class="hero h1">\`).
- Do not use external resources (no external images/CDNs) EXCEPT for Google Fonts (e.g., Inter, Outfit, Poppins).
- Start your output with <!DOCTYPE html> and end with </html>.`;

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server is not configured with an API key." }), {
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

  const groqResp = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt.trim() },
      ],
      temperature: 0.7,
      max_tokens: 8192,
      stream: true,
    }),
  });

  if (!groqResp.ok) {
    const errBody = await groqResp.json().catch(() => ({}));
    const msg = errBody.error?.message || `Upstream error ${groqResp.status}`;
    return new Response(JSON.stringify({ error: msg }), {
      status: groqResp.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Pass the SSE stream straight through to the client
  return new Response(groqResp.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
