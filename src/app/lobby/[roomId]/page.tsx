"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Users, Play, ShieldAlert, Crown, Swords, UserX, Settings2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";

export default function LobbyPage() {
  const { roomId: roomIdFromParams } = useParams();
  const roomIdStr = roomIdFromParams as string;
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  const roomRef = useMemoFirebase(() => {
    if (!user || !roomIdStr) return null;
    return doc(db, "gameRooms", roomIdStr);
  }, [db, roomIdStr, user]);
  
  const { data: room, isLoading } = useDoc(roomRef);

  const [p1Profile, setP1Profile] = useState<any>(null);
  const [p2Profile, setP2Profile] = useState<any>(null);

  const isLeader = room?.player1Id === user?.uid;

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!room || !user) return;

    const p1Unsub = onSnapshot(doc(db, "userProfiles", room.player1Id), (snap) => {
      setP1Profile(snap.data());
    });

    let p2Unsub = () => {};
    if (room.player2Id) {
      p2Unsub = onSnapshot(doc(db, "userProfiles", room.player2Id), (snap) => {
        setP2Profile(snap.data());
      });
    } else {
      setP2Profile(null);
    }

    if (room.status === 'InProgress') {
      router.push(`/game/${roomIdStr}`);
    }

    return () => {
      p1Unsub();
      p2Unsub();
    };
  }, [room, db, roomIdStr, router, user]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomIdStr);
    toast({ title: "Copied!", description: "Room code copied to clipboard." });
  };

  const updateHealth = async (val: string) => {
    if (!isLeader || !roomRef) return;
    await updateDoc(roomRef, { 
      healthOption: parseInt(val),
      player1CurrentHealth: parseInt(val),
      player2CurrentHealth: parseInt(val)
    });
  };

  const updateVersion = async (val: string) => {
    if (!isLeader || !roomRef) return;
    await updateDoc(roomRef, { gameVersion: val });
  };

  const startGame = async () => {
    if (!room?.player2Id || !roomRef) {
      toast({ variant: "destructive", title: "Wait!", description: "Waiting for an opponent to join." });
      return;
    }
    await updateDoc(roomRef, { 
      status: 'InProgress',
      startedAt: new Date().toISOString()
    });
  };

  if (isUserLoading || isLoading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Swords className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center">
      <div className="w-full max-w-lg space-y-6">
        <header className="flex justify-between items-center py-4">
          <h1 className="text-2xl font-black font-headline text-primary">FOOTY DUEL</h1>
          <Badge variant="outline" className="text-xs font-bold border-primary text-primary">ROOM: {roomIdStr}</Badge>
        </header>

        <Card className="bg-card border-none shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <Users className="w-5 h-5 text-secondary" /> LOBBY STATUS
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={copyCode} className="text-xs text-muted-foreground gap-1 font-bold">
              <Copy className="w-3 h-3" /> COPY CODE
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center p-4 rounded-xl bg-muted/50 border-2 border-primary/20 relative">
                <Crown className="w-4 h-4 text-yellow-500 absolute -top-2 left-1/2 -translate-x-1/2" />
                <img src={p1Profile?.avatarUrl || "https://picsum.photos/seed/p1/100/100"} className="w-16 h-16 rounded-full mb-2 border-2 border-primary object-cover" alt="P1" />
                <span className="font-bold text-sm truncate w-full text-center uppercase tracking-tight">{p1Profile?.displayName || "Player 1"}</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-xl bg-muted/50 border-2 border-dashed border-muted-foreground/30 min-h-[140px] justify-center">
                {room.player2Id ? (
                  <>
                    <img src={p2Profile?.avatarUrl || "https://picsum.photos/seed/p2/100/100"} className="w-16 h-16 rounded-full mb-2 border-2 border-secondary object-cover" alt="P2" />
                    <span className="font-bold text-sm truncate w-full text-center uppercase tracking-tight">{p2Profile?.displayName || "Player 2"}</span>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center animate-pulse">
                    <UserX className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Awaiting Rival</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest">Match Settings</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Match Health</label>
                  {isLeader ? (
                    <Select value={room.healthOption.toString()} onValueChange={updateHealth}>
                      <SelectTrigger className="bg-muted border-none h-12 rounded-xl font-bold">
                        <SelectValue placeholder="Select Health" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50 HP (Fast)</SelectItem>
                        <SelectItem value="100">100 HP (Normal)</SelectItem>
                        <SelectItem value="150">150 HP (Pro)</SelectItem>
                        <SelectItem value="200">200 HP (Endurance)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="h-12 bg-muted rounded-xl flex items-center px-4 font-black uppercase text-sm">{room.healthOption} HP</div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Question Pack</label>
                  {isLeader ? (
                    <Select value={room.gameVersion || 'DEMO'} onValueChange={updateVersion}>
                      <SelectTrigger className="bg-muted border-none h-12 rounded-xl font-bold">
                        <SelectValue placeholder="Select Pack" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEMO">DEMO (Starter Pack)</SelectItem>
                        <SelectItem value="FDv0.1">FDv0.1 (Season 1)</SelectItem>
                        <SelectItem value="All">ALL PACKS</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="h-12 bg-muted rounded-xl flex items-center px-4 font-black uppercase text-sm">{room.gameVersion || 'DEMO'}</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLeader ? (
          <Button onClick={startGame} disabled={!room.player2Id} className="w-full h-16 text-xl font-black bg-primary hover:bg-primary/90 shadow-2xl rounded-2xl">
            <Play className="w-6 h-6 mr-2" /> START MATCH
          </Button>
        ) : (
          <div className="p-6 bg-muted/50 rounded-2xl flex items-center gap-4 text-muted-foreground border border-dashed border-white/5">
            <ShieldAlert className="w-8 h-8 text-primary animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
              Waiting for the Party Leader to kickoff the duel...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
