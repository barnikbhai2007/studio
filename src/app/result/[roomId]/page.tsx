
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, Swords, Target, History, Home, 
  User as UserIcon, CheckCircle2, XCircle, Sparkles,
  Flame, ShieldAlert, Award, BarChart3, RefreshCw
} from "lucide-react";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, onSnapshot, query, orderBy, updateDoc, writeBatch, deleteDoc, getDocs } from "firebase/firestore";
import { FOOTBALLERS } from "@/lib/footballer-data";

export default function ResultPage() {
  const { roomId } = useParams();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  const roomRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "gameRooms", roomId as string);
  }, [db, roomId, user]);
  
  const { data: room, isLoading: isRoomLoading } = useDoc(roomRef);

  const roundsQuery = useMemoFirebase(() => {
    if (!user || !roomId) return null;
    return query(collection(db, "gameRooms", roomId as string, "gameRounds"), orderBy("roundNumber", "asc"));
  }, [db, roomId, user]);

  const { data: rounds } = useCollection(roundsQuery);

  const [p1Profile, setP1Profile] = useState<any>(null);
  const [p2Profile, setP2Profile] = useState<any>(null);
  const [battleHistory, setBattleHistory] = useState<any>(null);

  const isPlayer1 = room?.player1Id === user?.uid;
  const isWinner = room?.winnerId === user?.uid;
  const healthDiff = Math.abs((room?.player1CurrentHealth || 0) - (room?.player2CurrentHealth || 0));

  useEffect(() => {
    if (!isUserLoading && !user) router.push('/');
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (room?.status === 'InProgress') {
      router.push(`/game/${roomId}`);
    } else if (room?.status === 'Lobby') {
      router.push(`/lobby/${roomId}`);
    }
  }, [room?.status, roomId, router]);

  useEffect(() => {
    if (!room || !user) return;
    onSnapshot(doc(db, "userProfiles", room.player1Id), snap => setP1Profile(snap.data()));
    if (room.player2Id) onSnapshot(doc(db, "userProfiles", room.player2Id), snap => setP2Profile(snap.data()));

    const battleHistoryId = [room.player1Id, room.player2Id].sort().join('_');
    const bhUnsub = onSnapshot(doc(db, "battleHistories", battleHistoryId), snap => setBattleHistory(snap.data()));
    
    return () => bhUnsub();
  }, [room, db, user]);

  const handlePlayAgain = async () => {
    if (!roomRef || !roomId || !isPlayer1) return;
    
    const batch = writeBatch(db);
    
    // Clear rounds
    const roundsSnap = await getDocs(collection(db, "gameRooms", roomId as string, "gameRounds"));
    roundsSnap.docs.forEach(d => batch.delete(d.ref));
    
    // Reset room
    batch.update(roomRef, {
      status: 'Lobby',
      player1CurrentHealth: room.healthOption,
      player2CurrentHealth: room.healthOption,
      currentRoundNumber: 1,
      usedFootballerIds: [],
      winnerId: null,
      loserId: null,
      finishedAt: null,
      lastEmote: null
    });
    
    await batch.commit();
  };

  if (isUserLoading || isRoomLoading || !room || !p1Profile) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Swords className="w-12 h-12 text-primary animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center gap-8 pb-32 overflow-x-hidden relative">
      {isWinner && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(20)].map((_, i) => (
            <div key={i} className={`absolute animate-confetti opacity-0`} style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 3}s` }}>
              <Sparkles className="text-secondary w-6 h-6 fill-secondary" />
            </div>
          ))}
        </div>
      )}

      <header className="w-full max-w-2xl text-center space-y-4 pt-8">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-secondary/20 blur-[60px] rounded-full animate-pulse" />
          <Trophy className="w-24 h-24 text-secondary relative z-10 mx-auto animate-in zoom-in duration-700" />
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase text-white animate-in slide-in-from-bottom-4">
          {isWinner ? "VICTORY" : (room.winnerId ? "DEFEAT" : "MATCH ENDED")}
        </h1>
        <Badge className="bg-primary text-black font-black text-xl px-8 py-1 transform -skew-x-12">
          {healthDiff} HP DIFFERENCE
        </Badge>
      </header>

      <section className="w-full max-w-2xl grid grid-cols-2 gap-6 relative">
         <div className={`flex flex-col items-center p-6 rounded-3xl border-2 ${room.winnerId === room.player1Id ? 'border-primary bg-primary/10 shadow-[0_0_50px_rgba(255,123,0,0.2)]' : 'border-white/5 bg-white/5 opacity-60'} transition-all`}>
            <img src={p1Profile.avatarUrl} className="w-20 h-20 rounded-full border-4 border-primary shadow-2xl mb-3 object-cover" alt="p1" />
            <span className="font-black text-sm text-white uppercase truncate w-full text-center">{p1Profile.displayName}</span>
            <span className="text-[10px] font-bold text-primary tracking-widest uppercase mt-1">{room.winnerId === room.player1Id ? 'WINNER' : (room.winnerId ? 'LOSER' : '')}</span>
            <div className="mt-4 w-full">
              <div className="flex justify-between text-[10px] font-black text-white/50 mb-1 uppercase"><span>HP</span><span>{room.player1CurrentHealth}</span></div>
              <Progress value={(room.player1CurrentHealth / room.healthOption) * 100} className="h-2 bg-black/20" />
            </div>
         </div>
         <div className={`flex flex-col items-center p-6 rounded-3xl border-2 ${room.winnerId === room.player2Id ? 'border-secondary bg-secondary/10 shadow-[0_0_50px_rgba(255,215,0,0.2)]' : 'border-white/5 bg-white/5 opacity-60'} transition-all`}>
            <img src={p2Profile?.avatarUrl || "https://picsum.photos/seed/p2/100/100"} className="w-20 h-20 rounded-full border-4 border-secondary shadow-2xl mb-3 object-cover" alt="p2" />
            <span className="font-black text-sm text-white uppercase truncate w-full text-center">{p2Profile?.displayName || "Guest"}</span>
            <span className="text-[10px] font-bold text-secondary tracking-widest uppercase mt-1">{room.winnerId === room.player2Id ? 'WINNER' : (room.winnerId ? 'LOSER' : '')}</span>
            <div className="mt-4 w-full">
              <div className="flex justify-between text-[10px] font-black text-white/50 mb-1 uppercase"><span>HP</span><span>{room.player2CurrentHealth}</span></div>
              <Progress value={(room.player2CurrentHealth / room.healthOption) * 100} className="h-2 bg-black/20" />
            </div>
         </div>
      </section>

      <section className="w-full max-w-2xl space-y-4">
        <h3 className="text-xs font-black text-white/40 tracking-[0.3em] uppercase flex items-center gap-2">
          <History className="w-4 h-4" /> ROUND LOG
        </h3>
        <div className="space-y-3">
          {rounds?.map((r: any) => {
            const footballer = FOOTBALLERS.find(f => f.id === r.footballerId);
            return (
              <div key={r.id} className="bg-card/40 backdrop-blur-xl p-4 rounded-2xl border border-white/5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div className="text-center overflow-hidden">
                  <p className={`text-[10px] font-black truncate ${r.player1GuessedCorrectly ? 'text-green-500' : 'text-red-500/50'}`}>{r.player1Guess || "SKIP"}</p>
                  <span className={`text-xs font-black ${r.player1ScoreChange > 0 ? 'text-green-400' : r.player1ScoreChange < 0 ? 'text-red-400' : 'text-white/20'}`}>
                    {r.player1ScoreChange > 0 ? `+${r.player1ScoreChange}` : r.player1ScoreChange}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <Badge variant="outline" className="border-white/10 text-[8px] font-black uppercase py-0.5 mb-1">RD {r.roundNumber}</Badge>
                  <span className="text-[9px] font-black text-primary uppercase truncate max-w-[80px] text-center">{footballer?.name}</span>
                </div>
                <div className="text-center overflow-hidden">
                  <p className={`text-[10px] font-black truncate ${r.player2GuessedCorrectly ? 'text-green-500' : 'text-red-500/50'}`}>{r.player2Guess || "SKIP"}</p>
                  <span className={`text-xs font-black ${r.player2ScoreChange > 0 ? 'text-green-400' : r.player2ScoreChange < 0 ? 'text-red-400' : 'text-white/20'}`}>
                    {r.player2ScoreChange > 0 ? `+${r.player2ScoreChange}` : r.player2ScoreChange}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {battleHistory && (
        <section className="w-full max-w-2xl bg-white/5 border border-white/10 p-6 rounded-3xl space-y-6">
          <div className="text-center">
            <h3 className="text-xs font-black text-secondary tracking-[0.4em] uppercase mb-1">HEAD-TO-HEAD STATS</h3>
            <span className="text-[10px] font-bold text-white/30 uppercase">TOTAL DUELS: {battleHistory.totalMatches}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
             <div className="flex-1 text-center">
                <span className="text-[3rem] font-black text-primary leading-none">{battleHistory.player1Id === p1Profile.id ? battleHistory.player1Wins : battleHistory.player2Wins}</span>
                <span className="block text-[8px] font-black text-white/40 uppercase mt-2">{p1Profile.displayName} WINS</span>
             </div>
             <div className="w-px h-12 bg-white/10" />
             <div className="flex-1 text-center">
                <span className="text-[3rem] font-black text-secondary leading-none">{battleHistory.player2Id === p2Profile?.id ? battleHistory.player2Wins : battleHistory.player1Wins}</span>
                <span className="block text-[8px] font-black text-white/40 uppercase mt-2">{p2Profile?.displayName || "Guest"} WINS</span>
             </div>
          </div>
        </section>
      )}

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-background/80 backdrop-blur-3xl border-t border-white/10 z-50">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button onClick={() => router.push('/')} className="flex-1 h-14 bg-white text-black font-black text-lg gap-3 rounded-2xl uppercase shadow-lg">
            <Home className="w-6 h-6" /> Home
          </Button>
          <Button 
            variant="outline" 
            disabled={!isPlayer1} 
            onClick={handlePlayAgain} 
            className="h-14 px-8 border-white/10 bg-white/5 font-black uppercase rounded-2xl shadow-xl gap-2"
          >
            <RefreshCw className="w-6 h-6" /> Play Again
          </Button>
        </div>
        {!isPlayer1 && <p className="text-center text-[8px] text-slate-500 uppercase mt-2 font-black">Waiting for Party Leader to Rematch...</p>}
      </footer>
    </div>
  );
}
