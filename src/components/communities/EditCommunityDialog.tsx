"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { Community } from "@/types";
import { useAuth } from "@/providers/AuthProvider";
import { useUpdateCommunity } from "@/hooks/useCommunities";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { ChatModePicker } from "@/components/communities/ChatModePicker";

export function EditCommunityDialog({ community }: { community: Community }) {
  const updateCommunity = useUpdateCommunity(community.id, community.slug);
  const { profile } = useAuth();
  const isCreator = profile?.uid === community.createdBy;
  const [chatMode, setChatMode] = useState<"everyone" | "admins">(community.chatMode ?? "admins");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(community.name);
  const [game, setGame] = useState(community.game);
  const [description, setDescription] = useState(community.description);
  const [rulesText, setRulesText] = useState(community.rules?.join("\n") ?? "");
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim() || !game.trim()) return;
    setSubmitError(null);
    try {
      await updateCommunity.mutateAsync({
        name,
        game,
        description,
        rules: rulesText.split("\n").map((r) => r.trim()).filter(Boolean),
        ...(isCreator ? { chatMode } : {}),
      });
      setOpen(false);
    } catch {
      setSubmitError("Couldn't save changes. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="h-3.5 w-3.5" />
          Manage
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogTitle>Manage community</DialogTitle>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ec-name">Name</Label>
            <Input id="ec-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ec-game">Game</Label>
            <Input id="ec-game" value={game} onChange={(e) => setGame(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ec-desc">Description</Label>
            <Textarea id="ec-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ec-rules">Rules (one per line)</Label>
            <Textarea
              id="ec-rules"
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              placeholder={"Be respectful\nNo cheating\nHave fun"}
              className="min-h-[100px]"
            />
          </div>
          {isCreator && <ChatModePicker value={chatMode} onChange={setChatMode} />}
          {submitError && <p className="text-sm text-signal-red">{submitError}</p>}
          <Button onClick={handleSave} disabled={!name.trim() || !game.trim() || updateCommunity.isPending}>
            {updateCommunity.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
