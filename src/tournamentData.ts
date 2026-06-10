/**
 * CORNER 26' PRESENTS EFOOTBALL TOURNAMENT
 * Core static data and user-editable tournament states.
 * 
 * ADMIN MANUAL:
 * To update the tournament results, simply edit the score values and 'completed' flags below.
 * Standings, knockout brackets, live stats, and the Champion section will automatically update!
 */

export interface Team {
  id: number;
  name: string;
  shortName: string;
  group: string;
  color: string; // Primary team color for styling accents
}

export interface Match {
  id: string;
  group: string;
  team1Id: number;
  team2Id: number;
  team1Score: number | null;
  team2Score: number | null;
  completed: boolean;
}

export interface KnockoutMatch {
  id: string;
  stage: 'r24' | 'r16' | 'qf' | 'sf' | 'f';
  title: string;
  // User-editable scores for each knockout slot
  team1Score: number | null;
  team2Score: number | null;
  completed: boolean;
  // Optional penalties if there is a draw
  penalties1?: number | null;
  penalties2?: number | null;
}

// 48 TEAMS across 12 Groups (A to L, 4 teams per group)
export const teams: Team[] = [];

/**
 * GROUP MATCHES (Total 72 Matches - Round Robin inside 12 Groups)
 * 
 * ADMIN INSTRUCTIONS:
 * Modify 'team1Score', 'team2Score', and set 'completed: false' to record tournament scores.
 * Standings & Knockout brackets recalculate in real-time.
 */
export const groupMatches: Match[] = [];

/**
 * KNOCKOUT MATCHES RESULTS
 * 
 * ADMIN INSTRUCTIONS:
 * Modify standard 'team1Score', 'team2Score' values and set 'completed: false' to record knockout scores.
 * The bracket lines and subsequent rounds will calculate automatically.
 * Use 'penalties1' and 'penalties2' (integers) if a lockout match remains tied and goes to a penalty shootout.
 */
export const knockoutMatchesConfig: KnockoutMatch[] = [
  // --- ROUND OF 24 (8 MATCHES) ---
  // R24 Match 1: 9th best group winner vs 12th runner-up (Winner advances to R16 to face one of top 8 byes)
  { id: "r24-1", stage: "r24", title: "R24 Match 1", team1Score: null, team2Score: null, completed: false },
  // R24 Match 2: 10th best group winner vs 11th runner-up
  { id: "r24-2", stage: "r24", title: "R24 Match 2", team1Score: null, team2Score: null, completed: false },
  // R24 Match 3: 11th best group winner vs 10th runner-up
  { id: "r24-3", stage: "r24", title: "R24 Match 3", team1Score: null, team2Score: null, completed: false },
  // R24 Match 4: 12th best group winner vs 9th runner-up
  { id: "r24-4", stage: "r24", title: "R24 Match 4", team1Score: null, team2Score: null, completed: false }, // Penalty shootout!
  // R24 Match 5: 1st runner-up vs 8th runner-up
  { id: "r24-5", stage: "r24", title: "R24 Match 5", team1Score: null, team2Score: null, completed: false },
  // R24 Match 6: 2nd runner-up vs 7th runner-up
  { id: "r24-6", stage: "r24", title: "R24 Match 6", team1Score: null, team2Score: null, completed: false },
  // R24 Match 7: 3rd runner-up vs 6th runner-up
  { id: "r24-7", stage: "r24", title: "R24 Match 7", team1Score: null, team2Score: null, completed: false },
  // R24 Match 8: 4th runner-up vs 5th runner-up
  { id: "r24-8", stage: "r24", title: "r24 Match 8", team1Score: null, team2Score: null, completed: false },

  // --- ROUND OF 16 (8 MATCHES) ---
  // Match 1: 1st Best Bye Team vs Winner of R24 Match 1
  { id: "r16-1", stage: "r16", title: "R16 Match 1", team1Score: null, team2Score: null, completed: false },
  // Match 2: 2nd Best Bye Team vs Winner of R24 Match 2
  { id: "r16-2", stage: "r16", title: "R16 Match 2", team1Score: null, team2Score: null, completed: false },
  // Match 3: 3rd Best Bye Team vs Winner of R24 Match 3
  { id: "r16-3", stage: "r16", title: "R16 Match 3", team1Score: null, team2Score: null, completed: false },
  // Match 4: 4th Best Bye Team vs Winner of R24 Match 4
  { id: "r16-4", stage: "r16", title: "R16 Match 4", team1Score: null, team2Score: null, completed: false },
  // Match 5: 5th Best Bye Team vs Winner of R24 Match 5
  { id: "r16-5", stage: "r16", title: "R16 Match 5", team1Score: null, team2Score: null, completed: false },
  // Match 6: 6th Best Bye Team vs Winner of R24 Match 6
  { id: "r16-6", stage: "r16", title: "R16 Match 6", team1Score: null, team2Score: null, completed: false },
  // Match 7: 7th Best Bye Team vs Winner of R24 Match 7
  { id: "r16-7", stage: "r16", title: "R16 Match 7", team1Score: null, team2Score: null, completed: false },
  // Match 8: 8th Best Bye Team vs Winner of R24 Match 8
  { id: "r16-8", stage: "r16", title: "R16 Match 8", team1Score: null, team2Score: null, completed: false },

  // --- QUARTER FINALS (4 MATCHES) ---
  { id: "qf-1", stage: "qf", title: "Quarter-Final 1", team1Score: null, team2Score: null, completed: false },
  { id: "qf-2", stage: "qf", title: "Quarter-Final 2", team1Score: null, team2Score: null, completed: false },
  { id: "qf-3", stage: "qf", title: "Quarter-Final 3", team1Score: null, team2Score: null, completed: false },
  { id: "qf-4", stage: "qf", title: "Quarter-Final 4", team1Score: null, team2Score: null, completed: false },

  // --- SEMI FINALS (2 MATCHES) ---
  { id: "sf-1", stage: "sf", title: "Semi-Final 1", team1Score: null, team2Score: null, completed: false },
  { id: "sf-2", stage: "sf", title: "Semi-Final 2", team1Score: null, team2Score: null, completed: false },

  // --- FINAL ---
  { id: "f-1", stage: "f", title: "Grand Final", team1Score: null, team2Score: null, completed: false }
];
