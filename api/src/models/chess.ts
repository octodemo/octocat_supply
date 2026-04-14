/**
 * @swagger
 * components:
 *   schemas:
 *     ChessDailyPuzzle:
 *       type: object
 *       required:
 *         - title
 *         - url
 *         - publishTime
 *         - fen
 *         - pgn
 *         - solutionMoves
 *       properties:
 *         title:
 *           type: string
 *           description: Puzzle title returned by Chess.com Published Data API.
 *         url:
 *           type: string
 *           description: URL to the puzzle page on Chess.com.
 *         publishTime:
 *           type: integer
 *           description: Unix timestamp when the puzzle was published.
 *         fen:
 *           type: string
 *           description: Initial board position in FEN format.
 *         pgn:
 *           type: string
 *           description: Full PGN line from Chess.com.
 *         image:
 *           type: string
 *           nullable: true
 *           description: Optional image URL for the puzzle.
 *         solutionMoves:
 *           type: array
 *           items:
 *             type: string
 *           description: Sequence of SAN moves extracted from PGN used for move validation.
 *     ChessSpeedStats:
 *       type: object
 *       required:
 *         - wins
 *         - losses
 *         - draws
 *       properties:
 *         lastRating:
 *           type: integer
 *           nullable: true
 *         bestRating:
 *           type: integer
 *           nullable: true
 *         wins:
 *           type: integer
 *         losses:
 *           type: integer
 *         draws:
 *           type: integer
 *     ChessPlayerStats:
 *       type: object
 *       required:
 *         - username
 *       properties:
 *         username:
 *           type: string
 *         rapid:
 *           allOf:
 *             - $ref: '#/components/schemas/ChessSpeedStats'
 *           nullable: true
 *         blitz:
 *           allOf:
 *             - $ref: '#/components/schemas/ChessSpeedStats'
 *           nullable: true
 *         bullet:
 *           allOf:
 *             - $ref: '#/components/schemas/ChessSpeedStats'
 *           nullable: true
 */

export interface ChessDailyPuzzle {
  title: string;
  url: string;
  publishTime: number;
  fen: string;
  pgn: string;
  image: string | null;
  solutionMoves: string[];
}

export interface ChessSpeedStats {
  lastRating: number | null;
  bestRating: number | null;
  wins: number;
  losses: number;
  draws: number;
}

export interface ChessPlayerStats {
  username: string;
  rapid: ChessSpeedStats | null;
  blitz: ChessSpeedStats | null;
  bullet: ChessSpeedStats | null;
}