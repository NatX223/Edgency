import * as SQLite from 'expo-sqlite';
import { useRef } from 'react';

export type LogActionType =
  | 'log_entry'
  | 'broadcast_coordinates'
  | 'step_done'
  | 'model_load_start'
  | 'model_load_complete'
  | 'model_load_error'
  | 'image_selected'
  | 'inference_start'
  | 'inference_complete'
  | 'tool_executed';

export interface LogEntry {
  id?: number;
  sessionId: string;
  timestamp: string;
  actionType: LogActionType;
  message: string;
  lat?: number;
  lng?: number;
  metadata?: Record<string, unknown>;
}

interface IncidentLogHook {
  sessionId: string;
  logAction: (entry: Omit<LogEntry, 'id' | 'sessionId' | 'timestamp'>) => Promise<void>;
  getSessionLog: () => Promise<LogEntry[]>;
  getAllLogs: () => Promise<LogEntry[]>;
}

const INIT_SQL = `
  CREATE TABLE IF NOT EXISTS incident_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL,
    timestamp   TEXT NOT NULL,
    action_type TEXT NOT NULL,
    message     TEXT NOT NULL,
    lat         REAL,
    lng         REAL,
    metadata    TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  )
`;

export function useIncidentLog(): IncidentLogHook {
  const sessionId = useRef(Date.now().toString(36) + Math.random().toString(36).slice(2)).current;
  const dbRef = useRef<SQLite.SQLiteDatabase | null>(null);

  const getDb = async () => {
    if (dbRef.current) return dbRef.current;
    const db = await SQLite.openDatabaseAsync('edgency.db');
    await db.execAsync(INIT_SQL);
    // Migration: add metadata column for existing installs (no-op on fresh ones)
    try { await db.execAsync(`ALTER TABLE incident_log ADD COLUMN metadata TEXT`); } catch (_) {}
    dbRef.current = db;
    return db;
  };

  const logAction = async (entry: Omit<LogEntry, 'id' | 'sessionId' | 'timestamp'>) => {
    try {
      const db = await getDb();
      const metaJson = entry.metadata ? JSON.stringify(entry.metadata) : null;
      await db.runAsync(
        `INSERT INTO incident_log (session_id, timestamp, action_type, message, lat, lng, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sessionId, new Date().toISOString(), entry.actionType, entry.message, entry.lat ?? null, entry.lng ?? null, metaJson]
      );
    } catch (e) {
      console.warn('[IncidentLog] write failed:', e);
    }
  };

  const parseRow = (r: Record<string, any>): LogEntry => ({
    id: r.id,
    sessionId: r.session_id,
    timestamp: r.timestamp,
    actionType: r.action_type as LogEntry['actionType'],
    message: r.message,
    lat: r.lat,
    lng: r.lng,
    metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
  });

  const getSessionLog = async (): Promise<LogEntry[]> => {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<Record<string, any>>(
        `SELECT * FROM incident_log WHERE session_id = ? ORDER BY id ASC`,
        [sessionId]
      );
      return rows.map(parseRow);
    } catch {
      return [];
    }
  };

  const getAllLogs = async (): Promise<LogEntry[]> => {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<Record<string, any>>(
        `SELECT * FROM incident_log ORDER BY id ASC`
      );
      return rows.map(parseRow);
    } catch {
      return [];
    }
  };

  return { sessionId, logAction, getSessionLog, getAllLogs };
}
