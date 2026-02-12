import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";

const DB_NAME = "openwhispr.db";
const DB_VERSION = 2;

let db: SQLiteDatabase | null = null;

export function getDatabase(): SQLiteDatabase {
  if (!db) {
    db = openDatabaseSync(DB_NAME);
    runMigrations(db);
  }
  return db;
}

function runMigrations(database: SQLiteDatabase): void {
  const currentVersion =
    database.getFirstSync<{ user_version: number }>("PRAGMA user_version")
      ?.user_version ?? 0;

  // v1: Initial schema
  if (currentVersion < 1) {
    database.execSync(`
      CREATE TABLE IF NOT EXISTS transcriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        duration INTEGER,
        model_used TEXT,
        is_local INTEGER DEFAULT 1,
        was_processed INTEGER DEFAULT 0,
        processing_method TEXT
      );

      CREATE TABLE IF NOT EXISTS custom_dictionary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  // v2: Add source column for keyboard extension
  if (currentVersion < 2) {
    database.execSync(`
      ALTER TABLE transcriptions ADD COLUMN source TEXT DEFAULT 'app';
    `);
  }

  database.execSync(`PRAGMA user_version = ${DB_VERSION};`);
}

// --- Transcription CRUD ---

export interface TranscriptionRow {
  id: number;
  text: string;
  timestamp: string;
  duration: number | null;
  model_used: string | null;
  is_local: number;
  was_processed: number;
  processing_method: string | null;
  source: string | null;
}

export function insertTranscription(params: {
  text: string;
  duration?: number;
  modelUsed?: string;
  isLocal?: boolean;
  wasProcessed?: boolean;
  processingMethod?: string;
  source?: "app" | "keyboard";
}): number {
  const database = getDatabase();
  const result = database.runSync(
    `INSERT INTO transcriptions (text, duration, model_used, is_local, was_processed, processing_method, source)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    params.text,
    params.duration ?? null,
    params.modelUsed ?? null,
    params.isLocal !== false ? 1 : 0,
    params.wasProcessed ? 1 : 0,
    params.processingMethod ?? null,
    params.source ?? "app"
  );
  return result.lastInsertRowId;
}

export function getTranscriptions(
  limit = 50,
  offset = 0
): TranscriptionRow[] {
  const database = getDatabase();
  return database.getAllSync<TranscriptionRow>(
    "SELECT * FROM transcriptions ORDER BY timestamp DESC LIMIT ? OFFSET ?",
    limit,
    offset
  );
}

export function searchTranscriptions(query: string): TranscriptionRow[] {
  const database = getDatabase();
  return database.getAllSync<TranscriptionRow>(
    "SELECT * FROM transcriptions WHERE text LIKE ? ORDER BY timestamp DESC LIMIT 50",
    `%${query}%`
  );
}

export function deleteTranscription(id: number): void {
  const database = getDatabase();
  database.runSync("DELETE FROM transcriptions WHERE id = ?", id);
}

export function getTranscriptionCount(): number {
  const database = getDatabase();
  const row = database.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM transcriptions"
  );
  return row?.count ?? 0;
}

// --- Custom Dictionary CRUD ---

export interface DictionaryWordRow {
  id: number;
  word: string;
  created_at: string;
}

export function getDictionaryWords(): DictionaryWordRow[] {
  const database = getDatabase();
  return database.getAllSync<DictionaryWordRow>(
    "SELECT * FROM custom_dictionary ORDER BY word ASC"
  );
}

export function addDictionaryWord(word: string): number {
  const database = getDatabase();
  const result = database.runSync(
    "INSERT OR IGNORE INTO custom_dictionary (word) VALUES (?)",
    word.trim()
  );
  return result.lastInsertRowId;
}

export function removeDictionaryWord(id: number): void {
  const database = getDatabase();
  database.runSync("DELETE FROM custom_dictionary WHERE id = ?", id);
}

export function getDictionaryWordList(): string[] {
  return getDictionaryWords().map((w) => w.word);
}
