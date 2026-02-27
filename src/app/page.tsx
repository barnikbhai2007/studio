
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
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, collection, arrayUnion, query, orderBy, limit, getDocs, where } from "firebase/firestore";
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
  const [showAbout, setShowAbout] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
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

  // Optimized query for counts
  const todayQuery = useMemoFirebase(() => {
    const today = startOfDay(new Date()).toISOString();
    return query(collection(db, "gameRooms"), where("createdAt", ">=", today), limit(50));
  }, [db]);
  const { data: todayRooms } = useCollection(todayQuery);

  const roomsToday = todayRooms?.length || 0;
  const playerCount = 1240 + (profileData?.totalGamesPlayed || 0);

  useEffect(() => {
    const checkSeasonalResetReward = async () => {
      if (!user || !db) return;
      const now = new Date();
      const isResetWindow = now.getUTCDay() === 1 && now.getUTCHours() === 18 && now.getUTCMinutes() < 60;
      
      if (isResetWindow) {
        const q = query(collection(db, "userProfiles"), orderBy("totalWins", "desc"), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty && snap.docs[0].id === user.uid) {
          const uRef = doc(db, "userProfiles", user.uid);
          await updateDoc(uRef, { unlockedEmoteIds: arrayUnion('rank_one') });
          toast({ title: "SEASON CHAMPION", description: "RANK 1 REWARD DELIVERED!" });
        }
      }
    };
    checkSeasonalResetReward();
  }, [user, db, toast]);

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
                    FootyDuel is a real-time 1v1 footballer guessing battle.
                  </p>
                  <div className="space-y-3">
                    <h3 className="text-primary flex items-center gap-2">
                      <ScrollText className="w-4 h-4" /> Rules:
                    </h3>
                    <ul className="space-y-2 list-none">
                      <li>• Correct guess = +10 HP gain potential.</li>
                      <li>• Wrong guess = –10 HP risk.</li>
                      <li>• Skip = 0 HP change.</li>
                      <li>• Win 10 matches to unlock the VICTORY ROYALE emote!</li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
              {isSyncing ? (
                <div className="w-full space-y-2 px-4">
                  <Progress value={syncProgress} className="h-2 bg-white/5" />
                  <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
                    Syncing Intelligence... {Math.round(syncProgress)}%
                  </p>
                </div>
              ) : (
                <Button onClick={() => setShowManual(false)} className="w-full h-14 bg-primary text-black font-black uppercase rounded-2xl">
                  GOT IT, DUELIST
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
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-8 flex flex-col items-center">
              <h2 className="text-3xl font-black uppercase text-primary tracking-tighter">SUPPORT DEV</h2>
              <img src="https://res.cloudinary.com/speed-searches/image/upload/v1772129990/photo_2026-02-26_23-45-57_isa851.jpg" className="w-56 h-56 rounded-3xl bg-white p-2" alt="QR" />
              <Button onClick={() => setShowSupport(false)} className="w-full h-14 bg-primary text-black font-black uppercase rounded-2xl">BACK</Button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-md space-y-10 py-8">
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 rounded-3xl bg-primary/20 text-primary border border-primary/20 mb-2">
            <Swords className="w-12 h-12" />
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-white uppercase">FOOTY DUEL</h1>
        </div>

        {!user ? (
          <Card className="bg-[#161618] border-white/5 shadow-2xl rounded-3xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-black text-white uppercase">SIGN IN</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGoogleLogin} className="w-full h-14 bg-white text-black font-black text-lg gap-3 rounded-2xl">
                <LogIn className="w-5 h-5" /> GOOGLE SIGN IN
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-3xl border border-white/5">
              <div className="flex items-center gap-4">
                <img src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} className="w-12 h-12 rounded-full ring-2 ring-primary" alt="Profile" />
                <div className="flex flex-col">
                  <span className="font-black text-sm uppercase truncate max-w-[120px]">{user.displayName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] text-primary font-black uppercase"><Trophy className="w-2 h-2 inline mr-1" /> {profileData?.totalWins || 0} WINS</span>
                    <span className="text-[8px] text-slate-500 font-black uppercase"><Swords className="w-2 h-2 inline mr-1" /> {profileData?.totalGamesPlayed || 0} MATCHES</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => auth.signOut()} className="text-slate-500"><LogOut className="w-5 h-5" /></Button>
            </div>

            <div className="grid gap-3">
              <Button onClick={handleCreateRoom} className="w-full h-16 text-xl font-black bg-primary rounded-2xl uppercase">CREATE DUEL</Button>
              <div className="flex gap-2">
                <Input placeholder="ROOM" className="h-16 bg-[#161618] text-center font-black tracking-[0.3em] text-2xl rounded-2xl uppercase" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} maxLength={6} />
                <Button onClick={handleJoinRoom} variant="secondary" className="h-16 px-8 font-black rounded-2xl uppercase">JOIN</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => router.push('/quests')} variant="outline" className="h-14 bg-white/5 rounded-2xl font-black uppercase"><Target className="w-5 h-5 mr-2" /> QUESTS</Button>
              <Button onClick={() => router.push('/leaderboard')} variant="outline" className="h-14 bg-white/5 rounded-2xl font-black uppercase"><BarChart3 className="w-5 h-5 mr-2" /> BOARD</Button>
            </div>

            <Button onClick={() => setShowSupport(true)} variant="link" className="w-full text-slate-500 font-black uppercase text-[10px]">
              <Heart className="w-3 h-3 mr-2" /> SUPPORT DEVELOPER
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white/5 p-5 rounded-3xl border border-white/5 flex flex-col items-center">
              <Trophy className="text-secondary w-6 h-6 mb-1" />
              <span className="text-[8px] uppercase font-black text-slate-500">DUELS TODAY</span>
              <span className="text-xl font-black">{roomsToday}</span>
           </div>
           <div className="bg-white/5 p-5 rounded-3xl border border-white/5 flex flex-col items-center">
              <Users className="text-primary w-6 h-6 mb-1" />
              <span className="text-[8px] uppercase font-black text-slate-500">PLAYERS</span>
              <span className="text-xl font-black">{playerCount}</span>
           </div>
        </div>

        <div className="text-center pt-8 pb-4">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center justify-center gap-2">
            MADE WITH <Heart className="w-3 h-3 text-red-500 fill-red-500" /> IN INDIA
          </p>
        </div>
      </div>
    </div>
  );
}
