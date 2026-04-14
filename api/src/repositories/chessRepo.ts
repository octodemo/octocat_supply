import { DatabaseConnection, getDatabase } from '../db/sqlite';
import { handleDatabaseError } from '../utils/errors';

interface CacheRow {
  payload: string;
  cached_at: string;
}

export class ChessRepository {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async getCache<T>(key: string, maxAgeMs: number): Promise<T | null> {
    try {
      const row = await this.db.get<CacheRow>('SELECT payload, cached_at FROM chess_api_cache WHERE cache_key = ?', [key]);
      if (!row) {
        return null;
      }

      const cachedAt = Date.parse(row.cached_at);
      if (Number.isNaN(cachedAt) || Date.now() - cachedAt > maxAgeMs) {
        return null;
      }

      return JSON.parse(row.payload) as T;
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async setCache<T>(key: string, payload: T): Promise<void> {
    try {
      await this.db.run(
        `INSERT INTO chess_api_cache (cache_key, payload, cached_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(cache_key) DO UPDATE SET
           payload = excluded.payload,
           cached_at = excluded.cached_at`,
        [key, JSON.stringify(payload)],
      );
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}

export async function createChessRepository(isTest: boolean = false): Promise<ChessRepository> {
  const db = await getDatabase(isTest);
  return new ChessRepository(db);
}

let chessRepo: ChessRepository | null = null;

export async function getChessRepository(isTest: boolean = false): Promise<ChessRepository> {
  const isTestEnv = isTest || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
  if (isTestEnv) {
    return createChessRepository(true);
  }

  if (!chessRepo) {
    chessRepo = await createChessRepository(false);
  }

  return chessRepo;
}