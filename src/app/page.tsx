
"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Plus, Swords, LogIn, Loader2, Trophy, Users, Download, 
  LogOut, Target, Heart, Info, HelpCircle,
  BarChart3, Smile, Sparkles, ScrollText, X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, collection } from "firebase/firestore";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { isToday } from "date-fns";

export default function LandingPage() {
  const [roomCode, setRoomCode] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
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
      const loggedUser = result.user;
      
      const userRef = doc(db, "userProfiles", loggedUser.uid);
      const userSnap = await getDoc(userRef);

      // Trigger sync for every login
      startAssetSync(loggedUser.uid, loggedUser.displayName, loggedUser.photoURL, !userSnap.exists());
      
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login failed", description: "Google authentication error." });
    }
  };

  const startAssetSync = async (uid: string, displayName: string | null, photoURL: string | null, isNew: boolean) => {
    setIsSyncing(true);
    setShowManual(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 8;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(async () => {
          const userRef = doc(db, "userProfiles", uid);
          if (isNew) {
            await setDoc(userRef, {
              id: uid,
              googleId: uid,
              displayName: displayName || "Player",
              avatarUrl: photoURL || `https://picsum.photos/seed/${uid}/200/200`,
              totalGamesPlayed: 0,
              totalWins: 0,
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString()
            }, { merge: true });
          } else {
            await updateDoc(userRef, { lastLoginAt: new Date().toISOString() });
          }
          setIsSyncing(false);
          toast({ title: "Duelist Ready", description: `LOGGED IN AS ${displayName?.toUpperCase()}` });
        }, 800);
      }
      setSyncProgress(progress);
    }, 200);
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
        gameVersion: 'DEMO',
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
      {/* Welcome Manual & Asset Sync Overlay */}
      {(isSyncing || showManual) && (
        <div className="fixed inset-0 z-[100] bg-black/98 flex flex-col items-center justify-center p-6 backdrop-blur-3xl animate-in fade-in duration-500 overflow-hidden">
          <div className="w-full max-w-lg space-y-6 text-center flex flex-col items-center relative">
            {!isSyncing && showManual && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowManual(false)} 
                className="absolute -top-12 right-0 text-slate-500 hover:text-white"
              >
                <X className="w-6 h-6" />
              </Button>
            )}

            <div className="relative inline-block shrink-0">
              <div className="absolute inset-0 bg-primary/20 blur-[40px] rounded-full animate-pulse" />
              {isSyncing ? (
                <Download className="w-12 h-12 text-primary mx-auto relative z-10 animate-bounce" />
              ) : (
                <HelpCircle className="w-12 h-12 text-primary mx-auto relative z-10" />
              )}
            </div>
            
            <div className="w-full space-y-4">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-primary">🎮 Welcome to FootyDuel!</h2>
              
              <ScrollArea className="h-[50vh] w-full bg-white/5 p-6 rounded-[2rem] border border-white/10 text-left">
                <div className="space-y-4 text-xs font-bold leading-relaxed text-slate-300 uppercase tracking-tight">
                  <p className="text-white text-sm leading-tight">
                    FootyDuel is a real-time 1v1 footballer guessing battle where speed and knowledge decide the winner.
                  </p>
                  
                  <div className="space-y-3">
                    <h3 className="text-primary flex items-center gap-2">
                      <ScrollText className="w-4 h-4" /> How It Works:
                    </h3>
                    <ul className="space-y-2 list-none">
                      <li>1. Create a room or join one using a room code.</li>
                      <li>2. Wait in the lobby until both players are ready.</li>
                      <li>3. Each round, a footballer will be revealed.</li>
                      <li>4. Correct guess = +10 points.<br/>Wrong guess = –10 points.<br/>Skip = 0 points.</li>
                      <li>5. If both players score the same, health remains unchanged.<br/>If one gets +10 and the other –10, the second player loses 20 health.</li>
                      <li>6. Forfeiting the match or dropping to 0 health results in defeat.</li>
                    </ul>
                  </div>

                  <p className="text-primary/80 border-t border-white/10 pt-4">
                    🔥 Stay fast. Stay sharp. Prove your football knowledge.
                  </p>
                  
                  <div className="pt-2">
                    <p className="text-white">Good luck and have fun!</p>
                    <p className="text-[10px] text-slate-500">~ Barnik (brokenAqua)</p>
                  </div>
                </div>
              </ScrollArea>

              {isSyncing ? (
                <div className="w-full space-y-2 px-4">
                  <Progress value={syncProgress} className="h-2 bg-white/5" />
                  <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
                    {syncProgress < 100 ? `Syncing Intelligence... ${Math.round(syncProgress)}%` : "Ready for Kickoff!"}
                  </p>
                </div>
              ) : (
                <Button 
                  onClick={() => setShowManual(false)} 
                  className="w-full h-14 bg-primary text-black font-black uppercase rounded-2xl"
                >
                  GOT IT, DUELIST
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Support Dev Overlay */}
      {showSupport && (
        <div className="fixed inset-0 z-[110] bg-black/98 flex flex-col items-center justify-center p-6 backdrop-blur-3xl animate-in fade-in duration-500 overflow-hidden">
          <div className="w-full max-w-sm space-y-6 text-center flex flex-col items-center relative">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowSupport(false)} 
              className="absolute -top-12 right-0 text-slate-500 hover:text-white"
            >
              <X className="w-6 h-6" />
            </Button>
            
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-8 flex flex-col items-center">
              <div className="space-y-3">
                 <h2 className="text-3xl font-black uppercase text-primary tracking-tighter leading-none">SUPPORT THE DEV</h2>
                 <p className="text-[11px] font-bold text-slate-300 uppercase leading-relaxed tracking-tight">
                    Buy the dev a coffee. Scan the QR code and help the project to run for more days.
                 </p>
              </div>
              
              <div className="relative group">
                 <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-3xl group-hover:bg-primary/30 transition-all animate-pulse" />
                 <img 
                    src="https://res.cloudinary.com/speed-searches/image/upload/v1772129990/photo_2026-02-26_23-45-57_isa851.jpg" 
                    className="relative z-10 w-56 h-56 mx-auto rounded-3xl border-4 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-white p-2 object-contain" 
                    alt="Support QR Code"
                 />
              </div>

              <Button 
                onClick={() => setShowSupport(false)} 
                className="w-full h-14 bg-primary text-black font-black uppercase rounded-2xl shadow-xl hover:scale-105 transition-transform"
              >
                BACK TO LOBBY
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Info / About Me Overlay */}
      {showAbout && (
        <div className="fixed inset-0 z-[120] bg-black/98 flex flex-col items-center justify-center p-6 backdrop-blur-3xl animate-in fade-in duration-500 overflow-hidden">
          <div className="w-full max-w-lg space-y-6 text-center flex flex-col items-center relative">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowAbout(false)} 
              className="absolute -top-12 right-0 text-slate-500 hover:text-white"
            >
              <X className="w-6 h-6" />
            </Button>
            
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6 text-left">
              <h2 className="text-3xl font-black uppercase text-primary tracking-tighter text-center">About Me</h2>
              <div className="space-y-4 text-xs font-bold leading-relaxed text-slate-300 uppercase tracking-tight">
                <p className="text-white text-base font-black">Hi, I’m Barnik 👋</p>
                <p>I’m a passionate web developer from India who loves building interactive games and creative web projects. I enjoy creating real-time multiplayer experiences and learning new technologies every day.</p>
                <p>For development and problem-solving, I take major guidance from Gemini, along with support from ChatGPT. For voice and song-related content, I use ElevenLabs, and for designing clean and attractive UI elements, I use Canva.</p>
                <p className="text-primary/80 border-t border-white/10 pt-4">All ideas, planning, and final project decisions are mine — these tools simply help me work smarter and faster.</p>
                <div className="pt-2 text-center">
                  <p className="text-white font-black">Made with passion in India 🇮🇳</p>
                </div>
              </div>
              <Button 
                onClick={() => setShowAbout(false)} 
                className="w-full h-14 bg-primary text-black font-black uppercase rounded-2xl shadow-xl"
              >
                BACK TO LOBBY
              </Button>
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
              <CardTitle className="text-2xl font-black text-white uppercase">WELCOME DUELIST</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest">SIGN IN TO START YOUR CAREER</CardDescription>
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
                  <span className="font-black text-sm uppercase">{user.displayName}</span>
                  <span className="text-[8px] text-primary font-black tracking-widest uppercase">WELCOME BACK DUELIST</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => auth.signOut()} className="text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid gap-3">
              <Button onClick={handleCreateRoom} disabled={isActionLoading} className="w-full h-16 text-xl font-black bg-primary hover:bg-primary/90 gap-3 shadow-lg rounded-2xl uppercase">
                {isActionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-7 h-7" />} CREATE NEW DUEL
              </Button>
              <div className="flex gap-2">
                <Input 
                  placeholder="ROOM" 
                  className="h-16 bg-[#161618] border-white/10 text-center font-black tracking-[0.3em] text-2xl rounded-2xl text-white uppercase"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  maxLength={6}
                />
                <Button onClick={handleJoinRoom} disabled={isActionLoading || !roomCode} variant="secondary" className="h-16 px-8 font-black rounded-2xl uppercase">
                  JOIN
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-14 border-white/5 bg-white/5 rounded-2xl font-black uppercase tracking-tighter gap-2 hover:bg-white/10">
                <Target className="w-5 h-5 text-primary" /> QUESTS
              </Button>
              <Button variant="outline" className="h-14 border-white/5 bg-white/5 rounded-2xl font-black uppercase tracking-tighter gap-2 hover:bg-white/10">
                <BarChart3 className="w-5 h-5 text-yellow-500" /> LEADERBOARD
              </Button>
              <Button 
                onClick={() => setShowAbout(true)}
                variant="outline" 
                className="h-14 border-white/5 bg-white/5 rounded-2xl font-black uppercase tracking-tighter gap-2 hover:bg-white/10"
              >
                <Info className="w-5 h-5 text-secondary" /> INFO
              </Button>
              <Button variant="outline" className="h-14 border-white/5 bg-white/5 rounded-2xl font-black uppercase tracking-tighter gap-2 hover:bg-white/10">
                <Smile className="w-5 h-5 text-green-400" /> EMOTES
              </Button>
            </div>

            <Button 
              onClick={() => setShowSupport(true)}
              variant="link" 
              className="w-full text-slate-500 font-black uppercase text-[10px] tracking-[0.3em] hover:text-primary"
            >
              <Heart className="w-3 h-3 mr-2" /> SUPPORT THE DEV
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white/5 p-5 rounded-3xl border border-white/5 flex flex-col items-center text-center space-y-1">
              <Trophy className="text-secondary w-6 h-6 mb-1" />
              <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">DUELS TODAY</span>
              <span className="text-2xl font-black">{roomsToday.toLocaleString()}</span>
           </div>
           <div className="bg-white/5 p-5 rounded-3xl border border-white/5 flex flex-col items-center text-center space-y-1">
              <Users className="text-primary w-6 h-6 mb-1" />
              <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">TOTAL DUELISTS REGISTERED</span>
              <span className="text-2xl font-black">{playerCount.toLocaleString()}</span>
           </div>
        </div>
      </div>

      {/* Floating Info Button */}
      <Button 
        onClick={() => setShowManual(true)} 
        size="icon" 
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-black shadow-2xl hover:scale-110 transition-transform z-50 border-4 border-[#0a0a0b]"
      >
        <span className="text-2xl font-black">?</span>
      </Button>
    </div>
  );
}
