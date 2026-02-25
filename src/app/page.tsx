"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Swords } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

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
      
      // Save user profile
      const userRef = doc(db, "userProfiles", user.uid);
      await setDoc(userRef, {
        id: user.uid,
        googleAccountId: user.uid,
        displayName: user.displayName || "Anonymous",
        avatarUrl: user.photoURL || "",
        totalGamesPlayed: 0,
        totalWins: 0,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      }, { merge: true });

      toast({
        title: "Logged in successfully",
        description: `Welcome, ${user.displayName}!`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message,
      });
    }
  };

  const handleCreateRoom = async () => {
    if (!user) return;
    
    // Generate a clean room code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomRef = doc(db, "gameRooms", code);

    setDocumentNonBlocking(roomRef, {
      id: code,
      creatorId: user.uid,
      player1Id: user.uid,
      status: 'Lobby',
      healthOption: 100,
      gameVersion: 'GTF 1',
      player1CurrentHealth: 100,
      player2CurrentHealth: 100,
      currentRoundNumber: 1,
      createdAt: new Date().toISOString(),
    }, { merge: true });

    toast({ title: "Room Created", description: `Room ${code} is ready!` });
    router.push(`/lobby/${code}?isLeader=true`);
  };

  const handleJoinRoom = async () => {
    if (!user) return;
    if (!roomCode || roomCode.length < 4) {
      toast({ variant: "destructive", title: "Invalid Code", description: "Enter a valid room code." });
      return;
    }

    const cleanCode = roomCode.toUpperCase();
    const roomRef = doc(db, "gameRooms", cleanCode);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      toast({ variant: "destructive", title: "Not Found", description: "Room does not exist." });
      return;
    }

    const roomData = roomSnap.data();
    if (roomData.player2Id && roomData.player2Id !== user.uid) {
      toast({ variant: "destructive", title: "Full", description: "Room is already full." });
      return;
    }

    // Join room
    await setDoc(roomRef, {
      player2Id: user.uid,
      player2CurrentHealth: roomData.healthOption || 100
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=2070')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      <div className="relative z-10 w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <div className="inline-flex p-4 rounded-full bg-primary/20 mb-4 animate-bounce">
            <Swords className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white font-headline">FOOTY DUEL</h1>
          <p className="text-muted-foreground font-medium">1v1 Real-time Football Guessing Battle</p>
        </div>

        {!user ? (
          <Card className="bg-card/90 border-primary/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl font-headline">Welcome Player</CardTitle>
              <CardDescription>Sign in to start your journey</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGoogleLogin} size="lg" className="w-full font-bold h-14 bg-white text-black hover:bg-white/90 gap-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="bg-card/90 border-primary/20 overflow-hidden shadow-2xl">
              <div className="p-1 bg-gradient-to-r from-primary to-secondary" />
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-6 text-left">
                  <img src={user.photoURL || ""} alt={user.displayName || ""} className="w-12 h-12 rounded-full border-2 border-primary" />
                  <div>
                    <h2 className="font-bold text-xl">{user.displayName}</h2>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-headline">Ready for Match</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <Button onClick={handleCreateRoom} className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 gap-2 shadow-lg">
                    <Plus className="w-5 h-5" /> CREATE ROOM
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-muted" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">OR JOIN</span></div>
                  </div>

                  <div className="flex gap-2">
                    <Input 
                      placeholder="ENTER ROOM CODE" 
                      className="h-14 bg-muted border-none text-center font-black tracking-widest text-lg focus-visible:ring-primary"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    />
                    <Button onClick={handleJoinRoom} variant="secondary" className="h-14 px-6 font-bold shadow-lg">
                      JOIN
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
