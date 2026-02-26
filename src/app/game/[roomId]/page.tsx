"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trophy, Clock, Send, Swords, CheckCircle2, AlertCircle, Loader2, SmilePlus, Sparkles, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, setDoc, onSnapshot, arrayUnion } from "firebase/firestore";
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
    if (!room?.lastEmote || !user) return;
    const { userId, emoteId, timestamp } = room.lastEmote;
    const now = Date.now();
    const emoteTime = new Date(timestamp).getTime();
    if (now - emoteTime < 2000) {
      const emoteObj = EMOTES.find(e => e.id === emoteId);
      if (emoteObj) {
        const id = Math.random().toString();
        const x = Math.random() * 30 + 65;
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
        player1Id: room.player1Id,
        player2Id: room.player2Id,
        hintsRevealedCount: 1,
        player1Guess: "",
        player2Guess: "",
        player1GuessedCorrectly: false,
        player2GuessedCorrectly: false,
      }, { merge: true });
      if (roomRef) {
        updateDoc(roomRef, { usedFootballerIds: arrayUnion(player.id) });
      }
    }
  }, [isPlayer1, room, roomId, currentRoundId, roundRef, roomRef]);

  useEffect(() => {
    if (isPlayer1 && room && !roundData && !isRoundLoading && gameState === 'countdown' && countdown === 5) {
      startNewRoundLocally();
    }
  }, [isPlayer1, room, roundData, isRoundLoading, gameState, countdown, startNewRoundLocally]);

  useEffect(() => {
    if (!room || !user) return;
    const p1Unsub = onSnapshot(doc(db, "userProfiles", room.player1Id), snap => setP1Profile(snap.data()));
    const p2Unsub = room.player2Id ? onSnapshot(doc(db, "userProfiles", room.player2Id), snap => setP2Profile(snap.data())) : () => {};
    return () => { p1Unsub(); p2Unsub(); };
  }, [room, db, user]);

  useEffect(() => {
    if (roundData) {
      const player = FOOTBALLERS.find(f => f.id === roundData.footballerId);
      setTargetPlayer(player || null);
      const hasP1Guessed = !!roundData.player1Guess;
      const hasP2Guessed = !!roundData.player2Guess;
      const iGuessed = isPlayer1 ? hasP1Guessed : hasP2Guessed;
      if ((hasP1Guessed || hasP2Guessed) && !iGuessed && roundTimer === null && gameState === 'playing') {
        setRoundTimer(15);
      }
      if (hasP1Guessed && hasP2Guessed && gameState === 'playing' && !revealTriggered.current) {
        setGameState('finalizing');
        setTimeout(() => handleReveal(), 3000);
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
    toast({ title: "Guess Locked In", description: `You guessed: ${guessInput}` });
    
    if (!roundData.player1Guess && !roundData.player2Guess) {
      setRoundTimer(15);
    }
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
        } else {
          router.push('/');
        }
      }, 5000);
    }, 11900);
  };

  const calculateRoundResults = async () => {
    if (!roundData || !targetPlayer || !room || !roomRef) return;
    
    let s1 = roundData.player1GuessedCorrectly ? 10 : (roundData.player1Guess ? -10 : 0);
    let s2 = roundData.player2GuessedCorrectly ? 10 : (roundData.player2Guess ? -10 : 0);
    
    const p1Change = s1 - s2;
    const p2Change = s2 - s1;
    
    await updateDoc(roomRef, {
      player1CurrentHealth: Math.max(0, Math.min(room.healthOption, room.player1CurrentHealth + p1Change)),
      player2CurrentHealth: Math.max(0, Math.min(room.healthOption, room.player2CurrentHealth + p2Change))
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
            {revealStep === 'position' && <div className="animate-in fade-in slide-in-from-bottom-20 duration-300"><span className="text-[100px] md:text-[180px] font-black text-white/95 italic tracking-tighter drop-shadow-[0_0_100px_rgba(255,165,0,1)] uppercase">{targetPlayer?.position}</span></div>}
            {revealStep === 'rarity' && currentRarity && <div className="animate-in fade-in zoom-in duration-400"><Badge className={`bg-gradient-to-r ${currentRarity.bg} text-white text-3xl md:text-5xl px-8 md:px-16 py-3 md:py-6 font-black italic border-4 border-white/50 shadow-[0_0_120px_rgba(255,255,255,0.7)] uppercase tracking-[0.25em]`}>{currentRarity.type}</Badge></div>}
          </div>
          {revealStep === 'full-card' && currentRarity && (
            <div className="relative fc-card-container">
              <div className={`w-64 h-[420px] md:w-80 md:h-[520px] fc-animation-reveal rounded-3xl shadow-[0_0_150px_rgba(255,165,0,0.5)] flex flex-col border-[8px] md:border-[10px] overflow-hidden relative bg-gradient-to-br ${currentRarity.bg} border-white/20`}>
                <div className="p-6 md:p-10 flex flex-col h-full items-center text-center justify-center">
                  <div className="flex flex-col items-center gap-4 md:gap-6">
                     <span className="text-6xl md:text-8xl font-black text-white/40 leading-none tracking-tighter drop-shadow-2xl">{targetPlayer?.position}</span>
                     <img src={`https://flagcdn.com/w640/${targetPlayer?.countryCode}.png`} className="w-32 md:w-48 filter drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)] transform scale-125" alt="flag" />
                  </div>
                  <div className="mt-8 md:mt-12 w-full space-y-4">
                    <div className="bg-black/95 backdrop-blur-2xl px-3 md:px-4 py-3 md:py-5 rounded-2xl w-full border border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-black text-primary/80 uppercase tracking-tighter">{currentRarity.type}</span>
                      </div>
                      <h3 className="text-xl md:text-3xl font-black uppercase text-white tracking-tight fc-text-glow leading-tight">{targetPlayer?.name}</h3>
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
          <div key={emote.id} className="absolute bottom-0 emote-float" style={{ left: `${emote.x}%` }}>
            <img src={emote.url} className="w-16 h-16 md:w-20 md:h-20 object-contain shadow-2xl" alt="emote" />
          </div>
        ))}
      </div>

      <header className="p-3 md:p-4 bg-card/60 backdrop-blur-xl border-b border-white/10 grid grid-cols-3 items-center sticky top-0 z-30">
        <div className="flex flex-col gap-1.5 md:gap-2 min-w-0">
          <div className="flex items-center gap-2">
            <div className="relative shrink-0 w-8 h-8 md:w-10 md:h-10">
              <img src={p1Profile?.avatarUrl || "https://picsum.photos/seed/p1/100/100"} className="w-full h-full rounded-full border-2 border-primary shadow-lg object-cover" alt="P1" />
              {hasP1Guessed && <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 shadow-lg animate-in zoom-in ring-1 ring-white"><CheckCircle2 className="w-2.5 h-2.5 text-white" /></div>}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] md:text-sm font-black truncate text-white">{p1Profile?.displayName || "Player 1"}</span>
              {hasP1Guessed && <span className="text-[8px] md:text-[10px] font-black text-green-500 uppercase leading-none tracking-tighter">GUESSED</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={(room.player1CurrentHealth / room.healthOption) * 100} className="h-2 bg-muted/30" />
            <span className="text-[10px] md:text-xs font-black text-primary">{room.player1CurrentHealth}</span>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <Badge className="bg-primary text-black font-black px-3 md:px-4 py-1 md:py-1.5 text-[8px] md:text-[10px] shadow-lg transform -skew-x-12 whitespace-nowrap uppercase">ROUND {room.currentRoundNumber}</Badge>
        </div>
        <div className="flex flex-col gap-1.5 md:gap-2 items-end min-w-0">
          <div className="flex items-center gap-2 w-full justify-end">
            <div className="flex flex-col items-end min-w-0">
              <span className="text-[10px] md:text-sm font-black truncate text-white">{p2Profile?.displayName || "Opponent"}</span>
              {hasP2Guessed && <span className="text-[8px] md:text-[10px] font-black text-green-500 uppercase leading-none tracking-tighter">GUESSED</span>}
            </div>
            <div className="relative shrink-0 w-8 h-8 md:w-10 md:h-10">
              <img src={p2Profile?.avatarUrl || "https://picsum.photos/seed/p2/100/100"} className="w-full h-full rounded-full border-2 border-secondary shadow-lg object-cover" alt="P2" />
              {hasP2Guessed && <div className="absolute -top-1 -left-1 bg-green-500 rounded-full p-0.5 shadow-lg animate-in zoom-in ring-1 ring-white"><CheckCircle2 className="w-2.5 h-2.5 text-white" /></div>}
            </div>
          </div>
          <div className="flex items-center gap-2 w-full justify-end">
            <span className="text-[10px] md:text-xs font-black text-secondary">{room.player2CurrentHealth}</span>
            <Progress value={(room.player2CurrentHealth / room.healthOption) * 100} className="h-2 bg-muted/30 rotate-180" />
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-6 max-w-lg mx-auto w-full pb-48">
        {gameState === 'countdown' ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 md:space-y-8 p-4 md:p-6 text-center">
             <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-[60px] md:blur-[100px] rounded-full animate-pulse" />
                <div className="text-8xl md:text-[10rem] font-black text-primary animate-ping leading-none drop-shadow-[0_0_80px_rgba(255,123,0,0.6)] relative z-10">{countdown}</div>
             </div>
             <div className="flex flex-col items-center gap-2 md:gap-3">
               <p className="text-xl md:text-2xl font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-white/90 animate-pulse">Prepare to Duel</p>
               <div className="h-1 w-16 md:h-1.5 md:w-24 bg-primary rounded-full" />
             </div>
          </div>
        ) : gameState === 'finalizing' ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center animate-in fade-in zoom-in duration-500">
             <div className="relative">
                <div className="absolute inset-0 bg-primary/30 blur-[80px] rounded-full animate-pulse" />
                <Loader2 className="w-20 h-20 md:w-24 md:h-24 text-primary animate-spin relative z-10" />
             </div>
             <div className="space-y-2">
               <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">Finalising Answer</h2>
               <div className="flex items-center justify-center gap-2 text-primary font-bold uppercase text-[10px] tracking-widest animate-pulse">
                  <Sparkles className="w-3 h-3" /> Both players locked in <Sparkles className="w-3 h-3" />
               </div>
             </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-primary" /> Scouting Reports
              </h3>
              {anyoneGuessed && <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 text-[10px] font-black flex items-center gap-1.5 uppercase tracking-widest"><Ban className="w-3 h-3" /> Scouting Suspended</Badge>}
              {roundTimer !== null && (
                <Badge className="bg-red-600 animate-pulse text-white px-3 h-8 text-[10px] md:text-xs font-black border-2 border-white/40 shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                  <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> {roundTimer}s REMAINING
                </Badge>
              )}
            </div>
            <div className="space-y-3">
              {!targetPlayer ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-4 opacity-50">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" /><p className="text-[10px] font-black uppercase tracking-widest">Awaiting Player Data...</p>
                </div>
              ) : (
                targetPlayer.hints.slice(0, visibleHints).map((hint, idx) => (
                  <div key={idx} className="bg-card/80 backdrop-blur-md p-4 md:p-5 rounded-2xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
                    <p className="text-xs md:text-sm font-bold text-white/90 leading-relaxed italic">"{hint}"</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-black/40 backdrop-blur-3xl border-t border-white/10 space-y-4 z-40">
        <div className="max-w-lg mx-auto w-full flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 md:gap-4">
             {iHaveGuessed && gameState === 'playing' ? (
              <div className="flex-1 flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-full border border-green-500/30 h-14 md:h-16">
                <CheckCircle2 className="w-4 h-4 text-green-500 animate-bounce" />
                <p className="text-[10px] font-black text-green-400 uppercase tracking-[0.15em]">Decision Locked. {oppHasGuessed ? 'Waiting for reveal...' : 'Waiting for opponent...'}</p>
              </div>
            ) : (
              <div className="flex gap-2 flex-1">
                <Input placeholder="ENTER PLAYER NAME" className="h-14 md:h-16 bg-white/5 border-white/10 font-black tracking-widest text-white placeholder:text-white/20 rounded-2xl focus-visible:ring-primary text-center uppercase text-sm md:text-base" value={guessInput} onChange={(e) => setGuessInput(e.target.value)} disabled={iHaveGuessed || gameState !== 'playing'} />
                <Button onClick={handleGuess} disabled={iHaveGuessed || gameState !== 'playing'} className="h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-primary hover:bg-primary/90 shadow-[0_0_30px_rgba(255,123,0,0.3)] group active:scale-95 transition-all"><Send className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /></Button>
              </div>
            )}
            <Popover><PopoverTrigger asChild><Button variant="secondary" className="h-14 w-14 md:h-16 md:w-16 rounded-2xl border border-white/10 shadow-xl"><SmilePlus className="w-5 h-5 md:w-6 md:h-6" /></Button></PopoverTrigger><PopoverContent className="w-64 p-3 bg-black/95 backdrop-blur-2xl border-white/10" side="top" align="end"><div className="grid grid-cols-3 gap-2">{EMOTES.map(emote => (<button key={emote.id} onClick={() => sendEmote(emote.id)} className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-90"><img src={emote.url} className="w-full aspect-square rounded-lg object-cover" alt={emote.id} /></button>))}</div></PopoverContent></Popover>
          </div>
        </div>
      </footer>

      {gameState === 'result' && (
        <div className="fixed inset-0 z-50 bg-black/98 flex flex-col items-center justify-center p-6 md:p-8 space-y-6 md:space-y-8 animate-in fade-in backdrop-blur-3xl overflow-y-auto">
           <Trophy className="w-12 h-12 md:w-16 md:h-16 text-secondary animate-bounce" />
           <div className="flex flex-col items-center gap-4 text-center">
              <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter drop-shadow-2xl">{targetPlayer?.name}</h2>
              <Badge className="bg-primary text-black font-black text-lg px-6 py-2 skew-x-[-12deg]">ROUND RESULT</Badge>
           </div>
           <div className="w-full max-w-md grid grid-cols-2 gap-3 md:gap-4 mt-6 md:mt-8">
              <div className="bg-white/5 p-4 md:p-5 rounded-3xl text-center space-y-2 border border-white/5 shadow-2xl flex flex-col items-center min-w-0">
                <img src={p1Profile?.avatarUrl || "https://picsum.photos/seed/p1/100/100"} className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-primary object-cover" alt="p1" />
                <span className="text-[10px] font-black truncate w-full text-white uppercase opacity-70">{p1Profile?.displayName || "Player 1"}</span>
                <p className="font-black text-[10px] md:text-xs text-white truncate w-full px-1 italic">"{roundData?.player1Guess || "SKIPPED"}"</p>
                <div className={`text-2xl md:text-4xl font-black ${roundData?.player1GuessedCorrectly ? 'text-green-500' : (roundData?.player1Guess ? 'text-red-500' : 'text-slate-500')}`}>
                  {(() => {
                    let s1 = roundData?.player1GuessedCorrectly ? 10 : (roundData?.player1Guess ? -10 : 0);
                    let s2 = roundData?.player2GuessedCorrectly ? 10 : (roundData?.player2Guess ? -10 : 0);
                    const diff = s1 - s2;
                    return diff > 0 ? `+${diff}` : diff;
                  })()}
                </div>
              </div>
              <div className="bg-white/5 p-4 md:p-5 rounded-3xl text-center space-y-2 border border-white/5 shadow-2xl flex flex-col items-center min-w-0">
                <img src={p2Profile?.avatarUrl || "https://picsum.photos/seed/p2/100/100"} className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-secondary object-cover" alt="p2" />
                <span className="text-[10px] font-black truncate w-full text-white uppercase opacity-70">{p2Profile?.displayName || "Player 2"}</span>
                <p className="font-black text-[10px] md:text-xs text-white truncate w-full px-1 italic">"{roundData?.player2Guess || "SKIPPED"}"</p>
                <div className={`text-2xl md:text-4xl font-black ${roundData?.player2GuessedCorrectly ? 'text-green-500' : (roundData?.player2Guess ? 'text-red-500' : 'text-slate-500')}`}>
                   {(() => {
                    let s1 = roundData?.player1GuessedCorrectly ? 10 : (roundData?.player1Guess ? -10 : 0);
                    let s2 = roundData?.player2GuessedCorrectly ? 10 : (roundData?.player2Guess ? -10 : 0);
                    const diff = s2 - s1;
                    return diff > 0 ? `+${diff}` : diff;
                  })()}
                </div>
              </div>
           </div>
           <div className="text-center pt-4">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em] animate-pulse">Next Round Loading...</p>
           </div>
        </div>
      )}
    </div>
  );
}
