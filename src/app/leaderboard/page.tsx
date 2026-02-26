
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, ArrowLeft, Medal, Users, Swords, 
  TrendingUp, Clock, Sparkles, Flame
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";

export default function LeaderboardPage() {
  const router = useRouter();
  const db = useFirestore();

  const leaderboardQuery = useMemoFirebase(() => {
    return query(
      collection(db, "userProfiles"),
      orderBy("totalWins", "desc"),
      limit(10)
    );
  }, [db]);

  const { data: topPlayers, isLoading } = useCollection(leaderboardQuery);

  // Simulated countdown for the 7-day refresh
  const [timeLeft, setTimeLeft] = useState("6D 23H 59M");

  useEffect(() => {
    const timer = setInterval(() => {
      // Logic for refresh would typically be server-side, 
      // here we just simulate the feeling of a live season.
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <Swords className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-4 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-8 py-8">
        <header className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/')} 
            className="rounded-xl bg-white/5 hover:bg-white/10 shrink-0"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-4xl font-black uppercase tracking-tighter">HALL OF FAME</h1>
            <span className="text-[10px] font-black text-primary tracking-[0.3em] uppercase flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> GLOBAL RANKINGS
            </span>
          </div>
        </header>

        <section className="grid gap-4">
          <Card className="bg-[#161618] border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-xl font-black uppercase">TOP DUELISTS</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  RANKED BY TOTAL VICTORIES
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-primary/50 text-primary font-black uppercase text-[10px] py-1 gap-2">
                <Clock className="w-3 h-3" /> REFRESH IN: {timeLeft}
              </Badge>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-1">
                {topPlayers?.map((player: any, index: number) => {
                  const winRate = player.totalGamesPlayed > 0 
                    ? Math.round((player.totalWins / player.totalGamesPlayed) * 100) 
                    : 0;
                  
                  return (
                    <div 
                      key={player.id} 
                      className={`flex items-center gap-4 p-4 transition-colors ${index === 0 ? 'bg-primary/10 border-y border-primary/20' : 'hover:bg-white/5'}`}
                    >
                      <div className="w-8 flex justify-center items-center">
                        {index === 0 ? <Trophy className="w-6 h-6 text-yellow-500" /> : 
                         index === 1 ? <Medal className="w-6 h-6 text-slate-300" /> :
                         index === 2 ? <Medal className="w-6 h-6 text-orange-600" /> :
                         <span className="text-xl font-black text-white/20 italic">{index + 1}</span>}
                      </div>
                      
                      <div className="relative">
                        <img 
                          src={player.avatarUrl || `https://picsum.photos/seed/${player.id}/100/100`} 
                          className={`w-12 h-12 rounded-full border-2 object-cover ${index === 0 ? 'border-primary ring-4 ring-primary/20' : 'border-white/10'}`} 
                          alt={player.displayName} 
                        />
                        {index === 0 && <Flame className="absolute -top-1 -right-1 w-5 h-5 text-orange-500 fill-orange-500" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-black uppercase text-sm truncate">{player.displayName}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                          {player.totalGamesPlayed} MATCHES • {winRate}% WIN RATE
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-black text-white tracking-tighter leading-none">{player.totalWins}</p>
                        <p className="text-[8px] font-black text-primary uppercase tracking-widest">WINS</p>
                      </div>
                    </div>
                  );
                })}

                {(!topPlayers || topPlayers.length === 0) && (
                  <div className="p-12 text-center opacity-30">
                    <Users className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">NO DATA REGISTERED YET</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-dashed border-white/10 rounded-[2rem] p-6 text-center">
            <TrendingUp className="w-8 h-8 text-secondary mx-auto mb-3" />
            <h3 className="text-sm font-black uppercase text-white mb-1">PROVE YOUR KNOWLEDGE</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed max-w-xs mx-auto">
              EVERY VICTORY COUNTS TOWARDS YOUR GLOBAL RANK. CLIMB THE LADDER AND BECOME A LEGEND.
            </p>
          </Card>
        </section>

        <footer className="text-center pt-4">
          <p className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-600">
            FOOTYDUEL COMPETITIVE SEASON 1
          </p>
        </footer>
      </div>
    </div>
  );
}
