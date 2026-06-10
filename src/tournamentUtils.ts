import { Team, Match, KnockoutMatch, teams, groupMatches } from './tournamentData';

export interface Standing {
  team: Team;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number; // Goals For
  ga: number; // Goals Against
  gd: number; // Goal Difference
  points: number;
}

/**
 * Calculates raw standings for a specific group based on matches.
 */
export function calculateGroupStandings(groupId: string, matches: Match[], allTeams: Team[]): Standing[] {
  const groupTeams = allTeams.filter(t => t.group === groupId);
  
  const standingsMap: Record<number, Standing> = {};
  groupTeams.forEach(team => {
    standingsMap[team.id] = {
      team,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0
    };
  });

  const groupMatchesFiltered = matches.filter(m => m.group === groupId && m.completed);

  groupMatchesFiltered.forEach(m => {
    const t1 = standingsMap[m.team1Id];
    const t2 = standingsMap[m.team2Id];

    if (t1 && t2 && m.team1Score !== null && m.team2Score !== null) {
      t1.played++;
      t2.played++;
      t1.gf += m.team1Score;
      t1.ga += m.team2Score;
      t2.gf += m.team2Score;
      t2.ga += m.team1Score;

      if (m.team1Score > m.team2Score) {
        t1.wins++;
        t1.points += 3;
        t2.losses++;
      } else if (m.team1Score < m.team2Score) {
        t2.wins++;
        t2.points += 3;
        t1.losses++;
      } else {
        t1.draws++;
        t1.points += 1;
        t2.draws++;
        t2.points += 1;
      }
    }
  });

  // Calculate Goal differences
  Object.values(standingsMap).forEach(s => {
    s.gd = s.gf - s.ga;
  });

  // Sort and return: Points (desc) -> GD (desc) -> GF (desc) -> team name (asc)
  return Object.values(standingsMap).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.team.name.localeCompare(b.team.name);
  });
}

/**
 * Gets all standings for all groups.
 */
export function getAllStandings(matches: Match[], allTeams: Team[]): Record<string, Standing[]> {
  const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  const standings: Record<string, Standing[]> = {};
  groups.forEach(g => {
    standings[g] = calculateGroupStandings(g, matches, allTeams);
  });
  return standings;
}

export interface KnockoutParticipant {
  id: number;
  name: string;
  shortName: string;
  source: string; // e.g. "Group A Winner", "R24 Match 1 Winner"
  color: string;
}

export interface ResolvedKnockoutMatch {
  id: string;
  stage: string;
  title: string;
  team1: KnockoutParticipant | null;
  team2: KnockoutParticipant | null;
  team1Score: number | null;
  team2Score: number | null;
  penalties1?: number | null;
  penalties2?: number | null;
  completed: boolean;
  winner: KnockoutParticipant | null;
  isTied: boolean;
}

/**
 * Resolves the entire knockout tree dynamically based on group standings and manual knockout scores.
 */
export function resolveKnockoutTree(
  matches: Match[],
  allTeams: Team[],
  koConfig: KnockoutMatch[]
): {
  byes: Standing[];
  qualifiedAll: { winner: Standing; runnerUp: Standing; group: string }[];
  r24Matches: ResolvedKnockoutMatch[];
  r16Matches: ResolvedKnockoutMatch[];
  qfMatches: ResolvedKnockoutMatch[];
  sfMatches: ResolvedKnockoutMatch[];
  finalMatch: ResolvedKnockoutMatch | null;
  champion: KnockoutParticipant | null;
} {
  const standings = getAllStandings(matches, allTeams);
  const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  
  // Extract winner and runnerUp from each group
  const groupWinners: Standing[] = [];
  const groupRunnersUp: Standing[] = [];
  const qualifiedAll: { winner: Standing; runnerUp: Standing; group: string }[] = [];

  groups.forEach(g => {
    const list = standings[g];
    // We assume the first 2 qualify
    if (list && list.length >= 2) {
      groupWinners.push(list[0]);
      groupRunnersUp.push(list[1]);
      qualifiedAll.push({
        group: g,
        winner: list[0],
        runnerUp: list[1]
      });
    }
  });

  // Sort group winners to rank them globally 1st to 12th
  // Rank by points, GD, GF across the group stage
  const rankedWinners = [...groupWinners].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });

  // Sort group runners-up to rank them globally 1st to 12th
  const rankedRunnersUp = [...groupRunnersUp].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });

  // Top 8 Winners get a BYE to Round of 16
  const byes = rankedWinners.slice(0, 8);
  // Remaining 4 winners enter Round of 24 (ranked 9th to 12th, index 8 to 11)
  const nonByeWinners = rankedWinners.slice(8, 12);

  // Helper inside to find config
  const findConfig = (id: string) => koConfig.find(m => m.id === id);

  // Helper to determine winner of a resolved stage
  const getWinner = (
    team1: KnockoutParticipant | null,
    team2: KnockoutParticipant | null,
    score1: number | null,
    score2: number | null,
    pen1?: number | null,
    pen2?: number | null,
    completed?: boolean
  ): { winner: KnockoutParticipant | null; isTied: boolean } => {
    if (!completed || !team1 || !team2 || score1 === null || score2 === null) {
      return { winner: null, isTied: false };
    }
    if (score1 > score2) return { winner: team1, isTied: false };
    if (score1 < score2) return { winner: team2, isTied: false };
    
    // Tied. Check penalties:
    if (pen1 !== undefined && pen2 !== undefined && pen1 !== null && pen2 !== null) {
      if (pen1 > pen2) return { winner: team1, isTied: true };
      if (pen2 > pen1) return { winner: team2, isTied: true };
    }
    // Fallback if no penalties filled but tied, we shouldn't have unresolved ties in KO, but return null
    return { winner: null, isTied: true };
  };

  // 1. ROUND OF 24
  const r24Matches: ResolvedKnockoutMatch[] = [];
  const r24Pairings = [
    // Winner 9 vs Runner-up 12
    { t1: nonByeWinners[0] ? { id: nonByeWinners[0].team.id, name: nonByeWinners[0].team.name, shortName: nonByeWinners[0].team.shortName, source: `9th Best Winner (${nonByeWinners[0].team.group})`, color: nonByeWinners[0].team.color } : null,
      t2: rankedRunnersUp[11] ? { id: rankedRunnersUp[11].team.id, name: rankedRunnersUp[11].team.name, shortName: rankedRunnersUp[11].team.shortName, source: `12th Best Runner-Up (${rankedRunnersUp[11].team.group})`, color: rankedRunnersUp[11].team.color } : null },
    // Winner 10 vs Runner-up 11
    { t1: nonByeWinners[1] ? { id: nonByeWinners[1].team.id, name: nonByeWinners[1].team.name, shortName: nonByeWinners[1].team.shortName, source: `10th Best Winner (${nonByeWinners[1].team.group})`, color: nonByeWinners[1].team.color } : null,
      t2: rankedRunnersUp[10] ? { id: rankedRunnersUp[10].team.id, name: rankedRunnersUp[10].team.name, shortName: rankedRunnersUp[10].team.shortName, source: `11th Best Runner-Up (${rankedRunnersUp[10].team.group})`, color: rankedRunnersUp[10].team.color } : null },
    // Winner 11 vs Runner-up 10
    { t1: nonByeWinners[2] ? { id: nonByeWinners[2].team.id, name: nonByeWinners[2].team.name, shortName: nonByeWinners[2].team.shortName, source: `11th Best Winner (${nonByeWinners[2].team.group})`, color: nonByeWinners[2].team.color } : null,
      t2: rankedRunnersUp[9] ? { id: rankedRunnersUp[9].team.id, name: rankedRunnersUp[9].team.name, shortName: rankedRunnersUp[9].team.shortName, source: `10th Best Runner-Up (${rankedRunnersUp[9].team.group})`, color: rankedRunnersUp[9].team.color } : null },
    // Winner 12 vs Runner-up 9
    { t1: nonByeWinners[3] ? { id: nonByeWinners[3].team.id, name: nonByeWinners[3].team.name, shortName: nonByeWinners[3].team.shortName, source: `12th Best Winner (${nonByeWinners[3].team.group})`, color: nonByeWinners[3].team.color } : null,
      t2: rankedRunnersUp[8] ? { id: rankedRunnersUp[8].team.id, name: rankedRunnersUp[8].team.name, shortName: rankedRunnersUp[8].team.shortName, source: `9th Best Runner-Up (${rankedRunnersUp[8].team.group})`, color: rankedRunnersUp[8].team.color } : null },
    // Runner-up 1 vs Runner-up 8
    { t1: rankedRunnersUp[0] ? { id: rankedRunnersUp[0].team.id, name: rankedRunnersUp[0].team.name, shortName: rankedRunnersUp[0].team.shortName, source: `1st Best Runner-Up (${rankedRunnersUp[0].team.group})`, color: rankedRunnersUp[0].team.color } : null,
      t2: rankedRunnersUp[7] ? { id: rankedRunnersUp[7].team.id, name: rankedRunnersUp[7].team.name, shortName: rankedRunnersUp[7].team.shortName, source: `8th Best Runner-Up (${rankedRunnersUp[7].team.group})`, color: rankedRunnersUp[7].team.color } : null },
    // Runner-up 2 vs Runner-up 7
    { t1: rankedRunnersUp[1] ? { id: rankedRunnersUp[1].team.id, name: rankedRunnersUp[1].team.name, shortName: rankedRunnersUp[1].team.shortName, source: `2nd Best Runner-Up (${rankedRunnersUp[1].team.group})`, color: rankedRunnersUp[1].team.color } : null,
      t2: rankedRunnersUp[6] ? { id: rankedRunnersUp[6].team.id, name: rankedRunnersUp[6].team.name, shortName: rankedRunnersUp[6].team.shortName, source: `7th Best Runner-Up (${rankedRunnersUp[6].team.group})`, color: rankedRunnersUp[6].team.color } : null },
    // Runner-up 3 vs Runner-up 6
    { t1: rankedRunnersUp[2] ? { id: rankedRunnersUp[2].team.id, name: rankedRunnersUp[2].team.name, shortName: rankedRunnersUp[2].team.shortName, source: `3rd Best Runner-Up (${rankedRunnersUp[2].team.group})`, color: rankedRunnersUp[2].team.color } : null,
      t2: rankedRunnersUp[5] ? { id: rankedRunnersUp[5].team.id, name: rankedRunnersUp[5].team.name, shortName: rankedRunnersUp[5].team.shortName, source: `6th Best Runner-Up (${rankedRunnersUp[5].team.group})`, color: rankedRunnersUp[5].team.color } : null },
    // Runner-up 4 vs Runner-up 5
    { t1: rankedRunnersUp[3] ? { id: rankedRunnersUp[3].team.id, name: rankedRunnersUp[3].team.name, shortName: rankedRunnersUp[3].team.shortName, source: `4th Best Runner-Up (${rankedRunnersUp[3].team.group})`, color: rankedRunnersUp[3].team.color } : null,
      t2: rankedRunnersUp[4] ? { id: rankedRunnersUp[4].team.id, name: rankedRunnersUp[4].team.name, shortName: rankedRunnersUp[4].team.shortName, source: `5th Best Runner-Up (${rankedRunnersUp[4].team.group})`, color: rankedRunnersUp[4].team.color } : null }
  ];

  for (let i = 0; i < 8; i++) {
    const matchId = `r24-${i + 1}`;
    const cfg = findConfig(matchId);
    const pair = r24Pairings[i];
    
    const t1Score = cfg?.team1Score ?? null;
    const t2Score = cfg?.team2Score ?? null;
    const completed = cfg?.completed ?? false;
    const { winner, isTied } = getWinner(pair.t1, pair.t2, t1Score, t2Score, cfg?.penalties1, cfg?.penalties2, completed);

    r24Matches.push({
      id: matchId,
      stage: "r24",
      title: `Round of 24 - Match ${i + 1}`,
      team1: pair.t1,
      team2: pair.t2,
      team1Score: t1Score,
      team2Score: t2Score,
      penalties1: cfg?.penalties1,
      penalties2: cfg?.penalties2,
      completed,
      winner,
      isTied
    });
  }

  // 2. ROUND OF 16
  const r16Matches: ResolvedKnockoutMatch[] = [];
  for (let i = 0; i < 8; i++) {
    const matchId = `r16-${i + 1}`;
    const cfg = findConfig(matchId);

    // Team 1 is the bye team (ranked 1st to 8th)
    const byeTeamStanding = byes[i];
    const team1: KnockoutParticipant | null = byeTeamStanding 
      ? { 
          id: byeTeamStanding.team.id, 
          name: byeTeamStanding.team.name, 
          shortName: byeTeamStanding.team.shortName,
          source: `${i + 1}st Best Winner (${byeTeamStanding.team.group}) (BYE)`,
          color: byeTeamStanding.team.color
        } 
      : null;

    // Team 2 is the winner of R24 Match (i + 1)
    const r24Winner = r24Matches[i]?.winner;
    const team2: KnockoutParticipant | null = r24Winner 
      ? {
          id: r24Winner.id,
          name: r24Winner.name,
          shortName: r24Winner.shortName,
          source: `R24 Match ${i + 1} Winner`,
          color: r24Winner.color
        }
      : null;

    const t1Score = cfg?.team1Score ?? null;
    const t2Score = cfg?.team2Score ?? null;
    const completed = cfg?.completed ?? false;
    const { winner, isTied } = getWinner(team1, team2, t1Score, t2Score, cfg?.penalties1, cfg?.penalties2, completed);

    r16Matches.push({
      id: matchId,
      stage: "r16",
      title: `Round of 16 - Match ${i + 1}`,
      team1,
      team2,
      team1Score: t1Score,
      team2Score: t2Score,
      penalties1: cfg?.penalties1,
      penalties2: cfg?.penalties2,
      completed,
      winner,
      isTied
    });
  }

  // 3. QUARTER FINALS (4 matches)
  // Pairings:
  // QF1: Winner R16-1 vs Winner R16-5
  // QF2: Winner R16-2 vs Winner R16-6
  // QF3: Winner R16-3 vs Winner R16-7
  // QF4: Winner R16-4 vs Winner R16-8
  const qfMatches: ResolvedKnockoutMatch[] = [];
  const qfPairingsInd = [
    { m1: 0, m2: 4 }, // indices: R16-1 (index 0) vs R16-5 (index 4)
    { m1: 1, m2: 5 }, // R16-2 vs R16-6
    { m1: 2, m2: 6 }, // R16-3 vs R16-7
    { m1: 3, m2: 7 }  // R16-4 vs R16-8
  ];

  for (let i = 0; i < 4; i++) {
    const matchId = `qf-${i + 1}`;
    const cfg = findConfig(matchId);
    const indices = qfPairingsInd[i];

    const w1 = r16Matches[indices.m1]?.winner;
    const team1: KnockoutParticipant | null = w1 
      ? { id: w1.id, name: w1.name, shortName: w1.shortName, source: `R16 Match ${indices.m1 + 1} Winner`, color: w1.color }
      : null;

    const w2 = r16Matches[indices.m2]?.winner;
    const team2: KnockoutParticipant | null = w2 
      ? { id: w2.id, name: w2.name, shortName: w2.shortName, source: `R16 Match ${indices.m2 + 1} Winner`, color: w2.color }
      : null;

    const t1Score = cfg?.team1Score ?? null;
    const t2Score = cfg?.team2Score ?? null;
    const completed = cfg?.completed ?? false;
    const { winner, isTied } = getWinner(team1, team2, t1Score, t2Score, cfg?.penalties1, cfg?.penalties2, completed);

    qfMatches.push({
      id: matchId,
      stage: "qf",
      title: `Quarter-Final ${i + 1}`,
      team1,
      team2,
      team1Score: t1Score,
      team2Score: t2Score,
      penalties1: cfg?.penalties1,
      penalties2: cfg?.penalties2,
      completed,
      winner,
      isTied
    });
  }

  // 4. SEMI FINALS (2 matches)
  // Pairings:
  // SF1: Winner QF-1 vs Winner QF-3
  // SF2: Winner QF-2 vs Winner QF-4
  const sfMatches: ResolvedKnockoutMatch[] = [];
  const sfPairingsInd = [
    { m1: 0, m2: 2 }, // QF1 (index 0) vs QF3 (index 2)
    { m1: 1, m2: 3 }  // QF2 (index 1) vs QF4 (index 3)
  ];

  for (let i = 0; i < 2; i++) {
    const matchId = `sf-${i + 1}`;
    const cfg = findConfig(matchId);
    const indices = sfPairingsInd[i];

    const w1 = qfMatches[indices.m1]?.winner;
    const team1: KnockoutParticipant | null = w1 
      ? { id: w1.id, name: w1.name, shortName: w1.shortName, source: `QF Match ${indices.m1 + 1} Winner`, color: w1.color }
      : null;

    const w2 = qfMatches[indices.m2]?.winner;
    const team2: KnockoutParticipant | null = w2 
      ? { id: w2.id, name: w2.name, shortName: w2.shortName, source: `QF Match ${indices.m2 + 1} Winner`, color: w2.color }
      : null;

    const t1Score = cfg?.team1Score ?? null;
    const t2Score = cfg?.team2Score ?? null;
    const completed = cfg?.completed ?? false;
    const { winner, isTied } = getWinner(team1, team2, t1Score, t2Score, cfg?.penalties1, cfg?.penalties2, completed);

    sfMatches.push({
      id: matchId,
      stage: "sf",
      title: `Semi-Final ${i + 1}`,
      team1,
      team2,
      team1Score: t1Score,
      team2Score: t2Score,
      penalties1: cfg?.penalties1,
      penalties2: cfg?.penalties2,
      completed,
      winner,
      isTied
    });
  }

  // 5. GRAND FINAL (1 match)
  // Winner SF1 vs Winner SF2
  const finalMatchId = "f-1";
  const finalCfg = findConfig(finalMatchId);
  const fW1 = sfMatches[0]?.winner;
  const fTeam1: KnockoutParticipant | null = fW1 
    ? { id: fW1.id, name: fW1.name, shortName: fW1.shortName, source: `SF 1 Winner`, color: fW1.color }
    : null;

  const fW2 = sfMatches[1]?.winner;
  const fTeam2: KnockoutParticipant | null = fW2 
    ? { id: fW2.id, name: fW2.name, shortName: fW2.shortName, source: `SF 2 Winner`, color: fW2.color }
    : null;

  const fT1Score = finalCfg?.team1Score ?? null;
  const fT2Score = finalCfg?.team2Score ?? null;
  const fCompleted = finalCfg?.completed ?? false;
  const { winner: champion, isTied: fTied } = getWinner(fTeam1, fTeam2, fT1Score, fT2Score, finalCfg?.penalties1, finalCfg?.penalties2, fCompleted);

  const finalMatch: ResolvedKnockoutMatch = {
    id: finalMatchId,
    stage: "f",
    title: "Gran Final",
    team1: fTeam1,
    team2: fTeam2,
    team1Score: fT1Score,
    team2Score: fT2Score,
    penalties1: finalCfg?.penalties1,
    penalties2: finalCfg?.penalties2,
    completed: fCompleted,
    winner: champion,
    isTied: fTied
  };

  return {
    byes,
    qualifiedAll,
    r24Matches,
    r16Matches,
    qfMatches,
    sfMatches,
    finalMatch,
    champion
  };
}

/**
 * Calculates high-level live metadata metrics for show in stats cards:
 * - Matches completed
 * - Matches remaining
 * - Qualified teams
 * - Current tournament phase
 */
export function calculateLiveStats(
  matches: Match[], 
  koMatches: KnockoutMatch[], 
  champion: KnockoutParticipant | null
) {
  const groupCompleted = matches.filter(m => m.completed).length;
  const groupTotal = matches.length;

  const koCompleted = koMatches.filter(m => m.completed).length;
  const koTotal = koMatches.length;

  const totalCompleted = groupCompleted + koCompleted;
  const totalMatches = groupTotal + koTotal;
  const remaining = totalMatches - totalCompleted;

  // Count uniquely qualified team names in KO so far (who have at least qualified from groups)
  // Since we know 12 groups qualify 2 each, it's 24. Let's make it reflect the current number of teams 
  // currently actively registered in KO slots or who won group standings
  const countCompletedGroupStages = matches.filter(m => m.completed).length;
  const qualifiedCount = countCompletedGroupStages > 0 ? 24 : 0;

  // Let's assess the current active stage
  let stageName = "Group Stage";
  if (koCompleted === koTotal && koTotal > 0 && champion) {
    stageName = "Champion Crowned 🏆";
  } else if (koMatches.find(m => m.stage === "f" && m.completed)) {
    stageName = "Grand Final Complete";
  } else if (koMatches.find(m => m.stage === "f" && (m.team1Score !== null || m.team2Score !== null || m.completed))) {
    stageName = "Grand Final ⚔️";
  } else if (koMatches.filter(m => m.stage === "sf" && m.completed).length > 0) {
    stageName = "Final Stage";
  } else if (koMatches.filter(m => m.stage === "qf" && m.completed).length > 0) {
    stageName = "Semi-Finals";
  } else if (koMatches.filter(m => m.stage === "r16" && m.completed).length > 0) {
    stageName = "Quarter-Finals";
  } else if (koMatches.filter(m => m.stage === "r24" && m.completed).length > 0) {
    stageName = "Round of 16";
  } else if (countCompletedGroupStages > 0) {
    stageName = "Round of 24 / Knockouts";
  }

  return {
    totalCompleted,
    totalMatches,
    remaining,
    qualifiedCount,
    stageName
  };
}
