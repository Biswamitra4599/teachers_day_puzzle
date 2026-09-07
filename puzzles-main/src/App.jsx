import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  Heart, 
  RefreshCw, 
  ChevronRight, 
  Trophy, 
  Sparkles, 
  Eye, 
  Gamepad2, 
  CheckCircle2,
  Lock
} from 'lucide-react';
import puzzlesData from './data/puzzles.json';

// --- Utility Functions ---
const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// --- Components ---

const PuzzlePiece = ({ piece, index, totalRows, totalCols, onDragStart, onDragOver, onDrop, onDragEnd, onClick, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, isDragging, isOver, isSelected, showHint }) => {
  const { originalIndex, currentImage } = piece;
  
  const row = Math.floor(originalIndex / totalCols);
  const col = originalIndex % totalCols;
  
  // Robust position calculation for any grid size
  const posX = totalCols > 1 ? (col / (totalCols - 1)) * 100 : 0;
  const posY = totalRows > 1 ? (row / (totalRows - 1)) * 100 : 0;

  return (
    <motion.div
      layout
      transition={{ layout: { type: "spring", stiffness: 400, damping: 35 } }}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index)}
      onClick={() => onClick(index)}
      onPointerDown={(e) => onPointerDown(e, index)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      data-piece-index={index}
      className={`relative overflow-hidden w-full h-full rounded-md shadow-sm cursor-grab active:cursor-grabbing touch-none border-2 transition-all duration-200 ${
        isDragging ? 'opacity-0' : 'opacity-100'
      } ${isOver || isSelected ? 'border-pink-500 scale-95 z-20' : 'border-transparent'} ${showHint ? 'ring-1 ring-pink-200 ring-offset-1' : ''}`}
      whileHover={{ scale: isDragging ? 1 : 1.02, zIndex: 10 }}
    >
      <div 
        className="w-full h-full"
        style={{
          backgroundImage: `url(${currentImage})`,
          backgroundSize: `${totalCols * 100}% ${totalRows * 100}%`,
          backgroundPosition: `${posX}% ${posY}%`,
        }}
      />
      {showHint && (
        <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[9px] px-1 rounded font-mono pointer-events-none">
          {originalIndex + 1}
        </div>
      )}
      {isOver && (
        <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
          <RefreshCw className="text-pink-600 animate-spin-slow" size={24} />
        </div>
      )}
    </motion.div>
  );
};

const PuzzleBoard = ({ puzzle, onSolve, isSolved, nextPuzzle }) => {
  const { rows, cols } = puzzle.grid;
  const [pieces, setPieces] = useState([]);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [imageRatio, setImageRatio] = useState(1);
  const [isShuffling, setIsShuffling] = useState(false);
  const pointerDragRef = useRef(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const image = new window.Image();
    image.onload = () => setImageRatio(image.naturalWidth / image.naturalHeight);
    image.src = puzzle.image;
  }, [puzzle.image]);

  const initPuzzle = useCallback(() => {
    const total = rows * cols;
    const initialPieces = Array.from({ length: total }, (_, i) => ({
      id: `piece-${i}`,
      originalIndex: i,
      currentImage: puzzle.image,
    }));
    
    let shuffled = shuffleArray(initialPieces);
    while (shuffled.every((p, i) => p.originalIndex === i)) {
      shuffled = shuffleArray(initialPieces);
    }
    
    setPieces(shuffled);
    setDraggingIndex(null);
    setOverIndex(null);
    setSelectedIndex(null);
  }, [puzzle, rows, cols]);

  useEffect(() => {
    initPuzzle();
  }, [initPuzzle]);

  const checkSolved = (currentPieces) => {
    return currentPieces.every((piece, index) => piece.originalIndex === index);
  };

  const handleDragStart = (e, index) => {
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
    
    // Create a ghost image if needed, or just let default happen
    const ghost = new Image();
    ghost.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(ghost, 0, 0);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (overIndex !== index) {
      setOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setOverIndex(null);
  };

  const handlePointerDown = (event, index) => {
    if (event.pointerType === 'mouse') return;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
    pointerDragRef.current = {
      sourceIndex: index,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    setDraggingIndex(index);
    setOverIndex(index);
  };

  const handlePointerMove = (event) => {
    const drag = pointerDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 8) {
      drag.moved = true;
    }

    if (!drag.moved) return;

    const element = document.elementFromPoint(event.clientX, event.clientY);
    const piece = element?.closest('[data-piece-index]');
    setOverIndex(piece ? Number(piece.dataset.pieceIndex) : null);
  };

  const handlePointerUp = (event) => {
    const drag = pointerDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const element = document.elementFromPoint(event.clientX, event.clientY);
    const piece = element?.closest('[data-piece-index]');
    const targetIndex = piece ? Number(piece.dataset.pieceIndex) : null;

    suppressClickRef.current = drag.moved;
    pointerDragRef.current = null;
    setDraggingIndex(null);
    setOverIndex(null);

    if (drag.moved && targetIndex !== null) {
      swapPieces(drag.sourceIndex, targetIndex);
    }
  };

  const handlePointerCancel = () => {
    pointerDragRef.current = null;
    setDraggingIndex(null);
    setOverIndex(null);
  };

  const swapPieces = (sourceIndex, targetIndex) => {
    if (sourceIndex === targetIndex) {
      setSelectedIndex(null);
      return;
    }

    const newPieces = [...pieces];
    [newPieces[sourceIndex], newPieces[targetIndex]] = [newPieces[targetIndex], newPieces[sourceIndex]];
    setPieces(newPieces);
    setSelectedIndex(null);

    if (checkSolved(newPieces)) {
      setTimeout(() => onSolve(), 300);
    }
  };

  const handlePieceClick = (index) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    if (selectedIndex === null) {
      setSelectedIndex(index);
      return;
    }

    swapPieces(selectedIndex, index);
  };

  const handleReshuffle = () => {
    initPuzzle();
    setIsShuffling(true);
    setTimeout(() => setIsShuffling(false), 650);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const targetIndex = index;

    setDraggingIndex(null);
    setOverIndex(null);

    if (sourceIndex === targetIndex || isNaN(sourceIndex)) {
      return;
    }

    swapPieces(sourceIndex, targetIndex);
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="relative w-full max-w-md mx-auto">
        <LayoutGroup>
          <motion.div 
            className="puzzle-grid bg-slate-200/50 backdrop-blur-sm p-2 rounded-2xl shadow-xl border-4 border-white/80 overflow-hidden"
            animate={isShuffling ? {
              rotate: [0, -1, 1, -0.5, 0],
              scale: [1, 1.015, 0.99, 1.005, 1],
            } : { rotate: 0, scale: 1 }}
            transition={{ duration: 0.65, ease: 'easeInOut' }}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
              aspectRatio: imageRatio,
            }}
          >
            {pieces.map((piece, index) => (
              <PuzzlePiece
                key={piece.id}
                piece={piece}
                index={index}
                totalRows={rows}
                totalCols={cols}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                onClick={handlePieceClick}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                isDragging={draggingIndex === index}
                isOver={overIndex === index && draggingIndex !== index}
                isSelected={selectedIndex === index}
                showHint={showHint}
              />
            ))}
          </motion.div>
        </LayoutGroup>

        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 z-20 p-2"
              onClick={() => setShowPreview(false)}
            >
              <img 
                src={puzzle.image} 
                className="w-full h-full object-contain rounded-xl shadow-2xl border-4 border-white bg-slate-100"
                alt="Preview"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                <span className="bg-white/90 text-slate-800 px-4 py-2 rounded-full font-bold shadow-lg">
                  Click to return
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="flex flex-wrap justify-center gap-3">
        <button 
          onClick={handleReshuffle}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-md active:scale-95"
        >
          <RefreshCw size={18} />
          Reshuffle
        </button>
        <button 
          onMouseEnter={() => setShowPreview(true)}
          onMouseLeave={() => setShowPreview(false)}
          onClick={() => setShowPreview(prev => !prev)}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-md active:scale-95"
        >
          <Eye size={18} />
          Hold to See
        </button>
        <button 
          onClick={() => setShowHint(!showHint)}
          className={`flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition-all shadow-md active:scale-95 ${
            showHint ? 'bg-pink-500 text-white' : 'bg-white text-slate-700'
          }`}
        >
          <Sparkles size={18} />
          {showHint ? 'Hide Hints' : 'Show Hints'}
        </button>
      </div>

      <AnimatePresence>
        {isSolved && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl relative"
            >
              <div className="h-64 relative overflow-hidden">
                <img 
                  src={puzzle.image} 
                  alt="Solved" 
                  className="w-full h-full object-contain bg-slate-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                <motion.div 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  transition={{ delay: 0.3, type: 'spring' }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white p-3 rounded-full shadow-xl"
                >
                  <Trophy size={48} className="text-yellow-500" />
                </motion.div>
              </div>

              <div className="p-8 text-center">
                <h3 className="text-4xl font-black text-rose-600 mb-4 drop-shadow-sm">
                  Love Found!
                </h3>
                <div className="bg-rose-50 p-6 rounded-2xl mb-8 relative">
                  <div className="absolute -top-3 left-6 text-rose-400">
                    <Heart size={24} className="fill-rose-400" />
                  </div>
                  <p className="text-2xl italic text-rose-800 font-serif leading-relaxed">
                    "{puzzle.message}"
                  </p>
                  <div className="absolute -bottom-3 right-6 text-rose-400">
                    <Heart size={24} className="fill-rose-400" />
                  </div>
                </div>

                <button
                  onClick={nextPuzzle}
                  className="w-full group flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xl font-bold rounded-2xl transition-all shadow-xl hover:shadow-rose-200/50 active:scale-95"
                >
                  <span>Continue the Adventure</span>
                  <ChevronRight size={24} className="group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [level, setLevel] = useState(1);
  const [highestUnlockedLevel, setHighestUnlockedLevel] = useState(1);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  const levelPuzzles = puzzlesData.filter(p => p.level === level);
  const currentPuzzle = levelPuzzles[currentPuzzleIndex];
  const totalLevels = Math.max(...puzzlesData.map(p => p.level));

  const handleSolve = () => {
    setIsSolved(true);
    if (currentPuzzleIndex === levelPuzzles.length - 1 && level < totalLevels) {
      setHighestUnlockedLevel(previous => Math.max(previous, level + 1));
    }
    confetti({
      particleCount: 200,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#f43f5e', '#ec4899', '#ffffff', '#fbbf24']
    });
  };

  const nextPuzzle = () => {
    setIsSolved(false);
    if (currentPuzzleIndex < levelPuzzles.length - 1) {
      setCurrentPuzzleIndex(prev => prev + 1);
    } else if (level < totalLevels) {
      setLevel(prev => prev + 1);
      setCurrentPuzzleIndex(0);
    } else {
      // Loop back to level 1
      setLevel(1);
      setCurrentPuzzleIndex(0);
    }
  };

  const handleLevelChange = (newLvl) => {
    if (newLvl > highestUnlockedLevel) return;

    setLevel(newLvl);
    setCurrentPuzzleIndex(0);
    setIsSolved(false);
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-white"
        >
          <div className="mb-6 inline-block p-5 bg-rose-100 rounded-full text-rose-500 relative">
             <Gamepad2 size={64} />
             <motion.div 
               animate={{ scale: [1, 1.2, 1] }} 
               transition={{ repeat: Infinity, duration: 1.5 }}
               className="absolute -top-1 -right-1"
             >
               <Heart size={32} className="fill-rose-500" />
             </motion.div>
          </div>
          <h1 className="text-5xl font-black text-slate-800 mb-4 tracking-tight">HeartPuzzle</h1>
          <p className="text-slate-500 text-lg mb-10 font-medium">
            Pieces of a story, fragments of a dream. Solve them to unlock the heart within.
          </p>
          <button 
            onClick={() => setGameStarted(true)}
            className="w-full py-5 bg-rose-500 hover:bg-rose-600 text-white text-2xl font-black rounded-3xl shadow-lg shadow-rose-200 transition-all active:scale-95"
          >
            Start Playing
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfcfd] text-slate-900 font-sans selection:bg-rose-200">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-100 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-100 rounded-full blur-[120px] opacity-60" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setGameStarted(false)}
          >
            <div className="p-3 bg-rose-500 rounded-2xl shadow-lg shadow-rose-200 group-hover:scale-110 transition-transform">
              <Heart className="text-white fill-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">HeartPuzzle</h1>
              <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">Chapter {level} • Challenge {currentPuzzleIndex + 1}</p>
            </div>
          </div>

          <nav className="flex items-center bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 backdrop-blur-sm">
            {Array.from({ length: totalLevels }, (_, i) => i + 1).map((lvl) => {
              const isLocked = lvl > highestUnlockedLevel;
              return (
                <button
                  key={lvl}
                  disabled={isLocked}
                  onClick={() => handleLevelChange(lvl)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                    level === lvl 
                    ? 'bg-white text-rose-500 shadow-md ring-1 ring-slate-200' 
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {isLocked ? <Lock size={14} /> : <span>{lvl}</span>}
                  <span className="hidden sm:inline">Level {lvl}</span>
                </button>
              );
            })}
          </nav>
        </header>

        <main className="grid lg:grid-cols-[1fr_350px] gap-12 items-start">
          {/* Main Game Area */}
          <section className="flex flex-col items-center">
             <PuzzleBoard 
                key={currentPuzzle.id}
                puzzle={currentPuzzle} 
                onSolve={handleSolve}
                isSolved={isSolved}
                nextPuzzle={nextPuzzle}
              />
          </section>

          {/* Sidebar / Info Area */}
          <aside className="space-y-6">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <CheckCircle2 size={16} /> Current Objective
              </h4>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <h3 className="text-xl font-bold text-slate-800 mb-1">{currentPuzzle.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {currentPuzzle.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-black uppercase px-2 py-0.5 bg-rose-100 text-rose-500 rounded-md">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm py-2 px-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Difficulty</span>
                  <span className="font-bold text-slate-800">
                    {currentPuzzle.grid.rows}x{currentPuzzle.grid.cols}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm py-2 px-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Puzzles in Level</span>
                  <span className="font-bold text-slate-800">{levelPuzzles.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-rose-500 to-pink-500 p-8 rounded-[2rem] text-white shadow-xl shadow-rose-200">
              <Sparkles className="mb-4 opacity-80" />
              <h4 className="text-lg font-bold mb-2">Did you know?</h4>
              <p className="text-rose-50 opacity-90 text-sm leading-relaxed">
                Puzzles are like relationships. They take patience, effort, and sometimes a little hint to see how perfectly everything fits together.
              </p>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
