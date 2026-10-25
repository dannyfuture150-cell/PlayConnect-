import { StoriesRow } from "@/components/feed/StoriesRow";
import { LiveNowStrip } from "@/components/live/LiveNowStrip";
import { PushPromptBanner } from "@/components/shared/PushPromptBanner";
import { FeedTournamentHub } from "@/components/feed/FeedTournamentHub";
import { FeedList } from "@/components/feed/FeedList";

export default function FeedPage() {
  return (
    <div className="flex flex-col gap-5">
      <PushPromptBanner />
      <StoriesRow />
      <FeedTournamentHub />
      <LiveNowStrip />
      <FeedList />
    </div>
  );
}
