"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Clock, Send, Heart, User, Ghost, Smile, Laugh, Angry, Frown, Sparkles, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateFootballerHints } from "@/ai/flows/generate-footballer-hints-flow";
import { getRandomFootballer, Footballer } from "@/lib/footballer-data";

type GameState = 'countdown' | 'playing' | 'finalizing' | 'reveal' | 'result';

export default function GamePage() {
  const { roomId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const initialHP = parseInt(searchParams.get("health") || "100");
  const isLeader = searchParams.get("isLeader") === "true";

  // Player State
  const [p1Health, setP1Health] = useState(initialHP);
  const [p2Health, setP2Health] = useState(initialHP);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [user, setUser] = useState<{ name: string; photo: string } | null>(null);

  // Round State
  const [gameState, setGameState] = useState<GameState>('countdown');
  const [countdown, setCountdown] = useState(5);
  const [round, setRound] = useState(1);
  const [targetPlayer, setTargetPlayer] = useState<Footballer | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [visibleHints, setVisibleHints] = useState<number>(1);
  const [p1Guess, setP1Guess] = useState("");
  const [p2Guess, setP2Guess] = useState("");
  const [guessInput, setGuessInput] = useState("");
  const [p1HasGuessed, setP1HasGuessed] = useState(false);
  const [p2HasGuessed, setP2HasGuessed] = useState(false);
  const [roundTimer, setRoundTimer] = useState<number | null>(null); // 15s timer
  
  // UI State
  const [emotes, setEmotes] = useState<{ id: number; icon: string; x: number }[]>([]);

  const startNewRound = useCallback(async () => {
    setGameState('countdown');
    setCountdown(5);
    setP1HasGuessed(false);
    setP2HasGuessed(false);
    setP1Guess("");
    setP2Guess("");
    setGuessInput("");
    setRoundTimer(null);
    setVisibleHints(1);

    const player = getRandomFootballer();
    setTargetPlayer(player);
    
    try {
      const result = await generateFootballerHints({ footballerName: player.name });
      setHints(result.hints);
    } catch (e) {
      setHints(["World class player", "Famous in Europe", "Top goal scorer"]);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("footy_user");
    if (saved) setUser(JSON.parse(saved));
    startNewRound();
  }, [startNewRound]);

  // Main game loop logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (gameState === 'countdown' && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (gameState === 'countdown' && countdown === 0) {
      setGameState('playing');
    }

    // Reveal 1 hint every 5 seconds if not all revealed
    if (gameState === 'playing' && visibleHints < hints.length) {
      timer = setTimeout(() => setVisibleHints(prev => prev + 1), 5000);
    }

    // Round timer (15s after first guess)
    if (roundTimer !== null && roundTimer > 0) {
      timer = setTimeout(() => setRoundTimer(roundTimer - 1), 1000);
    } else if (roundTimer === 0) {
      handleFinalize();
    }

    return () => clearTimeout(timer);
  }, [gameState, countdown, visibleHints, hints.length, roundTimer]);

  const handleGuess = () => {
    if (p1HasGuessed || !guessInput.trim()) return;
    
    setP1HasGuessed(true);
    setP1Guess(guessInput);
    
    toast({ title: "Guess Submitted", description: `You guessed: ${guessInput}` });
    
    if (!p2HasGuessed && roundTimer === null) {
      setRoundTimer(15);
      // Simulate p2 guessing after some time
      setTimeout(() => {
        setP2HasGuessed(true);
        setP2Guess(targetPlayer?.name || "Unknown");
      }, Math.random() * 10000 + 2000);
    }
    
    if (p2HasGuessed) {
      handleFinalize();
    }
  };

  const handleFinalize = () => {
    setGameState('finalizing');
    setRoundTimer(null);
    setTimeout(() => {
      setGameState('reveal');
      setTimeout(() => {
        calculateScores();
        setGameState('result');
        setTimeout(() => {
          if (p1Health > 0 && p2Health > 0) {
            setRound(r => r + 1);
            startNewRound();
          } else {
             // End game logic
          }
        }, 8000);
      }, 4000);
    }, 3000);
  };

  const calculateScores = () => {
    if (!targetPlayer) return;
    
    const p1Correct = p1Guess.toLowerCase().includes(targetPlayer.name.toLowerCase());
    const p2Correct = p2Guess.toLowerCase().includes(targetPlayer.name.toLowerCase());
    
    let p1Mod = p1Correct ? 10 : (p1Guess === "" ? 0 : -10);
    let p2Mod = p2Correct ? 10 : (p2Guess === "" ? 0 : -10);

    setP1Score(s => s + p1Mod);
    setP2Score(s => s + p2Mod);

    // Health logic as per user request:
    // If both +10, health same.
    // If P1 +10, P2 0, P2 health -10.
    // If P1 +10, P2 -10, P2 health -20.
    
    if (p1Correct && !p2Correct) {
       const reduction = p2Guess === "" ? 10 : 20;
       setP2Health(h => Math.max(0, h - reduction));
    } else if (p2Correct && !p1Correct) {
       const reduction = p1Guess === "" ? 10 : 20;
       setP1Health(h => Math.max(0, h - reduction));
    }
  };

  const triggerEmote = (icon: string) => {
    const id = Date.now();
    setEmotes(prev => [...prev, { id, icon, x: Math.random() * 80 + 10 }]);
    setTimeout(() => {
      setEmotes(prev => prev.filter(e => e.id !== id));
    }, 2000);
  };

  const EmoteButtons = [
    { icon: "🔥", label: "Fire" },
    { icon: "😂", label: "Laugh" },
    { icon: "😡", label: "Angry" },
    { icon: "😢", label: "Sad" },
    { icon: "👑", label: "Crown" },
    { icon: "⚽", label: "Ball" },
  ];

  if (gameState === 'reveal') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center space-y-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent" />
        <h2 className="text-4xl font-black font-headline text-primary animate-pulse tracking-widest">REVEALING PLAYER...</h2>
        
        <div className="relative w-72 h-[450px] fc-animation-reveal">
           <div className={`absolute inset-0 rounded-2xl p-6 flex flex-col items-center justify-between border-4 ${targetPlayer?.rarity === 'ICON' ? 'bg-gradient-to-br from-yellow-100 via-yellow-400 to-yellow-600 border-yellow-200' : 'bg-gradient-to-br from-gray-700 via-gray-800 to-black border-gray-600'}`}>
              <div className="text-4xl font-black text-black/50 absolute top-4 left-4">{targetPlayer?.position}</div>
              <div className="text-6xl mt-4">{targetPlayer?.flag}</div>
              <div className="text-3xl font-black uppercase text-center mt-auto mb-8 bg-black/80 px-4 py-2 rounded-lg text-white w-full">{targetPlayer?.name}</div>
              <div className="text-sm font-bold opacity-60 uppercase tracking-tighter">{targetPlayer?.club}</div>
              <div className="absolute -bottom-4 right-4 text-white font-black text-6xl opacity-10 italic">FC</div>
           </div>
           <div className="absolute -inset-10 bg-primary/10 blur-3xl -z-10 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Floating Emotes Layer */}
      {emotes.map(emote => (
        <div 
          key={emote.id} 
          className="absolute bottom-20 z-40 text-4xl emote-float pointer-events-none"
          style={{ left: `${emote.x}%` }}
        >
          {emote.icon}
        </div>
      ))}

      {/* Header UI */}
      <header className="p-4 bg-card/50 backdrop-blur-md border-b border-white/5 grid grid-cols-3 items-center sticky top-0 z-30">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <img src={user?.photo} className="w-8 h-8 rounded-full border border-primary" alt="P1" />
            <span className="text-xs font-black truncate">{user?.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Progress value={(p1Health / initialHP) * 100} className="h-2 bg-muted-foreground/20" />
            <span className="text-[10px] font-bold text-primary">{p1Health}</span>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <Badge className="bg-primary text-black font-black mb-1">ROUND {round}</Badge>
          <div className="text-xl font-black flex items-center gap-2">
            <span>{p1Score}</span>
            <span className="text-muted-foreground opacity-30">:</span>
            <span>{p2Score}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 items-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black truncate">OPPONENT</span>
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
               <User className="w-5 h-5 text-secondary-foreground" />
            </div>
          </div>
          <div className="flex items-center gap-1 w-full justify-end">
            <span className="text-[10px] font-bold text-secondary">{p2Health}</span>
            <Progress value={(p2Health / initialHP) * 100} className="h-2 bg-muted-foreground/20 rotate-180" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 flex flex-col gap-4 max-w-lg mx-auto w-full pb-32">
        {gameState === 'countdown' ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
             <div className="text-8xl font-black text-primary animate-ping">{countdown}</div>
             <p className="text-xl font-headline font-bold uppercase tracking-widest text-muted-foreground">Get Ready!</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> HINTS REVEALED
                </h3>
                {roundTimer !== null && (
                  <Badge className="bg-red-600 animate-pulse text-white px-3 h-8">
                    15s TIMER: {roundTimer}s
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2">
                {hints.slice(0, visibleHints).map((hint, idx) => (
                  <div key={idx} className="bg-card p-4 rounded-xl border border-white/5 shadow-lg animate-in slide-in-from-right duration-300">
                    <p className="text-sm font-medium leading-relaxed">{hint}</p>
                  </div>
                ))}
                {visibleHints < hints.length && (
                  <div className="p-4 rounded-xl border border-dashed border-muted-foreground/30 flex items-center justify-center gap-2 text-muted-foreground italic text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    Analyzing player stats...
                  </div>
                )}
              </div>
            </div>

            {/* Status Notifications */}
            <div className="space-y-2">
              {p1HasGuessed && (
                <div className="bg-green-500/20 text-green-400 p-2 rounded-lg text-xs font-bold flex items-center gap-2 border border-green-500/30">
                  <Star className="w-3 h-3" /> YOU HAVE GUESSED!
                </div>
              )}
              {p2HasGuessed && (
                <div className="bg-primary/20 text-primary p-2 rounded-lg text-xs font-bold flex items-center gap-2 border border-primary/30">
                  <User className="w-3 h-3" /> OPPONENT HAS GUESSED!
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer Interface */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-white/5 space-y-4 z-40">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {EmoteButtons.map(btn => (
            <button 
              key={btn.label}
              onClick={() => triggerEmote(btn.icon)}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-card hover:bg-muted border border-white/10 flex items-center justify-center text-xl transition-transform active:scale-90"
            >
              {btn.icon}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input 
            placeholder="Type player name..." 
            className="h-12 bg-muted/50 border-none font-bold"
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
            disabled={p1HasGuessed || gameState !== 'playing'}
          />
          <Button 
            onClick={handleGuess} 
            disabled={p1HasGuessed || gameState !== 'playing'}
            className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </footer>

      {/* Result Overlay */}
      {gameState === 'result' && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in">
           <Trophy className="w-16 h-16 text-secondary animate-bounce" />
           <h2 className="text-3xl font-black font-headline">ROUND RESULTS</h2>
           
           <div className="w-full grid grid-cols-2 gap-6">
              <div className="bg-card p-4 rounded-2xl text-center space-y-2 border-t-4 border-primary">
                <p className="text-xs text-muted-foreground uppercase font-black">YOU</p>
                <p className="font-bold text-sm truncate">{p1Guess || "SKIPPED"}</p>
                <div className={`text-2xl font-black ${p1Score > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {p1Guess.toLowerCase().includes(targetPlayer?.name.toLowerCase() || "") ? "+10" : (p1Guess === "" ? "0" : "-10")}
                </div>
              </div>
              <div className="bg-card p-4 rounded-2xl text-center space-y-2 border-t-4 border-secondary">
                <p className="text-xs text-muted-foreground uppercase font-black">OPPONENT</p>
                <p className="font-bold text-sm truncate">{p2Guess || "SKIPPED"}</p>
                <div className={`text-2xl font-black ${p2Score > 0 ? 'text-green-500' : 'text-red-500'}`}>
                   {p2Guess.toLowerCase().includes(targetPlayer?.name.toLowerCase() || "") ? "+10" : (p2Guess === "" ? "0" : "-10")}
                </div>
              </div>
           </div>

           <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">Starting next round in 5 seconds...</p>
              <Progress value={80} className="w-48 h-1 mx-auto" />
           </div>
        </div>
      )}
    </div>
  );
}