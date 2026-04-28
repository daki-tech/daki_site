/**
 * Unified AI fallback chain. Tries Gemini first (Google AI Studio, free tier),
 * falls back to OpenRouter free models. Used for voice/text intent parsing
 * and photo receipt vision.
 *
 * Gemini accepts audio/image inline via inline_data; OpenRouter is text-only here.
 */

const GEMINI_KEY = () => (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_KEY || "").trim();
const OPENROUTER_KEY = () => (process.env.OPENROUTER_API_KEY || "").trim();

const GOOGLE_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-flash-latest",
];

const OPENROUTER_MODELS = [
  "deepseek/deepseek-chat-v3.1:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "openai/gpt-oss-120b:free",
];

export interface AICallLog {
  provider: "gemini" | "openrouter";
  model: string;
  attempt: number;
  ms: number;
  ok: boolean;
  error?: string;
}

export interface AICallResult {
  data: string;
  model: string;
  log: AICallLog[];
}

export class AIUnavailableError extends Error {
  log: AICallLog[];
  constructor(message: string, log: AICallLog[]) {
    super(message);
    this.name = "AIUnavailableError";
    this.log = log;
  }
}

/** Audio (or image) → JSON. Only Gemini accepts inline media on the free tier. */
export async function mediaToJSON(params: {
  mediaBase64: string;
  mimeType: string;
  systemPrompt: string;
}): Promise<AICallResult> {
  const log: AICallLog[] = [];

  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i];
    const t0 = Date.now();
    try {
      const text = await callGeminiMedia(model, params);
      if (text) {
        log.push({ provider: "gemini", model, attempt: i + 1, ms: Date.now() - t0, ok: true });
        return { data: text, model: `gemini/${model}`, log };
      }
      log.push({ provider: "gemini", model, attempt: i + 1, ms: Date.now() - t0, ok: false, error: "empty" });
    } catch (e) {
      log.push({ provider: "gemini", model, attempt: i + 1, ms: Date.now() - t0, ok: false, error: (e as Error).message });
    }
  }

  throw new AIUnavailableError("All Gemini media models failed", log);
}

/** Text → JSON. Gemini first, then OpenRouter. */
export async function textToJSON(params: {
  systemPrompt: string;
  userMessage: string;
}): Promise<AICallResult> {
  const log: AICallLog[] = [];

  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i];
    const t0 = Date.now();
    try {
      const text = await callGeminiText(model, params.systemPrompt, params.userMessage, 2048);
      if (text) {
        log.push({ provider: "gemini", model, attempt: i + 1, ms: Date.now() - t0, ok: true });
        return { data: text, model: `gemini/${model}`, log };
      }
      log.push({ provider: "gemini", model, attempt: i + 1, ms: Date.now() - t0, ok: false, error: "empty" });
    } catch (e) {
      log.push({ provider: "gemini", model, attempt: i + 1, ms: Date.now() - t0, ok: false, error: (e as Error).message });
    }
  }

  if (!OPENROUTER_KEY()) {
    throw new AIUnavailableError("Все модели Gemini заняты. Подожди минуту и повтори.", log);
  }

  for (let i = 0; i < OPENROUTER_MODELS.length; i++) {
    const model = OPENROUTER_MODELS[i];
    const t0 = Date.now();
    try {
      const text = await callOpenRouter(model, params.systemPrompt, params.userMessage, 2048);
      if (text) {
        log.push({ provider: "openrouter", model, attempt: i + 1, ms: Date.now() - t0, ok: true });
        return { data: text, model: `openrouter/${model}`, log };
      }
      log.push({ provider: "openrouter", model, attempt: i + 1, ms: Date.now() - t0, ok: false, error: "empty" });
    } catch (e) {
      log.push({ provider: "openrouter", model, attempt: i + 1, ms: Date.now() - t0, ok: false, error: (e as Error).message });
    }
  }

  throw new AIUnavailableError("All AI models failed", log);
}

async function callGeminiMedia(
  model: string,
  params: { mediaBase64: string; mimeType: string; systemPrompt: string },
): Promise<string> {
  const key = GEMINI_KEY();
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const res = await fetch(`${GOOGLE_BASE}/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: params.systemPrompt },
          { inline_data: { mime_type: params.mimeType, data: params.mediaBase64 } },
        ],
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
    }),
  });

  if (res.status === 429 || res.status === 503) throw new Error(`${model} ${res.status}`);
  if (!res.ok) throw new Error(`${model} ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

async function callGeminiText(
  model: string,
  system: string,
  userMessage: string,
  maxTokens: number,
): Promise<string> {
  const key = GEMINI_KEY();
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const res = await fetch(`${GOOGLE_BASE}/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
    }),
  });

  if (res.status === 429 || res.status === 503) throw new Error(`${model} ${res.status}`);
  if (!res.ok) throw new Error(`${model} ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

async function callOpenRouter(
  model: string,
  system: string,
  userMessage: string,
  maxTokens: number,
): Promise<string> {
  const key = OPENROUTER_KEY();
  if (!key) throw new Error("OPENROUTER_API_KEY not set");

  const res = await fetch(OPENROUTER_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://daki.fashion.ua",
      "X-Title": "DaKi",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
      temperature: 0.2,
      max_tokens: maxTokens,
    }),
  });

  if (res.status === 429 || res.status === 503) throw new Error(`${model} ${res.status}`);
  if (!res.ok) throw new Error(`${model} ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

/**
 * Extract JSON from LLM response. Handles markdown fences, preamble text,
 * and truncation (auto-closes unmatched braces/brackets).
 */
export function extractJSON<T = Record<string, unknown>>(raw: string): T | null {
  const text = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const jsonStart = text.indexOf("{");
  if (jsonStart === -1) return null;

  const jsonEnd = text.lastIndexOf("}");
  if (jsonEnd > jsonStart) {
    try {
      return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as T;
    } catch { /* try repair */ }
  }

  let body = text.slice(jsonStart);
  body = body.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, "")
             .replace(/,\s*"[^"]*"\s*:\s*[^,}\]]*$/, "")
             .replace(/,\s*"[^"]*"?\s*$/, "");

  let openBraces = 0, openBrackets = 0, inString = false, escape = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') inString = !inString;
    if (inString) continue;
    if (c === "{") openBraces++;
    else if (c === "}") openBraces--;
    else if (c === "[") openBrackets++;
    else if (c === "]") openBrackets--;
  }
  if (inString) body += '"';
  body += "]".repeat(Math.max(0, openBrackets));
  body += "}".repeat(Math.max(0, openBraces));

  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

/** Download a Telegram voice/photo file as base64 + correct mime type. */
export async function downloadTelegramFile(fileId: string): Promise<{ base64: string; mimeType: string }> {
  const botToken = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN not set");

  const fileInfoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
  const fileInfo = await fileInfoRes.json();
  const filePath: string | undefined = fileInfo.result?.file_path;
  if (!filePath) throw new Error("Could not get Telegram file path");

  const fileRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
  const buffer = await fileRes.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  const lower = filePath.toLowerCase();
  let mimeType = "audio/mpeg";
  if (lower.endsWith(".oga") || lower.endsWith(".ogg")) mimeType = "audio/ogg";
  else if (lower.endsWith(".mp3")) mimeType = "audio/mpeg";
  else if (lower.endsWith(".m4a")) mimeType = "audio/mp4";
  else if (lower.endsWith(".png")) mimeType = "image/png";
  else if (lower.endsWith(".webp")) mimeType = "image/webp";
  else if (lower.match(/\.jpe?g$/)) mimeType = "image/jpeg";

  return { base64, mimeType };
}
