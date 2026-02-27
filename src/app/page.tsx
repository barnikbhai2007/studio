"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Plus, Swords, LogIn, Trophy, Users, Download, 
  LogOut, Target, Heart, Info, HelpCircle,
  BarChart3, Smile, Sparkles, X, Coffee
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, collection, query, where, limit, getCountFromServer } from "firebase/firestore";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { startOfDay } from "date-fns";
import { DEFAULT_EQUIPPED_IDS, UNLOCKED_EMOTE_IDS } from "@/lib/emote-data";

export default function LandingPage() {
  const [roomCode, setRoomCode] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "userProfiles", user.uid);
  }, [db, user]);

  const { data: profileData } = useDoc(userProfileRef);

  const todayQuery = useMemoFirebase(() => {
    const today = startOfDay(new Date()).toISOString();
    return query(collection(db, "gameRooms"), where("createdAt", ">=", today), limit(50));
  }, [db]);
  const { data: todayRooms } = useCollection(todayQuery);

  const roomsToday = todayRooms?.length || 0;

  useEffect(() => {
    const fetchTotalPlayers = async () => {
      try {
        const coll = collection(db, "userProfiles");
        const snapshot = await getCountFromServer(coll);
        setTotalPlayers(snapshot.data().count);
      } catch (e) {
        console.error("Error fetching player count:", e);
        setTotalPlayers(0);
      }
    };
    fetchTotalPlayers();
  }, [db]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const loggedUser = result.user;
      const userRef = doc(db, "userProfiles", loggedUser.uid);
      const userSnap = await getDoc(userRef);
      startAssetSync(loggedUser.uid, loggedUser.displayName, loggedUser.photoURL, !userSnap.exists());
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login failed", description: "Google authentication error." });
    }
  };

  const startAssetSync = async (uid: string, displayName: string | null, photoURL: string | null, isNew: boolean) => {
    setIsSyncing(true);
    setSyncProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
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
              totalLosses: 0,
              equippedEmoteIds: DEFAULT_EQUIPPED_IDS,
              unlockedEmoteIds: UNLOCKED_EMOTE_IDS,
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString()
            }, { merge: true });
          } else {
            await updateDoc(userRef, { lastLoginAt: new Date().toISOString() });
          }
          setIsSyncing(false);
          setShowManual(true);
          toast({ title: "Duelist Ready", description: `LOGGED IN AS ${displayName?.toUpperCase()}` });
        }, 500);
      }
      setSyncProgress(progress);
    }, 100);
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
        toast({ variant: "destructive", title: "Not Found", description: "Invalid code." });
        setIsActionLoading(false);
        return;
      }
      const data = roomSnap.data();
      if (data.player2Id && data.player2Id !== user.uid && data.player1Id !== user.uid) {
        toast({ variant: "destructive", title: "Full", description: "Match in progress." });
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
      console.error("Join error:", error);
      toast({ variant: "destructive", title: "Join Failed", description: "Check connection or permissions." });
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

      {(isSyncing || showManual) && (
        <div className="fixed inset-0 z-[100] bg-black/98 flex flex-col items-center justify-center p-6 backdrop-blur-3xl animate-in fade-in duration-500 overflow-hidden">
          <div className="w-full max-w-lg space-y-6 text-center flex flex-col items-center relative">
            {!isSyncing && (
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
              <h2 className="text-3xl font-black uppercase tracking-normal text-primary">
                {isSyncing ? "SYNCING CAREER" : "Welcome to FootyDuel!"}
              </h2>
              <ScrollArea className="h-[50vh] w-full bg-white/5 p-6 rounded-[2rem] border border-white/10 text-left">
                <div className="space-y-6 text-xs font-bold leading-relaxed text-slate-300 uppercase tracking-tight">
                  {isSyncing ? (
                    <div className="space-y-4 text-center py-8">
                       <p className="text-sm">SETTING UP PLAYER INTELLIGENCE...</p>
                       <p className="opacity-50">ESTABLISHING SECURE CONNECTION TO ARENA...</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-white text-sm leading-tight normal-case">
                        FootyDuel is a real-time 1v1 footballer guessing battle where speed and knowledge decide the winner.
                      </p>
                      
                      <div className="space-y-4">
                        <h3 className="text-primary flex items-center gap-2 text-sm uppercase">
                          <Plus className="w-4 h-4" /> How It Works:
                        </h3>
                        <ul className="space-y-3 list-none">
                          <li className="flex gap-2"><span className="text-primary">1.</span> Create a room or join one using a room code.</li>
                          <li className="flex gap-2"><span className="text-primary">2.</span> Wait in the lobby until both players are ready.</li>
                          <li className="flex gap-2"><span className="text-primary">3.</span> Each round, a footballer will be revealed.</li>
                          <li className="flex gap-2"><span className="text-primary">4.</span> Correct guess = +10 points. Wrong guess = –10 points. Skip = 0 points.</li>
                          <li className="flex gap-2"><span className="text-primary">5.</span> If both players score the same, health remains unchanged. If one gets +10 and the other –10, the second player loses 20 health.</li>
                          <li className="flex gap-2"><span className="text-primary">6.</span> Forfeiting the match or dropping to 0 health results in defeat.</li>
                        </ul>
                      </div>

                      <div className="pt-4 border-t border-white/10 space-y-4">
                        <p className="text-primary text-sm uppercase">Stay fast. Stay sharp. Prove your football knowledge.</p>
                        <p className="text-slate-400 normal-case">Good luck and have fun! ~ Barnik (brokenAqua)</p>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
              {isSyncing ? (
                <div className="w-full space-y-2 px-4">
                  <Progress value={syncProgress} className="h-2 bg-white/5" />
                  <p className="text-primary text-[10px] font-black uppercase tracking-widest animate-pulse">
                    SETUP FILE LOADING... {Math.round(syncProgress)}%
                  </p>
                </div>
              ) : (
                <Button onClick={() => setShowManual(false)} className="w-full h-14 bg-primary text-black font-black uppercase rounded-2xl shadow-xl">
                  READY TO KICKOFF
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {showSupport && (
        <div className="fixed inset-0 z-[110] bg-black/98 flex flex-col items-center justify-center p-6 backdrop-blur-3xl animate-in fade-in duration-500 overflow-hidden">
          <div className="w-full max-sm space-y-6 text-center flex flex-col items-center relative">
            <Button variant="ghost" size="icon" onClick={() => setShowSupport(false)} className="absolute -top-12 right-0 text-slate-500 hover:text-white">
              <X className="w-6 h-6" />
            </Button>
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6 flex flex-col items-center">
              <div className="flex flex-col items-center gap-2 text-center">
                <Coffee className="w-10 h-10 text-primary" />
                <h2 className="text-2xl font-black uppercase text-primary tracking-normal leading-tight">BUY THE DEV A COFFEE</h2>
              </div>
              
              <img src="https://res.cloudinary.com/speed-searches/image/upload/v1772129990/photo_2026-02-26_23-45-57_isa851.jpg" className="w-56 h-56 rounded-3xl bg-white p-2 shadow-2xl" alt="QR Code" />
              
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-relaxed px-4 text-center">
                Scan the QR code and help the project to run for more days.
              </p>

              <Button onClick={() => setShowSupport(false)} className="w-full h-14 bg-primary text-black font-black uppercase rounded-2xl shadow-xl">
                BACK TO DUEL
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          onClick={() => setShowManual(true)} 
          className="w-14 h-14 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 text-primary shadow-2xl hover:scale-110 transition-all flex items-center justify-center"
        >
          <HelpCircle className="w-8 h-8" />
        </Button>
      </div>

      <div className="relative z-10 w-full max-w-md space-y-10 py-8">
        <header className="text-center space-y-4">
          <div className="inline-flex p-4 rounded-3xl bg-primary/20 text-primary border border-primary/20 mb-2 animate-bounce">
            <Swords className="w-12 h-12" />
          </div>
          <h1 className="text-6xl font-black tracking-normal text-white uppercase">FOOTY DUEL</h1>
        </header>

        {!user ? (
          <Card className="bg-[#161618] border-white/5 shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-black text-white uppercase tracking-normal">AUTHENTICATION</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Join the global duelist arena</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Button onClick={handleGoogleLogin} className="w-full h-16 bg-white text-black font-black text-lg gap-3 rounded-2xl hover:scale-[1.02] transition-transform">
                <LogIn className="w-6 h-6" /> GOOGLE SIGN IN
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-[2rem] border border-white/5 backdrop-blur-md shadow-xl">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} className="w-14 h-14 rounded-full ring-2 ring-primary object-cover" alt="Profile" />
                  <div className="absolute -bottom-1 -right-1 bg-primary text-black rounded-full p-1 border-2 border-[#0a0a0b]">
                    <Sparkles className="w-3 h-3" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-base uppercase truncate max-w-[140px] tracking-tight">{user.displayName}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-primary font-black uppercase flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                      <Trophy className="w-2 h-2" /> {profileData?.totalWins || 0} WINS
                    </span>
                    <span className="text-[9px] text-slate-500 font-black uppercase flex items-center gap-1">
                      <Swords className="w-2 h-2" /> {profileData?.totalGamesPlayed || 0} MATCHES
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => auth.signOut()} className="text-slate-500 hover:text-red-500">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid gap-3">
              <Button onClick={handleCreateRoom} className="w-full h-12 text-sm font-black bg-primary rounded-xl uppercase shadow-lg hover:scale-[1.02] transition-all group">
                CREATE DUEL <Swords className="ml-2 w-4 h-4 group-hover:rotate-12 transition-transform" />
              </Button>
              <div className="flex gap-2">
                <Input 
                  placeholder="CODE" 
                  className="h-14 bg-[#161618] text-center font-black tracking-widest text-2xl rounded-xl uppercase border-white/10 focus:border-primary/50" 
                  value={roomCode} 
                  onChange={(e) => setRoomCode(e.target.value)} 
                  maxLength={6} 
                />
                <Button onClick={handleJoinRoom} variant="secondary" className="h-14 px-8 font-black rounded-xl uppercase text-lg shadow-xl">JOIN</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => router.push('/quests')} variant="outline" className="h-16 bg-white/5 rounded-2xl font-black uppercase border-white/10 hover:bg-white/10 hover:border-primary/30">
                <Target className="w-5 h-5 mr-2 text-primary" /> QUESTS
              </Button>
              <Button onClick={() => router.push('/leaderboard')} variant="outline" className="h-16 bg-white/5 rounded-2xl font-black uppercase border-white/10 hover:bg-white/10 hover:border-secondary/30">
                <BarChart3 className="w-5 h-5 mr-2 text-secondary" /> LEADERBOARD
              </Button>
              <Button onClick={() => router.push('/emotes')} variant="outline" className="h-16 bg-white/5 rounded-2xl font-black uppercase border-white/10 hover:bg-white/10">
                <Smile className="w-5 h-5 mr-2 text-primary" /> EMOTES
              </Button>
              <Button onClick={() => router.push('/quests')} variant="outline" className="h-16 bg-white/5 rounded-2xl font-black uppercase border-white/10 hover:bg-white/10">
                <Info className="w-5 h-5 mr-2 text-primary" /> INFO
              </Button>
            </div>

            <div className="pt-2">
              <Button variant="link" className="w-full text-slate-500 font-black uppercase text-[10px] hover:text-primary transition-colors tracking-widest" onClick={() => setShowSupport(true)}>
                <Heart className="w-3 h-3 mr-2 text-red-500 fill-red-500" /> SUPPORT THE DEV
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 flex flex-col items-center shadow-lg">
              <Trophy className="text-secondary w-8 h-8 mb-2" />
              <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest text-center">DUELS TODAY</span>
              <span className="text-2xl font-black">{roomsToday}</span>
           </div>
           <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 flex flex-col items-center shadow-lg">
              <Users className="text-primary w-8 h-8 mb-2" />
              <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest text-center">TOTAL REGISTERED</span>
              <span className="text-2xl font-black">{totalPlayers}</span>
           </div>
        </div>

        <div className="text-center pt-8 pb-4">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2">
            MADE WITH <Heart className="w-3 h-3 text-red-500 fill-red-500" /> IN INDIA
          </p>
        </div>
      </div>
    </div>
  );
}