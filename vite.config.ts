import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
// @ts-ignore - Built-in Node.js v22.14.0 SQLite module
import { DatabaseSync } from 'node:sqlite';
import { sqliteRunHistoryPlugin } from './server/sqliteRunHistoryPlugin';

function sqliteWorkflowApiPlugin(): Plugin {
  let db: any = null;

  function getDb() {
    if (db) return db;
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'pixel_office.sqlite');
    db = new DatabaseSync(dbPath);
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        crew_endpoint_url TEXT NOT NULL DEFAULT 'ws://localhost:8765',
        raw_requirement TEXT NOT NULL,
        blueprint_json TEXT NOT NULL,
        steps_json TEXT NOT NULL,
        integration_doc_md TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
    // Safe migration for existing databases created before crew_endpoint_url column
    try {
      db.exec(
        `ALTER TABLE workflows ADD COLUMN crew_endpoint_url TEXT NOT NULL DEFAULT 'ws://localhost:8765';`,
      );
    } catch {
      // Column already exists
    }
    return db;
  }

  return {
    name: 'pixel-office-sqlite-api',
    configureServer(server) {
      server.middlewares.use('/api/workflows', (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        const database = getDb();

        if (req.method === 'GET') {
          const rows = database
            .prepare('SELECT * FROM workflows ORDER BY created_at ASC')
            .all();
          const parsed = rows.map((r: any) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            crew_endpoint_url: r.crew_endpoint_url || 'ws://localhost:8765',
            raw_requirement: r.raw_requirement,
            blueprint: JSON.parse(r.blueprint_json),
            steps: JSON.parse(r.steps_json),
            integration_doc_md: r.integration_doc_md,
            created_at: r.created_at,
          }));
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true, workflows: parsed }));
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const payload = JSON.parse(body);
              const items = Array.isArray(payload.workflows)
                ? payload.workflows
                : [payload.workflow || payload];

              const stmt = database.prepare(`
                INSERT OR REPLACE INTO workflows (
                  id, name, description, crew_endpoint_url, raw_requirement,
                  blueprint_json, steps_json, integration_doc_md, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);

              for (const item of items) {
                if (!item || !item.id) continue;
                stmt.run(
                  String(item.id),
                  String(item.name || 'Custom Workflow'),
                  String(item.description || ''),
                  String(item.crew_endpoint_url || 'ws://localhost:8765'),
                  String(item.raw_requirement || ''),
                  JSON.stringify(item.blueprint || {}),
                  JSON.stringify(item.steps || []),
                  String(item.integration_doc_md || ''),
                  Number(item.created_at || Date.now()),
                );
              }

              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true, count: items.length }));
            } catch (err: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: String(err?.message || err) }));
            }
          });
          return;
        }

        if (req.method === 'DELETE') {
          const urlObj = new URL(req.url || '', 'http://localhost');
          const id = urlObj.searchParams.get('id');
          if (id) {
            database.prepare('DELETE FROM workflows WHERE id = ?').run(id);
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
      });
    },
  };
}

export default defineConfig({
  plugins: [vue(), sqliteWorkflowApiPlugin(), sqliteRunHistoryPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
