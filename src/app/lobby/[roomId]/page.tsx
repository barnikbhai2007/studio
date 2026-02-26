
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Users, Play, ShieldAlert, Crown, Swords } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";

export default function LobbyPage() {
  const { roomId } = roomId_from_params;
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
            <CardTitle className="text-lg font-headline flex items-center gap-2">
              <Users className="w-5 h-5 text-secondary" /> LOBBY STATUS
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={copyCode} className="text-xs text-muted-foreground gap-1">
              <Copy className="w-3 h-3" /> Copy Code
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center p-4 rounded-xl bg-muted/50 border-2 border-primary/20 relative">
                <Crown className="w-4 h-4 text-yellow-500 absolute -top-2 left-1/2 -translate-x-1/2" />
                <img src={p1Profile?.avatarUrl || "https://picsum.photos/seed/p1/100/100"} className="w-16 h-16 rounded-full mb-2 border-2 border-primary" alt="P1" />
                <span className="font-bold text-sm truncate w-full text-center">{p1Profile?.displayName || "Player 1"}</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-xl bg-muted/50 border-2 border-dashed border-muted-foreground/30">
                {room.player2Id ? (
                  <>
                    <img src={p2Profile?.avatarUrl || "https://picsum.photos/seed/p2/100/100"} className="w-16 h-16 rounded-full mb-2 border-2 border-secondary" alt="P2" />
                    <span className="font-bold text-sm truncate w-full text-center">{p2Profile?.displayName || "Player 2"}</span>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full animate-pulse">
                    <div className="w-16 h-16 rounded-full bg-muted mb-2 flex items-center justify-center">
                       <Users className="text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground">WAITING...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Game Health</label>
                {isLeader ? (
                  <Select value={room.healthOption.toString()} onValueChange={updateHealth}>
                    <SelectTrigger className="bg-muted border-none h-12">
                      <SelectValue placeholder="Select Health" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50 HP (Fast Match)</SelectItem>
                      <SelectItem value="100">100 HP (Normal)</SelectItem>
                      <SelectItem value="150">150 HP (Endurance)</SelectItem>
                      <SelectItem value="200">200 HP (Epic)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-12 bg-muted rounded-md flex items-center px-3 font-bold">{room.healthOption} HP</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {isLeader ? (
          <Button onClick={startGame} className="w-full h-16 text-xl font-black bg-primary hover:bg-primary/90 shadow-2xl animate-pulse">
            <Play className="w-6 h-6 mr-2" /> START MATCH
          </Button>
        ) : (
          <div className="p-6 bg-muted rounded-2xl flex items-center gap-4 text-muted-foreground">
            <ShieldAlert className="w-8 h-8" />
            <p className="text-sm">Only the <b>Party Leader</b> can start the game. Waiting for kickoff...</p>
          </div>
        )}
      </div>
    </div>
  );
}
