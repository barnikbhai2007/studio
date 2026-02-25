
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Swords, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

export default function LandingPage() {
  const [roomCode, setRoomCode] = useState("");
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
      await setDoc(userRef, {
        id: user.uid,
        googleAccountId: user.uid,
        displayName: user.displayName || "Player",
        avatarUrl: user.photoURL || "",
        totalGamesPlayed: 0,
        totalWins: 0,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      }, { merge: true });

      toast({ title: "Welcome back!", description: `Logged in as ${user.displayName}` });
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        toast({
          variant: "destructive",
          title: "Setup Required",
          description: "Google Login is not enabled. Go to Firebase Console > Auth > Sign-in method and enable Google.",
        });
      } else {
        toast({ variant: "destructive", title: "Login failed", description: error.message });
      }
    }
  };

  const handleCreateRoom = async () => {
    if (!user) return;
    
    // Generate a clean 6-character alphanumeric code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomRef = doc(db, "gameRooms", code);

    await setDoc(roomRef, {
      id: code,
      creatorId: user.uid,
      player1Id: user.uid,
      status: 'Lobby',
      healthOption: 100,
      player1CurrentHealth: 100,
      player2CurrentHealth: 100,
      currentRoundNumber: 1,
      createdAt: new Date().toISOString(),
    });

    router.push(`/lobby/${code}`);
  };

  const handleJoinRoom = async () => {
    if (!user || !roomCode) return;

    const cleanCode = roomCode.toUpperCase().trim();
    const roomRef = doc(db, "gameRooms", cleanCode);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      toast({ variant: "destructive", title: "Room Not Found", description: "Check your code and try again." });
      return;
    }

    const roomData = roomSnap.data();
    if (roomData.player2Id && roomData.player2Id !== user.uid) {
      toast({ variant: "destructive", title: "Room Full", description: "This game is already 1v1." });
      return;
    }

    if (roomData.player1Id === user.uid) {
      router.push(`/lobby/${cleanCode}`);
      return;
    }

    await setDoc(roomRef, {
      player2Id: user.uid,
      player2CurrentHealth: roomData.healthOption
    }, { merge: true });

    router.push(`/lobby/${cleanCode}`);
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Swords className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50" />
      
      <div className="relative z-10 w-full max-w-md space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 rounded-3xl bg-primary/20 text-primary shadow-inner mb-2">
            <Swords className="w-12 h-12" />
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-white font-headline">FOOTY DUEL</h1>
          <p className="text-slate-400 font-medium tracking-wide">MASTER THE TRIVIA. WIN THE DUEL.</p>
        </div>

        {!user ? (
          <Card className="bg-slate-900/50 border-white/5 backdrop-blur-xl shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-headline text-white">Authenticating...</CardTitle>
              <CardDescription>Join thousands of players in real-time battles</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGoogleLogin} size="lg" className="w-full font-bold h-14 bg-white text-black hover:bg-slate-100 gap-3 rounded-2xl">
                <LogIn className="w-5 h-5" />
                Sign in with Google
              </Button>
              <p className="text-[10px] text-center text-slate-500 mt-4 uppercase font-bold tracking-widest">Secure Firebase Auth</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5">
              <img src={user.photoURL || ""} className="w-12 h-12 rounded-full ring-2 ring-primary" alt="Profile" />
              <div>
                <h3 className="font-bold text-white">{user.displayName}</h3>
                <p className="text-xs text-primary font-black uppercase tracking-tighter">Ready for kick-off</p>
              </div>
            </div>

            <div className="grid gap-3">
              <Button onClick={handleCreateRoom} className="w-full h-16 text-lg font-black bg-primary hover:bg-primary/90 gap-2 shadow-lg rounded-2xl">
                <Plus className="w-6 h-6" /> CREATE NEW DUEL
              </Button>
              
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-4 text-xs font-black text-slate-500 uppercase tracking-widest">Or Join Friend</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              <div className="flex gap-2">
                <Input 
                  placeholder="ROOM CODE" 
                  className="h-16 bg-slate-900 border-white/10 text-center font-black tracking-[0.5em] text-xl focus-visible:ring-primary rounded-2xl text-white"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                />
                <Button onClick={handleJoinRoom} variant="secondary" className="h-16 px-8 font-black rounded-2xl">
                  JOIN
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
