/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Book, 
  Coffee, 
  CupSoda, 
  BookOpen, 
  Library, 
  Moon, 
  Sun, 
  PenTool, 
  Bookmark, 
  Glasses, 
  Cake,
  RotateCcw,
  Trophy,
  Settings as SettingsIcon,
  Play,
  Heart,
  Timer,
  Volume2,
  VolumeX
} from 'lucide-react';

// --- Types ---
type GameMode = 'matching' | 'counting';
type Difficulty = 'easy' | 'medium' | 'hard';
type GameType = 'single' | 'pvp' | 'pvc';

interface CardData {
  id: number;
  value: string | number;
  icon: React.ReactNode;
  isFlipped: boolean;
  isMatched: boolean;
  countLabel?: number; // Used for counting mode
}

// --- Constants ---
const THEME = {
  bg: "bg-[#FFF9F2] border-4 md:border-8 border-pink-100",
  container: "bg-[#FFF9F2] font-sans flex flex-col items-center",
  cardBack: "bg-yellow-400 border-4 border-yellow-300 shadow-lg",
  cardFront: "bg-pink-500 border-4 border-pink-400 shadow-lg",
  accentPink: "text-pink-600",
  accentYellow: "text-yellow-500",
  buttonPink: "bg-pink-500 hover:bg-pink-600 text-white shadow-lg rounded-2xl font-bold uppercase",
  buttonYellow: "bg-yellow-400 hover:bg-yellow-500 text-pink-900 shadow-lg rounded-2xl font-bold uppercase",
  statBoxPink: "bg-white border-2 border-pink-200 rounded-3xl p-4 shadow-sm",
  statBoxYellow: "bg-white border-2 border-yellow-200 rounded-3xl p-4 shadow-sm",
  headerText: "text-pink-600 font-black uppercase tracking-tight",
};

const ICONS = [
  { icon: <Book size={32} />, label: "Book" },
  { icon: <Coffee size={32} />, label: "Latte" },
  { icon: <BookOpen size={32} />, label: "Open Book" },
  { icon: <Library size={32} />, label: "Library" },
  { icon: <CupSoda size={32} />, label: "Iced Coffee" },
  { icon: <Moon size={32} />, label: "Night Read" },
  { icon: <Sun size={32} />, label: "Early Morning Brew" },
  { icon: <PenTool size={32} />, label: "Ink & Pen" },
  { icon: <Bookmark size={32} />, label: "Marker" },
  { icon: <Glasses size={32} />, label: "Spectacles" },
  { icon: <Cake size={32} />, label: "Cafe Treat" },
];

const TURN_LIMITS: Record<Difficulty, number | null> = {
  easy: null, // Unlimited
  medium: 30,
  hard: 20,
};

// --- Components ---

const Card = ({ card, onClick }: { card: CardData; onClick: () => void }) => {
  return (
    <div 
      className="relative w-full aspect-[3/4] cursor-pointer perspective-1000"
      onClick={onClick}
    >
      <motion.div
        className="w-full h-full relative preserve-3d"
        animate={{ rotateY: card.isFlipped || card.isMatched ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
      >
        {/* Card Back */}
        <div className={`absolute inset-0 w-full h-full backface-hidden rounded-2xl ${THEME.cardBack} flex items-center justify-center`}>
          <div className="text-pink-600 text-4xl font-black italic">L</div>
        </div>

        {/* Card Front */}
        <div 
          className={`absolute inset-0 w-full h-full backface-hidden rounded-2xl ${THEME.cardFront} flex flex-col items-center justify-center gap-2 rotate-y-180`}
        >
          <div className="text-white">
            {card.icon}
          </div>
          {card.countLabel !== undefined && (
            <span className="text-xs font-bold text-pink-700 bg-white px-2 py-0.5 rounded-full">
              {card.countLabel}
            </span>
          )}
          {typeof card.value === 'number' && (
             <span className="text-2xl font-black text-white">
               {card.value}
             </span>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [cards, setCards] = useState<CardData[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [mode, setMode] = useState<GameMode>('matching');
  const [gameType, setGameType] = useState<GameType>('single');
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [isComputerThinking, setIsComputerThinking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Sound helper
  const playSound = useCallback((type: 'flip' | 'match' | 'mismatch' | 'win' | 'lose') => {
    if (isMuted) return;
    const sounds = {
      flip: 'https://www.soundjay.com/button/button-16.mp3',
      match: 'https://www.soundjay.com/misc/sounds/success-chime-01.mp3',
      mismatch: 'https://www.soundjay.com/button/button-10.mp3',
      win: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3',
      lose: 'https://www.soundjay.com/button/button-11.mp3'
    };
    const audio = new Audio(sounds[type]);
    audio.play().catch(() => {}); // Catch browser policy blocks
  }, [isMuted]);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('mochaMuseHighScore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const initGame = useCallback(() => {
    const selectedIcons = [...ICONS].slice(0, 11); // 11 pairs needed for 22 cards
    let gameCards: CardData[] = [];

    if (mode === 'matching') {
      const pairs = selectedIcons.flatMap((item, index) => [
        { id: index * 2, value: item.label, icon: item.icon, isFlipped: false, isMatched: false },
        { id: index * 2 + 1, value: item.label, icon: item.icon, isFlipped: false, isMatched: false }
      ]);
      gameCards = pairs;
    } else {
      // Counting mode: Match image icon (with labels 1-11) with numeric value
      const pairs = selectedIcons.flatMap((item, index) => {
        const countValue = index + 1;
        return [
          { id: index * 2, value: `image-${countValue}`, icon: item.icon, countLabel: countValue, isFlipped: false, isMatched: false },
          { id: index * 2 + 1, value: countValue, icon: null, isFlipped: false, isMatched: false }
        ];
      });
      gameCards = pairs;
    }

    // Shuffle
    gameCards.sort(() => Math.random() - 0.5);
    
    setCards(gameCards);
    setMoves(0);
    setScore(0);
    setPlayer1Score(0);
    setPlayer2Score(0);
    setCurrentPlayer(1);
    setFlippedIndices([]);
    setGameStarted(true);
    setGameOver(false);
    setIsWon(false);
    setIsComputerThinking(false);
    setIsProcessing(false);
  }, [mode]);

  const handleCardClick = useCallback((index: number, isAuto: boolean = false) => {
    // If not auto, check if it's the computer's turn or if processing logic
    const isComputerTurn = gameType === 'pvc' && currentPlayer === 2;
    if (!isAuto && (isComputerTurn || isComputerThinking || isProcessing)) return;
    
    // Standard guards
    if (gameOver || cards[index].isFlipped || cards[index].isMatched) return;
    if (flippedIndices.length >= 2) return;

    playSound('flip');

    setCards(prevCards => {
      const newCards = [...prevCards];
      newCards[index] = { ...newCards[index], isFlipped: true };
      return newCards;
    });

    setFlippedIndices(prev => [...prev, index]);
  }, [cards, flippedIndices, isProcessing, isComputerThinking, gameOver, currentPlayer, gameType, playSound]);

  // Handle matching and turn transitions in a side effect to ensure state consistency
  useEffect(() => {
    if (flippedIndices.length === 2 && !isProcessing) {
      setIsProcessing(true);
      const [first, second] = flippedIndices;
      
      // Increment moves if applicable
      if (gameType === 'single' || currentPlayer === 1 || (gameType === 'pvp' && currentPlayer === 2)) {
        setMoves(m => m + 1);
      }

      const isMatch = mode === 'matching' 
        ? cards[first].value === cards[second].value
        : (typeof cards[first].value === 'number' && typeof cards[second].value === 'string' && cards[first].value === cards[second].countLabel) ||
          (typeof cards[second].value === 'number' && typeof cards[first].value === 'string' && cards[second].value === cards[first].countLabel);

      if (isMatch) {
        setTimeout(() => {
          playSound('match');
          setCards(prev => {
            const next = [...prev];
            next[first] = { ...next[first], isMatched: true, isFlipped: false };
            next[second] = { ...next[second], isMatched: true, isFlipped: false };
            return next;
          });
          
          if (gameType === 'single') {
            setScore(s => s + 10);
          } else {
            if (currentPlayer === 1) setPlayer1Score(p => p + 10);
            else setPlayer2Score(p => p + 10);
          }

          setFlippedIndices([]);
          setIsProcessing(false);
        }, 600);
      } else {
        setTimeout(() => {
          playSound('mismatch');
          setCards(prev => {
            const next = [...prev];
            next[first] = { ...next[first], isFlipped: false };
            next[second] = { ...next[second], isFlipped: false };
            return next;
          });

          if (gameType === 'single') {
            setScore(s => Math.max(0, s - 1));
          } else {
            setCurrentPlayer(curr => (curr === 1 ? 2 : 1));
          }

          setFlippedIndices([]);
          setIsProcessing(false);
        }, 1000);
      }
    }
  }, [flippedIndices, cards, mode, gameType, currentPlayer, isProcessing, playSound]);

  // Computer Logic - Robust Turn Execution
  useEffect(() => {
    if (gameType === 'pvc' && currentPlayer === 2 && !gameOver && !isWon && !isProcessing && flippedIndices.length === 0) {
      const executeAiTurn = async () => {
        setIsComputerThinking(true);
        
        // Thinking delay
        await new Promise(r => setTimeout(r, 1500));

        const getUnmatchedIdx = (currentCards: CardData[]) => currentCards
          .map((c, i) => (c.isMatched || c.isFlipped ? -1 : i))
          .filter(i => i !== -1);

        const unmatched = getUnmatchedIdx(cards);
        
        if (unmatched.length > 1) {
          const firstPick = unmatched[Math.floor(Math.random() * unmatched.length)];
          handleCardClick(firstPick, true); // Use isAuto = true
          
          // Wait for first card flip animation
          await new Promise(r => setTimeout(r, 800));
          
          let secondPick: number = -1;
          setCards(latest => {
            const currentUnmatched = getUnmatchedIdx(latest);
            if (currentUnmatched.length > 0) {
              secondPick = currentUnmatched[Math.floor(Math.random() * currentUnmatched.length)];
            }
            return latest;
          });

          if (secondPick !== -1) {
            handleCardClick(secondPick, true); // Use isAuto = true
          }
        }
        setIsComputerThinking(false);
      };
      
      executeAiTurn();
    }
  }, [currentPlayer, gameType, gameOver, isWon, cards, isProcessing, flippedIndices.length, handleCardClick]);

  // Check win condition separately
  useEffect(() => {
    if (cards.length > 0 && cards.every(c => c.isMatched)) {
      setIsWon(true);
      setGameOver(true);
      playSound('win');
    }
  }, [cards, playSound]);

  // LOSS CONDITION: Turn limits for single player
  useEffect(() => {
    const limit = TURN_LIMITS[difficulty];
    if (limit && moves >= limit && !isWon && gameType === 'single') {
      setGameOver(true);
      playSound('lose');
    }
  }, [moves, difficulty, isWon, gameType, playSound]);

  // HIGH SCORE: Update high score on game over
  useEffect(() => {
    if (gameOver) {
      const finalScore = gameType === 'single' ? score : (player1Score > player2Score ? player1Score : player2Score);
      if (finalScore > highScore) {
        setHighScore(finalScore);
        localStorage.setItem('mochaMuseHighScore', finalScore.toString());
      }
    }
  }, [gameOver, gameType, score, player1Score, player2Score, highScore]);

  // Render Rows: 3, 4, 4, 4, 4, 3
  const renderGrid = () => {
    const rows = [
      cards.slice(0, 3),
      cards.slice(3, 7),
      cards.slice(7, 11),
      cards.slice(11, 15),
      cards.slice(15, 19),
      cards.slice(19, 22),
    ];

    return (
      <div className="flex flex-col gap-3 w-full max-w-lg mx-auto py-4">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-3">
            {row.map((card) => {
              const globalIndex = cards.findIndex(c => c.id === card.id);
              return (
                <div key={card.id} className="flex-1 max-w-[80px]">
                  <Card 
                    card={card} 
                    onClick={() => handleCardClick(globalIndex)} 
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  if (!gameStarted) {
    return (
      <div className={`min-h-screen ${THEME.bg} flex items-center justify-center p-6`}>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/90 backdrop-blur-sm p-8 rounded-[40px] shadow-2xl flex flex-col items-center gap-8 max-w-md w-full border-4 border-pink-100 overflow-y-auto max-h-[90vh]"
        >
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-pink-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg border-4 border-pink-400">
              <BookOpen className="text-white" size={40} />
            </div>
            <h1 className="text-4xl font-black text-pink-600 text-center tracking-tighter leading-none uppercase">
              Mocha & <span className="text-yellow-500">Muse</span>
            </h1>
            <p className="text-pink-400 font-bold uppercase tracking-widest text-[10px] mt-2">Memory & Literature Cafe</p>
          </div>

          <div className="w-full space-y-4">
            <div className={THEME.statBoxPink}>
              <label className="text-[10px] font-black text-pink-400 mb-3 block uppercase tracking-widest flex items-center gap-2">
                <Play size={12} className="fill-pink-400" /> Players
              </label>
              <div className="flex flex-col gap-2">
                {(['single', 'pvp', 'pvc'] as GameType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setGameType(t)}
                    className={`w-full py-2 px-4 rounded-xl text-xs font-bold uppercase transition-all ${
                      gameType === t ? 'bg-pink-500 text-white shadow-inner scale-102' : 'bg-white text-pink-300 border border-pink-100'
                    }`}
                  >
                    {t === 'single' ? 'Single Player' : t === 'pvp' ? 'Player vs Player' : 'Player vs Computer'}
                  </button>
                ))}
              </div>
            </div>

            <div className={THEME.statBoxPink}>
              <label className="text-[10px] font-black text-pink-400 mb-3 block uppercase tracking-widest flex items-center gap-2">
                <Coffee size={12} className="fill-pink-400" /> Mode
              </label>
              <div className="flex gap-2">
                {(['matching', 'counting'] as GameMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold uppercase transition-all ${
                      mode === m ? 'bg-pink-500 text-white shadow-inner scale-105' : 'bg-white text-pink-300 border border-pink-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className={THEME.statBoxYellow}>
              <label className="text-[10px] font-black text-yellow-600 mb-3 block uppercase tracking-widest flex items-center gap-2">
                <SettingsIcon size={12} className="fill-yellow-600" /> Difficulty (Single Player)
              </label>
              <div className="flex gap-2">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    disabled={gameType !== 'single'}
                    className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black transition-all ${
                      difficulty === d ? 'bg-yellow-400 text-pink-900 shadow-inner' : 'bg-white text-yellow-600 border border-yellow-200'
                    } ${gameType !== 'single' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {d} {TURN_LIMITS[d] ? `(${TURN_LIMITS[d]})` : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button 
            onClick={initGame}
            className={`${THEME.buttonPink} w-full py-5 text-xl tracking-tighter flex items-center justify-center gap-3 active:scale-95 transition-transform`}
          >
            START BREWING <RotateCcw size={24} />
          </button>
          
          {highScore > 0 && (
            <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest border border-yellow-100">
              <Trophy size={14} className="fill-yellow-600" /> Best Score: {highScore}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${THEME.bg} p-4 md:p-8 flex flex-col items-center overflow-x-hidden`}>
      {/* Header Stats */}
      <div className="w-full max-w-2xl mb-8 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex flex-col items-center md:items-start">
          <h1 className="text-3xl md:text-4xl font-black text-pink-600 tracking-tighter leading-none uppercase">
            Mocha & <span className="text-yellow-500">Muse</span>
          </h1>
          <p className="text-[10px] font-black text-pink-400 mt-1 uppercase tracking-widest">Memory & Literature Cafe</p>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3 rounded-full shadow-lg transition-all border-4 ${isMuted ? 'bg-white text-pink-300 border-pink-100' : 'bg-pink-500 text-white border-pink-400'}`}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          {gameType === 'single' ? (
            <>
              <div className="bg-pink-500 text-white px-6 py-2 rounded-3xl shadow-lg flex flex-col items-center min-w-[120px] border-4 border-pink-400">
                <span className="text-[9px] uppercase font-black opacity-80 tracking-widest">Current Score</span>
                <span className="text-xl font-black">{score}</span>
              </div>
            </>
          ) : (
            <>
              <div className={`px-6 py-2 rounded-3xl shadow-lg flex flex-col items-center min-w-[120px] border-4 transition-all ${currentPlayer === 1 ? 'bg-pink-500 text-white border-pink-400 scale-110 z-10' : 'bg-white text-pink-300 border-pink-100'}`}>
                <span className="text-[9px] uppercase font-black opacity-80 tracking-widest">P1 Score</span>
                <span className="text-xl font-black">{player1Score}</span>
              </div>
              <div className={`px-6 py-2 rounded-3xl shadow-lg flex flex-col items-center min-w-[120px] border-4 transition-all ${currentPlayer === 2 ? 'bg-yellow-400 text-pink-900 border-yellow-300 scale-110 z-10' : 'bg-white text-yellow-600 opacity-50 border-yellow-200'}`}>
                <span className="text-[9px] uppercase font-black opacity-80 tracking-widest">{gameType === 'pvc' ? 'AI' : 'P2'} Score</span>
                <span className="text-xl font-black">{player2Score}</span>
              </div>
            </>
          )}
          <div className="bg-yellow-400 text-pink-900 px-6 py-2 rounded-3xl shadow-lg flex flex-col items-center min-w-[120px] border-4 border-yellow-300">
            <span className="text-[9px] uppercase font-black opacity-80 tracking-widest">Pairs Found</span>
            <span className="text-xl font-black">{cards.filter(c => c.isMatched).length / 2} / 11</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 bg-white border-2 border-pink-200 rounded-3xl p-4 flex items-center justify-between shadow-sm">
           <div className="flex flex-col">
              <span className="text-[10px] text-pink-400 font-black uppercase tracking-widest">Selected Mode</span>
              <span className="text-xs font-black text-pink-600 uppercase">{mode}</span>
           </div>
           <div className="h-8 w-px bg-pink-100"></div>
           <div className="flex flex-col text-center">
              <span className="text-[10px] text-pink-400 font-black uppercase tracking-widest">Players</span>
              <span className="text-xs font-black text-pink-600 uppercase">{gameType === 'pvc' ? 'Player vs AI' : gameType}</span>
           </div>
           <div className="h-8 w-px bg-pink-100"></div>
           <div className="flex flex-col text-right">
              <span className="text-[10px] text-pink-400 font-black uppercase tracking-widest">Turn</span>
              <span className={`text-xs font-black uppercase ${currentPlayer === 1 ? 'text-pink-600' : 'text-yellow-600'}`}>
                {currentPlayer === 1 ? 'P1\'s Round' : gameType === 'pvc' ? 'AI Thinking' : 'P2\'s Round'}
              </span>
           </div>
        </div>

        {gameType === 'single' && (
          <div className="bg-white border-2 border-yellow-200 rounded-3xl p-4 flex items-center gap-8 shadow-sm px-8">
            <div className="text-center">
              <span className="block text-[10px] text-yellow-600 font-black uppercase tracking-widest">Moves Left</span>
              <span className={`text-2xl font-black ${TURN_LIMITS[difficulty] ? 'text-pink-500' : 'text-yellow-500'}`}>
                {TURN_LIMITS[difficulty] ? TURN_LIMITS[difficulty] - moves : moves}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 w-full flex items-center justify-center">
        {renderGrid()}
      </div>

      {/* Footer Controls */}
      <footer className="w-full max-w-2xl flex justify-between items-center py-8 mt-4 border-t border-pink-100">
        <div className="flex gap-4">
          <button 
            onClick={initGame}
            className={`${THEME.buttonYellow} px-6 py-3 text-xs active:scale-90 transition-transform`}
          >
            <RotateCcw size={14} className="inline mr-2" /> RE-BREW
          </button>
          <button 
            onClick={() => setGameStarted(false)}
            className="bg-white border border-pink-200 px-6 py-3 rounded-2xl text-xs font-black text-pink-400 hover:border-pink-300 transition-colors active:scale-95 shadow-sm uppercase tracking-widest"
          >
            <SettingsIcon size={14} className="inline mr-2" /> SETTINGS
          </button>
        </div>
        <div className="hidden sm:flex gap-2">
          <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
          <div className="w-3 h-3 bg-pink-300 rounded-full"></div>
        </div>
      </footer>

      {/* Game Over Modal */}
      <AnimatePresence>
        {gameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-pink-900/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#FFF9F2] p-10 rounded-[48px] shadow-2xl flex flex-col items-center gap-8 max-w-md w-full text-center border-8 border-pink-100 border-t-pink-500"
            >
              <div className={`w-28 h-28 rounded-3xl flex items-center justify-center rotate-3 ${isWon ? 'bg-yellow-400 shadow-yellow-200' : 'bg-pink-500 shadow-pink-200'} shadow-2xl`}>
                {isWon ? <Trophy className="text-pink-900" size={56} /> : <Timer className="text-white" size={56} />}
              </div>
              
              <div>
                <h2 className="text-4xl font-black text-pink-600 uppercase tracking-tighter leading-none mb-2">
                  {gameType === 'single' ? (isWon ? "Literary Legend!" : "Closed for the day") : 
                   (isWon ? (player1Score > player2Score ? "P1 Wins!" : player2Score > player1Score ? (gameType === 'pvc' ? "AI Wins!" : "P2 Wins!") : "It's a Tie!") : "Match Over")}
                </h2>
                <p className="text-pink-400 font-black uppercase text-[10px] tracking-widest">
                  {isWon 
                    ? (gameType === 'single' ? `Order complete in ${moves} moves` : "The cafe is clear!") 
                    : "Turn limit reached. Ready for more caffeine?"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full">
                {gameType === 'single' ? (
                  <>
                    <div className="bg-white border-2 border-pink-100 p-4 rounded-3xl">
                      <p className="text-[10px] font-black text-pink-300 uppercase tracking-widest">Final Moves</p>
                      <p className="text-2xl font-black text-pink-600">{moves}</p>
                    </div>
                    <div className="bg-white border-2 border-pink-100 p-4 rounded-3xl">
                      <p className="text-[10px] font-black text-pink-300 uppercase tracking-widest">Final Score</p>
                      <p className="text-2xl font-black text-pink-600">{score}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white border-2 border-pink-100 p-4 rounded-3xl">
                      <p className="text-[10px] font-black text-pink-300 uppercase tracking-widest">P1 Score</p>
                      <p className="text-2xl font-black text-pink-600">{player1Score}</p>
                    </div>
                    <div className="bg-white border-2 border-yellow-100 p-4 rounded-3xl">
                      <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">{gameType === 'pvc' ? 'AI' : 'P2'} Score</p>
                      <p className="text-2xl font-black text-yellow-500">{player2Score}</p>
                    </div>
                  </>
                )}
              </div>

              <button 
                onClick={initGame}
                className={`${THEME.buttonPink} w-full py-5 text-xl tracking-tighter active:scale-95 transition-transform`}
              >
                BREW ANOTHER ROUND
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}} />
    </div>
  );
}

