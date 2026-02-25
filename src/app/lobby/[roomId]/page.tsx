"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Users, Play, ShieldAlert, Crown } from "lucide-react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function LobbyPage() {
  const { roomId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const isLeader = searchParams.get("isLeader") === "true";

  const [health, setHealth] = useState("100");
  const [version, setVersion] = useState("DEMO");
  const [opponent, setOpponent] = useState<{ name: string; photo: string } | null>(null);
  const [user, setUser] = useState<{ name: string; photo: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("footy_user");
    if (saved) setUser(JSON.parse(saved));

    // Simulate opponent joining after 5 seconds if we are leader
    if (isLeader) {
      const timer = setTimeout(() => {
        const mockOpponent = {
          name: "Challenger_" + Math.floor(Math.random() * 99),
          photo: "https://picsum.photos/seed/opp/100/100"
        };
        setOpponent(mockOpponent);
        toast({ title: "Player Joined", description: `${mockOpponent.name} has entered the room!` });
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      // Simulate leader already there
      setOpponent({ name: "Host_Pro", photo: "https://picsum.photos/seed/host/100/100" });
    }
  }, [isLeader]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomId as string);
    toast({ title: "Copied!", description: "Room code copied to clipboard." });
  };

  const startGame = () => {
    if (!opponent) {
      toast({ variant: "destructive", title: "Wait!", description: "Waiting for an opponent to join." });
      return;
    }
    router.push(`/game/${roomId}?health=${health}&isLeader=${isLeader}`);
  };

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center">
      <div className="w-full max-w-lg space-y-6">
        <header className="flex justify-between items-center py-4">
          <h1 className="text-2xl font-black font-headline text-primary">FOOTY DUEL</h1>
          <Badge variant="outline" className="text-xs font-bold border-primary text-primary">ROOM: {roomId}</Badge>
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
                {isLeader && <Crown className="w-4 h-4 text-yellow-500 absolute -top-2 left-1/2 -translate-x-1/2" />}
                <img src={user?.photo} className="w-16 h-16 rounded-full mb-2 border-2 border-primary" alt="You" />
                <span className="font-bold text-sm truncate w-full text-center">{user?.name} (YOU)</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-xl bg-muted/50 border-2 border-dashed border-muted-foreground/30">
                {opponent ? (
                  <>
                    {!isLeader && <Crown className="w-4 h-4 text-yellow-500 absolute -top-2 left-1/2 -translate-x-1/2" />}
                    <img src={opponent.photo} className="w-16 h-16 rounded-full mb-2 border-2 border-secondary" alt="Opponent" />
                    <span className="font-bold text-sm truncate w-full text-center">{opponent.name}</span>
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
                  <Select value={health} onValueChange={setHealth}>
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
                  <div className="h-12 bg-muted rounded-md flex items-center px-3 font-bold">{health} HP</div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Game Version</label>
                {isLeader ? (
                  <Select value={version} onValueChange={setVersion}>
                    <SelectTrigger className="bg-muted border-none h-12">
                      <SelectValue placeholder="Select Version" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEMO">DEMO v1.0</SelectItem>
                      <SelectItem value="GTF1">GTF 1 (Classic)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-12 bg-muted rounded-md flex items-center px-3 font-bold">{version}</div>
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