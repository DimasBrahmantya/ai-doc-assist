import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

function loadDotEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

loadDotEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasSupabaseEnv = Boolean(supabaseUrl && anonKey && serviceRoleKey);

describe.skipIf(!hasSupabaseEnv)('Supabase connectivity, pgvector, and RLS', () => {
  let admin: SupabaseClient;
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let userAId = '';
  let userBId = '';
  let docAId = '';
  let convAId = '';

  const testRunId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const emailA = `rls-user-a-${testRunId}@example.com`;
  const emailB = `rls-user-b-${testRunId}@example.com`;
  const password = 'TestPassword!12345';

  // Normalized 768-dim unit vector along dimension 0
  const embedding = Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0));
  const embeddingLiteral = `[${embedding.join(',')}]`;

  beforeAll(async () => {
    admin = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const resA = await admin.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
    });
    if (resA.error || !resA.data.user) {
      throw new Error(`Failed to create user A: ${resA.error?.message}`);
    }
    userAId = resA.data.user.id;

    const resB = await admin.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
    });
    if (resB.error || !resB.data.user) {
      throw new Error(`Failed to create user B: ${resB.error?.message}`);
    }
    userBId = resB.data.user.id;

    clientA = createClient(supabaseUrl!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signInA = await clientA.auth.signInWithPassword({
      email: emailA,
      password,
    });
    if (signInA.error) throw signInA.error;

    clientB = createClient(supabaseUrl!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signInB = await clientB.auth.signInWithPassword({
      email: emailB,
      password,
    });
    if (signInB.error) throw signInB.error;
  }, 30000);

  afterAll(async () => {
    if (docAId && admin) {
      await admin.from('documents').delete().eq('id', docAId);
    }
    if (userAId && admin) {
      await admin.auth.admin.deleteUser(userAId);
    }
    if (userBId && admin) {
      await admin.auth.admin.deleteUser(userBId);
    }
  }, 30000);

  it('allows User A to create document, pgvector chunk, conversation, message and run match_document_chunks', async () => {
    const { data: doc, error: docErr } = await clientA
      .from('documents')
      .insert({
        user_id: userAId,
        file_name: 'rls-test.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        storage_path: `${userAId}/rls-test.pdf`,
        status: 'ready',
        total_pages: 1,
      })
      .select('*')
      .single();

    expect(docErr).toBeNull();
    expect(doc?.user_id).toBe(userAId);
    docAId = doc.id;

    const { error: chunkErr } = await clientA.from('document_chunks').insert({
      document_id: docAId,
      user_id: userAId,
      chunk_index: 0,
      page_number: 1,
      content: 'Quarterly revenue grew by 25 percent.',
      embedding: embeddingLiteral,
    });
    expect(chunkErr).toBeNull();

    const { data: matched, error: matchErr } = await clientA.rpc(
      'match_document_chunks',
      {
        query_embedding: embeddingLiteral,
        match_document_id: docAId,
        match_count: 5,
        min_similarity: 0.5,
      },
    );
    expect(matchErr).toBeNull();
    expect(matched).toHaveLength(1);
    expect(matched[0].page_number).toBe(1);
    expect(matched[0].similarity).toBeGreaterThan(0.99);

    const { data: conv, error: convErr } = await clientA
      .from('conversations')
      .insert({
        user_id: userAId,
        document_id: docAId,
        title: 'User A Chat',
      })
      .select('*')
      .single();
    expect(convErr).toBeNull();
    convAId = conv.id;

    const { data: msg, error: msgErr } = await clientA
      .from('messages')
      .insert({
        conversation_id: convAId,
        role: 'user',
        content: 'What was the quarterly revenue growth?',
      })
      .select('*')
      .single();
    expect(msgErr).toBeNull();
    expect(msg.conversation_id).toBe(convAId);
  });

  it('blocks User B from reading, mutating, or searching User A resources via RLS', async () => {
    const { data: docsB } = await clientB
      .from('documents')
      .select('*')
      .eq('id', docAId);
    expect(docsB).toEqual([]);

    const { data: chunksB } = await clientB
      .from('document_chunks')
      .select('*')
      .eq('document_id', docAId);
    expect(chunksB).toEqual([]);

    const { data: matchedB, error: matchErrB } = await clientB.rpc(
      'match_document_chunks',
      {
        query_embedding: embeddingLiteral,
        match_document_id: docAId,
        match_count: 5,
        min_similarity: 0.0,
      },
    );
    expect(matchErrB).toBeNull();
    expect(matchedB).toEqual([]);

    const { data: convsB } = await clientB
      .from('conversations')
      .select('*')
      .eq('id', convAId);
    expect(convsB).toEqual([]);

    const { data: msgsB } = await clientB
      .from('messages')
      .select('*')
      .eq('conversation_id', convAId);
    expect(msgsB).toEqual([]);

    // User B cannot spoof user_id on insert
    const { error: spoofDocErr } = await clientB.from('documents').insert({
      user_id: userAId,
      file_name: 'spoof.pdf',
      file_size: 512,
      mime_type: 'application/pdf',
      storage_path: `${userAId}/spoof.pdf`,
    });
    expect(spoofDocErr).not.toBeNull();

    // User B cannot insert a message into User A's conversation
    const { error: spoofMsgErr } = await clientB.from('messages').insert({
      conversation_id: convAId,
      role: 'user',
      content: 'Injected message',
    });
    expect(spoofMsgErr).not.toBeNull();

    // User B cannot delete User A's document
    const { data: delDocB } = await clientB
      .from('documents')
      .delete()
      .eq('id', docAId)
      .select('*');
    expect(delDocB).toEqual([]);
  });
});
