import path from 'path';
import { existsSync } from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'history.db');

export interface Passage {
  article_id: string;
  chunk_index: number;
  content: string;
  title?: string;
  source?: string;
}

export interface Article {
  id: string;
  title: string;
  source: string;
  category: string;
  content: string;
}

let _db: import('better-sqlite3').Database | null = null;

function getDb(): import('better-sqlite3').Database | null {
  if (_db) return _db;
  if (!existsSync(DB_PATH)) return null;
  try {
    // Dynamic require keeps better-sqlite3 out of the client bundle
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3');
    _db = new Database(DB_PATH, { readonly: true });
    return _db;
  } catch {
    return null;
  }
}

/**
 * Full-text search across all indexed passages.
 * Returns up to `limit` passages, most relevant first.
 * Returns [] if the DB does not exist (seed not yet run).
 */
export function searchPassages(query: string, limit = 6): Passage[] {
  const db = getDb();
  if (!db) return [];
  try {
    // FTS5 query: clean the input so it doesn't throw on special chars
    const safeQuery = query.replace(/[^\w\s-]/g, ' ').trim();
    if (!safeQuery) return [];
    const rows = db.prepare(`
      SELECT f.article_id, f.chunk_index, f.content, a.title, a.source
      FROM passages_fts f
      JOIN articles a ON a.id = f.article_id
      WHERE passages_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(safeQuery, limit) as Passage[];
    return rows;
  } catch {
    return [];
  }
}

/**
 * Retrieve the full text of a specific article by id.
 */
export function getArticle(id: string): Article | null {
  const db = getDb();
  if (!db) return null;
  try {
    return db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as Article | null;
  } catch {
    return null;
  }
}

/**
 * List all articles in the DB (for diagnostics).
 */
export function listArticles(): Pick<Article, 'id' | 'title' | 'source' | 'category'>[] {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare('SELECT id, title, source, category FROM articles ORDER BY category, id').all() as Pick<Article, 'id' | 'title' | 'source' | 'category'>[];
  } catch {
    return [];
  }
}

/** True if the local history DB exists and has articles. */
export function isDbReady(): boolean {
  const db = getDb();
  if (!db) return false;
  try {
    const row = db.prepare('SELECT COUNT(*) as n FROM articles').get() as { n: number };
    return row.n > 0;
  } catch {
    return false;
  }
}
