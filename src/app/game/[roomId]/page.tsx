
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Clock, Send, User, Star, Swords, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, setDoc, onSnapshot } from "firebase/firestore";
import { FOOTBALLERS, Footballer } from "@/lib/footballer-data";

type GameState = 'countdown' | 'playing' | 'reveal' | 'result';
type RevealStep = 'none' | 'country' | 'position' | 'rarity' | 'full-card';

export default function GamePage() {
  const { roomId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();
  const videoRef = useRef<HTMLVideoElement>(null);

  const roomRef = useMemoFirebase(() => doc(db, "gameRooms", roomId as string), [db, roomId]);
  const { data: room, isLoading: isRoomLoading } = useDoc(roomRef);

  const [p1Profile, setP1Profile] = useState<any>(null);
  const [p2Profile, setP2Profile] = useState<any>(null);

  const [gameState, setGameState] = useState<GameState>('countdown');
  const [revealStep, setRevealStep] = useState<RevealStep>('none');
  const [countdown, setCountdown] = useState(5);
  const [targetPlayer, setTargetPlayer] = useState<Footballer | null>(null);
  const [visibleHints, setVisibleHints] = useState<number>(1);
  const [guessInput, setGuessInput] = useState("");
  const [roundTimer, setRoundTimer] = useState<number | null>(null);
  
  const isPlayer1 = room?.player1Id === user?.uid;
  const currentRoundId = `round_${room?.currentRoundNumber || 1}`;
  const roundRef = useMemoFirebase(() => doc(db, "gameRooms", roomId as string, "gameRounds", currentRoundId), [db, roomId, currentRoundId]);
  const { data: roundData } = useDoc(roundRef);

  const startNewRoundLocally = useCallback(() => {
    setGameState('countdown');
    setRevealStep('none');
    setCountdown(5);
    setGuessInput("");
    setRoundTimer(null);
    setVisibleHints(1);

    if (isPlayer1 && room) {
      const player = FOOTBALLERS[Math.floor(Math.random() * FOOTBALLERS.length)];
      setDoc(roundRef, {
        id: currentRoundId,
        gameRoomId: roomId,
        roundNumber: room.currentRoundNumber,
        footballerId: player.id,
        player1Id: room.player1Id,
        player2Id: room.player2Id,
        hintsRevealedCount: 1,
        player1Guess: "",
        player2Guess: "",
        player1GuessedCorrectly: false,
        player2GuessedCorrectly: false,
      }, { merge: true });
    }
  }, [isPlayer1, room, roomId, currentRoundId, roundRef]);

  useEffect(() => {
    if (!room) return;
    
    const p1Unsub = onSnapshot(doc(db, "userProfiles", room.player1Id), snap => setP1Profile(snap.data()));
    const p2Unsub = onSnapshot(doc(db, "userProfiles", room.player2Id), snap => setP2Profile(snap.data()));

    if (!roundData && isPlayer1) {
      startNewRoundLocally();
    }

    return () => {
      p1Unsub();
      p2Unsub();
    };
  }, [room, db, roundData, startNewRoundLocally, isPlayer1]);

  useEffect(() => {
    if (roundData) {
      const player = FOOTBALLERS.find(f => f.id === roundData.footballerId);
      setTargetPlayer(player || null);
    }
  }, [roundData]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (gameState === 'countdown' && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (gameState === 'countdown' && countdown === 0) {
      setGameState('playing');
    }

    if (gameState === 'playing' && visibleHints < 5) {
      timer = setTimeout(() => setVisibleHints(prev => prev + 1), 5000);
    }

    if (roundTimer !== null && roundTimer > 0) {
      timer = setTimeout(() => setRoundTimer(roundTimer - 1), 1000);
    } else if (roundTimer === 0) {
      handleReveal();
    }

    return () => clearTimeout(timer);
  }, [gameState, countdown, visibleHints, roundTimer]);

  useEffect(() => {
    if (gameState === 'playing' && roundData) {
      const bothGuessed = roundData.player1Guess && roundData.player2Guess;
      if (bothGuessed) {
        handleReveal();
      }
    }
  }, [roundData, gameState]);

  const handleGuess = async () => {
    if (!guessInput.trim() || !roundData) return;
    
    const isCorrect = guessInput.toLowerCase().trim() === (targetPlayer?.name.toLowerCase().trim() || "");
    const update: any = isPlayer1 
      ? { player1Guess: guessInput, player1GuessedCorrectly: isCorrect }
      : { player2Guess: guessInput, player2GuessedCorrectly: isCorrect };
    
    await updateDoc(roundRef, update);
    toast({ title: "Guess Submitted", description: `You guessed: ${guessInput}` });
    
    if (roundTimer === null) setRoundTimer(15);
  };

  const handleReveal = () => {
    setGameState('reveal');
    setRevealStep('none');
    
    // Ensure video plays immediately
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(e => console.log("Video playback failed", e));
      }
    }, 50);

    // Precise Cinematic Timing
    // 1.7s: Country In
    setTimeout(() => setRevealStep('country'), 1700);
    
    // 2.6s: Country Out
    setTimeout(() => setRevealStep('none'), 2600);
    
    // 2.9s: Position In
    setTimeout(() => setRevealStep('position'), 2900);
    
    // 3.0s (Approx): Position Out (Tight window for rapid sequence)
    setTimeout(() => setRevealStep('none'), 3050);
    
    // 3.1s: Rarity In
    setTimeout(() => setRevealStep('rarity'), 3100);
    
    // 4.1s: Rarity Out
    setTimeout(() => setRevealStep('none'), 4100);

    // 4.5s: Final Card Pop Up
    setTimeout(() => setRevealStep('full-card'), 4500);

    // Transition to results screen
    setTimeout(() => {
      setGameState('result');
      if (isPlayer1) calculateRoundResults();
      
      setTimeout(async () => {
        if (room && room.player1CurrentHealth > 0 && room.player2CurrentHealth > 0) {
          if (isPlayer1) {
            await updateDoc(roomRef, { currentRoundNumber: room.currentRoundNumber + 1 });
          }
          setGameState('countdown');
          setCountdown(5);
          startNewRoundLocally();
        } else {
          router.push('/');
        }
      }, 8000);
    }, 11000); // Extended reveal time to accommodate the full sequence
  };

  const calculateRoundResults = async () => {
    if (!roundData || !targetPlayer || !room) return;

    let p1Dmg = 0;
    let p2Dmg = 0;

    if (roundData.player1GuessedCorrectly && !roundData.player2GuessedCorrectly) {
      p2Dmg = 20;
    } else if (roundData.player2GuessedCorrectly && !roundData.player1GuessedCorrectly) {
      p1Dmg = 20;
    } else if (!roundData.player1GuessedCorrectly && !roundData.player2GuessedCorrectly) {
      p1Dmg = 10;
      p2Dmg = 10;
    }

    await updateDoc(roomRef, {
      player1CurrentHealth: Math.max(0, room.player1CurrentHealth - p1Dmg),
      player2CurrentHealth: Math.max(0, room.player2CurrentHealth - p2Dmg)
    });
  };

  if (isRoomLoading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Swords className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (gameState === 'reveal') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
        <video 
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        >
          <source src="https://drive.google.com/uc?export=download&id=1w-NjTjDTkJ2j5_JPUhJUc-LKF3NvhU4Z" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        <div className="absolute inset-0 bg-white/10 fc-flash-overlay pointer-events-none z-10" />
        
        <div className="relative z-20 flex flex-col items-center justify-center w-full h-full p-6">
          
          {/* Sequential Elements Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {revealStep === 'country' && (
              <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
                <div className="text-[180px] filter drop-shadow-[0_0_50px_rgba(255,255,255,0.8)]">{targetPlayer?.flag}</div>
                <div className="mt-4 h-1 w-64 bg-white/50 blur-sm animate-pulse" />
              </div>
            )}
            {revealStep === 'position' && (
              <div className="animate-in fade-in slide-in-from-bottom-10 duration-300">
                <span className="text-[160px] font-black text-white/90 italic tracking-tighter drop-shadow-[0_0_80px_rgba(255,165,0,1)] uppercase">{targetPlayer?.position}</span>
              </div>
            )}
            {revealStep === 'rarity' && (
              <div className="animate-in fade-in zoom-in duration-400">
                <Badge className={`${targetPlayer?.rarity === 'ICON' ? 'bg-yellow-500 text-black' : 'bg-primary text-black'} text-4xl px-12 py-4 font-black italic border-4 border-white/40 shadow-[0_0_100px_rgba(255,255,255,0.6)] uppercase tracking-[0.2em]`}>
                  {targetPlayer?.rarity}
                </Badge>
              </div>
            )}
          </div>

          {/* Full Card Reveal (Step 7) */}
          {revealStep === 'full-card' && (
            <div className="relative fc-card-container">
              <div className={`w-80 h-[500px] fc-animation-reveal rounded-3xl shadow-[0_0_150px_rgba(255,165,0,0.5)] flex flex-col border-[8px] overflow-hidden relative ${targetPlayer?.rarity === 'ICON' ? 'bg-gradient-to-br from-yellow-100 via-yellow-500 to-yellow-800 border-yellow-200' : 'bg-gradient-to-br from-slate-700 via-slate-900 to-black border-slate-600'}`}>
                
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/20 rounded-full -ml-24 -mb-24 blur-3xl" />
                
                <div className="p-10 flex flex-col h-full items-center text-center justify-center">
                  <div className="flex flex-col items-center gap-6">
                     <span className="text-8xl font-black text-white/50 leading-none tracking-tighter drop-shadow-2xl">{targetPlayer?.position}</span>
                     <div className="text-[120px] filter drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)] transform scale-125">{targetPlayer?.flag}</div>
                  </div>

                  <div className="mt-12 w-full space-y-4">
                    <div className="bg-black/90 backdrop-blur-xl px-4 py-4 rounded-2xl w-full border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                      <h3 className="text-3xl font-black uppercase text-white tracking-tight fc-text-glow leading-tight">{targetPlayer?.name}</h3>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <div className="p-1.5 bg-secondary/20 rounded-lg">
                        <Zap className="w-5 h-5 text-secondary fill-secondary" />
                      </div>
                      <span className="text-sm font-black uppercase tracking-[0.2em] text-white/80 drop-shadow-md">{targetPlayer?.club}</span>
                    </div>
                  </div>
                </div>

                <div className="absolute top-6 right-6">
                  <Badge className={`${targetPlayer?.rarity === 'ICON' ? 'bg-black text-yellow-500' : 'bg-primary text-black'} text-sm px-4 py-1 font-black italic border-2 border-white/20`}>
                    {targetPlayer?.rarity}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <header className="p-4 bg-card/60 backdrop-blur-xl border-b border-white/10 grid grid-cols-3 items-center sticky top-0 z-30">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <img src={p1Profile?.avatarUrl || "https://picsum.photos/seed/p1/100/100"} className="w-10 h-10 rounded-full border-2 border-primary shadow-lg" alt="P1" />
            <span className="text-sm font-black truncate text-white">{p1Profile?.displayName || "Player 1"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={(room.player1CurrentHealth / room.healthOption) * 100} className="h-2.5 bg-muted/30" />
            <span className="text-xs font-black text-primary">{room.player1CurrentHealth}</span>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <Badge className="bg-primary text-black font-black px-4 py-1.5 text-xs shadow-lg transform -skew-x-12">ROUND {room.currentRoundNumber}</Badge>
        </div>

        <div className="flex flex-col gap-2 items-end">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black truncate text-white">{p2Profile?.displayName || "Opponent"}</span>
            <div className="w-10 h-10 rounded-full bg-secondary border-2 border-secondary overflow-hidden shadow-lg">
               <img src={p2Profile?.avatarUrl || "https://picsum.photos/seed/p2/100/100"} className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex items-center gap-2 w-full justify-end">
            <span className="text-xs font-black text-secondary">{room.player2CurrentHealth}</span>
            <Progress value={(room.player2CurrentHealth / room.healthOption) * 100} className="h-2.5 bg-muted/30 rotate-180" />
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-6 max-w-lg mx-auto w-full pb-40">
        {gameState === 'countdown' ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8">
             <div className="text-[12rem] font-black text-primary animate-ping leading-none drop-shadow-[0_0_50px_rgba(255,123,0,0.5)]">{countdown}</div>
             <p className="text-2xl font-headline font-bold uppercase tracking-[0.4em] text-muted-foreground animate-pulse">Prepare to Duel</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Scouting Reports
                </h3>
                {roundTimer !== null && (
                  <Badge className="bg-red-600/90 animate-pulse text-white px-4 h-10 text-sm font-black border-2 border-white/20">
                    {roundTimer}s REMAINING
                  </Badge>
                )}
              </div>
              
              <div className="space-y-3">
                {targetPlayer?.hints.slice(0, visibleHints).map((hint, idx) => (
                  <div key={idx} className="bg-card/80 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
                    <p className="text-sm font-bold text-white/90 leading-relaxed italic">"{hint}"</p>
                  </div>
                ))}
                {visibleHints < 5 && (
                  <div className="p-6 rounded-2xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-3 text-muted-foreground animate-pulse">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Incoming Data...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {(isPlayer1 ? roundData?.player1Guess : roundData?.player2Guess) && (
                <div className="bg-green-500/10 text-green-400 p-3 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-3 border border-green-500/20">
                  <Star className="w-4 h-4 fill-green-400" /> Guess Locked In
                </div>
              )}
              {(isPlayer1 ? roundData?.player2Guess : roundData?.player1Guess) && (
                <div className="bg-primary/10 text-primary p-3 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-3 border border-primary/20">
                  <User className="w-4 h-4 fill-primary" /> Opponent Submitted
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-black/40 backdrop-blur-3xl border-t border-white/10 space-y-4 z-40">
        <div className="flex gap-3 max-w-lg mx-auto">
          <Input 
            placeholder="ENTER PLAYER NAME" 
            className="h-16 bg-white/5 border-white/10 font-black tracking-widest text-white placeholder:text-white/20 rounded-2xl focus-visible:ring-primary text-center"
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
            disabled={(isPlayer1 ? !!roundData?.player1Guess : !!roundData?.player2Guess) || gameState !== 'playing'}
          />
          <Button 
            onClick={handleGuess} 
            disabled={(isPlayer1 ? !!roundData?.player1Guess : !!roundData?.player2Guess) || gameState !== 'playing'}
            className="h-16 w-16 rounded-2xl bg-primary hover:bg-primary/90 shadow-[0_0_30px_rgba(255,123,0,0.3)] group active:scale-95 transition-all"
          >
            <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </Button>
        </div>
      </footer>

      {gameState === 'result' && (
        <div className="fixed inset-0 z-50 bg-black/98 flex flex-col items-center justify-center p-8 space-y-10 animate-in fade-in backdrop-blur-3xl">
           <Trophy className="w-20 h-20 text-secondary animate-bounce drop-shadow-[0_0_30px_rgba(255,165,0,0.5)]" />
           <h2 className="text-4xl font-black font-headline tracking-tighter text-white">ROUND SUMMARY</h2>
           
           <div className="w-full max-w-md grid grid-cols-2 gap-6">
              <div className="bg-white/5 p-6 rounded-3xl text-center space-y-3 border-b-4 border-primary shadow-2xl">
                <p className="text-[10px] text-primary font-black tracking-widest">P1 STATUS</p>
                <p className="font-black text-sm text-white truncate px-2">{roundData?.player1Guess || "NO GUESS"}</p>
                <div className={`text-3xl font-black ${roundData?.player1GuessedCorrectly ? 'text-green-500' : 'text-red-500'}`}>
                  {roundData?.player1GuessedCorrectly ? "+10 HP" : "-10 HP"}
                </div>
              </div>
              <div className="bg-white/5 p-6 rounded-3xl text-center space-y-3 border-b-4 border-secondary shadow-2xl">
                <p className="text-[10px] text-secondary font-black tracking-widest">P2 STATUS</p>
                <p className="font-black text-sm text-white truncate px-2">{roundData?.player2Guess || "NO GUESS"}</p>
                <div className={`text-3xl font-black ${roundData?.player2GuessedCorrectly ? 'text-green-500' : 'text-red-500'}`}>
                   {roundData?.player2GuessedCorrectly ? "+10 HP" : "-10 HP"}
                </div>
              </div>
           </div>

           <div className="text-center w-full max-w-xs space-y-6">
              <div className="bg-white/5 py-4 px-6 rounded-2xl border border-white/10">
                <p className="text-xs text-white/50 font-bold mb-1">Target Player</p>
                <p className="text-xl font-black text-primary uppercase tracking-wider">{targetPlayer?.name}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-white/30 uppercase font-black tracking-[0.3em]">Synching Next Round</p>
                <Progress value={100} className="h-1 bg-white/5 animate-pulse" />
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
