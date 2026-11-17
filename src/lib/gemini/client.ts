import 'server-only';
import dns from 'node:dns';
import { GoogleGenAI } from '@google/genai';
import { getServerEnv } from '@/lib/env';

// Prefer IPv4 on Windows/Node 22 to avoid undici IPv6 connection stalls
dns.setDefaultResultOrder('ipv4first');

let cachedClient: GoogleGenAI | null = null;

/**
 * Returns a singleton server-side GoogleGenAI client.
 * Fails fast if GEMINI_API_KEY is missing in server environment.
 */
export function getGeminiClient(): GoogleGenAI {
  if (!cachedClient) {
    const env = getServerEnv();
    cachedClient = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
      httpOptions: { timeout: 15_000 },
    });
  }
  return cachedClient;
}
