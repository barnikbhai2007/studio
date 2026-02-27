
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { 
  Trophy, Clock, Swords, CheckCircle2, AlertCircle, Loader2, 
  SmilePlus, Sparkles, Ban, XCircle, Flame,
  ShieldAlert, PartyPopper, Star, Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { doc, updateDoc, setDoc, onSnapshot, arrayUnion, getDoc, increment, serverTimestamp, collection, query, orderBy, limit, addDoc, writeBatch } from "firebase/firestore";
import { FOOTBALLERS, Footballer, getRandomFootballer, getRandomRarity, RARITIES } from "@/lib/footballer-data";
import { ALL_EMOTES, DEFAULT_EQUIPPED_IDS, UNLOCKED_EMOTE_IDS } from "@/lib/emote-data";

type GameState = 'countdown' | 'playing' | 'finalizing' | 'reveal' | 'result';
type RevealStep = 'none' | 'country' | 'position' | 'rarity' | 'full-card';

const REVEAL_CARD_IMG = "https://res.cloudinary.com/speed-searches/image/upload/v1772119870/photo_2026-02-26_20-32-22_cutwwy.jpg";

export default function GamePage() {
  const params = useParams();
  const roomId = params?.roomId as string;
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  
  const revealTriggered = useRef(false);
  const isInitializingRound = useRef(false);
  const lastProcessedRound = useRef<number>(0);
  const revealTimeouts = useRef<NodeJS.Timeout[]>([]);

  const roomRef = useMemoFirebase(() => {
    if (!user || !roomId) return null;
    return doc(db, "gameRooms", roomId);
  }, [db, roomId, user]);
  
  const { data: room, isLoading: isRoomLoading } = useDoc(roomRef);
  const { data: profile } = useDoc(useMemoFirebase(() => user ? doc(db, "userProfiles", user.uid) : null, [db, user]));

  const equippedEmotes = useMemo(() => {
    const ids = profile?.equippedEmoteIds || DEFAULT_EQUIPPED_IDS;
    return ALL_EMOTES.filter(e => ids.includes(e.id));
  }, [profile]);

  const [p1Profile, setP1Profile] = useState<any>(null);
  const [p2Profile, setP2Profile] = useState<any>(null);

  const [gameState, setGameState] = useState<GameState>('countdown');
  const [revealStep, setRevealStep] = useState<RevealStep>('none');
  const [countdown, setCountdown] = useState(5);
  const [autoNextRoundCountdown, setAutoNextRoundCountdown] = useState<number | null>(null);
  const [targetPlayer, setTargetPlayer] = useState<Footballer | null>(null);
  const [visibleHints, setVisibleHints] = useState<number>(1);
  const [guessInput, setGuessInput] = useState("");
  const [roundTimer, setRoundTimer] = useState<number | null>(null);
  const [currentRarity, setCurrentRarity] = useState<any>(null);
  const [activeEmotes, setActiveEmotes] = useState<{id: string, emoteId: string, createdAt: number}[]>([]);
  const [showGameOverPopup, setShowGameOverPopup] = useState(false);
  const [completedQuest, setCompletedQuest] = useState<any>(null);
  
  const isPlayer1 = room?.player1Id === user?.uid;
  const currentRoundNumber = room?.currentRoundNumber || 1;
  const currentRoundId = `round_${currentRoundNumber}`;
  
  const roundRef = useMemoFirebase(() => {
    if (!user || !roomId) return null;
    return doc(db, "gameRooms", roomId, "gameRounds", currentRoundId);
  }, [db, roomId, currentRoundId, user]);
  
  const { data: roundData, isLoading: isRoundLoading } = useDoc(roundRef);

  const emotesQuery = useMemoFirebase(() => {
    if (!roomId) return null;
    return query(collection(db, "gameRooms", roomId, "emotes"), orderBy("createdAt", "desc"), limit(5));
  }, [db, roomId]);
  const { data: recentEmotes } = useCollection(emotesQuery);

  const checkAndUnlockQuest = useCallback(async (emoteId: string, questTitle: string) => {
    if (!user || !profile) return;
    const currentUnlocked = profile.unlockedEmoteIds || UNLOCKED_EMOTE_IDS;
    if (currentUnlocked.includes(emoteId)) return;

    try {
      const uRef = doc(db, "userProfiles", user.uid);
      await updateDoc(uRef, { unlockedEmoteIds: arrayUnion(emoteId) });
      const emote = ALL_EMOTES.find(e => e.id === emoteId);
      setCompletedQuest({ title: questTitle, emote });
    } catch (e) {}
  }, [user, profile, db]);

  useEffect(() => {
    if (recentEmotes && recentEmotes.length > 0) {
      const now = Date.now();
      const newEmotes = recentEmotes
        .filter(e => now - (e.createdAt?.seconds * 1000 || now) < 3000)
        .map(e => ({ id: e.id, emoteId: e.emoteId, createdAt: e.createdAt?.seconds * 1000 }));
      
      setActiveEmotes(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const filtered = newEmotes.filter(n => !existingIds.has(n.id));
        return [...prev, ...filtered].slice(-10);
      });
    }
  }, [recentEmotes]);

  useEffect(() => {
    if (!isUserLoading && !user) router.push('/');
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (room?.status === 'Completed' && !showGameOverPopup) {
       setShowGameOverPopup(true);
       const t = setTimeout(() => {
         router.push(`/result/${roomId}`);
       }, 5000);
       return () => clearTimeout(t);
    }
  }, [room?.status, roomId, router, showGameOverPopup]);

  useEffect(() => {
    if (!room || !user) return;
    const p1Unsub = onSnapshot(doc(db, "userProfiles", room.player1Id), snap => setP1Profile(snap.data()));
    let p2Unsub = () => {};
    if (room.player2Id) p2Unsub = onSnapshot(doc(db, "userProfiles", room.player2Id), snap => setP2Profile(snap.data()));
    return () => { p1Unsub(); p2Unsub(); };
  }, [room, db, user]);

  useEffect(() => {
    if (roundData?.timerStartedAt && gameState === 'playing') {
      const startTime = new Date(roundData.timerStartedAt).getTime();
      const tick = () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, 15 - elapsed);
        setRoundTimer(remaining);
        if (remaining === 0 && !revealTriggered.current) {
          handleRevealTrigger();
        }
      };
      tick();
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    }
  }, [roundData?.timerStartedAt, gameState]);

  useEffect(() => {
    if (currentRoundNumber !== lastProcessedRound.current) {
      // RESET ALL ROUND STATE IMMEDIATELY
      lastProcessedRound.current = currentRoundNumber;
      revealTriggered.current = false;
      isInitializingRound.current = false;
      
      revealTimeouts.current.forEach(t => clearTimeout(t));
      revealTimeouts.current = [];
      
      setRevealStep('none');
      setGuessInput("");
      setRoundTimer(null);
      setVisibleHints(1);
      setTargetPlayer(null);
      setAutoNextRoundCountdown(null);

      if (currentRoundNumber === 1) {
        setGameState('countdown');
        setCountdown(5);
      } else {
        setGameState('playing');
      }
    }
  }, [currentRoundNumber]);

  const startNewRoundLocally = useCallback(async () => {
    if (isInitializingRound.current || !isPlayer1 || !room || !roundRef || !roomRef) return;
    isInitializingRound.current = true;

    const pickedRarity = getRandomRarity();
    setCurrentRarity(pickedRarity);

    try {
      const player = getRandomFootballer(room.usedFootballerIds || [], room.gameVersion || 'DEMO');
      await setDoc(roundRef, {
        id: currentRoundId,
        gameRoomId: roomId,
        roundNumber: currentRoundNumber,
        footballerId: player.id,
        rarityType: pickedRarity.type,
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
        timerStartedAt: null,
      }, { merge: true });
      
      await updateDoc(roomRef, { usedFootballerIds: arrayUnion(player.id) });
    } catch (err) {
      console.error("Round init error:", err);
    } finally {
      isInitializingRound.current = false;
    }
  }, [isPlayer1, room, roomId, currentRoundId, currentRoundNumber, roundRef, roomRef]);

  useEffect(() => {
    if (isPlayer1 && room?.status === 'InProgress' && !roundData && !isRoundLoading && !isInitializingRound.current) {
      startNewRoundLocally();
    }
  }, [isPlayer1, room?.status, roundData, isRoundLoading, startNewRoundLocally]);

  useEffect(() => {
    if (roundData && gameState === 'playing') {
      const player = FOOTBALLERS.find(f => f.id === roundData.footballerId);
      setTargetPlayer(player || null);
      if (roundData.rarityType) {
        const rarity = RARITIES.find(r => r.type === roundData.rarityType);
        if (rarity) setCurrentRarity(rarity);
      }
      
      const bothGuessed = !!roundData.player1Guess && !!roundData.player2Guess;
      if (bothGuessed && !revealTriggered.current) {
        handleRevealTrigger();
      }
    }
  }, [roundData, gameState]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'countdown' && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (gameState === 'countdown' && countdown === 0) {
      setGameState('playing');
    }
    if (gameState === 'playing' && visibleHints < 5 && !roundData?.timerStartedAt) {
      timer = setTimeout(() => setVisibleHints(prev => prev + 1), 5000);
    }
    return () => clearTimeout(timer);
  }, [gameState, countdown, visibleHints, roundData?.timerStartedAt]);

  useEffect(() => {
    if (gameState === 'result' && isPlayer1 && autoNextRoundCountdown === null) {
      setAutoNextRoundCountdown(5);
    }

    let timer: NodeJS.Timeout;
    if (autoNextRoundCountdown !== null && autoNextRoundCountdown > 0) {
      timer = setTimeout(() => setAutoNextRoundCountdown(autoNextRoundCountdown - 1), 1000);
    } else if (autoNextRoundCountdown === 0 && isPlayer1) {
      handleNextRound();
    }
    return () => clearTimeout(timer);
  }, [gameState, autoNextRoundCountdown, isPlayer1]);

  const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const handleGuess = async () => {
    if (!guessInput.trim() || !roundRef || !roundData || gameState !== 'playing' || revealTriggered.current) return;
    const correctFull = normalizeStr(targetPlayer?.name || "");
    const guessNormalized = normalizeStr(guessInput);
    const isCorrect = correctFull.split(/\s+/).some(part => part === guessNormalized) || correctFull === guessNormalized;
    const update: any = isPlayer1 ? { player1Guess: guessInput, player1GuessedCorrectly: isCorrect } : { player2Guess: guessInput, player2GuessedCorrectly: isCorrect };
    if (!roundData.timerStartedAt) update.timerStartedAt = new Date().toISOString();
    await updateDoc(roundRef, update);
    toast({ title: "DECISION LOCKED", description: `GUESS: ${guessInput.toUpperCase()}` });
  };

  const handleSkip = async () => {
    if (!roundRef || gameState !== 'playing' || revealTriggered.current) return;
    const update: any = isPlayer1 ? { player1Guess: "SKIPPED", player1GuessedCorrectly: false } : { player2Guess: "SKIPPED", player2GuessedCorrectly: false };
    if (!roundData?.timerStartedAt) update.timerStartedAt = new Date().toISOString();
    await updateDoc(roundRef, update);
    toast({ title: "ROUND SKIPPED" });
  };

  const handleRevealTrigger = () => {
    if (revealTriggered.current) return;
    revealTriggered.current = true;
    setGameState('finalizing');
    const t = setTimeout(() => handleRevealSequence(), 2000);
    revealTimeouts.current.push(t);
  };

  const handleRevealSequence = async () => {
    setGameState('reveal');
    setRevealStep('none');
    
    if (user && targetPlayer && currentRarity) {
      const questCards = [
        { name: "Cristiano Ronaldo", rarity: "PLATINUM", emoteId: "ronaldo_platinum", title: "PLATINUM CR7 UNLOCKED" },
        { name: "Lionel Messi", rarity: "DIAMOND", emoteId: "messi_diamond", title: "DIAMOND MESSI UNLOCKED" },
        { name: "Erling Haaland", rarity: "GOLD", emoteId: "haaland_gold", title: "GOLDEN HAALAND UNLOCKED" },
        { name: "Kylian Mbappé", rarity: "SILVER", emoteId: "mbappe_silver", title: "SILVER MBAPPE UNLOCKED" },
        { name: "Neymar Jr", rarity: "MASTER", emoteId: "neymar_master", title: "MASTER NEYMAR UNLOCKED" }
      ];
      const matchedQuest = questCards.find(q => q.name === targetPlayer.name && q.rarity === currentRarity.type);
      if (matchedQuest) checkAndUnlockQuest(matchedQuest.emoteId, matchedQuest.title);
    }
    
    const steps = [
      { s: 'country', t: 1000 },
      { s: 'none', t: 2200 },
      { s: 'position', t: 2800 },
      { s: 'none', t: 4000 },
      { s: 'rarity', t: 4600 },
      { s: 'none', t: 5800 },
      { s: 'full-card', t: 6500 }
    ];

    steps.forEach(step => {
      const t = setTimeout(() => setRevealStep(step.s as RevealStep), step.t);
      revealTimeouts.current.push(t);
    });
    
    const finalT = setTimeout(() => {
      setGameState('result');
      if (isPlayer1) calculateRoundResults();
    }, 11500);
    revealTimeouts.current.push(finalT);
  };

  useEffect(() => {
    return () => {
      revealTimeouts.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const handleNextRound = async () => {
     if (!room || !roomRef || !isPlayer1) return;
     if (room.player1CurrentHealth > 0 && room.player2CurrentHealth > 0) {
        await updateDoc(roomRef, { currentRoundNumber: room.currentRoundNumber + 1 });
     }
  };

  const calculateRoundResults = async () => {
    if (!roundData || !targetPlayer || !room || !roomRef) return;
    let s1 = roundData.player1GuessedCorrectly ? 10 : (roundData.player1Guess === "SKIPPED" || !roundData.player1Guess ? 0 : -10);
    let s2 = roundData.player2GuessedCorrectly ? 10 : (roundData.player2Guess === "SKIPPED" || !roundData.player2Guess ? 0 : -10);
    const diff = s1 - s2;
    let p1NewHealth = room.player1CurrentHealth;
    let p2NewHealth = room.player2CurrentHealth;
    if (diff > 0) p2NewHealth = Math.max(0, p2NewHealth - diff);
    else if (diff < 0) p1NewHealth = Math.max(0, p1NewHealth - Math.abs(diff));
    
    const updatePayload: any = { player1CurrentHealth: p1NewHealth, player2CurrentHealth: p2NewHealth };
    
    if (p1NewHealth <= 0 || p2NewHealth <= 0) {
       const winnerId = p1NewHealth > 0 ? room.player1Id : room.player2Id;
       const loserId = p1NewHealth <= 0 ? room.player1Id : room.player2Id;
       updatePayload.status = 'Completed';
       updatePayload.winnerId = winnerId;
       updatePayload.loserId = loserId;
       updatePayload.finishedAt = new Date().toISOString();
       const batch = writeBatch(db);
       batch.update(doc(db, "userProfiles", winnerId), { totalWins: increment(1), weeklyWins: increment(1), totalGamesPlayed: increment(1) });
       batch.update(doc(db, "userProfiles", loserId), { totalLosses: increment(1), totalGamesPlayed: increment(1) });
       const bhId = [room.player1Id, room.player2Id].sort().join('_');
       const bhRef = doc(db, "battleHistories", bhId);
       const bhSnap = await getDoc(bhRef);
       if (!bhSnap.exists()) {
         batch.set(bhRef, { id: bhId, player1Id: [winnerId, loserId].sort()[0], player2Id: [winnerId, loserId].sort()[1], player1Wins: winnerId === [winnerId, loserId].sort()[0] ? 1 : 0, player2Wins: winnerId === [winnerId, loserId].sort()[1] ? 1 : 0, totalMatches: 1 });
       } else {
         const winnerKey = winnerId === bhSnap.data().player1Id ? 'player1Wins' : 'player2Wins';
         batch.update(bhRef, { [winnerKey]: increment(1), totalMatches: increment(1) });
       }
       batch.update(roomRef, updatePayload);
       await batch.commit();
    } else {
      await updateDoc(roomRef, updatePayload);
    }
    await updateDoc(roundRef, { player1ScoreChange: s1, player2ScoreChange: s2, roundEndedAt: new Date().toISOString() });
  };

  const handleForfeit = async () => {
    if (!roomRef || !user || !room || room.status !== 'InProgress') return;
    const winnerId = isPlayer1 ? room.player2Id : room.player1Id;
    const loserId = user.uid;
    const batch = writeBatch(db);
    batch.update(doc(db, "userProfiles", winnerId), { totalWins: increment(1), weeklyWins: increment(1), totalGamesPlayed: increment(1) });
    batch.update(doc(db, "userProfiles", loserId), { totalLosses: increment(1), totalGamesPlayed: increment(1) });
    const bhId = [winnerId, loserId].sort().join('_');
    const bhRef = doc(db, "battleHistories", bhId);
    const bhSnap = await getDoc(bhRef);
    if (!bhSnap.exists()) {
      batch.set(bhRef, { id: bhId, player1Id: [winnerId, loserId].sort()[0], player2Id: [winnerId, loserId].sort()[1], player1Wins: winnerId === [winnerId, loserId].sort()[0] ? 1 : 0, player2Wins: winnerId === [winnerId, loserId].sort()[1] ? 1 : 0, totalMatches: 1 });
    } else {
      const winnerKey = winnerId === bhSnap.data().player1Id ? 'player1Wins' : 'player2Wins';
      batch.update(bhRef, { [winnerKey]: increment(1), totalMatches: increment(1) });
    }
    batch.update(roomRef, { status: 'Completed', winnerId, loserId, finishedAt: new Date().toISOString() });
    await batch.commit();
  };

  const sendEmote = async (emoteId: string) => {
    if (!roomId || !user) return;
    await addDoc(collection(db, "gameRooms", roomId, "emotes"), { emoteId, senderId: user.uid, createdAt: serverTimestamp() });
  };

  if (isUserLoading || isRoomLoading || !room) return <div className="min-h-screen flex items-center justify-center bg-background"><Swords className="w-12 h-12 text-primary animate-spin" /></div>;

  const hasP1Guessed = !!roundData?.player1Guess;
  const hasP2Guessed = !!roundData?.player2Guess;
  const iHaveGuessed = isPlayer1 ? hasP1Guessed : hasP2Guessed;
  const oppHasGuessed = isPlayer1 ? hasP2Guessed : hasP1Guessed;

  if (gameState === 'reveal') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
        <video className="absolute inset-0 w-full h-full object-cover opacity-60" playsInline autoPlay src="https://res.cloudinary.com/speed-searches/video/upload/v1772079954/round_xxbuaq.mp4" />
        <div className="absolute inset-0 bg-white/5 fc-flash-overlay pointer-events-none z-10" />
        <div className="relative z-20 flex flex-col items-center justify-center w-full h-full p-6">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {revealStep === 'country' && targetPlayer && <div className="animate-in fade-in zoom-in duration-500"><img src={`https://flagcdn.com/w640/${targetPlayer.countryCode}.png`} className="w-48 md:w-80 filter drop-shadow-[0_0_60px_rgba(255,255,255,0.9)]" alt="flag" /></div>}
            {revealStep === 'position' && targetPlayer && <div className="animate-in fade-in slide-in-from-bottom-20 duration-300"><span className="text-[100px] md:text-[180px] font-black text-white drop-shadow-[0_0_100px_rgba(255,165,0,1)] uppercase">{targetPlayer.position}</span></div>}
            {revealStep === 'rarity' && currentRarity && <div className="animate-in fade-in zoom-in duration-400"><Badge className={`bg-gradient-to-r ${currentRarity.bg} text-white text-3xl md:text-5xl px-8 md:px-16 py-3 md:py-6 font-black border-4 border-white/50 uppercase tracking-widest`}>{currentRarity.type}</Badge></div>}
          </div>
          {revealStep === 'full-card' && currentRarity && targetPlayer && (
            <div className="relative fc-card-container">
              <div className={`w-72 h-[480px] md:w-96 md:h-[600px] fc-animation-reveal rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col border-[10px] md:border-[14px] overflow-hidden relative bg-gradient-to-br ${currentRarity.bg} border-white/20`}>
                <div className="absolute top-4 left-4 z-30"><Badge className="bg-black/80 backdrop-blur-md border-white/10 text-[10px] md:text-xs font-black px-4 py-2 uppercase tracking-tighter">{currentRarity.type}</Badge></div>
                <img src={REVEAL_CARD_IMG} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="background" />
                <div className="mt-auto relative z-20 p-4">
                  <div className="bg-black/90 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl flex flex-col items-center text-center">
                    <h3 className="text-3xl md:text-4xl font-black uppercase text-white leading-none mb-4">{targetPlayer.name}</h3>
                    <img src={`https://flagcdn.com/w640/${targetPlayer.countryCode}.png`} className="w-16 md:w-24 shadow-2xl rounded-sm border border-white/20" alt="flag" />
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <Dialog open={!!completedQuest} onOpenChange={() => setCompletedQuest(null)}>
        <DialogContent className="bg-black/95 border-primary/20 p-8 text-center flex flex-col items-center gap-6 max-w-sm rounded-[3rem] overflow-hidden">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 blur-[60px] animate-pulse" /><PartyPopper className="w-16 h-16 text-primary relative z-10 animate-bounce" />
          </div>
          <div className="space-y-2 relative z-10"><h2 className="text-2xl font-black text-white uppercase tracking-tighter">QUEST COMPLETE!</h2><p className="text-primary text-sm font-black uppercase tracking-widest">{completedQuest?.title}</p></div>
          <div className="bg-white/5 p-4 rounded-3xl border border-white/10 flex flex-col items-center gap-3 w-full relative z-10">
            <img src={completedQuest?.emote?.url} className="w-24 h-24 rounded-2xl object-cover shadow-2xl border-2 border-primary/50" alt="reward" />
            <div><p className="text-[10px] font-black text-slate-500 uppercase">REWARD UNLOCKED</p><p className="text-sm font-black text-white uppercase">{completedQuest?.emote?.name}</p></div>
          </div>
          <Button onClick={() => setCompletedQuest(null)} className="w-full bg-primary text-black font-black uppercase rounded-2xl h-12">CLAIM REWARD</Button>
        </DialogContent>
      </Dialog>
      <div className="fixed inset-0 pointer-events-none z-[60]">
        {activeEmotes.map((e) => {
          const emoteData = ALL_EMOTES.find(em => em.id === e.emoteId);
          return (<div key={e.id} className="absolute bottom-24 right-8 emote-float"><img src={emoteData?.url} className="w-16 h-16 rounded-xl shadow-2xl border-2 border-white/20" alt="emote" /></div>);
        })}
      </div>
      {showGameOverPopup && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 backdrop-blur-2xl">
           <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
              <div className="relative z-10 space-y-6">
                 <h2 className="text-7xl font-black text-white uppercase animate-bounce">{room.winnerId === user?.uid ? "VICTORY" : "DEFEAT"}</h2>
                 <div className="bg-white/5 px-8 py-4 rounded-3xl border border-white/10">
                    <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">
                      {room.player1CurrentHealth <= 0 || room.player2CurrentHealth <= 0 ? "TOTAL KNOCKOUT" : "VICTORY BY FORFEIT"}
                    </p>
                    <p className="text-lg font-black text-white uppercase">{room.winnerId === room.player1Id ? p1Profile?.displayName : p2Profile?.displayName} HAS WON</p>
                 </div>
              </div>
           </div>
        </div>
      )}
      <header className="p-4 bg-card/60 backdrop-blur-xl border-b border-white/10 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="relative shrink-0 w-10 h-10">
            <img src={p1Profile?.avatarUrl || "https://picsum.photos/seed/p1/100/100"} className="w-full h-full rounded-full border-2 border-primary shadow-lg object-cover" alt="P1" />
            {hasP1Guessed && <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 ring-1 ring-white"><CheckCircle2 className="w-3 h-3 text-white" /></div>}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-black truncate text-white uppercase">{p1Profile?.displayName || "PLAYER 1"}</span>
            <div className="flex items-center gap-1 mt-0.5"><Progress value={(room.player1CurrentHealth / room.healthOption) * 100} className="h-1.5 w-16 bg-muted/30 transition-all duration-1000" /><span className="text-[8px] font-black text-primary">{room.player1CurrentHealth}HP</span></div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 px-4"><Badge className="bg-primary text-black font-black px-3 py-0.5 text-[10px] uppercase">RD {room.currentRoundNumber}</Badge><button onClick={handleForfeit} className="text-[8px] text-red-500 font-black uppercase hover:underline">FORFEIT</button></div>
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <div className="flex flex-col items-end min-w-0">
            <span className="text-[10px] font-black truncate text-white uppercase">{p2Profile?.displayName || "OPPONENT"}</span>
            <div className="flex items-center gap-1 mt-0.5"><span className="text-[8px] font-black text-secondary">{room.player2CurrentHealth}HP</span><Progress value={(room.player2CurrentHealth / room.healthOption) * 100} className="h-1.5 w-16 bg-muted/30 rotate-180 transition-all duration-1000" /></div>
          </div>
          <div className="relative shrink-0 w-10 h-10">
            <img src={p2Profile?.avatarUrl || "https://picsum.photos/seed/p2/100/100"} className="w-full h-full rounded-full border-2 border-secondary shadow-lg object-cover" alt="P2" />
            {hasP2Guessed && <div className="absolute -top-1 -left-1 bg-green-500 rounded-full p-0.5 ring-1 ring-white"><CheckCircle2 className="w-3 h-3 text-white" /></div>}
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 flex flex-col gap-6 max-w-lg mx-auto w-full pb-48">
        {gameState === 'countdown' ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-4 text-center">
             <div className="relative"><div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full animate-pulse" /><div className="text-[10rem] font-black text-primary animate-ping leading-none relative z-10">{countdown}</div></div>
             <p className="text-2xl font-black uppercase tracking-widest text-white/90 animate-pulse">PREPARE TO DUEL</p>
          </div>
        ) : gameState === 'finalizing' ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center">
             <div className="relative"><div className="absolute inset-0 bg-primary/30 blur-[80px] rounded-full animate-pulse" /><div className="relative z-10 space-y-4 animate-in zoom-in duration-500"><div className="flex items-center gap-3 bg-primary/20 px-8 py-4 rounded-full border border-primary/40"><Swords className="w-10 h-10 text-primary animate-bounce" /><span className="text-3xl font-black text-white uppercase">DUEL LOCKDOWN</span></div><p className="text-xs font-black text-primary uppercase tracking-widest">FINALISING INTELLIGENCE...</p></div></div>
          </div>
        ) : gameState === 'result' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="text-center space-y-1">
              <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">ROUND SUMMARY</h2>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">BATTLE REPORT</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full">
              <Card className="bg-white/5 border-white/10 p-6 rounded-[2rem] flex flex-col items-center gap-4 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <img src={p1Profile?.avatarUrl || "https://picsum.photos/seed/p1/100/100"} className="w-12 h-12 rounded-full border-2 border-primary object-cover" alt="p1" />
                <span className="text-[10px] font-black text-slate-500 uppercase truncate w-full text-center">{p1Profile?.displayName || "PLAYER 1"}</span>
                <div className="w-full flex items-center gap-2">
                  <Progress value={(room.player1CurrentHealth / room.healthOption) * 100} className="h-2 flex-1 transition-all duration-1000" />
                </div>
                <Badge className={`${(roundData?.player1ScoreChange ?? 0) > 0 ? "bg-green-500" : ((roundData?.player1ScoreChange ?? 0) < 0 ? "bg-red-500" : "bg-slate-700")} text-white font-black px-4 py-1 relative z-10`}>
                  {(roundData?.player1ScoreChange ?? 0) > 0 ? `+${roundData.player1ScoreChange}` : (roundData?.player1ScoreChange ?? 0)} HP
                </Badge>
              </Card>
              
              <Card className="bg-white/5 border-white/10 p-6 rounded-[2rem] flex flex-col items-center gap-4 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <img src={p2Profile?.avatarUrl || "https://picsum.photos/seed/p2/100/100"} className="w-12 h-12 rounded-full border-2 border-secondary object-cover" alt="p2" />
                <span className="text-[10px] font-black text-slate-500 uppercase truncate w-full text-center">{p2Profile?.displayName || "OPPONENT"}</span>
                <div className="w-full flex items-center gap-2">
                  <Progress value={(room.player2CurrentHealth / room.healthOption) * 100} className="h-2 flex-1 transition-all duration-1000 rotate-180" />
                </div>
                <Badge className={`${(roundData?.player2ScoreChange ?? 0) > 0 ? "bg-green-500" : ((roundData?.player2ScoreChange ?? 0) < 0 ? "bg-red-500" : "bg-slate-700")} text-white font-black px-4 py-1 relative z-10`}>
                  {(roundData?.player2ScoreChange ?? 0) > 0 ? `+${roundData.player2ScoreChange}` : (roundData?.player2ScoreChange ?? 0)} HP
                </Badge>
              </Card>
            </div>

            <div className="w-full bg-white/5 p-8 rounded-[2.5rem] border border-white/10 flex flex-col items-center text-center gap-4 shadow-2xl">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">INTEL IDENTITY</p>
                <p className="text-5xl font-black text-white uppercase tracking-tighter italic leading-none">{targetPlayer?.name}</p>
              </div>
              {targetPlayer && <img src={`https://flagcdn.com/w640/${targetPlayer.countryCode}.png`} className="w-16 h-10 shadow-lg border border-white/20 rounded-md" alt="flag" />}
            </div>

            <div className="w-full space-y-4">
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-1000 ease-linear" 
                  style={{ width: `${(autoNextRoundCountdown || 0) * 20}%` }}
                />
              </div>
              <p className="text-[10px] font-black text-center text-slate-500 uppercase tracking-widest animate-pulse">
                NEXT ROUND IN {autoNextRoundCountdown}S...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2"><h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> SCOUTING REPORTS</h3>{roundData?.timerStartedAt && (<Badge className="bg-red-500 text-white px-3 py-1 text-[10px] font-black uppercase animate-in zoom-in"><Ban className="w-3 h-3 mr-1.5" /> SCOUTING SUSPENDED</Badge>)}</div>
            {roundTimer !== null && (<div className="flex items-center justify-center bg-red-600/20 p-3 rounded-xl border border-red-600/30 animate-pulse"><AlertCircle className="w-5 h-5 text-red-500 mr-2" /><span className="text-base font-black text-red-500 uppercase">{roundTimer}S REMAINING</span></div>)}
            <div className="space-y-3">{!targetPlayer ? (<div className="flex flex-col items-center justify-center p-12 opacity-50"><Loader2 className="w-8 h-8 animate-spin text-primary mb-2" /><p className="text-[10px] font-black uppercase">Loading Intelligence...</p></div>) : (targetPlayer.hints.slice(0, visibleHints).map((hint, idx) => (<div key={idx} className="bg-card/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl animate-in slide-in-from-bottom-2"><p className="text-sm font-bold text-white/90 leading-relaxed">"{hint}"</p></div>)))}</div>
          </div>
        )}
      </main>
      <div className="fixed bottom-24 right-4 z-50">
        <Popover><PopoverTrigger asChild><Button size="icon" className="h-14 w-14 rounded-full bg-secondary text-secondary-foreground shadow-2xl hover:scale-110 border-4 border-white/20"><SmilePlus className="w-7 h-7" /></Button></PopoverTrigger><PopoverContent className="w-64 p-3 bg-black/95 backdrop-blur-2xl border-white/10" side="top" align="end"><div className="grid grid-cols-3 gap-2">{equippedEmotes.map(emote => (<button key={emote.id} onClick={() => sendEmote(emote.id)} className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-90"><img src={emote.url} className="w-full aspect-square rounded-lg object-cover" alt={emote.name} /></button>))}</div></PopoverContent></Popover>
      </div>
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-black/80 backdrop-blur-3xl border-t border-white/10 z-40">
        <div className="max-w-lg mx-auto w-full">{iHaveGuessed && gameState === 'playing' ? (<div className="flex items-center gap-4 bg-green-500/10 px-6 py-4 rounded-2xl border border-green-500/30"><CheckCircle2 className="w-7 h-7 text-green-500" /><p className="text-xs font-black text-green-400 uppercase tracking-widest leading-tight">DECISION LOCKED.<br/><span className="opacity-70">{oppHasGuessed ? 'WAITING FOR REVEAL...' : 'WAITING FOR OPPONENT...'}</span></p></div>) : (<div className="flex flex-col gap-3"><Input placeholder="TYPE PLAYER NAME..." className="h-14 bg-white/5 border-white/10 font-black tracking-widest text-white text-center uppercase text-base rounded-2xl" value={guessInput} onChange={(e) => setGuessInput(e.target.value)} disabled={iHaveGuessed || gameState !== 'playing'} /><div className="flex gap-2"><Button onClick={handleGuess} disabled={iHaveGuessed || gameState !== 'playing' || !guessInput.trim()} className="flex-1 h-12 rounded-xl bg-primary text-black font-black uppercase text-xs">LOCK IN GUESS</Button><Button onClick={handleSkip} variant="outline" disabled={iHaveGuessed || gameState !== 'playing'} className="w-24 h-12 rounded-xl border-white/10 bg-white/5 text-xs font-black uppercase">SKIP</Button></div></div>)}</div>
      </footer>
    </div>
  );
}
