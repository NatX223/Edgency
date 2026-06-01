import { useEffect, useRef, useState } from 'react';
import * as SQLite from 'expo-sqlite';

// ─── User shape ───────────────────────────────────────────────────────────────
export interface UserRecord {
  full_name: string;
  sector: string;
  role: 'user' | 'responder';
  medical_history: string;
  health_conditions: string;   // comma-separated
  disabilities: string;
  experience_level: 'rookie' | 'intermediate' | 'veteran' | null;
}

export interface DatabaseState {
  isReady: boolean;
  error: string | null;
  insertUser: (data: UserRecord) => Promise<number>;
  getUser: () => Promise<UserRecord | null>;
}

const DB_NAME = 'edgency.db';

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name        TEXT    NOT NULL,
    sector           TEXT    NOT NULL,
    role             TEXT    NOT NULL DEFAULT 'user',
    medical_history  TEXT,
    health_conditions TEXT,
    disabilities     TEXT,
    experience_level TEXT,
    created_at       INTEGER NOT NULL
  );
`;

export function useDatabase(): DatabaseState {
  const dbRef    = useRef<SQLite.SQLiteDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // ── Open + migrate on mount ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        dbRef.current = db;
        await db.execAsync(CREATE_TABLE);
        setIsReady(true);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      }
    })();

    return () => {
      // expo-sqlite v14+ closes automatically; explicit close optional
      dbRef.current?.closeAsync().catch(() => {});
    };
  }, []);

  // ── insertUser ─────────────────────────────────────────────────────────────
  const insertUser = async (data: UserRecord): Promise<number> => {
    const db = dbRef.current;
    if (!db) throw new Error('Database not ready');

    const result = await db.runAsync(
      `INSERT INTO users
         (full_name, sector, role, medical_history, health_conditions,
          disabilities, experience_level, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.full_name,
        data.sector,
        data.role,
        data.medical_history,
        data.health_conditions,
        data.disabilities,
        data.experience_level ?? null,
        Date.now(),
      ]
    );

    return result.lastInsertRowId;
  };

  // ── getUser — returns the most recent user row ─────────────────────────────
  const getUser = async (): Promise<UserRecord | null> => {
    const db = dbRef.current;
    if (!db) return null;
    const row = await db.getFirstAsync<UserRecord>(
      `SELECT * FROM users ORDER BY id DESC LIMIT 1`
    );
    return row ?? null;
  };

  return { isReady, error, insertUser, getUser };
}
