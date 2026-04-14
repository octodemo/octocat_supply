import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import chessRouter from './chess';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { errorHandler } from '../utils/errors';

let app: express.Express;

describe('Chess API', () => {
  beforeEach(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    app = express();
    app.use(express.json());
    app.use('/chess', chessRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await closeDatabase();
  });

  it('returns daily puzzle and uses cache on subsequent request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        title: 'Daily Puzzle',
        url: 'https://www.chess.com/puzzles/problem/1',
        publish_time: 1713091200,
        fen: '6k1/5ppp/8/8/8/8/6PP/6K1 w - - 0 1',
        pgn: '1. Kg2 Kg8 2. Kf3 Kf8 1-0',
        image: 'https://images.chesscomfiles.com/daily_puzzle.jpg',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const first = await request(app).get('/chess/daily');
    expect(first.status).toBe(200);
    expect(first.body.title).toBe('Daily Puzzle');
    expect(first.body.solutionMoves).toEqual(['Kg2', 'Kg8', 'Kf3', 'Kf8']);

    const second = await request(app).get('/chess/daily');
    expect(second.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns player stats for valid username', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          chess_rapid: {
            last: { rating: 1522 },
            best: { rating: 1601 },
            record: { win: 40, loss: 10, draw: 2 },
          },
          chess_blitz: {
            last: { rating: 1450 },
            best: { rating: 1499 },
            record: { win: 27, loss: 20, draw: 3 },
          },
          chess_bullet: {
            last: { rating: 1300 },
            best: { rating: 1350 },
            record: { win: 11, loss: 15, draw: 1 },
          },
        }),
      }),
    );

    const response = await request(app).get('/chess/player/Hikaru/stats');
    expect(response.status).toBe(200);
    expect(response.body.username).toBe('hikaru');
    expect(response.body.rapid.lastRating).toBe(1522);
    expect(response.body.blitz.bestRating).toBe(1499);
  });

  it('returns 400 for invalid username', async () => {
    const response = await request(app).get('/chess/player/ab!/stats');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});