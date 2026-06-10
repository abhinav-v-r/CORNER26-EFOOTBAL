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
      team, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, points: 0
    };
  });

  const groupMatchesFiltered = matches.filter(m => m.group === groupId && m.completed);

  groupMatchesFiltered.forEach(m => {
    const t1 = standingsMap[m.team1Id];
    const t2 = standingsMap[m.team2Id];

    if (t1 && t2 && m.team1Score !== null && m.team2Score !== null) {
      t1.played++; t2.played++;
      t1.gf += m.team1Score; t1.ga += m.team2Score;
      t2.gf += m.team2Score; t2.ga += m.team1Score;

      if (m.team1Score > m.team2Score) {
        t1.wins++; t1.points += 3; t2.losses++;
      } else if (m.team1Score < m.team2Score) {
        t2.wins++; t2.points += 3; t1.losses++;
      } else {
        t1.draws++; t1.points += 1; t2.draws++; t2.points += 1;
      }
    }
  });

  Object.values(standingsMap).forEach(s => { s.gd = s.gf - s.ga; });

  return Object.values(standingsMap).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.team.name.localeCompare(b.team.name);
  });
}

export function getAllStandings(matches: Match[], allTeams: Team[]): Record<string, Standing[]> {
  const groups = ["A", "B", "C", "D", "E", "F", "G", "H"];
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
  source: string;
  color: string;
}

export interface ResolvedKnockoutMatch {
  id: string;
  stage: string;
  title: string;
  team1: KnockoutParticipant | null;
  team2: KnockoutParticipant | null;
  team1Placeholder?: string;
  team2Placeholder?: string;
  team1Score: number | null;
  team2Score: number | null;
  penalties1?: number | null;
  penalties2?: number | null;
  completed: boolean;
  winner: KnockoutParticipant | null;
  isTied: boolean;
}

export function resolveKnockoutTree(
  matches: Match[],
  allTeams: Team[],
  koConfig: KnockoutMatch[]
) {
  const standings = getAllStandings(matches, allTeams);
  const groups = ["A", "B", "C", "D", "E", "F", "G", "H"];
  
  const qualifiedAll: { winner: Standing; runnerUp: Standing; group: string }[] = [];
  groups.forEach(g => {
    const list = standings[g] || [];
    if (list.length >= 2) {
      qualifiedAll.push({ group: g, winner: list[0], runnerUp: list[1] });
    }
  });

  const findConfig = (id: string) => koConfig.find(m => m.id === id);

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
    if (pen1 !== undefined && pen2 !== undefined && pen1 !== null && pen2 !== null) {
      if (pen1 > pen2) return { winner: team1, isTied: true };
      if (pen2 > pen1) return { winner: team2, isTied: true };
    }
    return { winner: null, isTied: true };
  };

  // Convert Standing to KnockoutParticipant
  const toParticipant = (s: Standing | null | undefined, sourceLabel: string): KnockoutParticipant | null => {
    if (!s) return null;
    return { id: s.team.id, name: s.team.name, shortName: s.team.shortName, source: sourceLabel, color: s.team.color };
  };

  const getGroupStanding = (group: string, rank: 0 | 1) => {
    // A group's qualifiers are decided ONLY when all matches in that group are completed.
    const groupMatchesFiltered = matches.filter(m => m.group === group);
    const isGroupCompleted = groupMatchesFiltered.length > 0 && groupMatchesFiltered.every(m => m.completed);
    if (!isGroupCompleted) return null;

    const groupQual = qualifiedAll.find(q => q.group === group);
    if (!groupQual) return null;
    return rank === 0 ? groupQual.winner : groupQual.runnerUp;
  };

  const r16Matches: ResolvedKnockoutMatch[] = [];
  const r16Pairings = [
    { t1: toParticipant(getGroupStanding('A', 0), '1A'), t2: toParticipant(getGroupStanding('B', 1), '2B'), p1: 'Winner Group A (1A)', p2: 'Runner-Up Group B (2B)' },
    { t1: toParticipant(getGroupStanding('C', 0), '1C'), t2: toParticipant(getGroupStanding('D', 1), '2D'), p1: 'Winner Group C (1C)', p2: 'Runner-Up Group D (2D)' },
    { t1: toParticipant(getGroupStanding('E', 0), '1E'), t2: toParticipant(getGroupStanding('F', 1), '2F'), p1: 'Winner Group E (1E)', p2: 'Runner-Up Group F (2F)' },
    { t1: toParticipant(getGroupStanding('G', 0), '1G'), t2: toParticipant(getGroupStanding('H', 1), '2H'), p1: 'Winner Group G (1G)', p2: 'Runner-Up Group H (2H)' },
    { t1: toParticipant(getGroupStanding('B', 0), '1B'), t2: toParticipant(getGroupStanding('A', 1), '2A'), p1: 'Winner Group B (1B)', p2: 'Runner-Up Group A (2A)' },
    { t1: toParticipant(getGroupStanding('D', 0), '1D'), t2: toParticipant(getGroupStanding('C', 1), '2C'), p1: 'Winner Group D (1D)', p2: 'Runner-Up Group C (2C)' },
    { t1: toParticipant(getGroupStanding('F', 0), '1F'), t2: toParticipant(getGroupStanding('E', 1), '2E'), p1: 'Winner Group F (1F)', p2: 'Runner-Up Group E (2E)' },
    { t1: toParticipant(getGroupStanding('H', 0), '1H'), t2: toParticipant(getGroupStanding('G', 1), '2G'), p1: 'Winner Group H (1H)', p2: 'Runner-Up Group G (2G)' }
  ];

  for (let i = 0; i < 8; i++) {
    const matchId = `r16-${i + 1}`;
    const cfg = findConfig(matchId);
    const pair = r16Pairings[i];
    const t1Score = cfg?.team1Score ?? null;
    const t2Score = cfg?.team2Score ?? null;
    const completed = cfg?.completed ?? false;
    const { winner, isTied } = getWinner(pair.t1, pair.t2, t1Score, t2Score, cfg?.penalties1, cfg?.penalties2, completed);

    r16Matches.push({
      id: matchId, stage: "r16", title: `Round of 16 - Match ${i + 1}`,
      team1: pair.t1, team2: pair.t2, 
      team1Placeholder: pair.p1, team2Placeholder: pair.p2,
      team1Score: t1Score, team2Score: t2Score,
      penalties1: cfg?.penalties1, penalties2: cfg?.penalties2, completed, winner, isTied
    });
  }

  const qfMatches: ResolvedKnockoutMatch[] = [];
  const qfPairingsInd = [
    { m1: 0, m2: 1, p1: "R16 Match 1 Winner", p2: "R16 Match 2 Winner" }, // R16-1 vs R16-2
    { m1: 2, m2: 3, p1: "R16 Match 3 Winner", p2: "R16 Match 4 Winner" }, // R16-3 vs R16-4
    { m1: 4, m2: 5, p1: "R16 Match 5 Winner", p2: "R16 Match 6 Winner" }, // R16-5 vs R16-6
    { m1: 6, m2: 7, p1: "R16 Match 7 Winner", p2: "R16 Match 8 Winner" }  // R16-7 vs R16-8
  ];

  for (let i = 0; i < 4; i++) {
    const matchId = `qf-${i + 1}`;
    const cfg = findConfig(matchId);
    const indices = qfPairingsInd[i];
    const w1 = r16Matches[indices.m1]?.winner;
    const w2 = r16Matches[indices.m2]?.winner;
    const team1 = w1 ? { ...w1, source: `R16 Match ${indices.m1 + 1} Winner` } : null;
    const team2 = w2 ? { ...w2, source: `R16 Match ${indices.m2 + 1} Winner` } : null;

    const t1Score = cfg?.team1Score ?? null;
    const t2Score = cfg?.team2Score ?? null;
    const completed = cfg?.completed ?? false;
    const { winner, isTied } = getWinner(team1, team2, t1Score, t2Score, cfg?.penalties1, cfg?.penalties2, completed);

    qfMatches.push({
      id: matchId, stage: "qf", title: `Quarter-Final ${i + 1}`,
      team1, team2, 
      team1Placeholder: indices.p1, team2Placeholder: indices.p2,
      team1Score: t1Score, team2Score: t2Score,
      penalties1: cfg?.penalties1, penalties2: cfg?.penalties2, completed, winner, isTied
    });
  }

  const sfMatches: ResolvedKnockoutMatch[] = [];
  const sfPairingsInd = [
    { m1: 0, m2: 1, p1: "Quarter-Final 1 Winner", p2: "Quarter-Final 2 Winner" }, // QF1 vs QF2
    { m1: 2, m2: 3, p1: "Quarter-Final 3 Winner", p2: "Quarter-Final 4 Winner" }  // QF3 vs QF4
  ];

  for (let i = 0; i < 2; i++) {
    const matchId = `sf-${i + 1}`;
    const cfg = findConfig(matchId);
    const indices = sfPairingsInd[i];
    const w1 = qfMatches[indices.m1]?.winner;
    const w2 = qfMatches[indices.m2]?.winner;
    const team1 = w1 ? { ...w1, source: `QF Match ${indices.m1 + 1} Winner` } : null;
    const team2 = w2 ? { ...w2, source: `QF Match ${indices.m2 + 1} Winner` } : null;

    const t1Score = cfg?.team1Score ?? null;
    const t2Score = cfg?.team2Score ?? null;
    const completed = cfg?.completed ?? false;
    const { winner, isTied } = getWinner(team1, team2, t1Score, t2Score, cfg?.penalties1, cfg?.penalties2, completed);

    sfMatches.push({
      id: matchId, stage: "sf", title: `Semi-Final ${i + 1}`,
      team1, team2, 
      team1Placeholder: indices.p1, team2Placeholder: indices.p2,
      team1Score: t1Score, team2Score: t2Score,
      penalties1: cfg?.penalties1, penalties2: cfg?.penalties2, completed, winner, isTied
    });
  }

  const finalMatchId = "f-1";
  const finalCfg = findConfig(finalMatchId);
  const fTeam1 = sfMatches[0]?.winner ? { ...sfMatches[0].winner, source: `SF 1 Winner` } : null;
  const fTeam2 = sfMatches[1]?.winner ? { ...sfMatches[1].winner, source: `SF 2 Winner` } : null;

  const fT1Score = finalCfg?.team1Score ?? null;
  const fT2Score = finalCfg?.team2Score ?? null;
  const fCompleted = finalCfg?.completed ?? false;
  const { winner: champion, isTied: fTied } = getWinner(fTeam1, fTeam2, fT1Score, fT2Score, finalCfg?.penalties1, finalCfg?.penalties2, fCompleted);

  const finalMatch: ResolvedKnockoutMatch = {
    id: finalMatchId, stage: "f", title: "Grand Final",
    team1: fTeam1, team2: fTeam2, 
    team1Placeholder: "Semi-Final 1 Winner", team2Placeholder: "Semi-Final 2 Winner",
    team1Score: fT1Score, team2Score: fT2Score,
    penalties1: finalCfg?.penalties1, penalties2: finalCfg?.penalties2, completed: fCompleted, winner: champion, isTied: fTied
  };

  return {
    qualifiedAll,
    r16Matches,
    qfMatches,
    sfMatches,
    finalMatch,
    champion
  };
}

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

  const groups = ["A", "B", "C", "D", "E", "F", "G", "H"];
  let fullyCompletedGroups = 0;
  groups.forEach(g => {
    const gMatches = matches.filter(m => m.group === g);
    if (gMatches.length > 0 && gMatches.every(m => m.completed)) {
      fullyCompletedGroups++;
    }
  });
  const qualifiedCount = fullyCompletedGroups * 2;

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
  } else if (fullyCompletedGroups === 8) {
    stageName = "Round of 16";
  }

  return { totalCompleted, totalMatches, remaining, qualifiedCount, stageName };
}

