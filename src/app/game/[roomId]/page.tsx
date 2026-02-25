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

export default function GamePage() {
  const { roomId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Firestore Refs
  const roomRef = useMemoFirebase(() => doc(db, "gameRooms", roomId as string), [db, roomId]);
  const { data: room, isLoading: isRoomLoading } = useDoc(roomRef);

  // Profiles
  const [p1Profile, setP1Profile] = useState<any>(null);
  const [p2Profile, setP2Profile] = useState<any>(null);

  // Local state for game loop
  const [gameState, setGameState] = useState<GameState>('countdown');
  const [countdown, setCountdown] = useState(5);
  const [targetPlayer, setTargetPlayer] = useState<Footballer | null>(null);
  const [visibleHints, setVisibleHints] = useState<number>(1);
  const [guessInput, setGuessInput] = useState("");
  const [roundTimer, setRoundTimer] = useState<number | null>(null);
  
  // Real-time synchronization
  const isPlayer1 = room?.player1Id === user?.uid;
  const currentRoundId = `round_${room?.currentRoundNumber || 1}`;
  const roundRef = useMemoFirebase(() => doc(db, "gameRooms", roomId as string, "gameRounds", currentRoundId), [db, roomId, currentRoundId]);
  const { data: roundData } = useDoc(roundRef);

  const startNewRoundLocally = useCallback(() => {
    setGameState('countdown');
    setCountdown(5);
    setGuessInput("");
    setRoundTimer(null);
    setVisibleHints(1);

    // Leader picks the player
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
    
    // Profiles
    const p1Unsub = onSnapshot(doc(db, "userProfiles", room.player1Id), snap => setP1Profile(snap.data()));
    const p2Unsub = onSnapshot(doc(db, "userProfiles", room.player2Id), snap => setP2Profile(snap.data()));

    if (!roundData) {
      startNewRoundLocally();
    }

    return () => {
      p1Unsub();
      p2Unsub();
    };
  }, [room, db, roundData, startNewRoundLocally]);

  useEffect(() => {
    if (roundData) {
      const player = FOOTBALLERS.find(f => f.id === roundData.footballerId);
      setTargetPlayer(player || null);
    }
  }, [roundData]);

  // Game Loop
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

  // Watch for opponent guesses
  useEffect(() => {
    if (gameState === 'playing' && roundData) {
      const opponentGuessed = isPlayer1 ? roundData.player2Guess : roundData.player1Guess;
      if (opponentGuessed && roundTimer === null) {
        setRoundTimer(15);
      }
      
      // If both guessed, reveal
      if (roundData.player1Guess && roundData.player2Guess) {
        handleReveal();
      }
    }
  }, [roundData, gameState, isPlayer1, roundTimer]);

  const handleGuess = async () => {
    if (!guessInput.trim() || !roundData) return;
    
    const isCorrect = guessInput.toLowerCase().trim() === (targetPlayer?.name.toLowerCase().trim() || "");
    const update: any = isPlayer1 
      ? { player1Guess: guessInput, player1GuessedCorrectly: isCorrect, player1GuessTime: new Date().toISOString() }
      : { player2Guess: guessInput, player2GuessedCorrectly: isCorrect, player2GuessTime: new Date().toISOString() };
    
    await updateDoc(roundRef, update);
    toast({ title: "Guess Submitted", description: `You guessed: ${guessInput}` });
    
    if (roundTimer === null) setRoundTimer(15);
  };

  const handleReveal = () => {
    setGameState('reveal');
    
    // Auto-play the video if ref exists
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(e => console.log("Video autoplay failed", e));
    }

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
    }, 6000); // 6 seconds for the cinematic reveal
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
      // Both wrong
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
        {/* Cinematic Video Background */}
        <video 
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          autoPlay 
          muted 
          playsInline
        >
          <source src="https://player.vimeo.com/external/370331493.sd.mp4?s=29073739925e016142646b5d92825853240a5a51&profile_id=164&oauth2_token_id=57447761" type="video/mp4" />
        </video>
        
        {/* Flash Overlay Effect */}
        <div className="absolute inset-0 bg-white/30 fc-flash-overlay pointer-events-none z-10" />
        
        <div className="relative z-20 flex flex-col items-center justify-center w-full h-full p-6">
          <div className="mb-12 text-center">
            <h2 className="text-xl font-black text-secondary tracking-[0.4em] uppercase mb-2 animate-pulse">Identity Found</h2>
            <div className="h-1 w-48 bg-gradient-to-r from-transparent via-secondary to-transparent mx-auto" />
          </div>

          <div className="relative fc-card-container">
            <div className={`w-72 h-[450px] fc-animation-reveal rounded-2xl shadow-[0_0_100px_rgba(255,165,0,0.3)] flex flex-col border-[6px] overflow-hidden relative ${targetPlayer?.rarity === 'ICON' ? 'bg-gradient-to-br from-yellow-200 via-yellow-500 to-yellow-700 border-yellow-300' : 'bg-gradient-to-br from-slate-800 via-slate-900 to-black border-slate-700'}`}>
              
              {/* Card Decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              
              <div className="p-8 flex flex-col h-full">
                {/* Top Info */}
                <div className="flex flex-col gap-1 items-start">
                   <span className="text-5xl font-black text-black/40 leading-none">{targetPlayer?.position}</span>
                   <div className="text-6xl my-2 filter drop-shadow-lg">{targetPlayer?.flag}</div>
                </div>

                {/* Bottom Info */}
                <div className="mt-auto flex flex-col items-center w-full gap-4">
                  <div className="bg-black/80 backdrop-blur-md px-4 py-3 rounded-lg w-full text-center border border-white/10 shadow-2xl">
                    <h3 className="text-2xl font-black uppercase text-white tracking-tight fc-text-glow">{targetPlayer?.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-secondary fill-secondary" />
                    <span className="text-xs font-black uppercase tracking-widest text-white/60">{targetPlayer?.club}</span>
                  </div>
                </div>
              </div>

              {/* Rarity Badge */}
              <div className="absolute top-4 right-4">
                <Badge className={`${targetPlayer?.rarity === 'ICON' ? 'bg-black text-yellow-500' : 'bg-primary text-black'} font-black italic`}>
                  {targetPlayer?.rarity}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-col items-center gap-2 animate-bounce">
             <Trophy className="w-8 h-8 text-secondary" />
             <span className="text-xs font-black text-white/40 tracking-widest uppercase">Reveal Complete</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <header className="p-4 bg-card/50 backdrop-blur-md border-b border-white/5 grid grid-cols-3 items-center sticky top-0 z-30">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <img src={p1Profile?.avatarUrl || "https://picsum.photos/seed/p1/100/100"} className="w-8 h-8 rounded-full border border-primary" alt="P1" />
            <span className="text-xs font-black truncate">{p1Profile?.displayName || "Player 1"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Progress value={(room.player1CurrentHealth / room.healthOption) * 100} className="h-2 bg-muted-foreground/20" />
            <span className="text-[10px] font-bold text-primary">{room.player1CurrentHealth}</span>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <Badge className="bg-primary text-black font-black mb-1">ROUND {room.currentRoundNumber}</Badge>
        </div>

        <div className="flex flex-col gap-1 items-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black truncate">{p2Profile?.displayName || "Opponent"}</span>
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
               <img src={p2Profile?.avatarUrl || "https://picsum.photos/seed/p2/100/100"} className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex items-center gap-1 w-full justify-end">
            <span className="text-[10px] font-bold text-secondary">{room.player2CurrentHealth}</span>
            <Progress value={(room.player2CurrentHealth / room.healthOption) * 100} className="h-2 bg-muted-foreground/20 rotate-180" />
          </div>
        </div>
      </header>

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
                    {roundTimer}s REMAINING
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2">
                {targetPlayer?.hints.slice(0, visibleHints).map((hint, idx) => (
                  <div key={idx} className="bg-card p-4 rounded-xl border border-white/5 shadow-lg animate-in slide-in-from-right duration-300">
                    <p className="text-sm font-medium leading-relaxed">{hint}</p>
                  </div>
                ))}
                {visibleHints < 5 && (
                  <div className="p-4 rounded-xl border border-dashed border-muted-foreground/30 flex items-center justify-center gap-2 text-muted-foreground italic text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    Analyzing player stats...
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {(isPlayer1 ? roundData?.player1Guess : roundData?.player2Guess) && (
                <div className="bg-green-500/20 text-green-400 p-2 rounded-lg text-xs font-bold flex items-center gap-2 border border-green-500/30">
                  <Star className="w-3 h-3" /> YOU HAVE GUESSED!
                </div>
              )}
              {(isPlayer1 ? roundData?.player2Guess : roundData?.player1Guess) && (
                <div className="bg-primary/20 text-primary p-2 rounded-lg text-xs font-bold flex items-center gap-2 border border-primary/30">
                  <User className="w-3 h-3" /> OPPONENT HAS GUESSED!
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-white/5 space-y-4 z-40">
        <div className="flex gap-2">
          <Input 
            placeholder="Type player name..." 
            className="h-12 bg-muted/50 border-none font-bold"
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
            disabled={(isPlayer1 ? !!roundData?.player1Guess : !!roundData?.player2Guess) || gameState !== 'playing'}
          />
          <Button 
            onClick={handleGuess} 
            disabled={(isPlayer1 ? !!roundData?.player1Guess : !!roundData?.player2Guess) || gameState !== 'playing'}
            className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </footer>

      {gameState === 'result' && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in">
           <Trophy className="w-16 h-16 text-secondary animate-bounce" />
           <h2 className="text-3xl font-black font-headline">ROUND RESULTS</h2>
           
           <div className="w-full grid grid-cols-2 gap-6">
              <div className="bg-card p-4 rounded-2xl text-center space-y-2 border-t-4 border-primary shadow-xl">
                <p className="text-xs text-muted-foreground uppercase font-black">P1</p>
                <p className="font-bold text-sm truncate">{roundData?.player1Guess || "SKIPPED"}</p>
                <div className={`text-2xl font-black ${roundData?.player1GuessedCorrectly ? 'text-green-500' : 'text-red-500'}`}>
                  {roundData?.player1GuessedCorrectly ? "+10 HP" : "-10 HP"}
                </div>
              </div>
              <div className="bg-card p-4 rounded-2xl text-center space-y-2 border-t-4 border-secondary shadow-xl">
                <p className="text-xs text-muted-foreground uppercase font-black">P2</p>
                <p className="font-bold text-sm truncate">{roundData?.player2Guess || "SKIPPED"}</p>
                <div className={`text-2xl font-black ${roundData?.player2GuessedCorrectly ? 'text-green-500' : 'text-red-500'}`}>
                   {roundData?.player2GuessedCorrectly ? "+10 HP" : "-10 HP"}
                </div>
              </div>
           </div>

           <div className="text-center w-full max-w-xs space-y-4">
              <p className="text-sm text-muted-foreground font-medium italic">The correct player was <span className="text-primary font-bold">{targetPlayer?.name}</span></p>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Next Round Starting</p>
                <Progress value={100} className="h-1 bg-muted-foreground/10 animate-pulse" />
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
