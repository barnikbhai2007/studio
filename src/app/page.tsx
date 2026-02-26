"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Swords, LogIn, Loader2, Trophy, Users, Download, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { Progress } from "@/components/ui/progress";

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

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = doc(db, "userProfiles", user.uid);
      const userSnap = await getDoc(userRef);

      // If new user, trigger asset download simulation
      if (!userSnap.exists()) {
        startAssetSync(user.uid, user.displayName, user.photoURL);
      } else {
        await updateDoc(userRef, { lastLoginAt: new Date().toISOString() });
        toast({ title: "Welcome back!", description: `Logged in as ${user.displayName}` });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login failed", description: "Please ensure Google Auth is enabled in Firebase Console." });
    }
  };

  const startAssetSync = async (uid: string, displayName: string | null, photoURL: string | null) => {
    setIsSyncing(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
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
          toast({ title: "Assets Synced!", description: "High-quality game resources are ready." });
        }, 1000);
      }
      setSyncProgress(progress);
    }, 400);
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
        createdAt: new Date().toISOString(),
      });

      router.push(`/lobby/${code}`);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to create room." });
      setIsActionLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!user || !roomCode) return;
    setIsActionLoading(true);
    const cleanCode = roomCode.trim();
    
    try {
      const roomRef = doc(db, "gameRooms", cleanCode);
      const roomSnap = await getDoc(roomRef);

      if (!roomSnap.exists()) {
        toast({ variant: "destructive", title: "Room Not Found", description: "Check your code and try again." });
        setIsActionLoading(false);
        return;
      }

      const roomData = roomSnap.data();
      if (roomData.player1Id === user.uid || roomData.player2Id === user.uid) {
        router.push(`/lobby/${cleanCode}`);
        return;
      }

      if (roomData.player2Id && roomData.player2Id !== user.uid) {
        toast({ variant: "destructive", title: "Room Full", description: "This game already has two players." });
        setIsActionLoading(false);
        return;
      }

      await updateDoc(roomRef, {
        player2Id: user.uid,
        player2CurrentHealth: roomData.healthOption
      });

      router.push(`/lobby/${cleanCode}`);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Join Failed", description: "Permissions or network error." });
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
          <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                <Download className="w-16 h-16 text-primary animate-bounce relative z-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tighter uppercase italic">Optimising Assets</h2>
                <p className="text-slate-400 text-sm font-medium">Downloading video sequences and player data...</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-black tracking-widest text-primary uppercase">
                <span>Synchronizing</span>
                <span>{Math.round(syncProgress)}%</span>
              </div>
              <Progress value={syncProgress} className="h-2 bg-white/5" />
            </div>
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              <CheckCircle2 className={`w-3 h-3 ${syncProgress === 100 ? 'text-green-500' : 'text-slate-800'}`} />
              Verification in progress
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50" />
      
      <div className="relative z-10 w-full max-w-md space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 rounded-3xl bg-primary/20 text-primary shadow-inner mb-2 border border-primary/20">
            <Swords className="w-12 h-12" />
          </div>
          <h1 className="text-6xl font-black tracking-tighter font-headline text-white">FOOTY DUEL</h1>
          <p className="text-slate-400 font-medium tracking-wide">MASTER THE TRIVIA. WIN THE DUEL.</p>
        </div>

        {!user ? (
          <Card className="bg-[#161618] border-white/5 backdrop-blur-xl shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-headline text-white">Sign In</CardTitle>
              <CardDescription>Use your Google account to start dueling</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGoogleLogin} size="lg" className="w-full font-bold h-14 bg-white text-black hover:bg-slate-100 gap-3 rounded-2xl transition-all active:scale-95">
                <LogIn className="w-5 h-5" />
                Sign in with Google
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5">
              <img src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} className="w-12 h-12 rounded-full ring-2 ring-primary object-cover" alt="Profile" />
              <div>
                <h3 className="font-bold">{user.displayName}</h3>
                <p className="text-xs text-primary font-black uppercase tracking-tighter">Profile Connected</p>
              </div>
            </div>

            <div className="grid gap-3">
              <Button 
                onClick={handleCreateRoom} 
                disabled={isActionLoading}
                className="w-full h-16 text-lg font-black bg-primary hover:bg-primary/90 gap-2 shadow-lg rounded-2xl transition-all active:scale-95"
              >
                {isActionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />} 
                CREATE NEW DUEL
              </Button>
              
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-4 text-xs font-black text-slate-500 uppercase tracking-widest">Or Join Friend</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              <div className="flex gap-2">
                <Input 
                  placeholder="CODE" 
                  className="h-16 bg-[#161618] border-white/10 text-center font-black tracking-[0.2em] text-2xl focus-visible:ring-primary rounded-2xl text-white uppercase"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  maxLength={6}
                />
                <Button 
                  onClick={handleJoinRoom} 
                  disabled={isActionLoading || !roomCode}
                  variant="secondary" 
                  className="h-16 px-8 font-black rounded-2xl transition-all active:scale-95"
                >
                  {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "JOIN"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center text-center">
              <Trophy className="text-secondary w-6 h-6 mb-2" />
              <span className="text-[10px] uppercase font-black text-slate-500">Live Games</span>
              <span className="text-xl font-bold">1,248</span>
           </div>
           <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center text-center">
              <Users className="text-primary w-6 h-6 mb-2" />
              <span className="text-[10px] uppercase font-black text-slate-500">Online Players</span>
              <span className="text-xl font-bold">4,592</span>
           </div>
        </div>
      </div>
    </div>
  );
}
