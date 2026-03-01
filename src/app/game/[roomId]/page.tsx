"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Trophy, Clock, Swords, CheckCircle2, Loader2, 
  PartyPopper, Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { 
  doc, updateDoc, arrayUnion, 
  increment, collection, 
  query, orderBy, limit, addDoc, runTransaction, serverTimestamp 
} from "firebase/firestore";
import { FOOTBALLERS, Footballer, getRandomFootballer, getRandomRarity, RARITIES } from "@/lib/footballer-data";
import { ALL_EMOTES, DEFAULT_EQUIPPED_IDS, UNLOCKED_EMOTE_IDS } from "@/lib/emote-data";
import { validateAnswer } from "@/ai/flows/validate-answer-flow";

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

  const [participantProfiles, setParticipantProfiles] = useState<Record<string, any>>({});
  const [gameState, setGameState] = useState<GameState>('countdown');
  const [revealStep, setRevealStep] = useState<RevealStep>('none');
  const [countdown, setCountdown] = useState(5);
  const [autoNextRoundCountdown, setAutoNextRoundCountdown] = useState<number | null>(null);
  const [targetPlayer, setTargetPlayer] = useState<Footballer | null>(null);
  const [visibleHints, setVisibleHints] = useState<number>(1);
  const [guessInput, setGuessInput] = useState("");
  const [isGuessing, setIsGuessing] = useState(false);
  const [roundTimer, setRoundTimer] = useState<number | null>(null);
  const [currentRarity, setCurrentRarity] = useState<any>(null);
  const [activeEmotes, setActiveEmotes] = useState<{id: string, emoteId: string, createdAt: number}[]>([]);
  const [showGameOverPopup, setShowGameOverPopup] = useState(false);
  const [gameOverTimer, setGameOverTimer] = useState(5);
  const [completedQuest, setCompletedQuest] = useState<any>(null);
  
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
    if (!room?.participantIds || !db) return;
    const ids = room.participantIds as string[];
    const interval = setInterval(async () => {
      for (const uid of ids) {
        if (!participantProfiles[uid]) {
          const snap = await doc(db, "userProfiles", uid);
          // Simplified profile fetch for now
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [room?.participantIds, db, participantProfiles]);

  useEffect(() => {
    if (gameState === 'result' || gameState === 'reveal' || gameState === 'finalizing') {
      if (activeEmotes.length > 0) setActiveEmotes([]);
      return;
    }

    if (recentEmotes && recentEmotes.length > 0) {
      const now = Date.now();
      const freshEmotesFromDb = recentEmotes
        .filter(e => {
          const createdAt = e.createdAt?.toMillis ? e.createdAt.toMillis() : (e.createdAt?.seconds ? e.createdAt.seconds * 1000 : now);
          return now - createdAt < 2000;
        })
        .map(e => ({ 
          id: e.id, 
          emoteId: e.emoteId, 
          createdAt: e.createdAt?.toMillis ? e.createdAt.toMillis() : (e.createdAt?.seconds ? e.createdAt.seconds * 1000 : now)
        }));
      
      setActiveEmotes(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const filtered = freshEmotesFromDb.filter(n => !existingIds.has(n.id));
        if (filtered.length === 0) return prev;
        
        filtered.forEach(emote => {
          setTimeout(() => {
            setActiveEmotes(current => current.filter(item => item.id !== emote.id));
          }, 6000);
        });

        return [...prev, ...filtered];
      });
    }
  }, [recentEmotes, gameState]);

  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (room?.status === 'Completed' && !showGameOverPopup) {
       setShowGameOverPopup(true);
       setGameOverTimer(5);
    }

    if (showGameOverPopup) {
      timerId = setInterval(() => {
        setGameOverTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerId);
            router.push(`/result/${roomId}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => { if (timerId) clearInterval(timerId); };
  }, [room?.status, roomId, router, showGameOverPopup]);

  useEffect(() => {
    if (roundData?.timerStartedAt && gameState === 'playing' && roundData.roundNumber === currentRoundNumber) {
      const startTime = new Date(roundData.timerStartedAt).getTime();
      const maxTime = room?.timePerRound || 60;
      const tick = () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, maxTime - elapsed);
        setRoundTimer(remaining);
        if (remaining === 0 && !revealTriggered.current) {
          handleRevealTrigger();
        }
      };
      tick();
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    }
  }, [roundData?.timerStartedAt, gameState, currentRoundNumber, room?.timePerRound]);

  useEffect(() => {
    if (currentRoundNumber !== lastProcessedRound.current) {
      lastProcessedRound.current = currentRoundNumber;
      revealTriggered.current = false;
      isInitializingRound.current = false;
      revealTimeouts.current.forEach(t => clearTimeout(t));
      revealTimeouts.current = [];
      setRevealStep('none');
      setGameState(currentRoundNumber === 1 ? 'countdown' : 'playing');
      setGuessInput("");
      setRoundTimer(null);
      setVisibleHints(1);
      setTargetPlayer(null);
      setAutoNextRoundCountdown(null);
      setActiveEmotes([]); 
      if (currentRoundNumber === 1) setCountdown(5);
    }
  }, [currentRoundNumber]);

  const startNewRoundLocally = useCallback(async () => {
    if (isInitializingRound.current || !room || !roundRef || !roomRef) return;
    isInitializingRound.current = true;

    try {
      await runTransaction(db, async (transaction) => {
        const roundSnap = await transaction.get(roundRef);
        if (roundSnap.exists()) return; 

        const roomSnap = await transaction.get(roomRef);
        if (!roomSnap.exists()) return;
        const roomData = roomSnap.data();

        const player = getRandomFootballer(roomData.usedFootballerIds || [], roomData.gameVersion || 'FDv1.0');
        const rarity = getRandomRarity();
        const now = new Date().toISOString();

        transaction.set(roundRef, {
          id: currentRoundId,
          gameRoomId: roomId,
          roundNumber: currentRoundNumber,
          footballerId: player.id,
          rarity: rarity.type,
          hintsRevealedCount: 1,
          guesses: {},
          roundEndedAt: null,
          timerStartedAt: roomData.mode === 'Party' ? now : null,
          resultsProcessed: false
        });
        
        transaction.update(roomRef, { 
          usedFootballerIds: arrayUnion(player.id),
          lastActionAt: now
        });
      });
    } catch (err) {
      console.error("Round init conflict (expected/retry):", err);
    } finally {
      isInitializingRound.current = false;
    }
  }, [db, room, roomId, currentRoundId, currentRoundNumber, roundRef, roomRef]);

  useEffect(() => {
    if (room?.status === 'InProgress' && !roundData && !isRoundLoading && !isInitializingRound.current) {
      startNewRoundLocally();
    }
  }, [room?.status, roundData, isRoundLoading, startNewRoundLocally]);

  useEffect(() => {
    if (roundData && roundData.roundNumber === currentRoundNumber && (gameState === 'playing' || gameState === 'reveal')) {
      const player = FOOTBALLERS.find(f => f.id === roundData.footballerId);
      setTargetPlayer(player || null);
      
      const r = RARITIES.find(rarity => rarity.type === roundData.rarity);
      if (r) setCurrentRarity(r);
      
      const allParticipants = room?.participantIds || [];
      const guesses = roundData.guesses || {};
      const everyoneVoted = allParticipants.length > 0 && allParticipants.every((uid: string) => !!guesses[uid]);
      
      if (everyoneVoted && !revealTriggered.current && gameState === 'playing') {
        handleRevealTrigger();
      }
    }
  }, [roundData, gameState, currentRoundNumber, room?.participantIds]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'countdown' && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (gameState === 'countdown' && countdown === 0) {
      setGameState('playing');
    }
    
    if (gameState === 'playing' && targetPlayer && visibleHints < targetPlayer.hints.length) {
      const isParty = room?.mode === 'Party';
      const someoneGuessed = !!roundData?.timerStartedAt;
      
      // In 1v1, reveal stops when someone guesses. In Party, it continues regardless.
      // Reveal timing: 2s for Party (all in 10s), 5s for 1v1.
      if (!someoneGuessed || isParty) {
        const interval = isParty ? 2000 : 5000;
        timer = setTimeout(() => setVisibleHints(prev => prev + 1), interval);
      }
    }
    return () => clearTimeout(timer);
  }, [gameState, countdown, visibleHints, roundData?.timerStartedAt, targetPlayer, room?.mode]);

  useEffect(() => {
    if (gameState === 'result' && autoNextRoundCountdown === null) {
      setAutoNextRoundCountdown(5);
    }

    let timer: NodeJS.Timeout;
    if (autoNextRoundCountdown !== null && autoNextRoundCountdown > 0) {
      timer = setTimeout(() => setAutoNextRoundCountdown(autoNextRoundCountdown - 1), 1000);
    } else if (autoNextRoundCountdown === 0) {
      handleNextRound();
    }
    return () => clearTimeout(timer);
  }, [gameState, autoNextRoundCountdown]);

  const handleGuess = async () => {
    if (!guessInput.trim() || !roundRef || !roundData || gameState !== 'playing' || revealTriggered.current || isGuessing || !user) return;
    
    setIsGuessing(true);
    let isCorrect = false;
    
    if (targetPlayer) {
      try {
        const result = await validateAnswer({ correctName: targetPlayer.name, userGuess: guessInput });
        isCorrect = result.isCorrect;
      } catch (err) {
        console.error("Answer check failed:", err);
      }
    }
    
    const now = new Date().toISOString();
    const update: any = { [`guesses.${user.uid}`]: { text: guessInput, isCorrect, guessedAt: now } };
    if (!roundData.timerStartedAt) update.timerStartedAt = now;
    
    await updateDoc(roundRef, update);
    if (roomRef) await updateDoc(roomRef, { lastActionAt: now });
    
    toast({ title: "DECISION LOCKED", description: `GUESS: ${guessInput.toUpperCase()}` });
    setIsGuessing(false);
  };

  const handleSkip = async () => {
    if (!roundRef || gameState !== 'playing' || revealTriggered.current || !user) return;
    const now = new Date().toISOString();
    const update: any = { [`guesses.${user.uid}`]: { text: "SKIPPED", isCorrect: false, guessedAt: now } };
    if (!roundData?.timerStartedAt) update.timerStartedAt = now;
    
    await updateDoc(roundRef, update);
    if (roomRef) await updateDoc(roomRef, { lastActionAt: now });
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
    setActiveEmotes([]); 
    
    if (user && targetPlayer) {
      const questCards = ["Cristiano Ronaldo", "Lionel Messi", "Erling Haaland", "Kylian Mbappe", "Neymar Jr"];
      const emoteIds = ["ronaldo_platinum", "messi_diamond", "haaland_gold", "mbappe_silver", "neymar_master"];
      const titles = ["CR7 EMOTE UNLOCKED", "MESSI EMOTE UNLOCKED", "HAALAND EMOTE UNLOCKED", "MBAPPE EMOTE UNLOCKED", "NEYMAR EMOTE UNLOCKED"];
      
      const cardIdx = questCards.indexOf(targetPlayer.name);
      if (cardIdx !== -1) checkAndUnlockQuest(emoteIds[cardIdx], titles[cardIdx]);
    }
    
    const steps = [
      { s: 'country', t: 2200 },
      { s: 'none', t: 3100 },
      { s: 'position', t: 3800 },
      { s: 'none', t: 4700 },
      { s: 'rarity', t: 5200 },
      { s: 'none', t: 6100 },
      { s: 'full-card', t: 6900 }
    ];

    steps.forEach(step => {
      const t = setTimeout(() => setRevealStep(step.s as RevealStep), step.t);
      revealTimeouts.current.push(t);
    });
    
    const finalT = setTimeout(() => {
      setGameState('result');
      calculateRoundResults(); 
    }, 9500); 
    revealTimeouts.current.push(finalT);
  };

  const handleNextRound = async () => {
     if (!room || !roomRef) return;
     const maxRounds = room.mode === 'Party' ? (room.maxRounds || 10) : 999;
     const isGameOver = room.mode === 'Party' ? (currentRoundNumber >= maxRounds) : (room.player1CurrentHealth <= 0 || room.player2CurrentHealth <= 0);

     if (isGameOver) {
       await updateDoc(roomRef, { status: 'Completed', finishedAt: new Date().toISOString() });
       return;
     }

     await runTransaction(db, async (transaction) => {
       const freshRoomSnap = await transaction.get(roomRef);
       if (!freshRoomSnap.exists()) return;
       const roomData = freshRoomSnap.data();
       
       if (roomData.currentRoundNumber === currentRoundNumber) {
         transaction.update(roomRef, { 
           currentRoundNumber: currentRoundNumber + 1,
           lastActionAt: new Date().toISOString()
         });
       }
     });
  };

  const calculateRoundResults = async () => {
    if (!roundData || !targetPlayer || !room || !roomRef || !roundRef) return;

    await runTransaction(db, async (transaction) => {
      const freshRoundSnap = await transaction.get(roundRef);
      const freshRoomSnap = await transaction.get(roomRef);
      
      if (!freshRoundSnap.exists() || !freshRoomSnap.exists()) return;
      const rData = freshRoundSnap.data();
      const rmData = freshRoomSnap.data();

      if (rData.resultsProcessed) return;

      const guesses = rData.guesses || {};
      const timerStart = new Date(rData.timerStartedAt || 0).getTime();
      const maxTime = (rmData.timePerRound || 60) * 1000;
      
      const updates: any = { lastActionAt: new Date().toISOString() };
      const roundScoreChanges: Record<string, number> = {};

      if (rmData.mode === 'Party') {
        const scores = { ...(rmData.scores || {}) };
        rmData.participantIds.forEach((uid: string) => {
          const g = guesses[uid];
          let pts = 0;
          if (g?.isCorrect) {
            const guessedAt = new Date(g.guessedAt).getTime();
            const elapsed = Math.max(0, guessedAt - timerStart);
            pts = Math.max(10, Math.round(100 * (1 - (elapsed / maxTime))));
          }
          scores[uid] = (scores[uid] || 0) + pts;
          roundScoreChanges[uid] = pts;
        });
        updates.scores = scores;
      } else {
        const p1 = rmData.participantIds[0];
        const p2 = rmData.participantIds[1];
        const g1 = guesses[p1];
        const g2 = guesses[p2];

        let s1 = g1?.isCorrect ? 10 : (g1?.text === "SKIPPED" || !g1 ? 0 : -10);
        let s2 = g2?.isCorrect ? 10 : (g2?.text === "SKIPPED" || !g2 ? 0 : -10);
        
        const diff = s1 - s2;
        let p1Health = rmData.player1CurrentHealth;
        let p2Health = rmData.player2CurrentHealth;
        
        if (diff > 0) p2Health = Math.max(0, p2Health - diff);
        else if (diff < 0) p1Health = Math.max(0, p1Health - Math.abs(diff));
        
        updates.player1CurrentHealth = p1Health;
        updates.player2CurrentHealth = p2Health;
        roundScoreChanges[p1] = s1;
        roundScoreChanges[p2] = s2;

        if (p1Health <= 0 || p2Health <= 0) {
          updates.status = 'Completed';
          updates.finishedAt = new Date().toISOString();
          const winnerId = p1Health > 0 ? p1 : (p2Health > 0 ? p2 : null);
          updates.winnerId = winnerId;
          
          rmData.participantIds.forEach((uid: string) => {
            const pRef = doc(db, "userProfiles", uid);
            if (winnerId === uid) {
              transaction.update(pRef, { totalWins: increment(1), weeklyWins: increment(1), winStreak: increment(1), totalGamesPlayed: increment(1) });
            } else {
              transaction.update(pRef, { totalLosses: increment(1), winStreak: 0, totalGamesPlayed: increment(1) });
            }
          });
        }
      }
      
      transaction.update(roomRef, updates);
      transaction.update(roundRef, { 
        scoreChanges: roundScoreChanges,
        resultsProcessed: true,
        roundEndedAt: new Date().toISOString()
      });
    });
  };

  const handleForfeit = async () => {
    if (!roomRef || !user || !room || room.status !== 'InProgress') return;
    await updateDoc(roomRef, { status: 'Completed', finishedAt: new Date().toISOString(), winnerId: null, drawReason: 'FORFEIT' });
  };

  const sendEmote = async (emoteId: string) => {
    if (!roomId || !user || gameState === 'result' || gameState === 'reveal') return; 
    await addDoc(collection(db, "gameRooms", roomId, "emotes"), { emoteId, senderId: user.uid, createdAt: serverTimestamp() });
  };

  if (isUserLoading || isRoomLoading || !room) return <div className="min-h-screen flex items-center justify-center bg-background"><Swords className="w-12 h-12 text-primary animate-spin" /></div>;

  const myGuess = roundData?.guesses?.[user?.uid || ""] || null;
  const iHaveGuessed = !!myGuess;
  const participantIds = room.participantIds || [];
  const guessedCount = Object.keys(roundData?.guesses || {}).length;

  const getFlagUrl = (code: string) => {
    const map: Record<string, string> = { 'en': 'gb-eng', 'eng': 'gb-eng', 'sc': 'gb-sct', 'sco': 'gb-sct', 'wa': 'gb-wls', 'wal': 'gb-wls', 'ni': 'gb-nir' };
    return `https://flagcdn.com/w640/${map[code.toLowerCase()] || code.toLowerCase()}.png`;
  };

  if (gameState === 'reveal') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
        <video className="absolute inset-0 w-full h-full object-cover opacity-60" playsInline autoPlay src="https://res.cloudinary.com/speed-searches/video/upload/v1772079954/round_xxbuaq.mp4" />
        <div className="relative z-20 flex flex-col items-center justify-center w-full h-full p-6 text-center">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {revealStep === 'country' && targetPlayer && <div className="animate-in fade-in zoom-in duration-300"><img src={getFlagUrl(targetPlayer.countryCode)} className="w-48 md:w-80 filter drop-shadow-[0_0_60px_rgba(255,255,255,0.9)]" alt="flag" /></div>}
            {revealStep === 'position' && targetPlayer && <div className="animate-in fade-in slide-in-from-bottom-20 duration-300"><span className="text-[100px] md:text-[180px] font-black text-white drop-shadow-[0_0_100px_rgba(255,165,0,1)] uppercase">{targetPlayer.position}</span></div>}
            {revealStep === 'rarity' && currentRarity && <div className="animate-in fade-in zoom-in duration-400"><Badge className={`bg-gradient-to-r ${currentRarity.bg} text-white text-3xl md:text-5xl px-8 md:px-16 py-3 md:py-6 font-black border-4 border-white/50 uppercase tracking-widest`}>{currentRarity.type}</Badge></div>}
          </div>
          {revealStep === 'full-card' && currentRarity && targetPlayer && (
            <div className="relative fc-card-container">
              <div className={`w-72 h-[480px] md:w-96 md:h-[600px] fc-animation-reveal rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col border-[10px] md:border-[14px] overflow-hidden relative bg-gradient-to-br ${currentRarity.bg} border-white/20`}>
                <img src={REVEAL_CARD_IMG} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="background" />
                <div className="mt-auto relative z-20 p-4">
                  <div className="bg-black/90 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl flex flex-col items-center text-center">
                    <h3 className="text-3xl md:text-4xl font-black uppercase text-white leading-none mb-4">{targetPlayer.name}</h3>
                    <img src={getFlagUrl(targetPlayer.countryCode)} className="w-16 md:w-24 shadow-2xl rounded-sm border border-white/20" alt="flag" />
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
      <Dialog open={!!completedQuest} onOpenChange={() => setCompletedQuest(null)}>
        <DialogContent className="bg-black/95 border-primary/20 p-8 text-center flex flex-col items-center gap-6 max-w-sm rounded-[3rem] overflow-hidden">
          <PartyPopper className="w-16 h-16 text-primary animate-bounce" />
          <h2 className="text-2xl font-black text-white uppercase">QUEST COMPLETE!</h2>
          <p className="text-primary text-sm font-black uppercase">{completedQuest?.title}</p>
          <Button onClick={() => setCompletedQuest(null)} className="w-full bg-primary text-black font-black uppercase rounded-2xl h-12">CLAIM REWARD</Button>
        </DialogContent>
      </Dialog>
      
      {showGameOverPopup && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 backdrop-blur-2xl">
           <h2 className="text-7xl font-black text-white uppercase mb-8">MATCH ENDED</h2>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">REDIRECTING TO RESULTS IN {gameOverTimer}S...</p>
        </div>
      )}

      <header className="p-4 bg-card/60 backdrop-blur-xl border-b border-white/10 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Badge variant="outline" className="border-primary/30 text-[8px] font-black text-primary px-2 py-0 uppercase">ROOM: {roomId}</Badge>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Badge className="bg-primary text-black font-black px-3 py-0.5 text-[10px] uppercase">
            RD {currentRoundNumber} {room.mode === 'Party' ? `/ ${room.maxRounds || 10}` : ''}
          </Badge>
          <button onClick={handleForfeit} className="text-[8px] text-red-500 font-black uppercase hover:underline">FORFEIT</button>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <Badge variant="secondary" className="text-[8px] font-black">{guessedCount}/{participantIds.length}</Badge>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-6 max-w-lg mx-auto w-full pb-48">
        {gameState === 'countdown' ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-4 text-center">
             <div className="text-[10rem] font-black text-primary animate-ping leading-none">{countdown}</div>
             <p className="text-2xl font-black uppercase tracking-widest text-white/90">PREPARE TO DUEL</p>
          </div>
        ) : gameState === 'finalizing' ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center">
             <Swords className="w-16 h-16 text-primary animate-bounce" />
             <span className="text-3xl font-black text-white uppercase">DUEL LOCKDOWN</span>
             <p className="text-xs font-black text-primary uppercase tracking-widest">FINALISING INTELLIGENCE...</p>
          </div>
        ) : gameState === 'result' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-8 animate-in fade-in zoom-in duration-500">
            <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">ROUND SUMMARY</h2>
            <ScrollArea className="w-full max-h-[40vh] bg-white/5 p-4 rounded-3xl border border-white/10">
              <div className="space-y-3">
                {participantIds.map(uid => (
                  <div key={uid} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-white uppercase truncate max-w-[100px]">{uid === user?.uid ? "YOU" : "OPPONENT"}</span>
                    </div>
                    <Badge className={`${(roundData?.scoreChanges?.[uid] ?? 0) > 0 ? "bg-green-500" : "bg-slate-700"} text-white font-black`}>
                      +{(roundData?.scoreChanges?.[uid] ?? 0)} PTS
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="w-full bg-white/5 p-8 rounded-[2.5rem] border border-white/10 flex flex-col items-center text-center gap-4">
              <p className="text-5xl font-black text-white uppercase tracking-tighter italic">{targetPlayer?.name}</p>
              {targetPlayer && <img src={getFlagUrl(targetPlayer.countryCode)} className="w-16 h-10 shadow-lg border border-white/20 rounded-md" alt="flag" />}
            </div>
            <div className="w-full space-y-2">
              <Progress value={(autoNextRoundCountdown || 0) * 20} className="h-1.5 bg-white/10" />
              <p className="text-[8px] font-black text-center text-slate-500 uppercase tracking-widest">NEXT ROUND IN {autoNextRoundCountdown}S...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2"><h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> SCOUTING REPORTS</h3>{roundTimer !== null && (<Badge className="bg-red-500 text-white font-black">{roundTimer}S</Badge>)}</div>
            <div className="space-y-3">{!targetPlayer ? (<div className="flex flex-col items-center justify-center p-12 opacity-50"><Loader2 className="w-8 h-8 animate-spin text-primary mb-2" /><p className="text-[10px] font-black uppercase">Loading Intelligence...</p></div>) : (targetPlayer.hints.slice(0, visibleHints).map((hint, idx) => (<div key={idx} className="bg-card/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl animate-in slide-in-from-bottom-2"><p className="text-sm font-bold text-white/90 leading-relaxed">"{hint}"</p></div>)))}</div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-black/80 backdrop-blur-3xl border-t border-white/10 z-40">
        <div className="max-w-lg mx-auto w-full">
          {iHaveGuessed && gameState === 'playing' ? (
            <div className="flex items-center gap-4 bg-green-500/10 px-6 py-4 rounded-2xl border border-green-500/30">
              <CheckCircle2 className="w-7 h-7 text-green-500" />
              <p className="text-xs font-black text-green-400 uppercase tracking-widest leading-tight">
                DECISION LOCKED.<br/><span className="opacity-70">WAITING FOR OTHERS...</span>
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Input placeholder="TYPE PLAYER NAME..." className="h-14 bg-white/5 border-white/10 font-black tracking-widest text-white text-center uppercase text-base rounded-2xl" value={guessInput} onChange={(e) => setGuessInput(e.target.value)} disabled={iHaveGuessed || gameState !== 'playing' || isGuessing} />
              {isGuessing && <div className="flex items-center justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-primary mr-2" /><span className="text-[8px] font-black uppercase text-primary">VALIDATING...</span></div>}
              <div className="flex gap-2">
                <Button onClick={handleGuess} disabled={iHaveGuessed || gameState !== 'playing' || !guessInput.trim() || isGuessing} className="flex-1 h-12 rounded-xl bg-primary text-black font-black uppercase text-xs">LOCK in GUESS</Button>
                <Button onClick={handleSkip} variant="outline" disabled={iHaveGuessed || gameState !== 'playing' || isGuessing} className="w-24 h-12 rounded-xl border-white/10 bg-white/5 text-xs font-black uppercase">SKIP</Button>
              </div>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
