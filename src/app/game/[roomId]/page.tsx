"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Trophy, Clock, Send, Swords, CheckCircle2, AlertCircle, Loader2, 
  SmilePlus, Sparkles, Ban, Flag, SkipForward, XCircle, LogOut, Flame,
  ShieldAlert
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, setDoc, onSnapshot, arrayUnion, getDoc, increment } from "firebase/firestore";
import { FOOTBALLERS, Footballer, getRandomFootballer, getRandomRarity } from "@/lib/footballer-data";

type GameState = 'countdown' | 'playing' | 'finalizing' | 'reveal' | 'result';
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
  const [currentRarity, setCurrentRarity] = useState<any>(null);
  
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
    if (room?.status === 'Completed') {
       router.push(`/result/${roomId}`);
    }
  }, [room?.status, roomId, router]);

  useEffect(() => {
    if (!room || !user) return;
    const p1Unsub = onSnapshot(doc(db, "userProfiles", room.player1Id), snap => setP1Profile(snap.data()));
    const p2Unsub = room.player2Id ? onSnapshot(doc(db, "userProfiles", room.player2Id), snap => setP2Profile(snap.data())) : () => {};
    return () => { p1Unsub(); p2Unsub(); };
  }, [room, db, user]);

  useEffect(() => {
    if (!room?.lastEmote || !user) return;
    const { userId, emoteId, timestamp } = room.lastEmote;
    const now = Date.now();
    const emoteTime = new Date(timestamp).getTime();
    if (now - emoteTime < 2000) {
      const emoteObj = EMOTES.find(e => e.id === emoteId);
      if (emoteObj) {
        const id = Math.random().toString();
        const x = Math.random() * 30 + 35; 
        setFloatingEmotes(prev => [...prev, { id: id, url: emoteObj.url, x }]);
        setTimeout(() => setFloatingEmotes(prev => prev.filter(e => e.id !== id)), 2500);
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
    setCurrentRarity(getRandomRarity());

    if (isPlayer1 && room && roundRef) {
      const player = getRandomFootballer(room.usedFootballerIds || []);
      setDoc(roundRef, {
        id: currentRoundId,
        gameRoomId: roomId,
        roundNumber: room.currentRoundNumber,
        footballerId: player.id,
        creatorId: room.player1Id,
        opponentId: room.player2Id,
        hintsRevealedCount: 1,
        player1Guess: "",
        player2Guess: "",
        player1GuessedCorrectly: false,
        player2GuessedCorrectly: false,
        player1ScoreChange: 0,
        player2ScoreChange: 0,
        roundEndedAt: null,
      }, { merge: true });
      if (roomRef) {
        updateDoc(roomRef, { usedFootballerIds: arrayUnion(player.id) });
      }
    }
  }, [isPlayer1, room, roomId, currentRoundId, roundRef, roomRef]);

  useEffect(() => {
    if (isPlayer1 && room && !roundData && !isRoundLoading && gameState === 'countdown' && countdown === 5 && room.status === 'InProgress') {
      startNewRoundLocally();
    }
  }, [isPlayer1, room, roundData, isRoundLoading, gameState, countdown, startNewRoundLocally]);

  useEffect(() => {
    if (roundData) {
      const player = FOOTBALLERS.find(f => f.id === roundData.footballerId);
      setTargetPlayer(player || null);
      
      const hasP1Guessed = !!roundData.player1Guess;
      const hasP2Guessed = !!roundData.player2Guess;
      
      if ((hasP1Guessed || hasP2Guessed) && roundTimer === null && gameState === 'playing') {
        setRoundTimer(15);
      }

      if (hasP1Guessed && hasP2Guessed && gameState === 'playing' && !revealTriggered.current) {
        setGameState('finalizing');
        setTimeout(() => handleReveal(), 3000);
      }
    }
  }, [roundData, gameState, roundTimer]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'countdown' && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (gameState === 'countdown' && countdown === 0) {
      setGameState('playing');
    }

    const anyoneGuessed = !!roundData?.player1Guess || !!roundData?.player2Guess;
    
    if (gameState === 'playing' && visibleHints < 5 && !anyoneGuessed) {
      timer = setTimeout(() => setVisibleHints(prev => prev + 1), 5000);
    }

    if (gameState === 'playing' && roundTimer !== null && roundTimer > 0) {
      timer = setTimeout(() => setRoundTimer(roundTimer - 1), 1000);
    } else if (roundTimer === 0 && gameState === 'playing' && !revealTriggered.current) {
      setGameState('finalizing');
      setTimeout(() => handleReveal(), 3000);
    }
    return () => clearTimeout(timer);
  }, [gameState, countdown, visibleHints, roundTimer, roundData]);

  const normalizeStr = (str: string) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const handleGuess = async () => {
    if (!guessInput.trim() || !roundRef || !roundData || gameState !== 'playing') return;
    const correctFull = normalizeStr(targetPlayer?.name || "");
    const guessNormalized = normalizeStr(guessInput);
    const correctParts = correctFull.split(/\s+/);
    const isCorrect = correctParts.some(part => part === guessNormalized) || correctFull === guessNormalized;
    
    const update: any = isPlayer1 
      ? { player1Guess: guessInput, player1GuessedCorrectly: isCorrect }
      : { player2Guess: guessInput, player2GuessedCorrectly: isCorrect };
    
    await updateDoc(roundRef, update);
    toast({ title: "Decision Locked", description: `You guessed: ${guessInput}` });
  };

  const handleSkip = async () => {
    if (!roundRef || gameState !== 'playing') return;
    const update: any = isPlayer1 
      ? { player1Guess: "SKIPPED", player1GuessedCorrectly: false }
      : { player2Guess: "SKIPPED", player2GuessedCorrectly: false };
    await updateDoc(roundRef, update);
    toast({ title: "Round Skipped" });
  };

  const updateBattleHistory = async (winnerId: string, loserId: string) => {
    const battleHistoryId = [winnerId, loserId].sort().join('_');
    const bhRef = doc(db, "battleHistories", battleHistoryId);
    const bhSnap = await getDoc(bhRef);
    const player1Id = [winnerId, loserId].sort()[0];
    const player2Id = [winnerId, loserId].sort()[1];

    if (!bhSnap.exists()) {
      await setDoc(bhRef, {
        id: battleHistoryId,
        player1Id,
        player2Id,
        player1Wins: player1Id === winnerId ? 1 : 0,
        player2Wins: player2Id === winnerId ? 1 : 0,
        totalMatches: 1,
        lastPlayedGameRoomId: roomId,
        lastPlayedAt: new Date().toISOString()
      });
    } else {
      await updateDoc(bhRef, {
        player1Wins: player1Id === winnerId ? increment(1) : increment(0),
        player2Wins: player2Id === winnerId ? increment(1) : increment(0),
        totalMatches: increment(1),
        lastPlayedGameRoomId: roomId,
        lastPlayedAt: new Date().toISOString()
      });
    }
  };

  const handleForfeit = async () => {
    if (!roomRef || !user || !room) return;
    const winnerId = isPlayer1 ? room.player2Id : room.player1Id;
    const loserId = user.uid;
    await updateDoc(roomRef, { 
      status: 'Completed', 
      winnerId, 
      loserId,
      finishedAt: new Date().toISOString()
    });
    await updateBattleHistory(winnerId, loserId);
    router.push(`/result/${roomId}`);
  };

  const sendEmote = async (emoteId: string) => {
    if (!roomRef || !user) return;
    await updateDoc(roomRef, {
      lastEmote: { userId: user.uid, emoteId, timestamp: new Date().toISOString() }
    });
  };

  const handleReveal = () => {
    if (revealTriggered.current) return;
    revealTriggered.current = true;
    setGameState('reveal');
    setRoundTimer(null);
    setRevealStep('none');
    
    setTimeout(() => setRevealStep('country'), 2200); 
    setTimeout(() => setRevealStep('none'), 3100);    
    setTimeout(() => setRevealStep('position'), 3800); 
    setTimeout(() => setRevealStep('none'), 4700);    
    setTimeout(() => setRevealStep('rarity'), 5200);   
    setTimeout(() => setRevealStep('none'), 6100);    
    setTimeout(() => setRevealStep('full-card'), 6900); 
    
    setTimeout(() => {
      setGameState('result');
      if (isPlayer1) calculateRoundResults();
      setTimeout(async () => {
        if (room && room.player1CurrentHealth > 0 && room.player2CurrentHealth > 0) {
          if (isPlayer1 && roomRef) await updateDoc(roomRef, { currentRoundNumber: room.currentRoundNumber + 1 });
          startNewRoundLocally();
        }
      }, 5000); 
    }, 11900); 
  };

  const calculateRoundResults = async () => {
    if (!roundData || !targetPlayer || !room || !roomRef) return;
    let s1 = roundData.player1GuessedCorrectly ? 10 : (roundData.player1Guess === "SKIPPED" || !roundData.player1Guess ? 0 : -10);
    let s2 = roundData.player2GuessedCorrectly ? 10 : (roundData.player2Guess === "SKIPPED" || !roundData.player2Guess ? 0 : -10);
    const diff = s1 - s2;
    let p1NewHealth = room.player1CurrentHealth;
    let p2NewHealth = room.player2CurrentHealth;

    if (diff > 0) {
      p2NewHealth = Math.max(0, p2NewHealth - diff);
    } else if (diff < 0) {
      p1NewHealth = Math.max(0, p1NewHealth - Math.abs(diff));
    }
    
    const updatePayload: any = {
      player1CurrentHealth: p1NewHealth,
      player2CurrentHealth: p2NewHealth
    };

    if (p1NewHealth <= 0 || p2NewHealth <= 0) {
       const winnerId = p1NewHealth > 0 ? room.player1Id : room.player2Id;
       const loserId = p1NewHealth <= 0 ? room.player1Id : room.player2Id;
       updatePayload.status = 'Completed';
       updatePayload.winnerId = winnerId;
       updatePayload.loserId = loserId;
       updatePayload.finishedAt = new Date().toISOString();
       await updateBattleHistory(winnerId, loserId);
    }

    await updateDoc(roomRef, updatePayload);
    await updateDoc(roundRef, {
      player1ScoreChange: s1,
      player2ScoreChange: s2,
      roundEndedAt: new Date().toISOString()
    });
  };

  if (isUserLoading || isRoomLoading || !room) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Swords className="w-12 h-12 text-primary animate-spin" /></div>;
  }

  const hasP1Guessed = !!roundData?.player1Guess;
  const hasP2Guessed = !!roundData?.player2Guess;
  const iHaveGuessed = isPlayer1 ? hasP1Guessed : hasP2Guessed;
  const oppHasGuessed = isPlayer1 ? hasP2Guessed : hasP1Guessed;
  const anyoneGuessed = hasP1Guessed || hasP2Guessed;

  if (gameState === 'reveal') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline autoPlay src="https://res.cloudinary.com/speed-searches/video/upload/v1772079954/round_xxbuaq.mp4" />
        <div className="absolute inset-0 bg-white/5 fc-flash-overlay pointer-events-none z-10" />
        <div className="relative z-20 flex flex-col items-center justify-center w-full h-full p-6">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {revealStep === 'country' && <div className="animate-in fade-in zoom-in duration-500"><img src={`https://flagcdn.com/w640/${targetPlayer?.countryCode}.png`} className="w-48 md:w-80 filter drop-shadow-[0_0_60px_rgba(255,255,255,0.9)]" alt="flag" /></div>}
            {revealStep === 'position' && <div className="animate-in fade-in slide-in-from-bottom-20 duration-300"><span className="text-[100px] md:text-[180px] font-black text-white/95 tracking-tighter drop-shadow-[0_0_100px_rgba(255,165,0,1)] uppercase">{targetPlayer?.position}</span></div>}
            {revealStep === 'rarity' && currentRarity && <div className="animate-in fade-in zoom-in duration-400"><Badge className={`bg-gradient-to-r ${currentRarity.bg} text-white text-3xl md:text-5xl px-8 md:px-16 py-3 md:py-6 font-black border-4 border-white/50 shadow-[0_0_120px_rgba(255,255,255,0.7)] uppercase tracking-[0.25em]`}>{currentRarity.type}</Badge></div>}
          </div>
          {revealStep === 'full-card' && currentRarity && (
            <div className="relative fc-card-container">
              <div className={`w-64 h-[420px] md:w-80 md:h-[520px] fc-animation-reveal rounded-[2.5rem] shadow-[0_0_150px_rgba(0,0,0,0.8)] flex flex-col border-[12px] md:border-[16px] overflow-hidden relative bg-gradient-to-br ${currentRarity.bg} border-white/20`}>
                {/* Rarity top-left */}
                <div className="absolute top-4 left-4 z-30">
                  <Badge className="bg-black/60 backdrop-blur-md border-white/20 text-[10px] md:text-xs font-black px-4 py-1.5 uppercase tracking-tighter shadow-2xl">
                    {currentRarity.type}
                  </Badge>
                </div>

                <div className="p-6 md:p-10 flex flex-col h-full items-center text-center justify-center relative z-20">
                  {/* Universal Question Mark Reveal Styling */}
                  <div className="flex-1 flex items-center justify-center select-none">
                    <div className="relative">
                      <div className="absolute inset-0 blur-[60px] bg-white/20 rounded-full animate-pulse" />
                      <span className="text-[10rem] md:text-[14rem] font-black text-white/10 drop-shadow-[0_0_40px_rgba(255,255,255,0.3)] leading-none">?</span>
                    </div>
                  </div>

                  {/* Name and Flag at Bottom */}
                  <div className="mt-auto w-full space-y-4 pb-4">
                    <div className="bg-black/80 backdrop-blur-3xl px-4 py-4 md:py-6 rounded-[2rem] w-full border border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                      <h3 className="text-2xl md:text-4xl font-black uppercase text-white tracking-tighter fc-text-glow leading-none mb-4">
                        {targetPlayer?.name}
                      </h3>
                      <div className="flex justify-center">
                        <img 
                          src={`https://flagcdn.com/w640/${targetPlayer?.countryCode}.png`} 
                          className="w-16 md:w-24 shadow-[0_0_30px_rgba(255,255,255,0.2)] rounded-md border border-white/20" 
                          alt="flag" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtle overlay texture/pattern could go here */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.3)_100%)] pointer-events-none" />
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
          <div key={emote.id} className="absolute bottom-0 emote-float" style={{ left: `${emote.x}%` }}>
            <img src={emote.url} className="w-16 h-16 md:w-20 md:h-20 object-contain shadow-2xl" alt="emote" />
          </div>
        ))}
      </div>

      <header className="p-3 md:p-4 bg-card/60 backdrop-blur-xl border-b border-white/10 flex items-center justify-between sticky top-0 z-30 h-16 md:h-20">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="relative shrink-0 w-8 h-8 md:w-10 md:h-10">
            <img src={p1Profile?.avatarUrl || "https://picsum.photos/seed/p1/100/100"} className="w-full h-full rounded-full border-2 border-primary shadow-lg object-cover" alt="P1" />
            {hasP1Guessed && <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 shadow-lg animate-in zoom-in ring-1 ring-white"><CheckCircle2 className="w-2.5 h-2.5 text-white" /></div>}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] md:text-xs font-black truncate text-white uppercase">{p1Profile?.displayName || "Player 1"}</span>
            <div className="flex items-center gap-1 mt-0.5">
               <Progress value={(room.player1CurrentHealth / room.healthOption) * 100} className="h-1.5 w-12 md:w-20 bg-muted/30" />
               <span className="text-[8px] md:text-[10px] font-black text-primary">{room.player1CurrentHealth}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-0.5 px-2">
          <Badge className="bg-primary text-black font-black px-2 py-0.5 text-[8px] md:text-[10px] shadow-lg transform -skew-x-12 whitespace-nowrap uppercase">R{room.currentRoundNumber}</Badge>
          <button onClick={handleForfeit} className="text-[8px] text-red-500 font-black uppercase hover:underline">Forfeit</button>
        </div>

        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <div className="flex flex-col items-end min-w-0">
            <span className="text-[10px] md:text-xs font-black truncate text-white uppercase">{p2Profile?.displayName || "Opponent"}</span>
            <div className="flex items-center gap-1 mt-0.5">
               <span className="text-[8px] md:text-[10px] font-black text-secondary">{room.player2CurrentHealth}</span>
               <Progress value={(room.player2CurrentHealth / room.healthOption) * 100} className="h-1.5 w-12 md:w-20 bg-muted/30 rotate-180" />
            </div>
          </div>
          <div className="relative shrink-0 w-8 h-8 md:w-10 md:h-10">
            <img src={p2Profile?.avatarUrl || "https://picsum.photos/seed/p2/100/100"} className="w-full h-full rounded-full border-2 border-secondary shadow-lg object-cover" alt="P2" />
            {hasP2Guessed && <div className="absolute -top-1 -left-1 bg-green-500 rounded-full p-0.5 shadow-lg animate-in zoom-in ring-1 ring-white"><CheckCircle2 className="w-2.5 h-2.5 text-white" /></div>}
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-6 max-w-lg mx-auto w-full pb-48">
        {gameState === 'countdown' ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-4 text-center">
             <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-[60px] md:blur-[100px] rounded-full animate-pulse" />
                <div className="text-7xl md:text-[10rem] font-black text-primary animate-ping leading-none drop-shadow-[0_0_80px_rgba(255,123,0,0.6)] relative z-10">{countdown}</div>
             </div>
             <p className="text-lg md:text-2xl font-black uppercase tracking-[0.2em] text-white/90 animate-pulse">PREPARE TO DUEL</p>
          </div>
        ) : gameState === 'finalizing' ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center">
             <div className="relative">
                <div className="absolute inset-0 bg-primary/30 blur-[80px] rounded-full animate-pulse" />
                <div className="relative z-10 space-y-4 animate-in zoom-in duration-500">
                   <div className="flex items-center gap-2 bg-primary/20 px-6 py-3 rounded-full border border-primary/40">
                      <Swords className="w-8 h-8 text-primary animate-bounce" />
                      <span className="text-2xl md:text-3xl font-black text-white uppercase">DUEL LOCKDOWN</span>
                   </div>
                   <p className="text-xs font-black text-primary uppercase tracking-[0.3em]">FINALISING ANSWERS...</p>
                </div>
             </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-primary" /> SCOUTING REPORTS
              </h3>
              {anyoneGuessed && (
                <Badge className="bg-red-500 text-white border border-white/20 px-3 py-1 text-[9px] font-black flex items-center gap-1.5 uppercase animate-in zoom-in">
                  <Ban className="w-3.5 h-3.5" /> SCOUTING SUSPENDED
                </Badge>
              )}
            </div>
            {roundTimer !== null && (
              <div className="flex items-center justify-center bg-red-600/20 p-2 rounded-xl border border-red-600/30 animate-pulse">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                <span className="text-sm font-black text-red-500 uppercase">{roundTimer}S REMAINING</span>
              </div>
            )}
            <div className="space-y-3">
              {!targetPlayer ? (
                <div className="flex flex-col items-center justify-center p-12 opacity-50">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                  <p className="text-[10px] font-black uppercase">Loading Intelligence...</p>
                </div>
              ) : (
                targetPlayer.hints.slice(0, visibleHints).map((hint, idx) => (
                  <div key={idx} className="bg-card/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl animate-in slide-in-from-bottom-2">
                    <p className="text-xs md:text-sm font-bold text-white/90 leading-relaxed italic">"{hint}"</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-24 right-4 z-50">
        <Popover>
          <PopoverTrigger asChild>
            <Button size="icon" className="h-14 w-14 rounded-full bg-secondary text-secondary-foreground shadow-2xl hover:scale-110 transition-transform border-4 border-white/20">
              <SmilePlus className="w-7 h-7" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 bg-black/95 backdrop-blur-2xl border-white/10" side="top" align="end">
            <div className="grid grid-cols-3 gap-2">
              {EMOTES.map(emote => (
                <button key={emote.id} onClick={() => sendEmote(emote.id)} className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-90">
                  <img src={emote.url} className="w-full aspect-square rounded-lg object-cover" alt={emote.id} />
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-black/80 backdrop-blur-3xl border-t border-white/10 z-40">
        <div className="max-w-lg mx-auto w-full">
          {iHaveGuessed && gameState === 'playing' ? (
            <div className="flex items-center gap-3 bg-green-500/10 px-4 py-4 rounded-2xl border border-green-500/30">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              <p className="text-[11px] md:text-xs font-black text-green-400 uppercase tracking-widest leading-tight">
                DECISION LOCKED.<br/>
                <span className="opacity-70">{oppHasGuessed ? 'WAITING FOR REVEAL...' : 'WAITING FOR OPPONENT...'}</span>
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Input 
                placeholder="TYPE PLAYER NAME..." 
                className="h-14 bg-white/5 border-white/10 font-black tracking-widest text-white text-center uppercase text-sm md:text-base rounded-2xl" 
                value={guessInput} 
                onChange={(e) => setGuessInput(e.target.value)} 
                disabled={iHaveGuessed || gameState !== 'playing'} 
                onKeyDown={(e) => e.key === 'Enter' && handleGuess()} 
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleGuess} 
                  disabled={iHaveGuessed || gameState !== 'playing' || !guessInput.trim()} 
                  className="flex-1 h-12 rounded-xl bg-primary text-black font-black uppercase text-xs shadow-lg"
                >
                  LOCK IN GUESS
                </Button>
                <Button 
                  onClick={handleSkip} 
                  variant="outline" 
                  disabled={iHaveGuessed || gameState !== 'playing'} 
                  className="w-24 h-12 rounded-xl border-white/10 bg-white/5 text-xs font-black uppercase"
                >
                  SKIP
                </Button>
              </div>
            </div>
          )}
        </div>
      </footer>

      {gameState === 'result' && (
        <div className="fixed inset-0 z-50 bg-black/98 flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in backdrop-blur-3xl">
           <Trophy className="w-16 h-16 text-secondary animate-bounce" />
           <div className="text-center space-y-2">
              <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter">{targetPlayer?.name}</h2>
              <Badge className="bg-primary text-black font-black text-lg px-6 py-1 skew-x-[-12deg]">ROUND OVER</Badge>
           </div>
           
           <div className="w-full max-w-md grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-3xl text-center space-y-3 border border-white/5">
                <span className="text-[10px] font-black text-slate-500 uppercase">{p1Profile?.displayName || "Player 1"}</span>
                <p className="font-black text-xs text-white truncate italic">"{roundData?.player1Guess || "SKIP"}"</p>
                <div className={`text-3xl font-black ${roundData?.player1GuessedCorrectly ? 'text-green-500' : (roundData?.player1Guess && roundData?.player1Guess !== "SKIPPED" ? 'text-red-500' : 'text-slate-500')}`}>
                  {(() => {
                    const pts = roundData?.player1GuessedCorrectly ? 10 : (roundData?.player1Guess && roundData?.player1Guess !== "SKIPPED" ? -10 : 0);
                    return pts > 0 ? `+${pts}` : pts;
                  })()}
                </div>
              </div>
              <div className="bg-white/5 p-4 rounded-3xl text-center space-y-3 border border-white/5">
                <span className="text-[10px] font-black text-slate-500 uppercase">{p2Profile?.displayName || "Player 2"}</span>
                <p className="font-black text-xs text-white truncate italic">"{roundData?.player2Guess || "SKIP"}"</p>
                <div className={`text-3xl font-black ${roundData?.player2GuessedCorrectly ? 'text-green-500' : (roundData?.player2Guess && roundData?.player2Guess !== "SKIPPED" ? 'text-red-500' : 'text-slate-500')}`}>
                  {(() => {
                    const pts = roundData?.player2GuessedCorrectly ? 10 : (roundData?.player2Guess && roundData?.player2Guess !== "SKIPPED" ? -10 : 0);
                    return pts > 0 ? `+${pts}` : pts;
                  })()}
                </div>
              </div>
           </div>

           <div className="w-full max-w-md space-y-4 px-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-black text-primary uppercase">
                   <span className="truncate max-w-[100px]">{p1Profile?.displayName} Health</span>
                   <span>{room.player1CurrentHealth} HP</span>
                </div>
                <Progress value={(room.player1CurrentHealth / room.healthOption) * 100} className="h-3 bg-white/5" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-black text-secondary uppercase">
                   <span className="truncate max-w-[100px]">{p2Profile?.displayName} Health</span>
                   <span>{room.player2CurrentHealth} HP</span>
                </div>
                <Progress value={(room.player2CurrentHealth / room.healthOption) * 100} className="h-3 bg-white/5 rotate-180" />
              </div>
           </div>

           <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em] animate-pulse">PREPARING NEXT ROUND</p>
        </div>
      )}
    </div>
  );
}
