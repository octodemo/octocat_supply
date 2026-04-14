/**
 * @swagger
 * tags:
 *   name: Chess
 *   description: Chess.com integration endpoints (daily puzzle and player stats)
 */

/**
 * @swagger
 * /api/chess/daily:
 *   get:
 *     summary: Returns daily puzzle data from Chess.com (cached)
 *     tags: [Chess]
 *     responses:
 *       200:
 *         description: Daily puzzle payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChessDailyPuzzle'
 *
 * /api/chess/player/{username}/stats:
 *   get:
 *     summary: Returns player stats (rapid/blitz/bullet) from Chess.com (cached)
 *     tags: [Chess]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Chess.com username
 *     responses:
 *       200:
 *         description: Player stats
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChessPlayerStats'
 *       400:
 *         description: Invalid username
 */

import express from 'express';
import { DB_CONFIG } from '../db/config';
import { getChessRepository } from '../repositories/chessRepo';
import { fetchDailyPuzzle, fetchPlayerStats } from '../utils/chessApi';
import { ValidationError } from '../utils/errors';
import { ChessDailyPuzzle, ChessPlayerStats } from '../models/chess';

const router = express.Router();

router.get('/daily', async (_req, res, next) => {
  try {
    const repo = await getChessRepository();
    const cached = await repo.getCache<ChessDailyPuzzle>('daily-puzzle', DB_CONFIG.CHESS_DAILY_TTL_MS);
    if (cached) {
      res.json(cached);
      return;
    }

    const puzzle = await fetchDailyPuzzle();
    await repo.setCache('daily-puzzle', puzzle);
    res.json(puzzle);
  } catch (error) {
    next(error);
  }
});

router.get('/player/:username/stats', async (req, res, next) => {
  try {
    const username = req.params.username?.trim();
    if (!username || !/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
      throw new ValidationError('Username must be 3-30 characters and contain letters, numbers, underscore or hyphen');
    }

    const key = `player-stats:${username.toLowerCase()}`;
    const repo = await getChessRepository();
    const cached = await repo.getCache<ChessPlayerStats>(key, DB_CONFIG.CHESS_PLAYER_STATS_TTL_MS);
    if (cached) {
      res.json(cached);
      return;
    }

    const stats = await fetchPlayerStats(username);
    await repo.setCache(key, stats);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

export default router;