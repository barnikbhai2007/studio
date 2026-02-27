"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Swords, Home, Sparkles, RefreshCw, History, Users } from "lucide-react";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, onSnapshot, writeBatch, getDocs, collection } from "firebase/firestore";

export default function ResultPage() {
  const { roomId } = useParams();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  const roomRef = useMemoFirebase(() => {
    if (!roomId) return null;
    return doc(db, "gameRooms", roomId as string);
  }, [db, roomId]);
  
  const { data: room, isLoading: isRoomLoading } = useDoc(roomRef);

  const [p1Profile, setP1Profile] = useState<any>(null);
  const [p2Profile, setP2Profile] = useState<any>(null);
  const [confetti, setConfetti] = useState<{left: string, delay: string}[]>([]);

  const isWinner = room?.winnerId === user?.uid;
  const isPlayer1 = room?.player1Id === user?.uid;
  
  const p1Health = room?.player1CurrentHealth ?? 0;
  const p2Health = room?.player2CurrentHealth ?? 0;
  const healthMax = room?.healthOption ?? 100;
  const healthDiff = Math.abs(p1Health - p2Health);

  const betweenIds = useMemo(() => {
    if (!room?.player1Id || !room?.player2Id) return null;
    return [room.player1Id, room.player2Id].sort().join('_');
  }, [room?.player1Id, room?.player2Id]);

  const battleHistoryRef = useMemoFirebase(() => {
    if (!betweenIds) return null;
    return doc(db, "battleHistories", betweenIds);
  }, [db, betweenIds]);

  const { data: battleHistory, isLoading: isHistoryLoading } = useDoc(battleHistoryRef);

  useEffect(() => {
    if (!isUserLoading && !user) router.push('/');
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (room?.status === 'Completed') {
      const newConfetti = Array.from({ length: 20 }).map(() => ({
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`
      }));
      setConfetti(newConfetti);
    }
  }, [room?.status]);

  useEffect(() => {
    if (!room || !db) return;

    const unsubP1 = onSnapshot(doc(db, "userProfiles", room.player1Id), snap => {
      if (snap.exists()) setP1Profile(snap.data());
    });
    
    let unsubP2 = () => {};
    if (room.player2Id) {
      unsubP2 = onSnapshot(doc(db, "userProfiles", room.player2Id), snap => {
        if (snap.exists()) setP2Profile(snap.data());
      });
    }

    return () => {
      unsubP1();
      unsubP2();
    };
  }, [room, db]);

  const handlePlayAgain = async () => {
    if (!roomRef || !roomId || !isPlayer1 || !room) return;
    try {
      const batch = writeBatch(db);
      const roundsSnap = await getDocs(collection(db, "gameRooms", roomId as string, "gameRounds"));
      roundsSnap.docs.forEach(d => batch.delete(d.ref));
      const emotesSnap = await getDocs(collection(db, "gameRooms", roomId as string, "emotes"));
      emotesSnap.docs.forEach(d => batch.delete(d.ref));

      batch.update(roomRef, {
        status: 'Lobby',
        player1CurrentHealth: room.healthOption,
        player2CurrentHealth: room.healthOption,
        currentRoundNumber: 1,
        usedFootballerIds: [],
        winnerId: null,
        loserId: null,
        finishedAt: null,
      });
      await batch.commit();
      router.push(`/lobby/${roomId}`);
    } catch (e) {}
  };

  if (isUserLoading || isRoomLoading || !room || !p1Profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-12 h-12 text-primary animate-spin" />
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Syncing Career Statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] p-4 flex flex-col items-center gap-8 pb-32 overflow-x-hidden relative">
      {isWinner && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {confetti.map((c, i) => (
            <div key={i} className="absolute animate-confetti opacity-0" style={{ left: c.left, animationDelay: c.delay }}>
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
        <h1 className="text-5xl md:text-7xl font-black uppercase text-white leading-tight">
          {isWinner ? "VICTORY" : (room.winnerId ? "DEFEAT" : "MATCH ENDED")}
        </h1>
        <Badge className="bg-primary text-black font-black text-xl px-8 py-1 uppercase rounded-xl">
          {healthDiff} HP DIFFERENCE
        </Badge>
      </header>

      <section className="w-full max-w-2xl grid grid-cols-2 gap-6">
         <div className={`flex flex-col items-center p-6 rounded-[2rem] border-2 transition-all ${room.winnerId === room.player1Id ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5 opacity-60'}`}>
            <img src={p1Profile?.avatarUrl || `https://picsum.photos/seed/${room.player1Id}/100/100`} className="w-20 h-20 rounded-full border-4 border-primary mb-3 object-cover" alt="p1" />
            <span className="font-black text-sm text-white uppercase truncate w-full text-center">{p1Profile?.displayName || "PLAYER 1"}</span>
            <div className="mt-4 w-full">
              <div className="flex justify-between text-[10px] font-black text-white/50 mb-1 uppercase"><span>HP</span><span>{p1Health}</span></div>
              <Progress value={(p1Health / healthMax) * 100} className="h-2 bg-black/20" />
            </div>
         </div>
         <div className={`flex flex-col items-center p-6 rounded-[2rem] border-2 transition-all ${room.winnerId === room.player2Id ? 'border-secondary bg-secondary/10' : 'border-white/5 bg-white/5 opacity-60'}`}>
            <img src={p2Profile?.avatarUrl || `https://picsum.photos/seed/${room.player2Id}/100/100`} className="w-20 h-20 rounded-full border-4 border-secondary mb-3 object-cover" alt="p2" />
            <span className="font-black text-sm text-white uppercase truncate w-full text-center">{p2Profile?.displayName || "OPPONENT"}</span>
            <div className="mt-4 w-full">
              <div className="flex justify-between text-[10px] font-black text-white/50 mb-1 uppercase"><span>HP</span><span>{p2Health}</span></div>
              <Progress value={(p2Health / healthMax) * 100} className="h-2 bg-black/20" />
            </div>
         </div>
      </section>

      <section className="w-full max-w-2xl space-y-4">
        <div className="flex items-center gap-2 px-2">
          <History className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-black uppercase text-white">LIFETIME HEAD-TO-HEAD</h2>
        </div>
        
        {isHistoryLoading ? (
          <div className="p-12 text-center bg-white/5 rounded-[2.5rem] border border-white/5">
            <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
            <p className="text-[10px] font-black uppercase text-slate-500">Syncing Career Records...</p>
          </div>
        ) : battleHistory ? (
          <Card className="bg-white/5 border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-md">
            <CardContent className="p-8">
              <div className="grid grid-cols-3 gap-6 items-center">
                <div className="text-center space-y-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase truncate px-1">{p1Profile?.displayName}</p>
                  <p className="text-5xl font-black text-primary tracking-tighter">
                    {room.player1Id === battleHistory.player1Id ? battleHistory.player1Wins : battleHistory.player2Wins}
                  </p>
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em]">WINS</p>
                </div>
                <div className="text-center border-x border-white/10 py-4 space-y-2 bg-white/5 rounded-3xl">
                  <p className="text-[10px] font-black text-slate-500 uppercase">TOTAL</p>
                  <p className="text-3xl font-black text-white tracking-tighter">{battleHistory.totalMatches}</p>
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em]">BATTLES</p>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase truncate px-1">{p2Profile?.displayName}</p>
                  <p className="text-5xl font-black text-secondary tracking-tighter">
                    {room.player2Id === battleHistory.player1Id ? battleHistory.player1Wins : battleHistory.player2Wins}
                  </p>
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em]">WINS</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="p-12 text-center bg-white/5 rounded-[2.5rem] border border-white/5">
            <Users className="w-10 h-10 text-slate-700 mx-auto mb-2" />
            <p className="text-[10px] font-black uppercase text-slate-500">FIRST TIME RIVALS</p>
          </div>
        )}
      </section>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-black/80 backdrop-blur-3xl border-t border-white/10 z-50">
        <div className="max-w-2xl mx-auto flex gap-4">
          <Button onClick={() => router.push('/')} className="flex-1 h-14 bg-white text-black font-black text-lg gap-3 rounded-2xl uppercase shadow-2xl">
            <Home className="w-6 h-6" /> HOME
          </Button>
          <Button 
            variant="outline" 
            disabled={!isPlayer1} 
            onClick={handlePlayAgain} 
            className="h-14 px-8 border-white/10 bg-white/5 font-black uppercase rounded-2xl gap-2 shadow-2xl"
          >
            <RefreshCw className="w-6 h-6" /> PLAY AGAIN
          </Button>
        </div>
      </footer>
    </div>
  );
}