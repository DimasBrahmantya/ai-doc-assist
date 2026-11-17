import 'server-only';
import { GoogleGenAI } from '@google/genai';
import { getServerEnv } from '@/lib/env';

let cachedClient: GoogleGenAI | null = null;

/**
 * Returns a singleton server-side GoogleGenAI client.
 * Fails fast if GEMINI_API_KEY is missing in server environment.
 */
export function getGeminiClient(): GoogleGenAI {
  if (!cachedClient) {
    const env = getServerEnv();
    cachedClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return cachedClient;
}
