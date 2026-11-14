// expo-sqlite, the few calls the app makes, on sql.js in memory. Seeds the
// scenario from window.__SCENARIO__ right after the app creates its tables.
let SQLp = null;
function loadSql() {
  if (!SQLp)
    SQLp = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/sql-wasm.js';
      s.onload = () => window.initSqlJs({ locateFile: (f) => '/' + f }).then(resolve, reject);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  return SQLp;
}
const clean = (p) => (p || []).map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
class DB {
  constructor(db) {
    this.db = db;
    this.seeded = false;
  }
  rows(sql, params) {
    const st = this.db.prepare(sql);
    st.bind(clean(params));
    const out = [];
    while (st.step()) out.push(st.getAsObject());
    st.free();
    return out;
  }
  async execAsync(sql) {
    this.db.exec(sql);
    if (!this.seeded && /CREATE TABLE IF NOT EXISTS settings/.test(sql)) {
      this.seeded = true;
      seed(this.db);
    }
  }
  async runAsync(sql, params) {
    this.db.run(sql, clean(params));
    const id = this.db.exec('SELECT last_insert_rowid()')[0].values[0][0];
    return { lastInsertRowId: id, changes: this.db.getRowsModified() };
  }
  async getAllAsync(sql, params) {
    return this.rows(sql, params);
  }
  async getFirstAsync(sql, params) {
    return this.rows(sql, params)[0] ?? null;
  }
  async withTransactionAsync(fn) {
    this.db.exec('BEGIN');
    try {
      await fn();
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
}
function seed(db) {
  const sc = window.__SCENARIO__ || {};
  const d = sc.data || {};
  const run = (sql, p) => db.run(sql, clean(p));
  for (const m of d.meds || []) {
    run('INSERT INTO meds (id, name, schedule_kind, every_days, weekdays, start_day, remind, position, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)', [
      m.id, m.name, m.schedule.kind, m.schedule.kind === 'interval' ? m.schedule.everyDays : 7, JSON.stringify(m.schedule.kind === 'weekdays' ? m.schedule.days : []), m.startDay, m.remind ? 1 : 0, m.position, m.createdAt, m.createdAt,
    ]);
    for (const c of m.doses) run('INSERT INTO dose_changes (id, med_id, from_day, amount, unit, created_at) VALUES (?,?,?,?,?,?)', [c.id, c.medId, c.fromDay, c.amount, c.unit, 0]);
  }
  for (const s of d.shots || []) run('INSERT INTO shots (id, med_id, med_name, at, amount, unit, site, note, backfilled, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)', [s.id, s.medId, s.medName, s.at, s.amount, s.unit, s.site || '', s.note, s.backfilled ? 1 : 0, 0, 0]);
  for (const w of d.weights || []) run('INSERT INTO weights (id, at, value, unit, waist, created_at) VALUES (?,?,?,?,?,?)', [w.id, w.at, w.value, w.unit, w.waist, 0]);
  for (const f of d.feelings || []) run('INSERT INTO feelings (id, at, kind, level, note, created_at) VALUES (?,?,?,?,?,?)', [f.id, f.at, f.kind, f.level, f.note, 0]);
  for (const i of d.intake || []) run('INSERT INTO intake (day, protein, water, updated_at) VALUES (?,?,?,?)', [i.day, i.protein, i.water, 0]);
  for (const [k, v] of Object.entries(sc.kv || {})) run('INSERT INTO settings (key, value) VALUES (?, ?)', [k, v]);
}
export async function openDatabaseAsync() {
  const SQL = await loadSql();
  return new DB(new SQL.Database());
}
