import { useMemo, useState } from 'react';
import axios from 'axios';
import { useQuery } from 'react-query';
import { Chess, type PieceSymbol, type Square } from 'chess.js';
import { api } from '../../api/config';
import { useTheme } from '../../context/ThemeContext';

interface ChessDailyPuzzle {
  title: string;
  url: string;
  publishTime: number;
  fen: string;
  pgn: string;
  image: string | null;
  solutionMoves: string[];
}

interface ChessSpeedStats {
  lastRating: number | null;
  bestRating: number | null;
  wins: number;
  losses: number;
  draws: number;
}

interface ChessPlayerStats {
  username: string;
  rapid: ChessSpeedStats | null;
  blitz: ChessSpeedStats | null;
  bullet: ChessSpeedStats | null;
}

// Unicode chess piece symbols – filled variants to ensure crisp rendering at any size.
const PIECE_SYMBOL: Record<PieceSymbol, string> = {
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
};

// Inline styles per side so pieces stay readable on both light and dark squares.
const WHITE_PIECE_STYLE: React.CSSProperties = {
  color: '#ffffff',
  textShadow: '0 0 3px #000, 0 1px 4px rgba(0,0,0,0.9)',
  lineHeight: 1,
  userSelect: 'none',
};

const BLACK_PIECE_STYLE: React.CSSProperties = {
  color: '#111111',
  textShadow: '0 0 3px rgba(255,255,255,0.8), 0 1px 4px rgba(255,255,255,0.5)',
  lineHeight: 1,
  userSelect: 'none',
};

const BOARD_RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;
const BOARD_FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

const fetchDailyPuzzle = async (): Promise<ChessDailyPuzzle> => {
  const { data } = await axios.get(`${api.baseURL}${api.endpoints.chessDaily}`);
  return data;
};

const fetchPlayerStats = async (username: string): Promise<ChessPlayerStats> => {
  const { data } = await axios.get(`${api.baseURL}${api.endpoints.chessPlayerStats(username)}`);
  return data;
};

function ChessBoard({
  game,
  selectedSquare,
  onSquareClick,
  darkMode,
  isAutoPlaying,
}: {
  game: Chess;
  selectedSquare: Square | null;
  onSquareClick: (square: Square) => void;
  darkMode: boolean;
  isAutoPlaying: boolean;
}) {
  return (
    <div className={`grid grid-cols-8 rounded-xl overflow-hidden border border-primary/30 shadow-lg transition-opacity ${isAutoPlaying ? 'opacity-60 cursor-wait' : ''}`}>
      {BOARD_RANKS.map((rank) =>
        BOARD_FILES.map((file) => {
          const square = `${file}${rank}` as Square;
          const piece = game.get(square);
          const isDarkSquare = (BOARD_FILES.indexOf(file) + rank) % 2 === 0;
          const isSelected = selectedSquare === square;

          return (
            <button
              key={square}
              type="button"
              onClick={() => onSquareClick(square)}
              className={`aspect-square flex items-center justify-center text-3xl sm:text-4xl transition-colors ${
                isDarkSquare
                  ? darkMode
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-green-700/70 hover:bg-green-700/90'
                  : darkMode
                    ? 'bg-gray-200 hover:bg-gray-300'
                    : 'bg-green-100 hover:bg-green-200'
              } ${isSelected ? 'ring-2 ring-inset ring-primary' : ''}`}
              aria-label={`${piece ? (piece.color === 'w' ? 'White' : 'Black') + ' ' + piece.type : 'empty'} on ${square}`}
            >
              {piece ? (
                <span style={piece.color === 'w' ? WHITE_PIECE_STYLE : BLACK_PIECE_STYLE}>
                  {PIECE_SYMBOL[piece.type]}
                </span>
              ) : null}
            </button>
          );
        }),
      )}
    </div>
  );
}

function StatsCard({
  title,
  stats,
  darkMode,
}: {
  title: string;
  stats: ChessSpeedStats | null;
  darkMode: boolean;
}) {
  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 shadow-md border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      {stats ? (
        <div className="space-y-1 text-sm">
          <p>Last rating: {stats.lastRating ?? 'N/A'}</p>
          <p>Best rating: {stats.bestRating ?? 'N/A'}</p>
          <p>
            Record: {stats.wins}W / {stats.losses}L / {stats.draws}D
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-500">Brak danych dla tego tempa gry.</p>
      )}
    </div>
  );
}

export default function ChessDaily() {
  const { darkMode } = useTheme();
  const [username, setUsername] = useState('hikaru');
  const [submittedUsername, setSubmittedUsername] = useState('hikaru');
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [progressIndex, setProgressIndex] = useState(0);
  // resetKey forces useMemo to rebuild the game instance even when progressIndex did not change
  // (e.g. wrong first move mutated the object, or explicit reset while already at step 0).
  const [resetKey, setResetKey] = useState(0);
  // Blocks user input while the auto-response animation plays.
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const {
    data: puzzle,
    isLoading: puzzleLoading,
    error: puzzleError,
  } = useQuery('chessDaily', fetchDailyPuzzle, {
    staleTime: 1000 * 60 * 30,
  });

  const game = useMemo(() => {
    if (!puzzle) {
      return new Chess();
    }

    const instance = new Chess();
    instance.load(puzzle.fen);

    // Replay the validated sequence to the current progress state.
    for (let index = 0; index < progressIndex; index += 1) {
      const san = puzzle.solutionMoves[index];
      if (!san) {
        break;
      }
      instance.move(san);
    }

    return instance;
  }, [puzzle, progressIndex, resetKey]);

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery(['chessPlayerStats', submittedUsername], () => fetchPlayerStats(submittedUsername), {
    enabled: submittedUsername.trim().length >= 3,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const onSquareClick = (square: Square) => {
    if (!puzzle || progressIndex >= puzzle.solutionMoves.length || isAutoPlaying) {
      return;
    }

    if (!selectedSquare) {
      const piece = game.get(square);
      if (!piece || piece.color !== game.turn()) {
        setFeedback('Wybierz pionek strony, ktora ma ruch.');
        return;
      }
      setSelectedSquare(square);
      setFeedback('Wybierz pole docelowe.');
      return;
    }

    if (selectedSquare === square) {
      setSelectedSquare(null);
      setFeedback('Anulowano wybor pola.');
      return;
    }

    const moveResult = game.move({
      from: selectedSquare,
      to: square,
      promotion: 'q',
    });

    if (!moveResult) {
      setFeedback('Ten ruch jest nielegalny.');
      setSelectedSquare(null);
      return;
    }

    const expectedMove = puzzle.solutionMoves[progressIndex];
    if (moveResult.san === expectedMove) {
      const userMoveIndex = progressIndex;
      const afterUserIndex = userMoveIndex + 1;
      setProgressIndex(afterUserIndex);
      setSelectedSquare(null);

      // If there is an opponent response in the sequence, auto-play it after a short delay.
      const hasResponse = afterUserIndex < puzzle.solutionMoves.length;
      if (hasResponse) {
        setIsAutoPlaying(true);
        setFeedback('Odpowiedź przeciwnika...');
        setTimeout(() => {
          setProgressIndex(afterUserIndex + 1);
          setIsAutoPlaying(false);
          setFeedback(
            afterUserIndex + 1 >= puzzle.solutionMoves.length ? '' : 'Twój ruch!',
          );
        }, 650);
      } else {
        // Last move in the sequence — puzzle solved.
        setFeedback('');
      }
    } else {
      // Wrong move — rebuild board to undo the mutation (same progressIndex, bumped resetKey).
      setResetKey((k) => k + 1);
      setFeedback(`Zly ruch. Oczekiwany: ${expectedMove}`);
      setSelectedSquare(null);
    }
  };

  const resetAttempt = () => {
    setSelectedSquare(null);
    setProgressIndex(0);
    setResetKey((k) => k + 1);
    setFeedback('');
  };

  if (puzzleLoading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-dark text-light' : 'bg-gray-100 text-gray-800'} pt-24 px-4`}>
        <div className="max-w-6xl mx-auto">
          <p className="text-center">Ladowanie zadania dziennego...</p>
        </div>
      </div>
    );
  }

  if (puzzleError || !puzzle) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-dark text-light' : 'bg-gray-100 text-gray-800'} pt-24 px-4`}>
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-red-500">Nie udalo sie pobrac zadania z Chess.com.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-dark text-light' : 'bg-gray-100 text-gray-800'} pt-24 pb-12 px-4 transition-colors duration-300`}>
      <div className="max-w-6xl mx-auto space-y-8">
        <section className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6`}>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/2 space-y-4">
              <h1 className="text-3xl font-bold">Chess.com Daily Challenge</h1>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{puzzle.title}</p>
              <p className="text-sm">Publikacja: {new Date(puzzle.publishTime * 1000).toLocaleString()}</p>
              <p className="text-sm break-all">FEN: {puzzle.fen}</p>
              <p className="text-sm">Postep: {Math.min(progressIndex, puzzle.solutionMoves.length)} / {puzzle.solutionMoves.length}</p>

              {progressIndex >= puzzle.solutionMoves.length ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/15 text-primary font-semibold text-sm">
                  ★ Rozwiazanie poprawne!
                </div>
              ) : (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold ${
                  game.turn() === 'w'
                    ? 'bg-white border border-gray-300 text-gray-800'
                    : 'bg-gray-800 border border-gray-600 text-white'
                }`}>
                  <span
                    className="inline-block w-4 h-4 rounded-full border border-gray-400"
                    style={{ background: game.turn() === 'w' ? '#fff' : '#111' }}
                    aria-hidden="true"
                  />
                  Ruch: {game.turn() === 'w' ? 'Bialy' : 'Czarny'}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={resetAttempt}
                  className="px-4 py-2 rounded-md bg-primary text-white hover:bg-accent transition-colors"
                >
                  Resetuj probe
                </button>
                <a
                  href={puzzle.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`px-4 py-2 rounded-md border ${darkMode ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'} transition-colors`}
                >
                  Otworz na Chess.com
                </a>
              </div>
              {feedback && (
                <p className={`text-sm rounded-md px-3 py-2 ${feedback.startsWith('Poprawny') ? 'bg-primary/15 text-primary' : 'bg-red-500/15 text-red-400'}`}>
                  {feedback}
                </p>
              )}
            </div>
            <div className="lg:w-1/2">
              <ChessBoard
                game={game}
                selectedSquare={selectedSquare}
                onSquareClick={onSquareClick}
                darkMode={darkMode}
                isAutoPlaying={isAutoPlaying}
              />
            </div>
          </div>
        </section>

        <section className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl shadow-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-6`}>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
            <div className="flex-1">
              <label htmlFor="chess-username" className="block text-sm font-medium mb-2">
                Sprawdz statystyki gracza Chess.com
              </label>
              <input
                id="chess-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className={`w-full px-3 py-2 rounded-md border ${darkMode ? 'bg-gray-800 border-gray-700 text-light' : 'bg-white border-gray-300 text-gray-800'} focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none`}
                placeholder="np. hikaru"
              />
            </div>
            <button
              type="button"
              onClick={() => setSubmittedUsername(username.trim())}
              className="px-4 py-2 rounded-md bg-primary text-white hover:bg-accent transition-colors"
            >
              Pobierz statystyki
            </button>
          </div>

          {statsLoading && <p>Ladowanie statystyk...</p>}
          {Boolean(statsError) && (
            <p className="text-red-500 text-sm">Nie udalo sie pobrac statystyk. Sprawdz nazwe uzytkownika.</p>
          )}

          {stats && (
            <div className="space-y-4">
              <p className="text-sm">
                Uzytkownik: <span className="font-semibold">{stats.username}</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard title="Rapid" stats={stats.rapid} darkMode={darkMode} />
                <StatsCard title="Blitz" stats={stats.blitz} darkMode={darkMode} />
                <StatsCard title="Bullet" stats={stats.bullet} darkMode={darkMode} />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
