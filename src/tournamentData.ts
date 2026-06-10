/**
 * OFFICIAL FIFA WORLD CUP ESPORTS
 * Core static data and user-editable tournament states.
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
  stage: 'r16' | 'qf' | 'sf' | 'f';
  title: string;
  // User-editable scores for each knockout slot
  team1Score: number | null;
  team2Score: number | null;
  completed: boolean;
  // Optional penalties if there is a draw
  penalties1?: number | null;
  penalties2?: number | null;
}

export const teams: Team[] = [
  // GROUP A
  { id: 1, name: 'Mexico', shortName: 'MEX', group: 'A', color: '#006847' },
  { id: 2, name: 'France', shortName: 'FRA', group: 'A', color: '#002654' },
  { id: 3, name: 'Japan', shortName: 'JPN', group: 'A', color: '#000555' },
  { id: 4, name: 'Argentina', shortName: 'ARG', group: 'A', color: '#43A1D5' },

  // GROUP B
  { id: 5, name: 'Uruguay', shortName: 'URU', group: 'B', color: '#0038A8' },
  { id: 6, name: 'Spain', shortName: 'ESP', group: 'B', color: '#AA151B' },
  { id: 7, name: 'Brazil', shortName: 'BRA', group: 'B', color: '#009B3A' },
  { id: 8, name: 'Denmark', shortName: 'DEN', group: 'B', color: '#C60C30' },

  // GROUP C
  { id: 9, name: 'Croatia', shortName: 'CRO', group: 'C', color: '#FF0000' },
  { id: 10, name: 'Portugal', shortName: 'POR', group: 'C', color: '#006600' },
  { id: 11, name: 'Netherlands', shortName: 'NED', group: 'C', color: '#F36C21' },
  { id: 12, name: 'Morocco', shortName: 'MAR', group: 'C', color: '#C1272D' },

  // GROUP D
  { id: 13, name: 'Saudi Arabia', shortName: 'KSA', group: 'D', color: '#006C35' },
  { id: 14, name: 'Qatar', shortName: 'QAT', group: 'D', color: '#8A1538' },
  { id: 15, name: 'Turkey', shortName: 'TUR', group: 'D', color: '#E30A17' },
  { id: 16, name: 'Ivory Coast', shortName: 'CIV', group: 'D', color: '#F77F00' },

  // GROUP E
  { id: 17, name: 'Belgium', shortName: 'BEL', group: 'E', color: '#EF3340' },
  { id: 18, name: 'England', shortName: 'ENG', group: 'E', color: '#FFFFFF' },
  { id: 19, name: 'Germany', shortName: 'GER', group: 'E', color: '#000000' },
  { id: 20, name: 'Colombia', shortName: 'COL', group: 'E', color: '#FCD116' },

  // GROUP F
  { id: 21, name: 'Norway', shortName: 'NOR', group: 'F', color: '#BA0C2F' },
  { id: 22, name: 'Scotland', shortName: 'SCO', group: 'F', color: '#005EB8' },
  { id: 23, name: 'Senegal', shortName: 'SEN', group: 'F', color: '#00853F' },
  { id: 24, name: 'Paraguay', shortName: 'PAR', group: 'F', color: '#D52B1E' },

  // GROUP G
  { id: 25, name: 'USA', shortName: 'USA', group: 'G', color: '#002868' },
  { id: 26, name: 'Switzerland', shortName: 'SUI', group: 'G', color: '#FF0000' },
  { id: 27, name: 'Sweden', shortName: 'SWE', group: 'G', color: '#FECC02' },
  { id: 28, name: 'Egypt', shortName: 'EGY', group: 'G', color: '#CE1126' },

  // GROUP H
  { id: 29, name: 'South Korea', shortName: 'KOR', group: 'H', color: '#C60C30' },
  { id: 30, name: 'Iran', shortName: 'IRN', group: 'H', color: '#239F40' },
  { id: 31, name: 'Canada', shortName: 'CAN', group: 'H', color: '#FF0000' },
  { id: 32, name: 'Australia', shortName: 'AUS', group: 'H', color: '#FFCD00' }
];

export const groupMatches: Match[] = [];
// Generate round-robin matches for each group
let matchIdCounter = 1;
const groups = ['A','B','C','D','E','F','G','H'];
groups.forEach(g => {
  const groupTeams = teams.filter(t => t.group === g);
  for (let i = 0; i < groupTeams.length; i++) {
    for (let j = i + 1; j < groupTeams.length; j++) {
      groupMatches.push({
        id: 'gm' + matchIdCounter++,
        group: g,
        team1Id: groupTeams[i].id,
        team2Id: groupTeams[j].id,
        team1Score: null,
        team2Score: null,
        completed: false
      });
    }
  }
});

// For standard 32 teams (8 groups), 16 teams qualify for knockout stage
export const knockoutMatchesConfig: KnockoutMatch[] = [
  // --- ROUND OF 16 (8 MATCHES) ---
  { id: "r16-1", stage: "r16", title: "R16 Match 1 (1A vs 2B)", team1Score: null, team2Score: null, completed: false },
  { id: "r16-2", stage: "r16", title: "R16 Match 2 (1C vs 2D)", team1Score: null, team2Score: null, completed: false },
  { id: "r16-3", stage: "r16", title: "R16 Match 3 (1E vs 2F)", team1Score: null, team2Score: null, completed: false },
  { id: "r16-4", stage: "r16", title: "R16 Match 4 (1G vs 2H)", team1Score: null, team2Score: null, completed: false },
  { id: "r16-5", stage: "r16", title: "R16 Match 5 (1B vs 2A)", team1Score: null, team2Score: null, completed: false },
  { id: "r16-6", stage: "r16", title: "R16 Match 6 (1D vs 2C)", team1Score: null, team2Score: null, completed: false },
  { id: "r16-7", stage: "r16", title: "R16 Match 7 (1F vs 2E)", team1Score: null, team2Score: null, completed: false },
  { id: "r16-8", stage: "r16", title: "R16 Match 8 (1H vs 2G)", team1Score: null, team2Score: null, completed: false },

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
