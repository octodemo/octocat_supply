import { DB_CONFIG } from '../db/config';
import { ExternalServiceError, ValidationError } from './errors';
import { ChessDailyPuzzle, ChessPlayerStats, ChessSpeedStats } from '../models/chess';

interface ChessDailyPuzzleRaw {
  title?: unknown;
  url?: unknown;
  publish_time?: unknown;
  fen?: unknown;
  pgn?: unknown;
  image?: unknown;
}

interface ChessPlayerStatsRawSection {
  last?: { rating?: unknown };
  best?: { rating?: unknown };
  record?: { win?: unknown; loss?: unknown; draw?: unknown };
}

interface ChessPlayerStatsRaw {
  chess_rapid?: ChessPlayerStatsRawSection;
  chess_blitz?: ChessPlayerStatsRawSection;
  chess_bullet?: ChessPlayerStatsRawSection;
}

function sanitizePgn(pgn: string): string[] {
  const withoutHeaders = pgn
    .split('\n')
    .filter((line) => !line.trim().startsWith('['))
    .join(' ')
    .replace(/\{[^}]*\}/g, ' ')
    // Match move numbers for both white (e.g. "1.") and black (e.g. "1...").
    // \d+\.{1,3} covers "1.", "2." and "1...", "2..." correctly.
    .replace(/\d+\.{1,3}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return withoutHeaders
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .filter((token) => token !== '1-0' && token !== '0-1' && token !== '1/2-1/2' && token !== '*');
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DB_CONFIG.CHESS_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new ValidationError('Requested Chess.com resource was not found');
      }
      throw new ExternalServiceError(`Chess.com returned HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof ExternalServiceError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ExternalServiceError('Chess.com request timed out');
    }

    throw new ExternalServiceError('Failed to call Chess.com API');
  } finally {
    clearTimeout(timeoutId);
  }
}

function toInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  return null;
}

function mapSpeedStats(source?: ChessPlayerStatsRawSection): ChessSpeedStats | null {
  if (!source) {
    return null;
  }

  return {
    lastRating: toInt(source.last?.rating),
    bestRating: toInt(source.best?.rating),
    wins: toInt(source.record?.win) ?? 0,
    losses: toInt(source.record?.loss) ?? 0,
    draws: toInt(source.record?.draw) ?? 0,
  };
}

export async function fetchDailyPuzzle(): Promise<ChessDailyPuzzle> {
  const data = await fetchJson<ChessDailyPuzzleRaw>(`${DB_CONFIG.CHESS_API_URL}/puzzle`);

  if (
    typeof data.title !== 'string' ||
    typeof data.url !== 'string' ||
    typeof data.publish_time !== 'number' ||
    typeof data.fen !== 'string' ||
    typeof data.pgn !== 'string'
  ) {
    throw new ExternalServiceError('Chess.com returned an unexpected daily puzzle payload');
  }

  const solutionMoves = sanitizePgn(data.pgn);
  if (solutionMoves.length === 0) {
    throw new ExternalServiceError('Chess.com puzzle payload contains no moves to validate');
  }

  return {
    title: data.title,
    url: data.url,
    publishTime: data.publish_time,
    fen: data.fen,
    pgn: data.pgn,
    image: typeof data.image === 'string' ? data.image : null,
    solutionMoves,
  };
}

export async function fetchPlayerStats(username: string): Promise<ChessPlayerStats> {
  const normalizedUsername = username.trim().toLowerCase();
  const data = await fetchJson<ChessPlayerStatsRaw>(
    `${DB_CONFIG.CHESS_API_URL}/player/${normalizedUsername}/stats`,
  );

  return {
    username: normalizedUsername,
    rapid: mapSpeedStats(data.chess_rapid),
    blitz: mapSpeedStats(data.chess_blitz),
    bullet: mapSpeedStats(data.chess_bullet),
  };
}