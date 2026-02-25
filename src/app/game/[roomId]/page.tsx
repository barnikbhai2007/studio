"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Clock, Send, User, Star, Swords } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, setDoc, onSnapshot, collection } from "firebase/firestore";
import { FOOTBALLERS, Footballer } from "@/lib/footballer-data";

type GameState = 'countdown' | 'playing' | 'reveal' | 'result';

export default function GamePage() {
  const { roomId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();

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
    
    const isCorrect = guessInput.toLowerCase().includes(targetPlayer?.name.toLowerCase() || "");
    const update: any = isPlayer1 
      ? { player1Guess: guessInput, player1GuessedCorrectly: isCorrect, player1GuessTime: new Date().toISOString() }
      : { player2Guess: guessInput, player2GuessedCorrectly: isCorrect, player2GuessTime: new Date().toISOString() };
    
    await updateDoc(roundRef, update);
    toast({ title: "Guess Submitted", description: `You guessed: ${guessInput}` });
    
    if (roundTimer === null) setRoundTimer(15);
  };

  const handleReveal = () => {
    setGameState('reveal');
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
    }, 4000);
  };

  const calculateRoundResults = async () => {
    if (!roundData || !targetPlayer || !room) return;

    let p1Dmg = 0;
    let p2Dmg = 0;

    if (roundData.player1GuessedCorrectly && !roundData.player2GuessedCorrectly) {
      p2Dmg = roundData.player2Guess === "" ? 10 : 20;
    } else if (roundData.player2GuessedCorrectly && !roundData.player1GuessedCorrectly) {
      p1Dmg = roundData.player1Guess === "" ? 10 : 20;
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
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
               <img src={p2Profile?.avatarUrl || "https://picsum.photos/seed/p2/100/100"} className="w-full h-full rounded-full" />
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
              <div className="bg-card p-4 rounded-2xl text-center space-y-2 border-t-4 border-primary">
                <p className="text-xs text-muted-foreground uppercase font-black">P1</p>
                <p className="font-bold text-sm truncate">{roundData?.player1Guess || "SKIPPED"}</p>
                <div className={`text-2xl font-black ${roundData?.player1GuessedCorrectly ? 'text-green-500' : 'text-red-500'}`}>
                  {roundData?.player1GuessedCorrectly ? "+10" : "0"}
                </div>
              </div>
              <div className="bg-card p-4 rounded-2xl text-center space-y-2 border-t-4 border-secondary">
                <p className="text-xs text-muted-foreground uppercase font-black">P2</p>
                <p className="font-bold text-sm truncate">{roundData?.player2Guess || "SKIPPED"}</p>
                <div className={`text-2xl font-black ${roundData?.player2GuessedCorrectly ? 'text-green-500' : 'text-red-500'}`}>
                   {roundData?.player2GuessedCorrectly ? "+10" : "0"}
                </div>
              </div>
           </div>

           <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">Preparing next round...</p>
              <Progress value={80} className="w-48 h-1 mx-auto" />
           </div>
        </div>
      )}
    </div>
  );
}
