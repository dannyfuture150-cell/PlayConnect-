import { StoriesRow } from "@/components/feed/StoriesRow";
import { LiveNowStrip } from "@/components/live/LiveNowStrip";
import { PushPromptBanner } from "@/components/shared/PushPromptBanner";
import { FeedTournamentHub } from "@/components/feed/FeedTournamentHub";
import { FeedList } from "@/components/feed/FeedList";
import { BotHello } from "@/components/feed/BotHello";
import { PlayButton } from "@/components/feed/PlayButton";
import { PlayNowButton } from "@/components/play/PlayNowButton";
import { FeedLeagueStrip } from "@/components/feed/FeedLeagueStrip";
import { SetupChecklist } from "@/components/feed/SetupChecklist";

export default function FeedPage() {
  return (
    <div className="flex flex-col gap-5">
      <StoriesRow />
      <PushPromptBanner />
      <BotHello />
      <PlayNowButton />
      <PlayButton />
      <SetupChecklist />
      <FeedLeagueStrip />
      <FeedTournamentHub />
      <LiveNowStrip />
      <FeedList />
    </div>
  );
}
