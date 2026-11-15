import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
// @ts-ignore - Built-in Node.js v22.14.0 SQLite module
import { DatabaseSync } from 'node:sqlite';

interface CrewRunUpsertPayload {
  id: string;
  workflow_id?: string;
  workflow_name?: string;
  endpoint_url?: string;
  prompt?: string;
  attached_file_name?: string;
  attached_file_preview?: string;
  status?: 'running' | 'completed' | 'error';
  started_at?: number;
  finished_at?: number | null;
  elapsed_seconds?: number | null;
  llm_engine?: string;
  total_tokens?: number;
  qa_score?: number | null;
  qa_decision?: string;
  portal_url?: string;
  result_url?: string;
  zip_url?: string;
  zip_filename?: string;
  result_json?: string | Record<string, unknown>;
  error_message?: string;
  events?: Array<CrewRunEventPayload>;
}

interface CrewRunEventPayload {
  run_id?: string;
  seq?: number;
  event_id?: string;
  timestamp?: number;
  event_type?: string;
  agent_id?: string;
  agent_name?: string;
  target_agent_id?: string;
  status_text?: string;
  icon?: string;
  tokens_used?: number;
  payload_json?: string | Record<string, unknown>;
}

function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve((raw ? JSON.parse(raw) : {}) as T);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function ensureRunsSchema(db: DatabaseSync): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS crew_runs (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      workflow_name TEXT NOT NULL,
      endpoint_url TEXT NOT NULL DEFAULT '',
      prompt TEXT NOT NULL,
      attached_file_name TEXT NOT NULL DEFAULT '',
      attached_file_preview TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      elapsed_seconds REAL,
      llm_engine TEXT NOT NULL DEFAULT '',
      total_tokens INTEGER NOT NULL DEFAULT 0,
      qa_score REAL,
      qa_decision TEXT NOT NULL DEFAULT '',
      portal_url TEXT NOT NULL DEFAULT '',
      result_url TEXT NOT NULL DEFAULT '',
      zip_url TEXT NOT NULL DEFAULT '',
      zip_filename TEXT NOT NULL DEFAULT '',
      result_json TEXT NOT NULL DEFAULT '{}',
      error_message TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_crew_runs_started_at ON crew_runs(started_at DESC);

    CREATE TABLE IF NOT EXISTS crew_run_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      seq INTEGER NOT NULL,
      event_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      agent_name TEXT NOT NULL DEFAULT '',
      target_agent_id TEXT NOT NULL DEFAULT '',
      status_text TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '',
      tokens_used INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_crew_run_events_run_id ON crew_run_events(run_id, seq);
  `);
}

function toJsonText(val: string | Record<string, unknown> | undefined): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') return JSON.stringify(val);
  return '{}';
}

export function sqliteRunHistoryPlugin(): Plugin {
  let db: DatabaseSync | null = null;

  const getDb = (): DatabaseSync => {
    if (db) return db;
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'pixel_office.sqlite');
    db = new DatabaseSync(dbPath);
    ensureRunsSchema(db);
    return db;
  };

  return {
    name: 'sqlite-run-history-api',
    configureServer(server) {
      getDb();

      server.middlewares.use('/api/runs/event', async (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }
        try {
          const sqlite = getDb();
          const body = await readJsonBody<CrewRunEventPayload>(req);
          if (!body.run_id) {
            sendJson(res, 400, { error: 'Missing run_id' });
            return;
          }

          const seqRow = sqlite
            .prepare(`SELECT COALESCE(MAX(seq), 0) AS max_seq FROM crew_run_events WHERE run_id = ?`)
            .get(body.run_id) as { max_seq: number } | undefined;
          const nextSeq =
            typeof body.seq === 'number' && body.seq > 0
              ? body.seq
              : (seqRow?.max_seq ?? 0) + 1;
          const tokens = Number(body.tokens_used ?? 0) || 0;

          sqlite
            .prepare(
              `INSERT INTO crew_run_events (
                run_id, seq, event_id, timestamp, event_type, agent_id, agent_name,
                target_agent_id, status_text, icon, tokens_used, payload_json
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(
              body.run_id,
              nextSeq,
              body.event_id || `ev_${Date.now()}_${nextSeq}`,
              Number(body.timestamp ?? Date.now()),
              body.event_type || 'AGENT_TOOL_CALL',
              body.agent_id || 'system',
              body.agent_name || '',
              body.target_agent_id || '',
              body.status_text || '',
              body.icon || '',
              tokens,
              toJsonText(body.payload_json),
            );

          if (tokens > 0) {
            sqlite
              .prepare(
                `UPDATE crew_runs SET total_tokens = COALESCE(total_tokens, 0) + ? WHERE id = ?`,
              )
              .run(tokens, body.run_id);
          }

          sendJson(res, 200, { ok: true, seq: nextSeq });
        } catch (err) {
          sendJson(res, 500, { error: String(err) });
        }
      });

      server.middlewares.use('/api/runs', async (req, res, next) => {
        // Let /api/runs/event go cleanly if exact match wasn't handled earlier
        if (req.url?.startsWith('/event')) {
          next();
          return;
        }
        try {
          const sqlite = getDb();
          const urlObj = new URL(req.url || '/', 'http://localhost');

          if (req.method === 'GET') {
            const runId = urlObj.searchParams.get('id');
            if (runId) {
              const run = sqlite
                .prepare(`SELECT * FROM crew_runs WHERE id = ?`)
                .get(runId) as Record<string, unknown> | undefined;
              if (!run) {
                sendJson(res, 404, { error: 'Run not found' });
                return;
              }
              const events = sqlite
                .prepare(
                  `SELECT * FROM crew_run_events WHERE run_id = ? ORDER BY seq ASC, id ASC`,
                )
                .all(runId);
              sendJson(res, 200, { run, events });
              return;
            }

            const limitParam = Number(urlObj.searchParams.get('limit') || 100);
            const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 100;
            const workflowId = urlObj.searchParams.get('workflow_id');

            const runs = workflowId
              ? sqlite
                  .prepare(
                    `SELECT r.*, (SELECT COUNT(*) FROM crew_run_events e WHERE e.run_id = r.id) AS event_count
                     FROM crew_runs r
                     WHERE r.workflow_id = ?
                     ORDER BY r.started_at DESC
                     LIMIT ?`,
                  )
                  .all(workflowId, limit)
              : sqlite
                  .prepare(
                    `SELECT r.*, (SELECT COUNT(*) FROM crew_run_events e WHERE e.run_id = r.id) AS event_count
                     FROM crew_runs r
                     ORDER BY r.started_at DESC
                     LIMIT ?`,
                  )
                  .all(limit);

            sendJson(res, 200, { runs });
            return;
          }

          if (req.method === 'POST') {
            const body = await readJsonBody<CrewRunUpsertPayload>(req);
            if (!body.id) {
              sendJson(res, 400, { error: 'Missing run id' });
              return;
            }

            const existing = sqlite
              .prepare(`SELECT * FROM crew_runs WHERE id = ?`)
              .get(body.id) as Record<string, unknown> | undefined;

            const merged = {
              id: body.id,
              workflow_id: body.workflow_id ?? (existing?.workflow_id as string) ?? 'custom_workflow',
              workflow_name: body.workflow_name ?? (existing?.workflow_name as string) ?? 'Crew Workflow',
              endpoint_url: body.endpoint_url ?? (existing?.endpoint_url as string) ?? '',
              prompt: body.prompt ?? (existing?.prompt as string) ?? '',
              attached_file_name:
                body.attached_file_name ?? (existing?.attached_file_name as string) ?? '',
              attached_file_preview:
                body.attached_file_preview ?? (existing?.attached_file_preview as string) ?? '',
              status: body.status ?? (existing?.status as string) ?? 'running',
              started_at: Number(body.started_at ?? existing?.started_at ?? Date.now()),
              finished_at:
                body.finished_at !== undefined
                  ? body.finished_at
                  : (existing?.finished_at as number | null) ?? null,
              elapsed_seconds:
                body.elapsed_seconds !== undefined
                  ? body.elapsed_seconds
                  : (existing?.elapsed_seconds as number | null) ?? null,
              llm_engine: body.llm_engine ?? (existing?.llm_engine as string) ?? '',
              total_tokens:
                body.total_tokens !== undefined
                  ? Number(body.total_tokens)
                  : Number(existing?.total_tokens ?? 0),
              qa_score:
                body.qa_score !== undefined
                  ? body.qa_score
                  : (existing?.qa_score as number | null) ?? null,
              qa_decision: body.qa_decision ?? (existing?.qa_decision as string) ?? '',
              portal_url: body.portal_url ?? (existing?.portal_url as string) ?? '',
              result_url: body.result_url ?? (existing?.result_url as string) ?? '',
              zip_url: body.zip_url ?? (existing?.zip_url as string) ?? '',
              zip_filename: body.zip_filename ?? (existing?.zip_filename as string) ?? '',
              result_json:
                body.result_json !== undefined
                  ? toJsonText(body.result_json)
                  : (existing?.result_json as string) ?? '{}',
              error_message: body.error_message ?? (existing?.error_message as string) ?? '',
            };

            sqlite
              .prepare(
                `INSERT INTO crew_runs (
                  id, workflow_id, workflow_name, endpoint_url, prompt,
                  attached_file_name, attached_file_preview, status,
                  started_at, finished_at, elapsed_seconds, llm_engine,
                  total_tokens, qa_score, qa_decision,
                  portal_url, result_url, zip_url, zip_filename,
                  result_json, error_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  workflow_id = excluded.workflow_id,
                  workflow_name = excluded.workflow_name,
                  endpoint_url = excluded.endpoint_url,
                  prompt = excluded.prompt,
                  attached_file_name = excluded.attached_file_name,
                  attached_file_preview = excluded.attached_file_preview,
                  status = excluded.status,
                  finished_at = excluded.finished_at,
                  elapsed_seconds = excluded.elapsed_seconds,
                  llm_engine = excluded.llm_engine,
                  total_tokens = excluded.total_tokens,
                  qa_score = excluded.qa_score,
                  qa_decision = excluded.qa_decision,
                  portal_url = excluded.portal_url,
                  result_url = excluded.result_url,
                  zip_url = excluded.zip_url,
                  zip_filename = excluded.zip_filename,
                  result_json = excluded.result_json,
                  error_message = excluded.error_message`,
              )
              .run(
                merged.id,
                merged.workflow_id,
                merged.workflow_name,
                merged.endpoint_url,
                merged.prompt,
                merged.attached_file_name,
                merged.attached_file_preview,
                merged.status,
                merged.started_at,
                merged.finished_at,
                merged.elapsed_seconds,
                merged.llm_engine,
                merged.total_tokens,
                merged.qa_score,
                merged.qa_decision,
                merged.portal_url,
                merged.result_url,
                merged.zip_url,
                merged.zip_filename,
                merged.result_json,
                merged.error_message,
              );

            if (Array.isArray(body.events) && body.events.length > 0) {
              const insertStmt = sqlite.prepare(
                `INSERT INTO crew_run_events (
                  run_id, seq, event_id, timestamp, event_type, agent_id, agent_name,
                  target_agent_id, status_text, icon, tokens_used, payload_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              );
              body.events.forEach((ev, idx) => {
                insertStmt.run(
                  merged.id,
                  ev.seq ?? idx + 1,
                  ev.event_id || `ev_${Date.now()}_${idx + 1}`,
                  Number(ev.timestamp ?? Date.now()),
                  ev.event_type || 'AGENT_TOOL_CALL',
                  ev.agent_id || 'system',
                  ev.agent_name || '',
                  ev.target_agent_id || '',
                  ev.status_text || '',
                  ev.icon || '',
                  Number(ev.tokens_used ?? 0) || 0,
                  toJsonText(ev.payload_json),
                );
              });
            }

            sendJson(res, 200, { ok: true, id: merged.id });
            return;
          }

          if (req.method === 'DELETE') {
            const deleteAll = urlObj.searchParams.get('all');
            const id = urlObj.searchParams.get('id');
            if (deleteAll === '1') {
              sqlite.exec(`DELETE FROM crew_run_events; DELETE FROM crew_runs;`);
              sendJson(res, 200, { ok: true, deleted: 'all' });
              return;
            }
            if (!id) {
              sendJson(res, 400, { error: 'Missing id query parameter' });
              return;
            }
            sqlite.prepare(`DELETE FROM crew_run_events WHERE run_id = ?`).run(id);
            sqlite.prepare(`DELETE FROM crew_runs WHERE id = ?`).run(id);
            sendJson(res, 200, { ok: true, id });
            return;
          }

          next();
        } catch (err) {
          sendJson(res, 500, { error: String(err) });
        }
      });
    },
  };
}
