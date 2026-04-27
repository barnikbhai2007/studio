"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Swords, Home, Sparkles, RefreshCw, Medal, Crown, History, User } from "lucide-react";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, onSnapshot, writeBatch, getDocs, collection } from "firebase/firestore";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  const [participants, setParticipants] = useState<any[]>([]);
  const [participantProfiles, setParticipantProfiles] = useState<Record<string, any>>({});
  const [confetti, setConfetti] = useState<{left: string, delay: string}[]>([]);

  const isLeader = room?.creatorId === user?.uid;

  const h2hId = useMemo(() => {
    if (room?.mode === '1v1' && room.participantIds?.length === 2) {
      return [...room.participantIds].sort().join('_');
    }
    return null;
  }, [room?.mode, room?.participantIds]);

  const h2hRef = useMemoFirebase(() => {
    if (!h2hId) return null;
    return doc(db, "battleHistories", h2hId);
  }, [db, h2hId]);

  const { data: h2hData } = useDoc(h2hRef);

  useEffect(() => {
    if (!isUserLoading && !user) router.push('/');
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (room?.status === 'Lobby') {
      router.push(`/lobby/${roomId}`);
    }
  }, [room?.status, roomId, router]);

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
    const ids = room.participantIds || [];
    const unsubs = ids.map((uid: string) => 
      onSnapshot(doc(db, "userProfiles", uid), snap => {
        if (snap.exists()) {
          const profileData = snap.data();
          setParticipantProfiles(prev => ({ ...prev, [uid]: profileData }));
          setParticipants(prev => {
            const others = prev.filter(p => p.id !== uid);
            const score = room.mode === 'Party' ? (room.scores?.[uid] || 0) : (uid === room.player1Id ? room.player1CurrentHealth : room.player2CurrentHealth);
            return [...others, { ...profileData, id: uid, score }].sort((a, b) => b.score - a.score);
          });
        }
      })
    );
    return () => unsubs.forEach((u: any) => u());
  }, [room, db]);

  const handlePlayAgain = async () => {
    if (!roomRef || !isLeader || !room) return;
    try {
      const batch = writeBatch(db);
      const roundsSnap = await getDocs(collection(db, "gameRooms", roomId as string, "gameRounds"));
      roundsSnap.docs.forEach(d => batch.delete(d.ref));
      const emotesSnap = await getDocs(collection(db, "gameRooms", roomId as string, "emotes"));
      emotesSnap.docs.forEach(d => batch.delete(d.ref));

      const reset: any = {
        status: 'Lobby',
        currentRoundNumber: 1,
        usedFootballerIds: [],
        winnerId: null,
        endReason: null,
        finishedAt: null,
      };

      if (room.mode === 'Party') {
        const scores: any = {};
        room.participantIds.forEach((id: string) => scores[id] = 0);
        reset.scores = scores;
      } else {
        reset.player1CurrentHealth = room.healthOption;
        reset.player2CurrentHealth = room.healthOption;
      }

      batch.update(roomRef, reset);
      await batch.commit();
    } catch (e) {}
  };

  if (isUserLoading || isRoomLoading || !room || participants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <RefreshCw className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  const sortedParticipants = [...participants].sort((a, b) => b.score - a.score);
  const myRank = sortedParticipants.findIndex(p => p.id === user?.uid) + 1;
  const myScore = sortedParticipants.find(p => p.id === user?.uid)?.score || 0;
  
  const top10 = sortedParticipants.slice(0, 10);

  return (
    <div className="min-h-screen bg-[#0a0a0b] p-4 flex flex-col items-center gap-8 pb-48 overflow-x-hidden relative">
      {myRank === 1 && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {confetti.map((c, i) => (
            <div key={i} className="absolute animate-confetti opacity-0" style={{ left: c.left, animationDelay: c.delay }}>
              <Sparkles className="text-secondary w-6 h-6 fill-secondary" />
            </div>
          ))}
        </div>
      )}

      <header className="w-full max-w-2xl text-center space-y-4 pt-8">
        <Trophy className="w-20 h-20 text-secondary mx-auto animate-bounce" />
        <h1 className="text-5xl md:text-7xl font-black uppercase text-white leading-tight">
          {myRank === 1 ? "CHAMPION" : `RANK #${myRank}`}
        </h1>
        <Badge className="bg-primary text-black font-black text-xl px-8 py-1 uppercase rounded-xl">
          {room.mode === 'Party' ? 'PARTY ARENA' : 'DUEL RESULT'}
        </Badge>
      </header>

      {room.mode === 'Party' ? (
        <section className="w-full max-w-2xl space-y-6">
          <div className="flex items-end justify-center gap-4 h-64 mb-12">
            {top10[1] && (
              <div className="flex flex-col items-center gap-2 w-24">
                <Medal className="text-slate-300 w-8 h-8" />
                <div className="relative">
                  <img src={top10[1].avatarUrl} className="w-16 h-16 rounded-full border-4 border-slate-300 object-cover" alt="2nd" />
                  <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-300 text-black font-black">2ND</Badge>
                </div>
                <div className="h-24 w-full bg-slate-300/20 rounded-t-xl mt-2 flex flex-col items-center justify-center p-2 text-center">
                  <span className="text-[8px] font-black text-white truncate w-full uppercase">{top10[1].displayName}</span>
                  <span className="text-lg font-black text-white">{top10[1].score}</span>
                </div>
              </div>
            )}
            {top10[0] && (
              <div className="flex flex-col items-center gap-2 w-28 scale-110">
                <Crown className="text-yellow-500 w-10 h-10 animate-pulse" />
                <div className="relative">
                  <img src={top10[0].avatarUrl} className="w-20 h-20 rounded-full border-4 border-yellow-500 object-cover" alt="1st" />
                  <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-black font-black">1ST</Badge>
                </div>
                <div className="h-32 w-full bg-yellow-500/20 rounded-t-xl mt-2 flex flex-col items-center justify-center p-2 text-center">
                  <span className="text-[10px] font-black text-white truncate w-full uppercase">{top10[0].displayName}</span>
                  <span className="text-2xl font-black text-white">{top10[0].score}</span>
                </div>
              </div>
            )}
            {top10[2] && (
              <div className="flex flex-col items-center gap-2 w-24">
                <Medal className="text-orange-600 w-8 h-8" />
                <div className="relative">
                  <img src={top10[2].avatarUrl} className="w-16 h-16 rounded-full border-4 border-orange-600 object-cover" alt="3rd" />
                  <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-600 text-black font-black">3RD</Badge>
                </div>
                <div className="h-20 w-full bg-orange-600/20 rounded-t-xl mt-2 flex flex-col items-center justify-center p-2 text-center">
                  <span className="text-[8px] font-black text-white truncate w-full uppercase">{top10[2].displayName}</span>
                  <span className="text-lg font-black text-white">{top10[2].score}</span>
                </div>
              </div>
            )}
          </div>

          <Card className="bg-[#161618] border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-xl font-black uppercase italic text-primary">TOP 10 ARENA ELITE</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                {top10.slice(3).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-xl font-black text-slate-600 italic">#{i + 4}</span>
                      <img src={p.avatarUrl} className="w-10 h-10 rounded-full object-cover border-2 border-white/5" alt={p.displayName} />
                      <span className="font-black text-white uppercase truncate max-w-[120px]">{p.displayName}</span>
                    </div>
                    <Badge variant="outline" className="text-primary border-primary/20 font-black text-base">{p.score}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      ) : (
        <section className="w-full max-w-2xl space-y-8">
          <div className="grid grid-cols-2 gap-6">
            {sortedParticipants.map((p, i) => (
              <div key={p.id} className={`flex flex-col items-center p-6 rounded-[2rem] border-2 transition-all ${i === 0 ? 'border-primary bg-primary/10 shadow-[0_0_40px_rgba(249,115,22,0.2)]' : 'border-white/5 bg-white/5 opacity-60'}`}>
                  <div className="relative">
                    {i === 0 && <Crown className="w-6 h-6 text-yellow-500 absolute -top-4 left-1/2 -translate-x-1/2 drop-shadow-lg" />}
                    <img src={p.avatarUrl} className={`w-20 h-20 rounded-full border-4 ${i === 0 ? 'border-primary' : 'border-slate-500'} object-cover shadow-2xl`} alt="p" />
                  </div>
                  <span className="mt-4 font-black text-sm text-white uppercase">{p.displayName}</span>
                  <span className="text-2xl font-black text-primary italic">{p.score} HP</span>
              </div>
            ))}
          </div>

          {h2hData && (
            <Card className="bg-[#161618] border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <CardContent className="p-8 text-center space-y-6">
                <div className="flex items-center justify-center gap-2 text-slate-500 uppercase font-black text-xs tracking-widest">
                  <History className="w-4 h-4 text-primary" /> LIFETIME BATTLE RECORD
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 text-center">
                    <p className="text-4xl font-black text-white">{h2hData.player1Wins || 0}</p>
                    <p className="text-[10px] font-black text-slate-500 uppercase truncate">
                      {participantProfiles[h2hData.player1Id]?.displayName || "PLAYER 1"}
                    </p>
                  </div>
                  <div className="h-12 w-px bg-white/10" />
                  <div className="flex-1 text-center">
                    <p className="text-4xl font-black text-white">{h2hData.player2Wins || 0}</p>
                    <p className="text-[10px] font-black text-slate-500 uppercase truncate">
                      {participantProfiles[h2hData.player2Id]?.displayName || "PLAYER 2"}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">TOTAL DUELS: {h2hData.totalMatches || 0}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* Persistent User Rank Footer */}
      {room.mode === 'Party' && (
        <div className="fixed bottom-24 left-0 right-0 p-4 z-40">
           <div className="max-w-2xl mx-auto bg-primary text-black p-4 rounded-3xl shadow-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="bg-black/20 p-2 rounded-2xl"><User className="w-6 h-6" /></div>
                 <div>
                    <p className="text-[10px] font-black uppercase opacity-60">YOUR ARENA STATUS</p>
                    <p className="text-lg font-black uppercase leading-none">RANK #{myRank} • {myScore} PTS</p>
                 </div>
              </div>
              {myRank <= 10 ? <Badge className="bg-black text-white font-black">ELITE</Badge> : <Badge variant="outline" className="border-black/20 text-black font-black">ACTIVE</Badge>}
           </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-black/80 backdrop-blur-3xl border-t border-white/10 z-50">
        <div className="max-w-2xl mx-auto flex gap-4">
          <Button onClick={() => router.push('/')} className="flex-1 h-14 bg-white text-black font-black text-lg gap-3 rounded-2xl uppercase shadow-2xl hover:scale-[1.02] transition-transform">
            <Home className="w-6 h-6" /> HOME
          </Button>
          <Button 
            variant="outline" 
            disabled={!isLeader} 
            onClick={handlePlayAgain} 
            className="h-14 px-8 border-white/10 bg-white/5 font-black uppercase rounded-2xl gap-2 shadow-2xl hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-6 h-6" /> PLAY AGAIN
          </Button>
        </div>
      </footer>
    </div>
  );
}
