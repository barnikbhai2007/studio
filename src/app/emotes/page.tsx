
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smile, ArrowLeft, Save, CheckCircle2, Lock, Sparkles, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ALL_EMOTES, DEFAULT_EQUIPPED_IDS, UNLOCKED_EMOTE_IDS, Emote } from "@/lib/emote-data";

export default function EmotesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  const userRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "userProfiles", user.uid);
  }, [db, user]);

  const { data: profile, isLoading: isProfileLoading } = useDoc(userRef);
  const [equippedIds, setEquippedIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Merge default free emotes with user's unlocked rewards
  const unlockedList = Array.from(new Set([...UNLOCKED_EMOTE_IDS, ...(profile?.unlockedEmoteIds || [])]));

  useEffect(() => {
    if (profile) {
      setEquippedIds(profile.equippedEmoteIds || DEFAULT_EQUIPPED_IDS);
    }
  }, [profile]);

  useEffect(() => {
    if (!isUserLoading && !user) router.push('/');
  }, [user, isUserLoading, router]);

  const toggleEmote = (emoteId: string) => {
    const isCurrentlyEquipped = equippedIds.includes(emoteId);
    
    if (!isCurrentlyEquipped) {
      if (!unlockedList.includes(emoteId)) {
        toast({
          variant: "destructive",
          title: "RESTRICTED",
          description: "COMPLETE QUESTS TO UNLOCK THIS EMOTE."
        });
        return;
      }

      if (equippedIds.length >= 6) {
        toast({
          variant: "destructive",
          title: "LOCKDOWN",
          description: "MAXIMUM 6 EMOTES ALLOWED IN DUEL LOADOUT."
        });
        return;
      }
    }

    setEquippedIds(prev => {
      if (prev.includes(emoteId)) {
        return prev.filter(id => id !== emoteId);
      }
      return [...prev, emoteId];
    });
  };

  const handleSave = async () => {
    if (!userRef) return;
    setIsSaving(true);
    try {
      await updateDoc(userRef, { equippedEmoteIds: equippedIds });
      toast({ title: "LOADOUT SAVED", description: "YOUR EMOTES ARE READY FOR COMBAT." });
    } catch (error) {
      toast({ variant: "destructive", title: "SAVE FAILED", description: "CHECK YOUR CONNECTION." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-4 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-8 py-8">
        <header className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="rounded-xl bg-white/5 hover:bg-white/10 shrink-0">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="flex flex-col">
              <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">EMOTE LOADOUT</h1>
              <span className="text-[10px] font-black text-primary tracking-[0.3em] uppercase">CUSTOMIZE YOUR DUEL PERSONALITY</span>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto bg-primary text-black font-black uppercase rounded-2xl h-12 px-6 gap-2">
            <Save className="w-5 h-5" /> {isSaving ? "SAVING..." : "SAVE LOADOUT"}
          </Button>
        </header>

        <section className="grid gap-6">
          <Card className="bg-[#161618] border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black uppercase">EQUIPPED SLOTS</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
                    {equippedIds.length}/6 SLOTS ACTIVE
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`w-3 h-3 rounded-full ${i < equippedIds.length ? 'bg-primary' : 'bg-white/10'}`} />
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {equippedIds.map(id => {
                  const emote = ALL_EMOTES.find(e => e.id === id);
                  return (
                    <div key={id} onClick={() => toggleEmote(id)} className="relative aspect-square rounded-2xl bg-white/5 border-2 border-primary overflow-hidden group cursor-pointer hover:scale-105 transition-all">
                      <img src={emote?.url} className="w-full h-full object-cover" alt={emote?.name} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Badge variant="destructive" className="font-black text-[8px] uppercase">REMOVE</Badge>
                      </div>
                    </div>
                  );
                })}
                {[...Array(6 - equippedIds.length)].map((_, i) => (
                  <div key={i} className="aspect-square rounded-2xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center">
                    <Smile className="w-6 h-6 text-white/10" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2 px-2">
              <Sparkles className="w-4 h-4 text-primary" /> AVAILABLE COLLECTION
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {ALL_EMOTES.filter(e => {
                // Only show Rank One if it's unlocked
                if (e.id === 'rank_one' && !unlockedList.includes('rank_one')) return false;
                return true;
              }).map(emote => {
                const isEquipped = equippedIds.includes(emote.id);
                const isUnlocked = unlockedList.includes(emote.id);
                
                return (
                  <div 
                    key={emote.id} 
                    onClick={() => toggleEmote(emote.id)}
                    className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-105 ${isEquipped ? 'ring-4 ring-primary ring-offset-4 ring-offset-[#0a0a0b]' : 'bg-[#161618] border border-white/5'} ${!isUnlocked ? 'grayscale opacity-40' : ''}`}
                  >
                    <img src={emote.url} className={`w-full h-full object-cover ${isEquipped ? 'opacity-50' : ''}`} alt={emote.name} />
                    {isEquipped && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-primary drop-shadow-lg" />
                      </div>
                    )}
                    {!isUnlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Lock className="w-8 h-8 text-white/60" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md p-1.5">
                      <p className="text-[8px] font-black uppercase text-center truncate">{emote.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <footer className="text-center pt-8 opacity-40">
          <p className="text-[8px] font-black uppercase tracking-[0.5em] flex items-center justify-center gap-2">
            <Trophy className="w-3 h-3" /> COMPLETE QUESTS TO UNLOCK MORE REWARDS
          </p>
        </footer>
      </div>
    </div>
  );
}
