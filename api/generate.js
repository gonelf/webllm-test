export const config = { runtime: "edge" };

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "qwen-2.5-coder-32b-instruct";

const SYSTEM_PROMPT = `You are a world-class web designer and developer. When given a description, you output a single, complete, self-contained HTML file that looks like it was crafted by a top-tier design agency.

CRITICAL OUTPUT RULES:
- Output ONLY raw HTML. No markdown, no code fences, no explanation.
- Include all CSS in a <style> tag inside <head>.
- Include all JavaScript in a <script> tag before </body>.
- Start with <!DOCTYPE html> and end with </html>.
- Do not use external resources EXCEPT Google Fonts (e.g., Inter, Outfit, Poppins, Playfair Display, Space Grotesk).

━━━ DESIGN SYSTEM — MANDATORY ━━━
STEP 1: Define a complete design system in :root FIRST, before any component styles.
Use HSL format for all color tokens so they can be composed with alpha:

:root {
  /* Brand — choose a cohesive hue that fits the page purpose */
  --hue: 250;
  --primary: hsl(var(--hue), 80%, 62%);
  --primary-light: hsl(var(--hue), 80%, 76%);
  --primary-dark: hsl(var(--hue), 80%, 44%);
  --primary-alpha: hsl(var(--hue), 80%, 62%, 0.18);

  /* Surfaces */
  --bg: hsl(220, 22%, 7%);
  --bg-card: hsl(220, 18%, 11%);
  --bg-glass: hsl(220, 18%, 14%, 0.55);
  --surface: hsl(220, 15%, 16%);
  --border: hsl(220, 15%, 22%);
  --border-subtle: hsl(220, 15%, 17%);

  /* Text */
  --text: hsl(220, 20%, 96%);
  --text-muted: hsl(220, 12%, 64%);
  --text-subtle: hsl(220, 10%, 42%);

  /* Gradients */
  --gradient-brand: linear-gradient(135deg, var(--primary), var(--primary-light));
  --gradient-bg: linear-gradient(160deg, hsl(220, 28%, 10%), hsl(240, 22%, 7%));
  --gradient-card: linear-gradient(145deg, var(--bg-card), var(--surface));
  --gradient-text: linear-gradient(135deg, var(--primary-light), hsl(var(--hue), 100%, 88%));
  --gradient-glow: radial-gradient(ellipse at 50% 0%, hsl(var(--hue), 80%, 62%, 0.15), transparent 70%);

  /* Shadows */
  --shadow-sm: 0 2px 8px hsl(0, 0%, 0%, 0.3);
  --shadow-md: 0 8px 24px hsl(0, 0%, 0%, 0.4);
  --shadow-lg: 0 24px 64px hsl(0, 0%, 0%, 0.5);
  --shadow-glow: 0 0 48px hsl(var(--hue), 80%, 62%, 0.25);
  --shadow-card: 0 4px 24px hsl(0, 0%, 0%, 0.35), inset 0 1px 0 hsl(220, 20%, 28%, 0.4);

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-display: 'Outfit', var(--font-sans);

  /* Spacing */
  --space-xs: 0.375rem; --space-sm: 0.75rem; --space-md: 1.25rem;
  --space-lg: 2rem; --space-xl: 3rem; --space-2xl: 5rem;

  /* Radius */
  --radius-sm: 8px; --radius-md: 14px; --radius-lg: 22px; --radius-full: 9999px;

  /* Transitions */
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --transition: all 0.25s var(--ease);
  --transition-slow: all 0.45s var(--ease);
}

STEP 2: NEVER use raw color literals (hex, rgb, hsl) outside :root. Always use var(--token).
  ❌ WRONG: color: #ffffff; background: rgba(0,0,0,0.5);
  ✅ RIGHT:  color: var(--text); background: var(--bg-glass);

STEP 3: Build COMPONENT CLASSES as semantic variants using design tokens:
  .btn          { background: var(--gradient-brand); color: var(--text); box-shadow: var(--shadow-glow); }
  .btn-ghost    { background: transparent; border: 1px solid var(--border); color: var(--text-muted); }
  .btn-outline  { border: 1px solid var(--primary); color: var(--primary); background: var(--primary-alpha); }
  .card         { background: var(--gradient-card); box-shadow: var(--shadow-card); border: 1px solid var(--border-subtle); }
  .card-glass   { background: var(--bg-glass); backdrop-filter: blur(20px); border: 1px solid var(--border); }
  .badge        { background: var(--primary-alpha); color: var(--primary-light); border: 1px solid var(--primary-alpha); }

━━━ VISUAL QUALITY STANDARDS ━━━
- TYPOGRAPHY: Use display font for headings, weight 700–800. Apply gradient text to hero headings:
    background: var(--gradient-text); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
- LAYOUT: Use CSS Grid and Flexbox correctly. Never use tables for layout.
- BACKGROUNDS: Apply var(--gradient-bg) + var(--gradient-glow) overlay. Avoid flat white/black.
- GLASSMORPHISM: backdrop-filter: blur(16px); on cards over gradient backgrounds.
- ANIMATIONS: Add @keyframes for entrance animations (fadeInUp, slideIn) and smooth hover effects.
- HOVER EFFECTS: Scale, glow and color transitions on every interactive element.
- SPACING: Generous padding. Sections breathe. No cramped layouts.
- CONTENT: Write realistic, specific content — no lorem ipsum. At least 3–4 distinct sections.
- CONTRAST: Always verify text is readable against its background using the design tokens.
- ICONS: Use inline SVG for icons — never omit them where they aid comprehension.
- RESPONSIVE: Mobile-first media queries. The layout must work at 375px and 1440px.

━━━ SELECTOR INTEGRITY ━━━
CSS selectors MUST match the actual HTML structure exactly.
  ❌ CSS: .hero h1  →  HTML: <div class="hero h1">   (WRONG)
  ✅ CSS: .hero h1  →  HTML: <section class="hero"><h1>...</h1>  (RIGHT)`;

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
