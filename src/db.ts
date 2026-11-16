/**
 * On-device SQLite store. Times are epoch ms; days are local "YYYY-MM-DD".
 * Nothing here ever leaves the phone: no account, no sync, no network.
 *
 * After launch the schema only grows: never drop or rename a column or
 * table. A new column goes in as a new step in migrate() below, guarded by
 * PRAGMA user_version, so it runs once on every existing install.
 */
import * as SQLite from 'expo-sqlite';
import type { DoseChange, DoseUnit, Feeling, FeelingEntry, Intake, Level, Med, Schedule, Shot, Site, Weight, WeightUnit } from './model';
import { isSite } from './sites';
import { dayKey } from './days';
import { startMoveFor } from './schedule';

const SCHEMA_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('shotlog.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS meds (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          schedule_kind TEXT NOT NULL DEFAULT 'interval',
          every_days INTEGER NOT NULL DEFAULT 7,
          weekdays TEXT NOT NULL DEFAULT '[]',
          start_day TEXT NOT NULL,
          remind INTEGER NOT NULL DEFAULT 1,
          position INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS dose_changes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          med_id INTEGER NOT NULL,
          from_day TEXT NOT NULL,
          amount TEXT NOT NULL DEFAULT '',
          unit TEXT NOT NULL DEFAULT 'mg',
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_dose_changes_med ON dose_changes(med_id);
        CREATE TABLE IF NOT EXISTS shots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          med_id INTEGER,
          med_name TEXT NOT NULL DEFAULT '',
          at INTEGER NOT NULL,
          amount TEXT NOT NULL DEFAULT '',
          unit TEXT NOT NULL DEFAULT 'mg',
          site TEXT NOT NULL DEFAULT '',
          note TEXT NOT NULL DEFAULT '',
          backfilled INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_shots_at ON shots(at);
        CREATE TABLE IF NOT EXISTS weights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          at INTEGER NOT NULL,
          value REAL NOT NULL,
          unit TEXT NOT NULL DEFAULT 'kg',
          waist REAL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_weights_at ON weights(at);
        CREATE TABLE IF NOT EXISTS feelings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          at INTEGER NOT NULL,
          kind TEXT NOT NULL,
          level TEXT NOT NULL DEFAULT 'mild',
          note TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_feelings_at ON feelings(at);
        CREATE TABLE IF NOT EXISTS intake (
          day TEXT PRIMARY KEY NOT NULL,
          protein REAL NOT NULL DEFAULT 0,
          water REAL NOT NULL DEFAULT 0,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
      await migrate(db);
      return db;
    })();
    // A failed open is retried on the next call instead of failing forever.
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version >= SCHEMA_VERSION) return;
  // Version 1 is the tables above. Each later step goes here, runs once on existing installs,
  // and only adds (ALTER TABLE ... ADD COLUMN after a PRAGMA table_info check).
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

// ---------- settings (key/value) ----------

export async function kvGet(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function kvSet(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
}

/** Every stored key with this prefix, prefix removed. */
export async function kvAll(prefix: string): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings WHERE key LIKE ?', [prefix + '%']);
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key.slice(prefix.length)] = r.value;
  return out;
}

// ---------- reading rows ----------

const UNITS: DoseUnit[] = ['mg', 'mcg', 'mL', 'units'];
const FEELINGS: Feeling[] = ['nausea', 'constipation', 'heartburn', 'fatigue', 'headache', 'low_appetite', 'site_reaction', 'other'];
const LEVELS: Level[] = ['mild', 'moderate', 'strong'];

const unit = (v: unknown): DoseUnit => (UNITS.includes(v as DoseUnit) ? (v as DoseUnit) : 'mg');

function numbers(json: string | null | undefined): number[] {
  try {
    const v = JSON.parse(json ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is number => Number.isInteger(x) && x >= 0 && x <= 6) : [];
  } catch {
    return [];
  }
}

function rowToMed(r: any, doses: DoseChange[]): Med {
  const schedule: Schedule =
    r.schedule_kind === 'weekdays' ? { kind: 'weekdays', days: numbers(r.weekdays) } : { kind: 'interval', everyDays: Math.max(1, r.every_days ?? 7) };
  return {
    id: r.id,
    name: r.name ?? '',
    schedule,
    startDay: r.start_day,
    doses,
    remind: r.remind !== 0,
    position: r.position ?? 0,
    createdAt: r.created_at,
  };
}

function rowToShot(r: any, namesById: Map<number, string>): Shot {
  const name = r.med_id != null ? namesById.get(r.med_id) : undefined;
  return {
    id: r.id,
    medId: name != null ? r.med_id : null,
    medName: name ?? r.med_name ?? '',
    at: r.at,
    amount: r.amount ?? '',
    unit: unit(r.unit),
    site: isSite(r.site) ? (r.site as Site) : null,
    note: r.note ?? '',
    backfilled: r.backfilled === 1,
    createdAt: r.created_at,
  };
}

// ---------- medications ----------

export async function getMeds(): Promise<Med[]> {
  const db = await getDb();
  const [rows, doseRows] = await Promise.all([
    db.getAllAsync<any>('SELECT * FROM meds ORDER BY position ASC, id ASC'),
    db.getAllAsync<any>('SELECT * FROM dose_changes ORDER BY from_day ASC, id ASC'),
  ]);
  const byMed = new Map<number, DoseChange[]>();
  for (const d of doseRows) {
    const list = byMed.get(d.med_id) ?? [];
    list.push({ id: d.id, medId: d.med_id, fromDay: d.from_day, amount: d.amount ?? '', unit: unit(d.unit) });
    byMed.set(d.med_id, list);
  }
  return rows.map((r) => rowToMed(r, byMed.get(r.id) ?? []));
}

export interface MedFields {
  name: string;
  schedule: Schedule;
  startDay: string;
  remind: boolean;
}

function scheduleParams(s: Schedule): [string, number, string] {
  return s.kind === 'interval' ? ['interval', Math.max(1, Math.round(s.everyDays)), '[]'] : ['weekdays', 7, JSON.stringify([...new Set(s.days)].sort())];
}

/** A new medication with its first dose (from its start day). */
export async function addMed(f: MedFields, dose: { amount: string; unit: DoseUnit }): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  let id = 0;
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ n: number | null }>('SELECT MAX(position) AS n FROM meds');
    const res = await db.runAsync(
      'INSERT INTO meds (name, schedule_kind, every_days, weekdays, start_day, remind, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [f.name.trim(), ...scheduleParams(f.schedule), f.startDay, f.remind ? 1 : 0, (row?.n ?? -1) + 1, now, now]
    );
    id = res.lastInsertRowId;
    await db.runAsync('INSERT INTO dose_changes (med_id, from_day, amount, unit, created_at) VALUES (?, ?, ?, ?, ?)', [id, f.startDay, dose.amount.trim(), dose.unit, now]);
  });
  return id;
}

export async function updateMed(id: number, f: MedFields): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE meds SET name = ?, schedule_kind = ?, every_days = ?, weekdays = ?, start_day = ?, remind = ?, updated_at = ? WHERE id = ?', [
    f.name.trim(),
    ...scheduleParams(f.schedule),
    f.startDay,
    f.remind ? 1 : 0,
    Date.now(),
    id,
  ]);
  // Logged shots keep their own copy of the name, for when the medication is deleted.
  await db.runAsync('UPDATE shots SET med_name = ? WHERE med_id = ?', [f.name.trim(), id]);
}

/** A dose change from a day. A change on the same day replaces that day's. */
export async function addDoseChange(medId: number, fromDay: string, amount: string, u: DoseUnit): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM dose_changes WHERE med_id = ? AND from_day = ?', [medId, fromDay]);
    await db.runAsync('INSERT INTO dose_changes (med_id, from_day, amount, unit, created_at) VALUES (?, ?, ?, ?, ?)', [medId, fromDay, amount.trim(), u, Date.now()]);
  });
}

export async function deleteDoseChange(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM dose_changes WHERE id = ?', [id]);
}

/** Removes it from the list. Shots already logged keep its name and their dose. */
export async function deleteMed(id: number): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE shots SET med_id = NULL WHERE med_id = ?', [id]);
    await db.runAsync('DELETE FROM dose_changes WHERE med_id = ?', [id]);
    await db.runAsync('DELETE FROM meds WHERE id = ?', [id]);
  });
}

/**
 * After a shot is saved: when it is on a day before its medication's start,
 * the start moves back to that day, with the first dose entry when it began
 * on the old start (src/schedule.ts startMoveFor). Nothing changes otherwise.
 */
export async function moveMedStartBack(medId: number, shotAt: number): Promise<void> {
  const db = await getDb();
  const med = await db.getFirstAsync<{ start_day: string }>('SELECT start_day FROM meds WHERE id = ?', [medId]);
  if (!med) return;
  const doses = await db.getAllAsync<{ id: number; from_day: string }>('SELECT id, from_day FROM dose_changes WHERE med_id = ?', [medId]);
  const move = startMoveFor({ startDay: med.start_day, doses: doses.map((d) => ({ id: d.id, medId, fromDay: d.from_day, amount: '', unit: 'mg' as const })) }, dayKey(shotAt));
  if (!move) return;
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE meds SET start_day = ?, updated_at = ? WHERE id = ?', [move.startDay, Date.now(), medId]);
    if (move.doseId != null) await db.runAsync('UPDATE dose_changes SET from_day = ? WHERE id = ?', [move.startDay, move.doseId]);
  });
}

export async function countMeds(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM meds');
  return row?.n ?? 0;
}

// ---------- shots ----------

/** Every shot, newest first. Names come from the list while the medication exists. */
export async function getShots(): Promise<Shot[]> {
  const db = await getDb();
  const [rows, meds] = await Promise.all([db.getAllAsync<any>('SELECT * FROM shots ORDER BY at DESC, id DESC'), db.getAllAsync<{ id: number; name: string }>('SELECT id, name FROM meds')]);
  const names = new Map(meds.map((m) => [m.id, m.name]));
  return rows.map((r) => rowToShot(r, names));
}

export type ShotFields = Omit<Shot, 'id' | 'createdAt'>;

export async function addShot(f: ShotFields): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const res = await db.runAsync(
    'INSERT INTO shots (med_id, med_name, at, amount, unit, site, note, backfilled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [f.medId, f.medName, f.at, f.amount.trim(), f.unit, f.site ?? '', f.note, f.backfilled ? 1 : 0, now, now]
  );
  return res.lastInsertRowId;
}

export async function updateShot(id: number, f: ShotFields): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE shots SET med_id = ?, med_name = ?, at = ?, amount = ?, unit = ?, site = ?, note = ?, backfilled = ?, updated_at = ? WHERE id = ?', [
    f.medId,
    f.medName,
    f.at,
    f.amount.trim(),
    f.unit,
    f.site ?? '',
    f.note,
    f.backfilled ? 1 : 0,
    Date.now(),
    id,
  ]);
}

export async function deleteShot(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM shots WHERE id = ?', [id]);
}

export async function countShots(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM shots');
  return row?.n ?? 0;
}

// ---------- weight ----------

export async function getWeights(): Promise<Weight[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM weights ORDER BY at DESC, id DESC');
  return rows.map((r) => ({
    id: r.id,
    at: r.at,
    value: r.value,
    unit: (r.unit === 'lb' ? 'lb' : 'kg') as WeightUnit,
    waist: typeof r.waist === 'number' ? r.waist : null,
    createdAt: r.created_at,
  }));
}

export async function addWeight(at: number, value: number, u: WeightUnit, waist: number | null): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync('INSERT INTO weights (at, value, unit, waist, created_at) VALUES (?, ?, ?, ?, ?)', [at, value, u, waist, Date.now()]);
  return res.lastInsertRowId;
}

export async function updateWeight(id: number, at: number, value: number, u: WeightUnit, waist: number | null): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE weights SET at = ?, value = ?, unit = ?, waist = ? WHERE id = ?', [at, value, u, waist, id]);
}

export async function deleteWeight(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM weights WHERE id = ?', [id]);
}

// ---------- how I feel ----------

export async function getFeelings(): Promise<FeelingEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM feelings ORDER BY at DESC, id DESC');
  return rows
    .filter((r) => FEELINGS.includes(r.kind))
    .map((r) => ({ id: r.id, at: r.at, kind: r.kind as Feeling, level: LEVELS.includes(r.level) ? (r.level as Level) : 'mild', note: r.note ?? '', createdAt: r.created_at }));
}

export async function addFeeling(at: number, kind: Feeling, level: Level, note = ''): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync('INSERT INTO feelings (at, kind, level, note, created_at) VALUES (?, ?, ?, ?, ?)', [at, kind, level, note, Date.now()]);
  return res.lastInsertRowId;
}

export async function updateFeeling(id: number, at: number, kind: Feeling, level: Level, note: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE feelings SET at = ?, kind = ?, level = ?, note = ? WHERE id = ?', [at, kind, level, note, id]);
}

export async function deleteFeeling(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM feelings WHERE id = ?', [id]);
}

// ---------- protein and water ----------

export async function getIntake(): Promise<Intake[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT day, protein, water FROM intake ORDER BY day DESC');
  return rows.map((r) => ({ day: r.day, protein: r.protein ?? 0, water: r.water ?? 0 }));
}

/** Adds to (or with a negative step, takes from) a day's counter; never below zero. */
export async function addIntake(day: string, what: 'protein' | 'water', amount: number): Promise<void> {
  const db = await getDb();
  const col = what === 'protein' ? 'protein' : 'water';
  await db.runAsync(
    `INSERT INTO intake (day, protein, water, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(day) DO UPDATE SET ${col} = MAX(0, ${col} + ?), updated_at = excluded.updated_at`,
    [day, what === 'protein' ? Math.max(0, amount) : 0, what === 'water' ? Math.max(0, amount) : 0, Date.now(), amount]
  );
}

// ---------- everything ----------

/** Every shot, medication, weight, feeling and counter. Settings and purchases stay. */
export async function deleteAllData(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM shots; DELETE FROM dose_changes; DELETE FROM meds; DELETE FROM weights; DELETE FROM feelings; DELETE FROM intake;');
}
