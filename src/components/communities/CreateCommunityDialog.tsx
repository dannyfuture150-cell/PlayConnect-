"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useCreateCommunity } from "@/hooks/useCommunities";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { ChatModePicker } from "@/components/communities/ChatModePicker";

export function CreateCommunityDialog() {
  const { profile } = useAuth();
  const router = useRouter();
  const createCommunity = useCreateCommunity();
  const [chatMode, setChatMode] = useState<"everyone" | "admins">("everyone");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [game, setGame] = useState("");
  const [description, setDescription] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleCreate() {
    if (!profile || !name.trim() || !game.trim()) return;
    setSubmitError(null);
    try {
      const slug = await createCommunity.mutateAsync({ name, game, description, createdBy: profile.uid, chatMode });
      setOpen(false);
      setName("");
      setGame("");
      setDescription("");
      router.push(`/communities/${slug}`);
    } catch {
      setSubmitError("Couldn't create that community. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          New community
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Create a community</DialogTitle>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="community-name">Name</Label>
            <Input id="community-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. EA FC Grinders" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="community-game">Game</Label>
            <Input id="community-game" value={game} onChange={(e) => setGame(e.target.value)} placeholder="e.g. EA FC" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="community-desc">Description</Label>
            <Textarea
              id="community-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this community about?"
            />
          </div>
          <ChatModePicker value={chatMode} onChange={setChatMode} />
          {submitError && <p className="text-sm text-signal-red">{submitError}</p>}
          <Button onClick={handleCreate} disabled={!name.trim() || !game.trim() || createCommunity.isPending}>
            {createCommunity.isPending ? "Creating…" : "Create community"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
