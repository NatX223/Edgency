import * as SQLite from 'expo-sqlite';
import { useRef } from 'react';

export interface LogEntry {
  id?: number;
  sessionId: string;
  timestamp: string;
  actionType: 'log_entry' | 'broadcast_coordinates' | 'step_done';
  message: string;
  lat?: number;
  lng?: number;
}

interface IncidentLogHook {
  sessionId: string;
  logAction: (entry: Omit<LogEntry, 'id' | 'sessionId' | 'timestamp'>) => Promise<void>;
  getSessionLog: () => Promise<LogEntry[]>;
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
    dbRef.current = db;
    return db;
  };

  const logAction = async (entry: Omit<LogEntry, 'id' | 'sessionId' | 'timestamp'>) => {
    try {
      const db = await getDb();
      await db.runAsync(
        `INSERT INTO incident_log (session_id, timestamp, action_type, message, lat, lng) VALUES (?, ?, ?, ?, ?, ?)`,
        [sessionId, new Date().toISOString(), entry.actionType, entry.message, entry.lat ?? null, entry.lng ?? null]
      );
    } catch (e) {
      console.warn('[IncidentLog] write failed:', e);
    }
  };

  const getSessionLog = async (): Promise<LogEntry[]> => {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<Record<string, any>>(
        `SELECT * FROM incident_log WHERE session_id = ? ORDER BY id ASC`,
        [sessionId]
      );
      return rows.map(r => ({
        id: r.id,
        sessionId: r.session_id,
        timestamp: r.timestamp,
        actionType: r.action_type as LogEntry['actionType'],
        message: r.message,
        lat: r.lat,
        lng: r.lng,
      }));
    } catch {
      return [];
    }
  };

  return { sessionId, logAction, getSessionLog };
}
