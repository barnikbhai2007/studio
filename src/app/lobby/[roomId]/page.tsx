
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Copy, Users, Play, ShieldAlert, Crown, Swords, 
  UserX, Settings2, Info, Heart, Zap, BookOpen, 
  Target, Clock, AlertTriangle
} from "lucide-react";
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

  const [participants, setParticipants] = useState<any[]>([]);
  const isLeader = room?.creatorId === user?.uid;

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!room || !user) return;

    const unsubs: (() => void)[] = [];
    
    const ids = room.participantIds || [];
    ids.forEach((uid: string) => {
      const unsub = onSnapshot(doc(db, "userProfiles", uid), (snap) => {
        const data = snap.data();
        if (data) {
          setParticipants(prev => {
            const others = prev.filter(p => p.id !== uid);
            return [...others, { ...data, id: uid }].sort((a, b) => {
              if (a.id === room.creatorId) return -1;
              if (b.id === room.creatorId) return 1;
              return 0;
            });
          });
        }
      });
      unsubs.push(unsub);
    });

    if (room.status === 'InProgress') {
      router.push(`/game/${roomIdStr}`);
    }

    return () => unsubs.forEach(u => u());
  }, [room?.participantIds, room?.status, db, roomIdStr, router, user, room?.creatorId]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomIdStr);
    toast({ title: "Copied!", description: "Room code copied to clipboard." });
  };

  const updateSetting = async (field: string, val: any) => {
    if (!isLeader || !roomRef) return;
    await updateDoc(roomRef, { [field]: val });
  };

  const startGame = async () => {
    if ((room.participantIds?.length || 0) < 2) {
      toast({ variant: "destructive", title: "Wait!", description: "Need at least 2 players to start." });
      return;
    }
    
    const update: any = { 
      status: 'InProgress',
      startedAt: new Date().toISOString(),
      lastActionAt: new Date().toISOString()
    };

    const scores: Record<string, number> = {};
    room.participantIds.forEach((id: string) => scores[id] = 0);
    update.scores = scores;

    await updateDoc(roomRef, update);
  };

  if (isUserLoading || isLoading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Swords className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  const isPartyMode = room.mode === 'Party';
  const maxSlots = isPartyMode ? 10 : 2;

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center">
      <div className="w-full max-w-lg space-y-6">
        <header className="flex justify-between items-center py-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black font-headline text-primary uppercase leading-tight">FOOTY DUEL</h1>
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">VERSION 1.0 • ARENA</span>
          </div>
          <Badge variant="outline" className="text-xs font-black border-primary text-primary px-3 py-1">ROOM: {roomIdStr}</Badge>
        </header>

        <Card className="bg-card border-none shadow-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-white/5">
            <CardTitle className="text-lg font-black flex items-center gap-2 uppercase italic">
              <Users className="w-5 h-5 text-secondary" /> {isPartyMode ? 'PARTY' : 'DUEL'} LOBBY
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={copyCode} className="text-[10px] text-muted-foreground gap-1 font-black uppercase hover:bg-white/5">
              <Copy className="w-3 h-3" /> {roomIdStr}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className={`grid ${isPartyMode ? 'grid-cols-3 md:grid-cols-5' : 'grid-cols-2'} gap-3`}>
              {participants.slice(0, maxSlots).map((p) => (
                <div key={p.id} className="flex flex-col items-center gap-1 p-2 rounded-2xl bg-white/5 border border-white/5 relative group animate-in fade-in zoom-in">
                  {p.id === room.creatorId && <Crown className="w-3 h-3 text-yellow-500 absolute -top-1 left-1/2 -translate-x-1/2 drop-shadow-md" />}
                  <img src={p.avatarUrl || "https://picsum.photos/seed/p/100/100"} className="w-12 h-12 rounded-full border-2 border-primary/20 object-cover shadow-lg" alt={p.displayName} />
                  <span className="text-[8px] font-black truncate w-full text-center uppercase tracking-tight text-white/80">{p.displayName}</span>
                </div>
              ))}
              {Array.from({ length: Math.max(0, maxSlots - participants.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/5 border border-dashed border-white/10 opacity-30">
                  <UserX className="w-6 h-6 mb-1 text-slate-500" />
                  <span className="text-[6px] font-black uppercase">EMPTY</span>
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Match Configuration</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                    <Swords className="w-3 h-3 text-primary" /> Game Mode
                  </label>
                  {isLeader ? (
                    <Select value={room.mode || '1v1'} onValueChange={(val) => updateSetting('mode', val)}>
                      <SelectTrigger className="bg-muted border-none h-12 rounded-xl font-bold uppercase text-left">
                        <SelectValue placeholder="Select Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1v1">1v1 DUEL</SelectItem>
                        <SelectItem value="Party">PARTY ARENA</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="h-12 bg-muted rounded-xl flex items-center px-4 font-black uppercase text-sm">{room.mode || '1v1'}</div>
                  )}
                </div>

                {!isPartyMode && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                      <Heart className="w-3 h-3 text-red-500" /> Match Health
                    </label>
                    {isLeader ? (
                      <Select value={room.healthOption?.toString() || '100'} onValueChange={(val) => {
                        const h = parseInt(val);
                        updateDoc(roomRef!, { healthOption: h, player1CurrentHealth: h, player2CurrentHealth: h });
                      }}>
                        <SelectTrigger className="bg-muted border-none h-12 rounded-xl font-bold uppercase text-left">
                          <SelectValue placeholder="Select Health" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="50">50 HP (Blitz)</SelectItem>
                          <SelectItem value="100">100 HP (Standard)</SelectItem>
                          <SelectItem value="150">150 HP (Pro)</SelectItem>
                          <SelectItem value="200">200 HP (Elite)</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="h-12 bg-muted rounded-xl flex items-center px-4 font-black uppercase text-sm">{room.healthOption} HP</div>
                    )}
                  </div>
                )}

                {isPartyMode && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                      <Zap className="w-3 h-3 text-yellow-500" /> Total Rounds
                    </label>
                    {isLeader ? (
                      <Select value={room.maxRounds?.toString() || '10'} onValueChange={(val) => updateSetting('maxRounds', parseInt(val))}>
                        <SelectTrigger className="bg-muted border-none h-12 rounded-xl font-bold uppercase text-left">
                          <SelectValue placeholder="Select Rounds" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 Rounds</SelectItem>
                          <SelectItem value="10">10 Rounds</SelectItem>
                          <SelectItem value="15">15 Rounds</SelectItem>
                          <SelectItem value="20">20 Rounds</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="h-12 bg-muted rounded-xl flex items-center px-4 font-black uppercase text-sm">{room.maxRounds} Rounds</div>
                    )}
                  </div>
                )}

                {isPartyMode && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-500" /> Time Limit
                    </label>
                    {isLeader ? (
                      <Select value={room.timePerRound?.toString() || '60'} onValueChange={(val) => updateSetting('timePerRound', parseInt(val))}>
                        <SelectTrigger className="bg-muted border-none h-12 rounded-xl font-bold uppercase text-left">
                          <SelectValue placeholder="Select Time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="60">1 Minute</SelectItem>
                          <SelectItem value="120">2 Minutes</SelectItem>
                          <SelectItem value="180">3 Minutes</SelectItem>
                          <SelectItem value="300">5 Minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="h-12 bg-muted rounded-xl flex items-center px-4 font-black uppercase text-sm">{(room.timePerRound || 60) / 60} Min</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-secondary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rules & How to Play</span>
              </div>
              
              <ScrollArea className="h-32 rounded-2xl bg-white/5 p-4 border border-white/5">
                <div className="space-y-4 text-[10px] font-bold uppercase leading-relaxed text-slate-300">
                  {isPartyMode ? (
                    <>
                      <div className="flex items-start gap-2">
                        <Target className="w-3 h-3 text-primary shrink-0" />
                        <p>Score max <span className="text-white">100 points</span> per round. Points decrease the longer you take to guess.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Zap className="w-3 h-3 text-primary shrink-0" />
                        <p>All <span className="text-white">5 hints reveal in 10 seconds</span> (one every 2s). Be fast!</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                        <p>No penalties for wrong guesses. Keep guessing until the time runs out.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                        <p>Wrong answers deduct <span className="text-red-500">10 HP</span>. Reaching 0 HP ends the match.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="w-3 h-3 text-primary shrink-0" />
                        <p>Hints reveal every <span className="text-white">5 seconds</span> until someone locks a guess.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Info className="w-3 h-3 text-primary shrink-0" />
                        <p>Skipping awards 0 points but ends your turn for the round.</p>
                      </div>
                    </>
                  )}
                  <div className="flex items-start gap-2 border-t border-white/10 pt-2">
                    <Info className="w-3 h-3 text-secondary shrink-0" />
                    <p className="normal-case italic text-slate-400">Intelligent system: Minor typos are allowed based on name length.</p>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {isLeader ? (
          <Button onClick={startGame} disabled={participants.length < 2} className="w-full h-16 text-xl font-black bg-primary hover:bg-primary/90 shadow-2xl rounded-2xl uppercase group">
            <Play className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform" /> START MATCH
          </Button>
        ) : (
          <div className="p-6 bg-muted/50 rounded-[2rem] flex items-center gap-4 text-muted-foreground border border-dashed border-white/10">
            <ShieldAlert className="w-8 h-8 text-primary animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
              Waiting for the Duel Leader to initiate the match...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
