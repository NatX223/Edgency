import * as SQLite from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';

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

// ─── Chat session shape ───────────────────────────────────────────────────────
export interface ChatSession {
  id: number;
  incident_type: string | null;
  incident_title: string | null;
  messages_json: string;  // JSON.stringify(Message[])
  created_at: number;
  updated_at: number;
}

export interface DatabaseState {
  isReady: boolean;
  error: string | null;
  // User
  insertUser: (data: UserRecord) => Promise<number>;
  getUser: () => Promise<UserRecord | null>;
  // Chat sessions
  saveSession: (params: {
    id?: number | null;
    incidentType: string | null;
    incidentTitle: string | null;
    messagesJson: string;
  }) => Promise<number>;
  getLatestSession: (incidentType: string | null) => Promise<ChatSession | null>;
  getAllSessions: () => Promise<ChatSession[]>;
  getSessionById: (id: number) => Promise<ChatSession | null>;
}

const DB_NAME = 'edgency.db';

const INIT_SQL = `
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

  CREATE TABLE IF NOT EXISTS chat_sessions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_type  TEXT,
    incident_title TEXT,
    messages_json  TEXT    NOT NULL DEFAULT '[]',
    created_at     INTEGER NOT NULL,
    updated_at     INTEGER NOT NULL
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
        await db.execAsync(INIT_SQL);
        setIsReady(true);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      }
    })();

    return () => {
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

  // ── saveSession — upsert a chat session ───────────────────────────────────
  const saveSession = async (params: {
    id?: number | null;
    incidentType: string | null;
    incidentTitle: string | null;
    messagesJson: string;
  }): Promise<number> => {
    const db = dbRef.current;
    if (!db) throw new Error('Database not ready');

    const now = Date.now();

    if (params.id) {
      await db.runAsync(
        `UPDATE chat_sessions
         SET messages_json = ?, incident_type = ?, incident_title = ?, updated_at = ?
         WHERE id = ?`,
        [params.messagesJson, params.incidentType ?? null, params.incidentTitle ?? null, now, params.id]
      );
      return params.id;
    }

    const result = await db.runAsync(
      `INSERT INTO chat_sessions (incident_type, incident_title, messages_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [params.incidentType ?? null, params.incidentTitle ?? null, params.messagesJson, now, now]
    );
    return result.lastInsertRowId;
  };

  // ── getLatestSession — most recent session for a given incident type ───────
  const getLatestSession = async (incidentType: string | null): Promise<ChatSession | null> => {
    const db = dbRef.current;
    if (!db) return null;

    let row: ChatSession | null | undefined;
    if (incidentType === null) {
      row = await db.getFirstAsync<ChatSession>(
        `SELECT * FROM chat_sessions WHERE incident_type IS NULL ORDER BY updated_at DESC LIMIT 1`
      );
    } else {
      row = await db.getFirstAsync<ChatSession>(
        `SELECT * FROM chat_sessions WHERE incident_type = ? ORDER BY updated_at DESC LIMIT 1`,
        [incidentType]
      );
    }
    return row ?? null;
  };

  // ── getAllSessions — full list ordered newest-first (for history screen) ───
  const getAllSessions = async (): Promise<ChatSession[]> => {
    const db = dbRef.current;
    if (!db) return [];
    const rows = await db.getAllAsync<ChatSession>(
      `SELECT * FROM chat_sessions ORDER BY updated_at DESC`
    );
    return rows;
  };

  // ── getSessionById — load one specific session by primary key ─────────────
  const getSessionById = async (id: number): Promise<ChatSession | null> => {
    const db = dbRef.current;
    if (!db) return null;
    const row = await db.getFirstAsync<ChatSession>(
      `SELECT * FROM chat_sessions WHERE id = ?`,
      [id]
    );
    return row ?? null;
  };

  return { isReady, error, insertUser, getUser, saveSession, getLatestSession, getAllSessions, getSessionById };
}
