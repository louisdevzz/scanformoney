import { Bounty } from '../types/bounty';
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface BountyRow {
  id: string;
  title: string;
  reward: number;
  currency: string;
  deadline: string;
  link: string;
  tags_json: string;
  source: string;
  description: string | null;
  category: Bounty['category'] | null;
  target: Bounty['target'] | null;
  created_at: string;
  updated_at: string;
  notified_at: string | null;
}

export class DataStore {
  private readonly db: DatabaseSync;

  constructor(storePath?: string) {
    const resolvedStorePath =
      storePath ?? process.env.SQLITE_DB_PATH ?? './data/bounties.db';
    const absolutePath = path.resolve(resolvedStorePath);
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new DatabaseSync(absolutePath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bounties (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        reward REAL NOT NULL,
        currency TEXT NOT NULL,
        deadline TEXT NOT NULL,
        link TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        source TEXT NOT NULL,
        description TEXT,
        category TEXT,
        target TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        notified_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_bounties_updated_at ON bounties(updated_at);
    `);

    this.ensureNotifiedColumn();
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_bounties_notified_at ON bounties(notified_at);');
  }

  update(incomingBounties: Bounty[]): { new: Bounty[]; updated: Bounty[] } {
    const newItems: Bounty[] = [];
    const updatedItems: Bounty[] = [];
    const now = new Date();

    const selectById = this.db.prepare('SELECT * FROM bounties WHERE id = ?');
    const insertStmt = this.db.prepare(`
      INSERT INTO bounties (
        id, title, reward, currency, deadline, link, tags_json, source, description, category, target, created_at, updated_at, notified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateStmt = this.db.prepare(`
      UPDATE bounties
      SET title = ?, reward = ?, currency = ?, deadline = ?, link = ?, tags_json = ?, source = ?, description = ?, category = ?, target = ?, updated_at = ?, notified_at = NULL
      WHERE id = ?
    `);

    for (const bounty of incomingBounties) {
      const existing = selectById.get(bounty.id) as BountyRow | undefined;

      if (!existing) {
        const createdAt = bounty.createdAt ?? now;
        const updatedAt = bounty.updatedAt ?? now;
        insertStmt.run(
          bounty.id,
          bounty.title,
          bounty.reward,
          bounty.currency,
          bounty.deadline.toISOString(),
          bounty.link,
          JSON.stringify(bounty.tags),
          bounty.source,
          bounty.description ?? null,
          bounty.category ?? null,
          bounty.target ?? null,
          createdAt.toISOString(),
          updatedAt.toISOString(),
          null
        );
        newItems.push({ ...bounty, createdAt, updatedAt });
        continue;
      }

      const existingBounty = this.toBounty(existing);
      if (!this.hasChanged(existingBounty, bounty)) {
        continue;
      }

      const updatedAt = now;
      updateStmt.run(
        bounty.title,
        bounty.reward,
        bounty.currency,
        bounty.deadline.toISOString(),
        bounty.link,
        JSON.stringify(bounty.tags),
        bounty.source,
        bounty.description ?? null,
        bounty.category ?? null,
        bounty.target ?? null,
        updatedAt.toISOString(),
        bounty.id
      );
      updatedItems.push({ ...bounty, createdAt: existingBounty.createdAt, updatedAt });
    }

    return { new: newItems, updated: updatedItems };
  }

  getAll(): Bounty[] {
    const rows = this.db.prepare('SELECT * FROM bounties').all() as unknown as BountyRow[];
    return rows.map((row) => this.toBounty(row));
  }

  getById(id: string): Bounty | undefined {
    const row = this.db.prepare('SELECT * FROM bounties WHERE id = ?').get(id) as BountyRow | undefined;
    return row ? this.toBounty(row) : undefined;
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM bounties WHERE id = ?').run(id);
    return Number(result.changes) > 0;
  }

  deleteMany(ids: string[]): number {
    if (ids.length === 0) {
      return 0;
    }

    const deleteStmt = this.db.prepare('DELETE FROM bounties WHERE id = ?');
    let deletedCount = 0;

    for (const id of ids) {
      const result = deleteStmt.run(id);
      deletedCount += Number(result.changes);
    }

    return deletedCount;
  }

  getPendingNotifications(maxAgeHours: number): Bounty[] {
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    const threshold = new Date(Date.now() - maxAgeMs).toISOString();
    const rows = this.db.prepare(
      `SELECT * FROM bounties
       WHERE notified_at IS NULL
         AND COALESCE(updated_at, created_at) >= ?
       ORDER BY COALESCE(updated_at, created_at) DESC`
    ).all(threshold) as unknown as BountyRow[];

    return rows.map((row) => this.toBounty(row));
  }

  markAsNotified(ids: string[]): void {
    if (ids.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    const markStmt = this.db.prepare('UPDATE bounties SET notified_at = ? WHERE id = ?');

    for (const id of ids) {
      markStmt.run(now, id);
    }
  }

  close(): void {
    this.db.close();
  }

  private toBounty(row: BountyRow): Bounty {
    const tags = safeJsonParseStringArray(row.tags_json);

    return {
      id: row.id,
      title: row.title,
      reward: Number(row.reward),
      currency: row.currency,
      deadline: new Date(row.deadline),
      link: row.link,
      tags,
      source: row.source,
      description: row.description ?? undefined,
      category: row.category ?? undefined,
      target: row.target ?? undefined,
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
      notifiedAt: row.notified_at ? new Date(row.notified_at) : undefined,
    };
  }

  private hasChanged(oldBounty: Bounty, newBounty: Bounty): boolean {
    return (
      oldBounty.title !== newBounty.title ||
      oldBounty.reward !== newBounty.reward ||
      oldBounty.currency !== newBounty.currency ||
      oldBounty.deadline.getTime() !== newBounty.deadline.getTime() ||
      oldBounty.link !== newBounty.link ||
      oldBounty.source !== newBounty.source ||
      oldBounty.description !== newBounty.description ||
      oldBounty.category !== newBounty.category ||
      oldBounty.target !== newBounty.target ||
      oldBounty.tags.join('|') !== newBounty.tags.join('|')
    );
  }

  private ensureNotifiedColumn(): void {
    const columns = this.db.prepare('PRAGMA table_info(bounties)').all() as Array<{ name: string }>;
    const hasNotifiedColumn = columns.some((column) => column.name === 'notified_at');

    if (!hasNotifiedColumn) {
      this.db.exec('ALTER TABLE bounties ADD COLUMN notified_at TEXT');
    }
  }
}

function safeJsonParseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}
