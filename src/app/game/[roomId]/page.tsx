
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trophy, Clock, Send, Swords, CheckCircle2, AlertCircle, Loader2, SmilePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, setDoc, onSnapshot } from "firebase/firestore";
import { FOOTBALLERS, Footballer } from "@/lib/footballer-data";

type GameState = 'countdown' | 'playing' | 'reveal' | 'result';
type RevealStep = 'none' | 'country' | 'position' | 'rarity' | 'full-card';

const EMOTES = [
  { id: 'laugh', emoji: '😂', url: 'https://picsum.photos/seed/laugh/100/100' },
  { id: 'cry', emoji: '😭', url: 'https://picsum.photos/seed/cry/100/100' },
  { id: 'fire', emoji: '🔥', url: 'https://picsum.photos/seed/fire/100/100' },
  { id: 'goal', emoji: '⚽', url: 'https://picsum.photos/seed/goal/100/100' },
  { id: 'shock', emoji: '😲', url: 'https://picsum.photos/seed/shock/100/100' },
  { id: 'flex', emoji: '💪', url: 'https://picsum.photos/seed/flex/100/100' },
];

export default function GamePage() {
  const { roomId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const revealTriggered = useRef(false);

  const roomRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "gameRooms", roomId as string);
  }, [db, roomId, user]);
  
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
  const [floatingEmotes, setFloatingEmotes] = useState<{id: string, url: string, x: number}[]>([]);
  
  const isPlayer1 = room?.player1Id === user?.uid;
  const currentRoundId = `round_${room?.currentRoundNumber || 1}`;
  
  const roundRef = useMemoFirebase(() => {
    if (!user || !roomId) return null;
    return doc(db, "gameRooms", roomId as string, "gameRounds", currentRoundId);
  }, [db, roomId, currentRoundId, user]);
  
  const { data: roundData, isLoading: isRoundLoading } = useDoc(roundRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!room?.lastEmote || !user) return;
    
    const { userId, emoteId, timestamp } = room.lastEmote;
    const now = Date.now();
    const emoteTime = new Date(timestamp).getTime();
    
    if (now - emoteTime < 2000) {
      const emoteObj = EMOTES.find(e => e.id === emoteId);
      if (emoteObj) {
        const id = Math.random().toString();
        const x = Math.random() * 60 + 20;
        setFloatingEmotes(prev => [...prev, { id, url: emoteObj.url, x }]);
        setTimeout(() => {
          setFloatingEmotes(prev => prev.filter(e => e.id !== id));
        }, 2000);
      }
    }
  }, [room?.lastEmote, user]);

  const startNewRoundLocally = useCallback(() => {
    setGameState('countdown');
    setRevealStep('none');
    setCountdown(5);
    setGuessInput("");
    setRoundTimer(null);
    setVisibleHints(1);
    revealTriggered.current = false;

    if (isPlayer1 && room && roundRef) {
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
    if (isPlayer1 && room && !roundData && !isRoundLoading && gameState === 'countdown' && countdown === 5) {
      startNewRoundLocally();
    }
  }, [isPlayer1, room, roundData, isRoundLoading, gameState, countdown, startNewRoundLocally]);

  useEffect(() => {
    if (!room || !user) return;
    
    const p1Unsub = onSnapshot(doc(db, "userProfiles", room.player1Id), snap => setP1Profile(snap.data()));
    const p2Unsub = room.player2Id ? onSnapshot(doc(db, "userProfiles", room.player2Id), snap => setP2Profile(snap.data())) : () => {};

    return () => {
      p1Unsub();
      p2Unsub();
    };
  }, [room, db, user]);

  useEffect(() => {
    if (roundData) {
      const player = FOOTBALLERS.find(f => f.id === roundData.footballerId);
      setTargetPlayer(player || null);

      const hasP1Guessed = !!roundData.player1Guess;
      const hasP2Guessed = !!roundData.player2Guess;
      
      const opponentGuessed = isPlayer1 ? hasP2Guessed : hasP1Guessed;
      const iGuessed = isPlayer1 ? hasP1Guessed : hasP2Guessed;

      if (opponentGuessed && !iGuessed && roundTimer === null && gameState === 'playing') {
        setRoundTimer(15);
        toast({
          title: "Opponent Guessed!",
          description: "15 seconds remaining to lock in your answer!",
          variant: "destructive",
        });
      }

      if (hasP1Guessed && hasP2Guessed && gameState === 'playing' && !revealTriggered.current) {
        handleReveal();
      }
    }
  }, [roundData, isPlayer1, gameState]);

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

    if (gameState === 'playing' && roundTimer !== null && roundTimer > 0) {
      timer = setTimeout(() => setRoundTimer(roundTimer - 1), 1000);
    } else if (roundTimer === 0 && gameState === 'playing' && !revealTriggered.current) {
      handleReveal();
    }

    return () => clearTimeout(timer);
  }, [gameState, countdown, visibleHints, roundTimer]);

  const handleGuess = async () => {
    if (!guessInput.trim() || !roundRef || !roundData || gameState !== 'playing') return;
    
    const isCorrect = guessInput.toLowerCase().trim() === (targetPlayer?.name.toLowerCase().trim() || "");
    const update: any = isPlayer1 
      ? { player1Guess: guessInput, player1GuessedCorrectly: isCorrect }
      : { player2Guess: guessInput, player2GuessedCorrectly: isCorrect };
    
    await updateDoc(roundRef, update);
    toast({ title: "Guess Locked In", description: `You guessed: ${guessInput}` });
    
    if (!roundData.player1Guess && !roundData.player2Guess) {
      setRoundTimer(15);
    }
  };

  const sendEmote = async (emoteId: string) => {
    if (!roomRef || !user) return;
    await updateDoc(roomRef, {
      lastEmote: {
        userId: user.uid,
        emoteId,
        timestamp: new Date().toISOString()
      }
    });
  };

  const handleReveal = () => {
    if (revealTriggered.current) return;
    revealTriggered.current = true;

    setGameState('reveal');
    setRoundTimer(null);
    setRevealStep('none');
    
    // Exact User-Specified Timing:
    // 2.2s country in
    // 3.1s country out
    // 3.8s position in
    // 4.7s position out
    // 4.9s rarity in
    // 5.4s rarity out
    // 6.2s card reveal
    
    setTimeout(() => setRevealStep('country'), 2200);
    setTimeout(() => setRevealStep('none'), 3100);
    setTimeout(() => setRevealStep('position'), 3800);
    setTimeout(() => setRevealStep('none'), 4700);
    setTimeout(() => setRevealStep('rarity'), 4900);
    setTimeout(() => setRevealStep('none'), 5400);
    setTimeout(() => setRevealStep('full-card'), 6200);

    setTimeout(() => {
      setGameState('result');
      if (isPlayer1) calculateRoundResults();
      
      setTimeout(async () => {
        if (room && room.player1CurrentHealth > 0 && room.player2CurrentHealth > 0) {
          if (isPlayer1 && roomRef) {
            await updateDoc(roomRef, { currentRoundNumber: room.currentRoundNumber + 1 });
          }
          startNewRoundLocally();
        } else {
          router.push('/');
        }
      }, 10000);
    }, 13000); // Wait a bit longer to let them see the full card
  };

  const calculateRoundResults = async () => {
    if (!roundData || !targetPlayer || !room || !roomRef) return;

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

  if (isUserLoading || isRoomLoading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Swords className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  const hasP1Guessed = !!roundData?.player1Guess;
  const hasP2Guessed = !!roundData?.player2Guess;
  const iHaveGuessed = isPlayer1 ? hasP1Guessed : hasP2Guessed;

  if (gameState === 'reveal') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
        <video 
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
          src="https://res.cloudinary.com/speed-searches/video/upload/v1772079954/round_xxbuaq.mp4"
        />
        <div className="absolute inset-0 bg-white/5 fc-flash-overlay pointer-events-none z-10" />
        <div className="relative z-20 flex flex-col items-center justify-center w-full h-full p-6">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {revealStep === 'country' && (
              <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
                <div className="text-[200px] filter drop-shadow-[0_0_60px_rgba(255,255,255,0.9)]">{targetPlayer?.flag}</div>
              </div>
            )}
            {revealStep === 'position' && (
              <div className="animate-in fade-in slide-in-from-bottom-20 duration-300">
                <span className="text-[180px] font-black text-white/95 italic tracking-tighter drop-shadow-[0_0_100px_rgba(255,165,0,1)] uppercase">{targetPlayer?.position}</span>
              </div>
            )}
            {revealStep === 'rarity' && (
              <div className="animate-in fade-in zoom-in duration-400">
                <Badge className={`${targetPlayer?.rarity === 'ICON' ? 'bg-yellow-500 text-black' : 'bg-primary text-black'} text-5xl px-16 py-6 font-black italic border-4 border-white/50 shadow-[0_0_120px_rgba(255,255,255,0.7)] uppercase tracking-[0.25em]`}>
                  {targetPlayer?.rarity}
                </Badge>
              </div>
            )}
          </div>

          {revealStep === 'full-card' && (
            <div className="relative fc-card-container">
              <div className={`w-80 h-[520px] fc-animation-reveal rounded-3xl shadow-[0_0_150px_rgba(255,165,0,0.5)] flex flex-col border-[10px] overflow-hidden relative ${targetPlayer?.rarity === 'ICON' ? 'bg-gradient-to-br from-yellow-100 via-yellow-500 to-yellow-800 border-yellow-200' : 'bg-gradient-to-br from-slate-700 via-slate-900 to-black border-slate-600'}`}>
                <div className="p-10 flex flex-col h-full items-center text-center justify-center">
                  <div className="flex flex-col items-center gap-6">
                     <span className="text-8xl font-black text-white/40 leading-none tracking-tighter drop-shadow-2xl">{targetPlayer?.position}</span>
                     <div className="text-[120px] filter drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)] transform scale-125">{targetPlayer?.flag}</div>
                  </div>
                  <div className="mt-12 w-full space-y-4">
                    <div className="bg-black/95 backdrop-blur-2xl px-4 py-5 rounded-2xl w-full border border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
                      <h3 className="text-3xl font-black uppercase text-white tracking-tight fc-text-glow leading-tight">{targetPlayer?.name}</h3>
                    </div>
                  </div>
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
      <div className="fixed inset-0 pointer-events-none z-50">
        {floatingEmotes.map(emote => (
          <div 
            key={emote.id} 
            className="absolute bottom-0 emote-float"
            style={{ left: `${emote.x}%` }}
          >
            <img src={emote.url} className="w-16 h-16 rounded-full border-4 border-white shadow-2xl" alt="emote" />
          </div>
        ))}
      </div>

      <header className="p-4 bg-card/60 backdrop-blur-xl border-b border-white/10 grid grid-cols-3 items-center sticky top-0 z-30">
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-2">
            <div className="relative shrink-0">
              <img src={p1Profile?.avatarUrl || "https://picsum.photos/seed/p1/100/100"} className="w-10 h-10 min-w-[40px] rounded-full border-2 border-primary shadow-lg object-cover" alt="P1" />
              {hasP1Guessed && (
                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 shadow-lg animate-in zoom-in ring-2 ring-white">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-black truncate text-white">{p1Profile?.displayName || "Player 1"}</span>
              {hasP1Guessed && <span className="text-[10px] font-black text-green-500 uppercase leading-none tracking-tighter">GUESSED</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={(room.player1CurrentHealth / room.healthOption) * 100} className="h-2.5 bg-muted/30" />
            <span className="text-xs font-black text-primary">{room.player1CurrentHealth}</span>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <Badge className="bg-primary text-black font-black px-4 py-1.5 text-xs shadow-lg transform -skew-x-12">ROUND {room.currentRoundNumber}</Badge>
        </div>

        <div className="flex flex-col gap-2 items-end min-w-0">
          <div className="flex items-center gap-2 w-full justify-end">
            <div className="flex flex-col items-end min-w-0">
              <span className="text-sm font-black truncate text-white">{p2Profile?.displayName || "Opponent"}</span>
              {hasP2Guessed && <span className="text-[10px] font-black text-green-500 uppercase leading-none tracking-tighter">GUESSED</span>}
            </div>
            <div className="relative shrink-0">
              <img src={p2Profile?.avatarUrl || "https://picsum.photos/seed/p2/100/100"} className="w-10 h-10 min-w-[40px] rounded-full border-2 border-secondary shadow-lg object-cover" alt="P2" />
              {hasP2Guessed && (
                <div className="absolute -top-1 -left-1 bg-green-500 rounded-full p-0.5 shadow-lg animate-in zoom-in ring-2 ring-white">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 w-full justify-end">
            <span className="text-xs font-black text-secondary">{room.player2CurrentHealth}</span>
            <Progress value={(room.player2CurrentHealth / room.healthOption) * 100} className="h-2.5 bg-muted/30 rotate-180" />
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-6 max-w-lg mx-auto w-full pb-48">
        {gameState === 'countdown' ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8">
             <div className="text-[12rem] font-black text-primary animate-ping leading-none drop-shadow-[0_0_50px_rgba(255,123,0,0.5)]">{countdown}</div>
             <p className="text-2xl font-bold uppercase tracking-[0.4em] text-muted-foreground animate-pulse">Prepare to Duel</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Scouting Reports
              </h3>
              {roundTimer !== null && (
                <Badge className="bg-red-600 animate-pulse text-white px-4 h-10 text-sm font-black border-2 border-white/40 shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                  <AlertCircle className="w-4 h-4 mr-2" /> {roundTimer}s REMAINING
                </Badge>
              )}
            </div>
            
            <div className="space-y-3">
              {!targetPlayer ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-4 opacity-50">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-xs font-black uppercase tracking-widest">Awaiting Player Data...</p>
                </div>
              ) : (
                targetPlayer.hints.slice(0, visibleHints).map((hint, idx) => (
                  <div key={idx} className="bg-card/80 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
                    <p className="text-sm font-bold text-white/90 leading-relaxed italic">"{hint}"</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-black/40 backdrop-blur-3xl border-t border-white/10 space-y-4 z-40">
        <div className="max-w-lg mx-auto w-full flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
             {iHaveGuessed && gameState === 'playing' ? (
              <div className="flex-1 flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-full border border-green-500/30">
                <CheckCircle2 className="w-5 h-5 text-green-500 animate-bounce" />
                <p className="text-xs font-black text-green-400 uppercase tracking-[0.2em]">Decision Locked In</p>
              </div>
            ) : (
              <div className="flex gap-2 flex-1">
                <Input 
                  placeholder="ENTER PLAYER NAME" 
                  className="h-16 bg-white/5 border-white/10 font-black tracking-widest text-white placeholder:text-white/20 rounded-2xl focus-visible:ring-primary text-center uppercase"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  disabled={iHaveGuessed || gameState !== 'playing'}
                />
                <Button 
                  onClick={handleGuess} 
                  disabled={iHaveGuessed || gameState !== 'playing'}
                  className="h-16 w-16 rounded-2xl bg-primary hover:bg-primary/90 shadow-[0_0_30px_rgba(255,123,0,0.3)] group active:scale-95 transition-all"
                >
                  <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </Button>
              </div>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="secondary" className="h-16 w-16 rounded-2xl border border-white/10 shadow-xl">
                  <SmilePlus className="w-6 h-6" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3 bg-black/90 backdrop-blur-xl border-white/10" side="top" align="end">
                <div className="grid grid-cols-3 gap-2">
                  {EMOTES.map(emote => (
                    <button 
                      key={emote.id}
                      onClick={() => sendEmote(emote.id)}
                      className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-90"
                    >
                      <img src={emote.url} className="w-full aspect-square rounded-lg object-cover" alt={emote.id} />
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </footer>

      {gameState === 'result' && (
        <div className="fixed inset-0 z-50 bg-black/98 flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in backdrop-blur-3xl overflow-y-auto">
           <Trophy className="w-16 h-16 text-secondary animate-bounce drop-shadow-[0_0_30px_rgba(255,165,0,0.5)]" />
           
           <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-700">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full animate-pulse" />
                <img 
                  src={`https://picsum.photos/seed/${targetPlayer?.id}/400/400`} 
                  className="w-48 h-48 rounded-3xl object-cover border-4 border-primary shadow-[0_0_50px_rgba(255,123,0,0.5)] relative z-10" 
                  alt="correct-player" 
                />
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-20">
                   <Badge className="bg-primary text-black font-black text-xl px-6 py-2 shadow-2xl skew-x-[-12deg]">
                      {targetPlayer?.name}
                   </Badge>
                </div>
              </div>
           </div>

           <div className="w-full max-w-md grid grid-cols-2 gap-4 mt-8">
              <div className="bg-white/5 p-5 rounded-3xl text-center space-y-2 border border-white/5 shadow-2xl">
                <p className="text-[10px] text-primary font-black tracking-widest uppercase opacity-50">P1 GUESS</p>
                <p className="font-black text-xs text-white truncate px-2">{roundData?.player1Guess || "NO GUESS"}</p>
                <div className={`text-4xl font-black ${roundData?.player1GuessedCorrectly ? 'text-green-500' : 'text-red-500'} drop-shadow-lg`}>
                  {roundData?.player1GuessedCorrectly ? "+20" : "-10"}
                </div>
              </div>
              <div className="bg-white/5 p-5 rounded-3xl text-center space-y-2 border border-white/5 shadow-2xl">
                <p className="text-[10px] text-secondary font-black tracking-widest uppercase opacity-50">P2 GUESS</p>
                <p className="font-black text-xs text-white truncate px-2">{roundData?.player2Guess || "NO GUESS"}</p>
                <div className={`text-4xl font-black ${roundData?.player2GuessedCorrectly ? 'text-green-500' : 'text-red-500'} drop-shadow-lg`}>
                   {roundData?.player2GuessedCorrectly ? "+20" : "-10"}
                </div>
              </div>
           </div>

           <div className="text-center">
              <p className="text-xs font-black text-white/30 uppercase tracking-[0.5em] animate-pulse">Next Round Loading...</p>
           </div>
        </div>
      )}
    </div>
  );
}
