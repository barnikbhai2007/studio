
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Swords, History, Home, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { doc, onSnapshot, writeBatch, getDocs, collection, query, where, orderBy, limit, arrayUnion, updateDoc } from "firebase/firestore";

export default function ResultPage() {
  const { roomId } = useParams();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  const roomRef = useMemoFirebase(() => {
    if (!user || !roomId) return null;
    return doc(db, "gameRooms", roomId as string);
  }, [db, roomId, user]);
  
  const { data: room, isLoading: isRoomLoading } = useDoc(roomRef);

  const [p1Profile, setP1Profile] = useState<any>(null);
  const [p2Profile, setP2Profile] = useState<any>(null);

  const bid = useMemo(() => {
    if (!room || !room.player1Id || !room.player2Id) return null;
    return [room.player1Id, room.player2Id].sort().join('_');
  }, [room]);

  const historyQuery = useMemoFirebase(() => {
    if (!bid) return null;
    return query(
      collection(db, "gameRooms"),
      where("betweenIds", "==", bid),
      where("status", "==", "Completed"),
      orderBy("finishedAt", "desc"),
      limit(10)
    );
  }, [db, bid]);

  const { data: recentMatches, isLoading: isHistoryLoading } = useCollection(historyQuery);

  const isWinner = room?.winnerId === user?.uid;
  const isPlayer1 = room?.player1Id === user?.uid;
  
  // Defensive health calculation
  const p1Health = room?.player1CurrentHealth ?? 0;
  const p2Health = room?.player2CurrentHealth ?? 0;
  const healthMax = room?.healthOption ?? 100;
  const healthDiff = Math.abs(p1Health - p2Health);

  useEffect(() => {
    if (!isUserLoading && !user) router.push('/');
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (room?.status === 'Lobby') {
      router.push(`/lobby/${roomId}`);
    }
  }, [room?.status, roomId, router]);

  useEffect(() => {
    if (!room || !user || !room.player1Id) return;

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
  }, [room, db, user]);

  useEffect(() => {
    if (!user || !db || !room || !p1Profile) return;
    const profile = isPlayer1 ? p1Profile : p2Profile;
    if (profile && typeof profile.totalWins === 'number' && profile.totalWins >= 10) {
      const unlocked = profile.unlockedEmoteIds || [];
      if (!unlocked.includes('ten_wins')) {
        updateDoc(doc(db, "userProfiles", user.uid), {
          unlockedEmoteIds: arrayUnion('ten_wins')
        }).catch(err => console.error("Quest update failed", err));
      }
    }
  }, [p1Profile, p2Profile, user, isPlayer1, db, room]);

  const h2hStats = useMemo(() => {
    if (!recentMatches || !room || !room.player1Id || !room.player2Id) return { p1: 0, p2: 0, total: 0 };
    const p1Id = room.player1Id;
    const p2Id = room.player2Id;
    
    return recentMatches.reduce((acc, match) => {
      if (match.winnerId === p1Id) acc.p1++;
      else if (match.winnerId === p2Id) acc.p2++;
      acc.total++;
      return acc;
    }, { p1: 0, p2: 0, total: 0 });
  }, [recentMatches, room]);

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
    } catch (e) {
      console.error("Failed to reset game:", e);
    }
  };

  if (isUserLoading || isRoomLoading || !room || !p1Profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <div className="flex flex-col items-center gap-4">
          <Swords className="w-12 h-12 text-primary animate-spin" />
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Finalizing Duel Analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] p-4 flex flex-col items-center gap-8 pb-32 overflow-x-hidden relative">
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
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase text-white">
          {isWinner ? "VICTORY" : (room.winnerId ? "DEFEAT" : "MATCH ENDED")}
        </h1>
        <Badge className="bg-primary text-black font-black text-xl px-8 py-1 transform uppercase">
          {healthDiff} HP DIFFERENCE
        </Badge>
      </header>

      <section className="w-full max-w-2xl grid grid-cols-2 gap-6">
         <div className={`flex flex-col items-center p-6 rounded-3xl border-2 transition-all ${room.winnerId === room.player1Id ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5 opacity-60'}`}>
            <img src={p1Profile?.avatarUrl || `https://picsum.photos/seed/${room.player1Id}/100/100`} className="w-20 h-20 rounded-full border-4 border-primary mb-3 object-cover" alt="p1" />
            <span className="font-black text-sm text-white uppercase truncate w-full text-center">{p1Profile?.displayName || "PLAYER 1"}</span>
            <div className="mt-4 w-full">
              <div className="flex justify-between text-[10px] font-black text-white/50 mb-1 uppercase"><span>HP</span><span>{p1Health}</span></div>
              <Progress value={(p1Health / healthMax) * 100} className="h-2 bg-black/20" />
            </div>
         </div>
         <div className={`flex flex-col items-center p-6 rounded-3xl border-2 transition-all ${room.winnerId === room.player2Id ? 'border-secondary bg-secondary/10' : 'border-white/5 bg-white/5 opacity-60'}`}>
            <img src={p2Profile?.avatarUrl || `https://picsum.photos/seed/${room.player2Id}/100/100`} className="w-20 h-20 rounded-full border-4 border-secondary mb-3 object-cover" alt="p2" />
            <span className="font-black text-sm text-white uppercase truncate w-full text-center">{p2Profile?.displayName || "OPPONENT"}</span>
            <div className="mt-4 w-full">
              <div className="flex justify-between text-[10px] font-black text-white/50 mb-1 uppercase"><span>HP</span><span>{p2Health}</span></div>
              <Progress value={(p2Health / healthMax) * 100} className="h-2 bg-black/20" />
            </div>
         </div>
      </section>

      <section className="w-full max-w-2xl bg-white/5 border border-white/10 p-6 rounded-3xl space-y-6">
        <div className="text-center">
          <h3 className="text-[10px] font-black text-secondary tracking-widest uppercase mb-1 flex items-center justify-center gap-2">
            <History className="w-4 h-4" /> RECENT DUEL FORM
          </h3>
          <div className="flex justify-center gap-1.5 mt-4 mb-2">
            {isHistoryLoading ? (
              <Loader2 className="w-6 h-6 animate-spin opacity-30" />
            ) : (
              [...Array(10)].map((_, i) => {
                const match = recentMatches?.[i];
                if (!match) return <div key={i} className="w-6 h-8 rounded-md bg-white/5 border border-white/5" />;
                
                const isP1Win = match.winnerId === room.player1Id;
                const isP2Win = match.winnerId === room.player2Id;
                
                return (
                  <div 
                    key={i} 
                    className={`w-6 h-8 rounded-md flex items-center justify-center text-[10px] font-black border transition-all ${
                      isP1Win ? 'bg-primary/20 border-primary text-primary' : 
                      isP2Win ? 'bg-secondary/20 border-secondary text-secondary' : 
                      'bg-slate-500/20 border-slate-500 text-slate-500'
                    }`}
                  >
                    {isP1Win ? 'W' : (isP2Win ? 'L' : 'D')}
                  </div>
                );
              })
            )}
          </div>
          <span className="text-[10px] font-bold text-white/30 uppercase">LAST 10 MATCHES HISTORY</span>
        </div>
        
        <div className="flex items-center justify-between gap-4">
           <div className="flex-1 text-center">
              <span className="text-[3rem] font-black text-primary leading-none">
                {h2hStats.p1}
              </span>
              <span className="block text-[8px] font-black text-white/40 uppercase mt-2">{p1Profile?.displayName || "P1"} WINS</span>
           </div>
           <div className="w-px h-12 bg-white/10" />
           <div className="flex-1 text-center">
              <span className="text-[3rem] font-black text-secondary leading-none">
                {h2hStats.p2}
              </span>
              <span className="block text-[8px] font-black text-white/40 uppercase mt-2">{p2Profile?.displayName || "P2"} WINS</span>
           </div>
        </div>
      </section>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-black/80 backdrop-blur-3xl border-t border-white/10 z-50">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button onClick={() => router.push('/')} className="flex-1 h-14 bg-white text-black font-black text-lg gap-3 rounded-2xl uppercase">
            <Home className="w-6 h-6" /> HOME
          </Button>
          <Button 
            variant="outline" 
            disabled={!isPlayer1} 
            onClick={handlePlayAgain} 
            className="h-14 px-8 border-white/10 bg-white/5 font-black uppercase rounded-2xl gap-2"
          >
            <RefreshCw className="w-6 h-6" /> PLAY AGAIN
          </Button>
        </div>
      </footer>
    </div>
  );
}
