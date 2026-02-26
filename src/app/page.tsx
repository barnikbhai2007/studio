"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Plus, Swords, LogIn, Loader2, Trophy, Users, Download, 
  LogOut, Target, Heart, HelpCircle,
  BarChart3, Smile, Award
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, collection } from "firebase/firestore";
import { Progress } from "@/components/ui/progress";
import { isToday } from "date-fns";

export default function LandingPage() {
  const [roomCode, setRoomCode] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const roomsRef = useMemoFirebase(() => collection(db, "gameRooms"), [db]);
  const playersRef = useMemoFirebase(() => collection(db, "userProfiles"), [db]);

  const { data: allRooms } = useCollection(roomsRef);
  const { data: allPlayers } = useCollection(playersRef);

  const roomsToday = useMemo(() => {
    if (!allRooms) return 0;
    return allRooms.filter(r => r.createdAt && isToday(new Date(r.createdAt))).length;
  }, [allRooms]);

  const playerCount = useMemo(() => allPlayers?.length || 0, [allPlayers]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = doc(db, "userProfiles", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        startAssetSync(user.uid, user.displayName, user.photoURL);
      } else {
        await updateDoc(userRef, { lastLoginAt: new Date().toISOString() });
        toast({ title: "Welcome back!", description: `Logged in as ${user.displayName}` });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login failed", description: "Google authentication error." });
    }
  };

  const startAssetSync = async (uid: string, displayName: string | null, photoURL: string | null) => {
    setIsSyncing(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(async () => {
          const userRef = doc(db, "userProfiles", uid);
          await setDoc(userRef, {
            id: uid,
            googleAccountId: uid,
            displayName: displayName || "Player",
            avatarUrl: photoURL || `https://picsum.photos/seed/${uid}/200/200`,
            totalGamesPlayed: 0,
            totalWins: 0,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
          }, { merge: true });
          setIsSyncing(false);
          toast({ title: "Assets Ready", description: "Game resources synchronized." });
        }, 800);
      }
      setSyncProgress(progress);
    }, 300);
  };

  const handleCreateRoom = async () => {
    if (!user) return;
    setIsActionLoading(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const roomRef = doc(db, "gameRooms", code);
      await setDoc(roomRef, {
        id: code,
        creatorId: user.uid,
        player1Id: user.uid,
        player2Id: null,
        status: 'Lobby',
        healthOption: 100,
        player1CurrentHealth: 100,
        player2CurrentHealth: 100,
        currentRoundNumber: 1,
        usedFootballerIds: [],
        createdAt: new Date().toISOString(),
      });
      router.push(`/lobby/${code}`);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Could not create duel." });
      setIsActionLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!user || !roomCode) return;
    setIsActionLoading(true);
    try {
      const roomRef = doc(db, "gameRooms", roomCode.trim());
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) {
        toast({ variant: "destructive", title: "Not Found", description: "Invalid room code." });
        setIsActionLoading(false);
        return;
      }
      const data = roomSnap.data();
      if (data.player2Id && data.player2Id !== user.uid && data.player1Id !== user.uid) {
        toast({ variant: "destructive", title: "Full", description: "Match already in progress." });
        setIsActionLoading(false);
        return;
      }
      if (!data.player2Id && data.player1Id !== user.uid) {
        await updateDoc(roomRef, { 
          player2Id: user.uid,
          player2CurrentHealth: data.healthOption
        });
      }
      router.push(`/lobby/${roomCode.trim()}`);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Join Failed", description: "Check connection." });
      setIsActionLoading(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <Swords className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0a0a0b] relative overflow-hidden text-white">
      {isSyncing && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-8 backdrop-blur-xl">
          <div className="w-full max-w-sm space-y-8 text-center">
            <Download className="w-16 h-16 text-primary mx-auto animate-bounce" />
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase">Syncing Assets</h2>
              <Progress value={syncProgress} className="h-2 bg-white/5" />
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{Math.round(syncProgress)}% Complete</p>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50" />
      
      <div className="relative z-10 w-full max-w-md space-y-10 py-8">
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 rounded-3xl bg-primary/20 text-primary border border-primary/20 mb-2">
            <Swords className="w-12 h-12" />
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-white leading-none font-headline uppercase">FOOTY DUEL</h1>
          <p className="text-slate-400 font-bold tracking-[0.2em] uppercase text-[10px]">The Ultimate Football Trivia Combat</p>
        </div>

        {!user ? (
          <Card className="bg-[#161618] border-white/5 shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-black text-white">WELCOME DUELIST</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Sign in to start your career</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGoogleLogin} className="w-full h-14 bg-white text-black hover:bg-slate-200 font-black text-lg gap-3 rounded-2xl">
                <LogIn className="w-5 h-5" /> SIGN IN WITH GOOGLE
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-3xl border border-white/5">
              <div className="flex items-center gap-4">
                <img src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} className="w-12 h-12 rounded-full ring-2 ring-primary object-cover" alt="Profile" />
                <div className="flex flex-col">
                  <span className="font-black text-sm">{user.displayName?.toUpperCase()}</span>
                  <span className="text-[8px] text-primary font-black tracking-widest uppercase">ACTIVE PLAYER</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => auth.signOut()} className="text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid gap-3">
              <Button onClick={handleCreateRoom} disabled={isActionLoading} className="w-full h-16 text-xl font-black bg-primary hover:bg-primary/90 gap-3 shadow-lg rounded-2xl">
                {isActionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-7 h-7" />} CREATE NEW DUEL
              </Button>
              <div className="flex gap-2">
                <Input 
                  placeholder="ENTER CODE" 
                  className="h-16 bg-[#161618] border-white/10 text-center font-black tracking-[0.3em] text-2xl rounded-2xl text-white uppercase"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  maxLength={6}
                />
                <Button onClick={handleJoinRoom} disabled={isActionLoading || !roomCode} variant="secondary" className="h-16 px-8 font-black rounded-2xl">
                  JOIN
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-14 border-white/5 bg-white/5 rounded-2xl font-black uppercase tracking-tighter gap-2 hover:bg-white/10">
                <Target className="w-5 h-5 text-primary" /> Quests
              </Button>
              <Button variant="outline" className="h-14 border-white/5 bg-white/5 rounded-2xl font-black uppercase tracking-tighter gap-2 hover:bg-white/10">
                <Award className="w-5 h-5 text-yellow-500" /> Achievements
              </Button>
              <Button variant="outline" className="h-14 border-white/5 bg-white/5 rounded-2xl font-black uppercase tracking-tighter gap-2 hover:bg-white/10">
                <BarChart3 className="w-5 h-5 text-secondary" /> Leaders
              </Button>
              <Button variant="outline" className="h-14 border-white/5 bg-white/5 rounded-2xl font-black uppercase tracking-tighter gap-2 hover:bg-white/10">
                <Smile className="w-5 h-5 text-green-400" /> Emotes
              </Button>
            </div>

            <Button variant="link" className="w-full text-slate-500 font-black uppercase text-[10px] tracking-[0.3em] hover:text-primary">
              <Heart className="w-3 h-3 mr-2" /> Support FootyDuel
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white/5 p-5 rounded-3xl border border-white/5 flex flex-col items-center text-center space-y-1">
              <Trophy className="text-secondary w-6 h-6 mb-1" />
              <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Duels Today</span>
              <span className="text-2xl font-black">{roomsToday.toLocaleString()}</span>
           </div>
           <div className="bg-white/5 p-5 rounded-3xl border border-white/5 flex flex-col items-center text-center space-y-1">
              <Users className="text-primary w-6 h-6 mb-1" />
              <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Total Duelists</span>
              <span className="text-2xl font-black">{playerCount.toLocaleString()}</span>
           </div>
        </div>
      </div>
    </div>
  );
}
