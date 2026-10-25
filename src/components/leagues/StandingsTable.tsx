import type { LeagueTeam } from "@/types";
import { Card } from "@/components/ui/card";

export function StandingsTable({ teams }: { teams: LeagueTeam[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-steel/50">
              <th className="px-3 py-2.5 font-medium">#</th>
              <th className="px-3 py-2.5 font-medium">Team</th>
              <th className="px-2 py-2.5 text-center font-medium">P</th>
              <th className="px-2 py-2.5 text-center font-medium">W</th>
              <th className="px-2 py-2.5 text-center font-medium">D</th>
              <th className="px-2 py-2.5 text-center font-medium">L</th>
              <th className="px-2 py-2.5 text-center font-medium">GD</th>
              <th className="px-3 py-2.5 text-center font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, i) => {
              const played = team.wins + team.draws + team.losses;
              const gd = team.goalsFor - team.goalsAgainst;
              return (
                <tr key={team.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2.5 text-steel/50">{i + 1}</td>
                  <td className="px-3 py-2.5 font-semibold text-foreground">
                    {team.name}
                    {team.memberIds.length > 0 && (
                      <span className="ml-1.5 font-normal text-steel/40">({team.memberIds.length})</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-center text-steel/70">{played}</td>
                  <td className="px-2 py-2.5 text-center text-steel/70">{team.wins}</td>
                  <td className="px-2 py-2.5 text-center text-steel/70">{team.draws}</td>
                  <td className="px-2 py-2.5 text-center text-steel/70">{team.losses}</td>
                  <td className="px-2 py-2.5 text-center text-steel/70">{gd > 0 ? `+${gd}` : gd}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-foreground">{team.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
