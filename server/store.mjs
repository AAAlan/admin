import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, chmodSync } from 'node:fs'
import { dirname } from 'node:path'

export class RolloutStore {
  constructor(filename) {
    if (filename !== ':memory:')
      mkdirSync(dirname(filename), { recursive: true, mode: 0o700 })
    this.db = new DatabaseSync(filename)
    if (filename !== ':memory:') chmodSync(filename, 0o600)
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS templates (scope TEXT NOT NULL, id TEXT NOT NULL, state TEXT NOT NULL, PRIMARY KEY(scope,id));
      CREATE TABLE IF NOT EXISTS versions (scope TEXT NOT NULL, id TEXT NOT NULL, revision INTEGER NOT NULL, document TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(scope,id,revision));
      CREATE TABLE IF NOT EXISTS audit (seq INTEGER PRIMARY KEY AUTOINCREMENT, scope TEXT NOT NULL, id TEXT NOT NULL, event TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS decisions (id TEXT PRIMARY KEY, scope TEXT NOT NULL, data TEXT NOT NULL);`)
  }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const result = fn()
      this.db.exec('COMMIT')
      return result
    } catch (e) {
      this.db.exec('ROLLBACK')
      throw e
    }
  }
  get(scope, id) {
    const row = this.db
      .prepare('SELECT state FROM templates WHERE scope=? AND id=?')
      .get(scope, id)
    return row ? JSON.parse(row.state) : null
  }
  list(scope) {
    return this.db
      .prepare('SELECT state FROM templates WHERE scope=? ORDER BY id')
      .all(scope)
      .map((row) => JSON.parse(row.state))
  }
  put(scope, state) {
    this.db
      .prepare(
        'INSERT INTO templates VALUES(?,?,?) ON CONFLICT(scope,id) DO UPDATE SET state=excluded.state',
      )
      .run(scope, state.template_id, JSON.stringify(state))
  }
  version(scope, id, revision, document) {
    this.db
      .prepare('INSERT INTO versions VALUES(?,?,?,?,?)')
      .run(
        scope,
        id,
        revision,
        JSON.stringify(document),
        new Date().toISOString(),
      )
  }
  versions(scope, id) {
    return this.db
      .prepare(
        'SELECT revision,document,created_at FROM versions WHERE scope=? AND id=? ORDER BY revision DESC',
      )
      .all(scope, id)
      .map((r) => ({
        revision: r.revision,
        document: JSON.parse(r.document),
        createdAt: r.created_at,
      }))
  }
  audit(scope, id, event) {
    this.db
      .prepare('INSERT INTO audit(scope,id,event) VALUES(?,?,?)')
      .run(scope, id, JSON.stringify(event))
  }
  audits(scope, id) {
    return this.db
      .prepare(
        'SELECT event FROM audit WHERE scope=? AND id=? ORDER BY seq DESC LIMIT 100',
      )
      .all(scope, id)
      .map((r) => JSON.parse(r.event))
  }
  saveDecision(scope, id, data) {
    this.db
      .prepare('INSERT INTO decisions VALUES(?,?,?)')
      .run(id, scope, JSON.stringify(data))
  }
  decision(scope, id) {
    const row = this.db
      .prepare('SELECT data FROM decisions WHERE id=? AND scope=?')
      .get(id, scope)
    return row ? JSON.parse(row.data) : null
  }
  close() {
    this.db.close()
  }
}
