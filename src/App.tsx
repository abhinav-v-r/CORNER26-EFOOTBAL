import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Users, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Shield, 
  Info, 
  Settings, 
  Code, 
  Copy, 
  Plus, 
  Minus, 
  ChevronRight,
  User,
  ExternalLink,
  Zap,
  Check
} from 'lucide-react';
import { 
  teams as initialTeams, 
  groupMatches as initialGroupMatches, 
  knockoutMatchesConfig as initialKnockoutMatchesConfig,
  Team,
  Match,
  KnockoutMatch
} from './tournamentData';
import { 
  getAllStandings, 
  resolveKnockoutTree, 
  calculateLiveStats, 
  Standing 
} from './tournamentUtils';

export default function App() {
  const [teams] = useState<Team[]>(initialTeams);
  const [groupMatches] = useState<Match[]>(initialGroupMatches);
  const [knockoutMatches] = useState<KnockoutMatch[]>(initialKnockoutMatchesConfig);
  
  // Group filter for Fixtures section
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<'ALL' | string>('ALL');
  // Match Status filter: 'ALL' | 'COMPLETED' | 'PENDING'
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING'>('ALL');

  // Multi-view for Group Stage: 'GRID' or 'TAB'
  const [groupStageView, setGroupStageView] = useState<'GRID' | 'TAB'>('GRID');
  const [activeGroupTab, setActiveGroupTab] = useState('A');

  // Dynamic calculations based on state matches
  const groupStandings = useMemo(() => {
    return getAllStandings(groupMatches, teams);
  }, [groupMatches, teams]);

  const resolvedKnockout = useMemo(() => {
    return resolveKnockoutTree(groupMatches, teams, knockoutMatches);
  }, [groupMatches, teams, knockoutMatches]);

  const liveStats = useMemo(() => {
    return calculateLiveStats(groupMatches, knockoutMatches, resolvedKnockout.champion);
  }, [groupMatches, knockoutMatches, resolvedKnockout.champion]);

  // Group list
  const groupIds = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

  // Safe helper to find team info
  const getTeamById = (id: number): Team => {
    return teams.find(t => t.id === id) || { id: 0, name: 'Unknown Team', shortName: 'UNK', group: '?', color: '#ccc' };
  };

  // Render match score display (group stage)
  const renderGroupMatchScore = (m: Match) => {
    if (!m.completed || m.team1Score === null || m.team2Score === null) {
      return (
        <div className="flex flex-col items-center justify-center">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 uppercase tracking-widest font-mono">
            Pending
          </span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300 font-mono">
            {m.team1Score}
          </span>
          <span className="text-gray-500 text-xs font-mono font-bold">:</span>
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300 font-mono">
            {m.team2Score}
          </span>
        </div>
        <div className="mt-1">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-widest font-mono">
            FT Completed
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0c0014] text-slate-100 football-pitch overflow-x-hidden selection:bg-[#ee005f] selection:text-white">
      
      {/* Dynamic Confetti Shower for Champion Decided state */}
      {resolvedKnockout.champion && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden flex flex-wrap justify-between">
          {[...Array(60)].map((_, i) => {
            const randomLeft = Math.floor(Math.random() * 100);
            const randomDelay = Math.random() * 8;
            const randomDuration = 4 + Math.random() * 5;
            const colors = ['bg-yellow-400', 'bg-emerald-400', 'bg-sky-400', 'bg-pink-500', 'bg-purple-400'];
            const randomColor = colors[i % colors.length];
            return (
              <div 
                key={i} 
                className={`w-2 h-5 opacity-85 rotate-12 transform absolute animate-bounce ${randomColor}`}
                style={{
                  left: `${randomLeft}%`,
                  top: `-20px`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                  animation: `fallDown ${randomDuration}s linear infinite`,
                  animationDelay: `${randomDelay}s`
                }}
              />
            );
          })}
          <style>{`
            @keyframes fallDown {
              0% { top: -20px; transform: translateY(0) rotate(0deg); }
              100% { top: 110%; transform: translateY(100vh) rotate(720deg); }
            }
          `}</style>
        </div>
      )}

      {/* HEADER BAR & STICKY NAV */}
      <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl glow-green">
              <Trophy className="w-6 h-6 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest font-extrabold bg-blue-600 px-1.5 py-0.5 rounded text-white font-mono">
                  CORNER 26'
                </span>
                <span className="text-[10px] text-slate-400 font-mono">UDSF NSSCE</span>
              </div>
              <h1 className="text-base font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-white to-sky-400">
                EFOOTBALL TOURNAMENT
              </h1>
            </div>
          </div>

          {/* Quick Header Progress Stats */}
          <div className="hidden lg:flex items-center gap-6">
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-mono uppercase tracking-widest">Live Stage</span>
              <span className="text-sm font-bold text-[#00E536] font-sans tracking-wide">
                {liveStats.stageName}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800"></div>
            <div className="w-48 text-right">
              <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                <span>PROGRESS</span>
                <span>{liveStats.totalCompleted}/{liveStats.totalMatches} MATCHES</span>
              </div>
              <div className="w-full bg-[#1e102d] border border-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#ee005f] to-[#00f0ff] h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${(liveStats.totalCompleted / liveStats.totalMatches) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* QUICK FLOATING TELEPORT LINKS */}
      <div className="bg-slate-900/40 border-b border-slate-850 py-3 scrollbar-none overflow-x-auto whitespace-nowrap">
        <div className="max-w-7xl mx-auto px-4 select-none flex items-center gap-3 md:justify-center text-xs font-semibold tracking-wider uppercase font-mono">
          <a href="#hero" className="text-slate-400 hover:text-emerald-400 transition-colors px-2 py-1">Home</a>
          <span className="text-slate-700">•</span>
          <a href="#overview" className="text-slate-400 hover:text-emerald-400 transition-colors px-2 py-1">Overview</a>
          <span className="text-slate-700">•</span>
          <a href="#standings" className="text-slate-400 hover:text-emerald-400 transition-colors px-2 py-1">Groups</a>
          <span className="text-slate-700">•</span>
          <a href="#fixtures" className="text-slate-400 hover:text-emerald-400 transition-colors px-2 py-1">Fixtures</a>
          <span className="text-slate-700">•</span>
          <a href="#qualification" className="text-slate-400 hover:text-emerald-400 transition-colors px-2 py-1">Qualification</a>
          <span className="text-slate-700">•</span>
          <a href="#bracket" className="text-slate-400 hover:text-[#00E536] transition-colors px-2 py-1">Bracket</a>
          <span className="text-slate-700">•</span>
          <a href="#champion" className="text-slate-400 hover:text-[#00F0FF] transition-colors px-2 py-1">Champion</a>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-16">

        {/* 1. HERO SECTION */}
        <section id="hero" className="relative rounded-3xl overflow-hidden glass-pane-premium border border-[#ee005f]/20 py-12 md:py-20 px-6 md:px-12 text-center flex flex-col items-center justify-center space-y-8">
          {/* Neon Grid Overlay & Glowing Radial gradients */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#4a0e70]/40 via-[#0c0014]/70 to-[#0c0014]/95 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-[#ee005f]/15 rounded-full blur-[100px]" />
          
          <div className="relative z-10 space-y-4 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1e102d]/90 border border-[#4a0e70] text-slate-300 text-xs font-mono font-bold tracking-widest uppercase">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#00f0ff] animate-pulse" />
              CORNER 26' PRESENTS
            </div>
            
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter leading-none uppercase font-sans">
              <span className="block bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-200 to-slate-400">
                EFOOTBALL
              </span>
              <span className="block mt-1 bg-clip-text text-transparent bg-gradient-to-r from-[#ee005f] via-[#00f0ff] to-[#00E536]">
                TOURNAMENT
              </span>
            </h1>

            <p className="text-lg sm:text-2xl font-semibold italic text-slate-200 tracking-wide pt-2 max-w-xl mx-auto">
              "Time to prove who the real gamer is. Come, participate, and win prizes!"
            </p>
          </div>

          {/* Organizer tag */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 border-y border-slate-800/60 py-6 max-w-3xl w-full text-xs font-mono tracking-widest uppercase text-slate-400">
            <div className="flex flex-col items-center justify-center p-2">
              <span className="text-[10px] text-slate-500 block mb-1">Organized By</span>
              <span className="font-bold text-white tracking-wide">UDSF</span>
              <span className="text-[9px] text-slate-500 tracking-normal normal-case mt-0.5">United Democratic Students Front</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 border-y md:border-y-0 md:border-x border-slate-800/60">
              <span className="text-[10px] text-slate-500 block mb-1">Venue Host</span>
              <span className="font-bold text-emerald-400 tracking-wide text-center">NSS COLLEGE OF ENG.</span>
              <span className="text-[9px] text-slate-500 tracking-normal normal-case mt-0.5">Palakkad, Kerala</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2">
              <span className="text-[10px] text-slate-500 block mb-1">eSports Partner</span>
              <span className="font-bold text-sky-400 tracking-wide">FIFA ARISES</span>
              <span className="text-[9px] text-slate-500 tracking-normal normal-case mt-0.5">Gaming Guild</span>
            </div>
          </div>

          {/* 🏆 Prize Highlight Card */}
          <div className="relative z-10 w-full max-w-lg bg-gradient-to-b from-yellow-500/15 to-amber-600/5 border border-yellow-500/30 rounded-2xl p-6 glow-gold flex flex-col md:flex-row items-center gap-4 text-left transition-all duration-500 hover:scale-[1.02]">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center self-center shrink-0">
              <Trophy className="w-10 h-10 text-yellow-400" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-extrabold text-yellow-400 uppercase tracking-widest block mb-1">
                Grand Winner Prize ⚽👕
              </span>
              <h3 className="text-xl font-bold text-white tracking-tight leading-snug">
                Official Premium Club Football Jersey
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                The absolute winner receives a top-tier jersey of their favorite football club with custom name and number!
              </p>
            </div>
          </div>
        </section>

        {/* 2. TOURNAMENT OVERVIEW SECTION */}
        <section id="overview" className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-8 h-px bg-emerald-500"></span>
            <h2 className="text-xs font-mono font-black uppercase tracking-widest text-emerald-400">
              Tournament Structure
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat Box 1 */}
            <div className="glass-pane rounded-2xl p-5 border border-slate-800 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-600/25">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Total Teams</span>
                <span className="text-3xl font-extrabold font-mono text-white">48 Teams</span>
                <span className="text-xs text-slate-400 block mt-1">Competitive Players</span>
              </div>
            </div>

            {/* Stat Box 2 */}
            <div className="glass-pane rounded-2xl p-5 border border-slate-800 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-purple-600/10 text-purple-400 border border-purple-600/25">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Group Division</span>
                <span className="text-3xl font-extrabold font-mono text-white">12 Groups</span>
                <span className="text-xs text-slate-400 block mt-1">A through L brackets</span>
              </div>
            </div>

            {/* Stat Box 3 */}
            <div className="glass-pane rounded-2xl p-5 border border-slate-800 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-teal-600/10 text-teal-400 border border-teal-600/25">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Group Density</span>
                <span className="text-3xl font-extrabold font-mono text-white">4 Teams</span>
                <span className="text-xs text-slate-400 block mt-1">Per Group (Round Robin)</span>
              </div>
            </div>

            {/* Stat Box 4 */}
            <div className="glass-pane rounded-2xl p-5 border-emerald-500/20 bg-emerald-950/10 rounded-2xl p-5 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Qualification</span>
                <span className="text-3xl font-extrabold font-mono text-emerald-400">Top 2 Teams</span>
                <span className="text-xs text-slate-400 block mt-1">Advance to Round of 24</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. GROUP STAGES */}
        <section id="standings" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="w-8 h-px bg-emerald-500"></span>
                <h2 className="text-xs font-mono font-black uppercase tracking-widest text-emerald-400">
                  Group Standings Table
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Live computed rankings from matches. Green rows indicate top-2 slots which qualify for the knockout stage.
              </p>
            </div>

            {/* Toggle Grid vs Tab on Standings */}
            <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setGroupStageView('GRID')}
                className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition-all ${
                  groupStageView === 'GRID' 
                    ? 'bg-emerald-500 text-slate-950 shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                GRID VIEW
              </button>
              <button
                onClick={() => setGroupStageView('TAB')}
                className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition-all ${
                  groupStageView === 'TAB' 
                    ? 'bg-emerald-500 text-slate-950 shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                TABS VIEW
              </button>
            </div>
          </div>

          {/* TABS VIEW GROUP SELECTOR */}
          {groupStageView === 'TAB' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {groupIds.map(id => (
                <button
                  key={id}
                  onClick={() => setActiveGroupTab(id)}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold font-mono border transition-all shrink-0 ${
                    activeGroupTab === id 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold' 
                      : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  Group {id}
                </button>
              ))}
            </div>
          )}

          {/* RENDERING STANDINGS DATA */}
          {groupStageView === 'GRID' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupIds.map(id => (
                <GroupStandingTableCard 
                  key={id}
                  groupId={id}
                  standings={groupStandings[id] || []}
                />
              ))}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              <GroupStandingTableCard 
                groupId={activeGroupTab}
                standings={groupStandings[activeGroupTab] || []}
              />
            </div>
          )}
        </section>

        {/* 4. MATCH FIXTURES LIST */}
        <section id="fixtures" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="w-8 h-px bg-sky-500"></span>
                <h2 className="text-xs font-mono font-black uppercase tracking-widest text-sky-400">
                  Group Stage Fixtures
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Filter matches by group or status to track or simulation edit scores.
              </p>
            </div>
          </div>

          {/* Tab selectors for groupings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedGroupFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                  selectedGroupFilter === 'ALL'
                    ? 'bg-sky-500 border-sky-400 text-slate-950'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All Groups
              </button>
              {groupIds.map(id => (
                <button
                  key={id}
                  onClick={() => setSelectedGroupFilter(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all shrink-0 ${
                    selectedGroupFilter === id
                      ? 'bg-sky-500 border-sky-400 text-slate-950 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Group {id}
                </button>
              ))}
            </div>

            {/* Status filters */}
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-500 uppercase tracking-widest font-bold">Show Status:</span>
              <div className="flex items-center gap-2">
                {(['ALL', 'COMPLETED', 'PENDING'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setSelectedStatusFilter(st)}
                    className={`px-2.5 py-1 rounded text-[11px] tracking-wide uppercase transition-all ${
                      selectedStatusFilter === st
                        ? 'bg-slate-800 text-emerald-400 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fixtures roster rendering */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupMatches
              .filter(m => {
                const grpMatch = selectedGroupFilter === 'ALL' || m.group === selectedGroupFilter;
                const stMatch = selectedStatusFilter === 'ALL' 
                  || (selectedStatusFilter === 'COMPLETED' && m.completed)
                  || (selectedStatusFilter === 'PENDING' && !m.completed);
                return grpMatch && stMatch;
              })
              .map(m => {
                const team1 = getTeamById(m.team1Id);
                const team2 = getTeamById(m.team2Id);
                const isT1Winner = m.completed && m.homeScore !== null && m.awayScore !== null && m.homeScore > m.awayScore;
                const isT2Winner = m.completed && m.homeScore !== null && m.awayScore !== null && m.awayScore > m.homeScore;

                return (
                  <div 
                    key={m.id} 
                    className={`relative rounded-2xl border transition-all duration-300 overflow-hidden ${
                      m.completed 
                        ? 'glass-pane border-slate-800/80' 
                        : 'bg-slate-900/20 border-dashed border-slate-800/60 hover:bg-slate-900/45'
                    }`}
                  >
                    {/* Top Group Marker Header */}
                    <div className="flex justify-between items-center bg-slate-900/50 px-4 py-2 border-b border-slate-850 text-[10px] font-mono uppercase tracking-widest text-slate-400">
                      <span>GROUP {m.group} Stage</span>
                      <span className={`f-semibold ${m.completed ? 'text-emerald-400' : 'text-yellow-500'}`}>
                        {m.completed ? 'Match Played' : 'Upcoming'}
                      </span>
                    </div>

                    <div className="p-5 flex flex-col items-stretch space-y-4">
                      {/* Rosters display */}
                      <div className="grid grid-cols-5 items-center gap-2">
                        {/* Team A */}
                        <div className="col-span-2 text-right space-y-1">
                          <span 
                            className={`block text-xs font-bold leading-tight truncate px-1 ${
                              isT1Winner ? 'text-white underline decoration-emerald-400 decoration-2' : m.completed ? 'text-slate-400' : 'text-slate-200'
                            }`}
                            title={team1.name}
                          >
                            {team1.name}
                          </span>
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-400">
                            {team1.shortName}
                          </span>
                        </div>

                        {/* Versus / Score Central */}
                        <div className="col-span-1 flex flex-col items-center justify-center">
                          {renderGroupMatchScore(m)}
                        </div>

                        {/* Team B */}
                        <div className="col-span-2 text-left space-y-1">
                          <span 
                            className={`block text-xs font-bold leading-tight truncate px-1 ${
                              isT2Winner ? 'text-white underline decoration-emerald-400 decoration-2' : m.completed ? 'text-slate-400' : 'text-slate-200'
                            }`}
                            title={team2.name}
                          >
                            {team2.name}
                          </span>
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-400">
                            {team2.shortName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        {/* 5. DYNAMIC QUALIFICATION REVEAL SECTION */}
        <section id="qualification" className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-8 h-px bg-violet-500"></span>
            <h2 className="text-xs font-mono font-black uppercase tracking-widest text-violet-400">
              Knockout Qualifiers List (Live Status)
            </h2>
          </div>

          <div className="glass-pane rounded-3xl p-6 border border-slate-800 space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-violet-600/10 border border-violet-605/20 text-violet-400 rounded-xl">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">How Qualification Works</h3>
                <p className="text-sm text-slate-400 mt-1">
                  The 48 teams are allocated across 12 distinct groups (A to L). The top 2 performing teams of each group automatically secure access into the knockout state. Group winners are globally ranked: the top 8 receive automatic byes and wait in the Round of 16, whereas the remaining 16 dynamic qualifiers face off immediately during the Round of 24.
                </p>
              </div>
            </div>

            <div className="h-px bg-slate-800"></div>

            {/* List of current qualifies */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-extrabold text-slate-500 uppercase tracking-wider block">
                Top 2 Qualifiers from Groups (Real-time recalculating)
              </span>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {resolvedKnockout.qualifiedAll.map(q => {
                  return (
                    <div 
                      key={q.group} 
                      className="bg-slate-950/60 rounded-xl border border-slate-850 overflow-hidden flex flex-col"
                    >
                      {/* Header Group */}
                      <div className="bg-slate-900/40 text-center py-1.5 border-b border-slate-850 text-[10px] font-mono font-extrabold text-violet-400">
                        GROUP {q.group}
                      </div>
                      
                      {/* Qualified bodies */}
                      <div className="p-3 space-y-2 text-xs flex-1 flex flex-col justify-center">
                        {/* Winner */}
                        <div className="space-y-0.5">
                          <span className="text-[9px] uppercase font-mono text-emerald-400 block tracking-widest">
                            🥇 Winner
                          </span>
                          <span className="font-bold text-slate-200 block truncate" title={q.winner.team.name}>
                            {q.winner.played > 0 ? q.winner.team.name : 'Pending...'}
                          </span>
                        </div>

                        {/* Runner-up */}
                        <div className="space-y-0.5 pt-1.5 border-t border-slate-900">
                          <span className="text-[9px] uppercase font-mono text-teal-400 block tracking-widest">
                            🥈 Runner-Up
                          </span>
                          <span className="font-bold text-slate-300 block truncate" title={q.runnerUp.team.name}>
                            {q.runnerUp.played > 0 ? q.runnerUp.team.name : 'Pending...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 6. KNOCKOUT BRACKET SECTION */}
        <section id="bracket" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="w-8 h-px bg-emerald-500"></span>
                <h2 className="text-xs font-mono font-black uppercase tracking-widest text-emerald-400">
                  Knockout Stage Bracket
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Automatic slots resolve according to standings and outcomes. Side scroll to view the complete road to the Grand Final.
              </p>
            </div>
          </div>

          <div className="w-full overflow-x-auto pb-6 pt-4 scrollbar-thin scrollbar-thumb-slate-800">
            {/* The Bracket Core grid columns representing stages: R24 -> R16 -> QF -> SF -> F -> Champion */}
            <div className="min-w-[1400px] grid grid-cols-5 gap-8 items-stretch relative px-2">
              
              {/* ROUND OF 24 (8 matches) */}
              <div className="flex flex-col justify-around space-y-6">
                <div className="text-center py-2 bg-slate-900 border border-slate-800 rounded-lg">
                  <span className="text-xs font-extrabold text-indigo-400 uppercase tracking-widest font-mono">
                    Round of 24
                  </span>
                  <p className="text-[9px] text-slate-500 mt-0.5">16 teams (Group Winners & RUs)</p>
                </div>
                {resolvedKnockout.r24Matches.map((m, idx) => (
                  <BracketMatchCard 
                    key={m.id} 
                    match={m}
                  />
                ))}
              </div>

              {/* ROUND OF 16 (8 matches) */}
              <div className="flex flex-col justify-around space-y-6">
                <div className="text-center py-2 bg-slate-900 border border-slate-800 rounded-lg">
                  <span className="text-xs font-extrabold text-blue-400 uppercase tracking-widest font-mono">
                    Round of 16
                  </span>
                  <p className="text-[9px] text-slate-500 mt-0.5">8 Auto Byes + 8 Winners R24</p>
                </div>
                {resolvedKnockout.r16Matches.map((m, idx) => (
                  <BracketMatchCard 
                    key={m.id} 
                    match={m}
                  />
                ))}
              </div>

              {/* QUARTER FINALS (4 matches) */}
              <div className="flex flex-col justify-around space-y-12">
                <div className="text-center py-2 bg-slate-900 border border-slate-800 rounded-lg">
                  <span className="text-xs font-extrabold text-yellow-500 uppercase tracking-widest font-mono">
                    Quarter-Finals
                  </span>
                  <p className="text-[9px] text-slate-500 mt-0.5">8 Winners of R16</p>
                </div>
                {resolvedKnockout.qfMatches.map((m, idx) => (
                  <BracketMatchCard 
                    key={m.id} 
                    match={m}
                  />
                ))}
              </div>

              {/* SEMI FINALS (2 matches) */}
              <div className="flex flex-col justify-around space-y-24">
                <div className="text-center py-2 bg-slate-900 border border-slate-800 rounded-lg">
                  <span className="text-xs font-extrabold text-pink-500 uppercase tracking-widest font-mono">
                    Semi-Finals
                  </span>
                  <p className="text-[9px] text-slate-500 mt-0.5">Final 4 Duel</p>
                </div>
                {resolvedKnockout.sfMatches.map((m, idx) => (
                  <BracketMatchCard 
                    key={m.id} 
                    match={m}
                  />
                ))}
              </div>

              {/* GRAND FINAL + CHAMPION */}
              <div className="flex flex-col justify-center space-y-12">
                <div className="text-center py-2 bg-slate-900 border border-slate-800 rounded-lg">
                  <span className="text-xs font-extrabold text-amber-500 uppercase tracking-widest font-mono">
                    Grand Final
                  </span>
                  <p className="text-[9px] text-slate-500 mt-0.5">Championship Match</p>
                </div>

                {/* Final Card */}
                {resolvedKnockout.finalMatch && (
                  <BracketMatchCard 
                    match={resolvedKnockout.finalMatch}
                  />
                )}

                {/* Champion Banner inside tree layout */}
                <div className="pt-8 border-t border-slate-800 text-center flex flex-col items-center">
                  <div className={`p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl ${resolvedKnockout.champion ? 'glow-gold animate-bounce' : 'opacity-40'}`}>
                    <Trophy className={`w-14 h-14 ${resolvedKnockout.champion ? 'text-yellow-400' : 'text-slate-600'}`} />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#EAB308] font-bold block mt-3">
                    TOURNAMENT CHAMPION
                  </span>
                  <div className="mt-1 h-8 flex items-center justify-center">
                    {resolvedKnockout.champion ? (
                      <span className="text-lg font-black tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-200">
                        🏆 {resolvedKnockout.champion.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 italic">
                        Waiting for results...
                      </span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 7. LIVE TOURNAMENT STATISTICAL RUN */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-pane p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-mono uppercase tracking-widest">
              🏟️ Completed Matches
            </span>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-4xl font-extrabold font-mono text-white">
                {liveStats.totalCompleted}
              </span>
              <span className="text-slate-500 font-mono text-sm">/ {liveStats.totalMatches}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Group rounds and knockout matches recorded.
            </p>
          </div>

          <div className="glass-pane p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-mono uppercase tracking-widest">
              ⌛ Remaining Fixtures
            </span>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-4xl font-extrabold font-mono text-emerald-400">
                {liveStats.remaining}
              </span>
              <span className="text-slate-500 font-mono text-sm">matches</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Upcoming scheduled competitive challenges.
            </p>
          </div>

          <div className="glass-pane p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-mono uppercase tracking-widest">
              👥 Active Qualifiers
            </span>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-4xl font-extrabold font-mono text-violet-400">
                {liveStats.qualifiedCount}
              </span>
              <span className="text-slate-500 font-mono text-sm">Teams Qualified</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Secured placement within the elimination brackets.
            </p>
          </div>

          <div className="glass-pane p-6 rounded-2xl border border-emerald-500/10 flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
            <span className="text-xs text-slate-400 font-mono uppercase tracking-widest">
              🎮 Active Tournament Stage
            </span>
            <div className="flex items-baseline gap-2 mt-4 relative z-10">
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-sky-400 truncate max-w-full">
                {liveStats.stageName}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 relative z-10">
              UDSF NSSCE Live eFootball Arena.
            </p>
          </div>
        </section>

        {/* 8. CHAMPION CELEBRATION SHOWER */}
        <section id="champion" className="text-center py-6">
          <div className="max-w-4xl mx-auto glass-pane-premium relative rounded-3xl p-8 md:p-14 overflow-hidden border border-amber-500/20">
            {/* Ambient gold glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-amber-500/10 rounded-full blur-[90px]" />
            <div className="absolute -inset-[10px] bg-gradient-to-r from-yellow-500/5 to-amber-500/5 pointer-events-none rounded-3xl" />
            
            <div className="relative z-10 space-y-6 flex flex-col items-center">
              {resolvedKnockout.champion ? (
                <>
                  {/* Glowing Medal / Icon anim */}
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full scale-110" />
                    <div className="relative p-6 bg-gradient-to-b from-yellow-400 to-amber-500 rounded-full border-4 border-slate-950 font-semibold shadow-2xl animate-bounce">
                      <Trophy className="w-16 h-16 text-slate-950" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-mono font-extrabold tracking-widest text-amber-400 uppercase">
                      🎉 CHAMPION DECORATION SHOWER 🎉
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black uppercase text-white tracking-tight leading-none">
                      {resolvedKnockout.champion.name}
                    </h2>
                    <span className="inline-block px-3 py-1 bg-slate-900 border border-slate-800 text-slate-400 rounded text-xs font-mono mt-1">
                      Origin: {resolvedKnockout.champion.source}
                    </span>
                  </div>

                  {/* Winner design details */}
                  <div className="inline-flex flex-col items-center p-6 bg-slate-950/70 border border-slate-850 rounded-2xl max-w-md w-full relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-yellow-500 text-slate-950 font-mono text-[9px] font-black rounded-full uppercase tracking-wider">
                      GRAND PRIZE WINNER
                    </div>
                    <span className="text-xs text-slate-400 font-mono tracking-wider mt-1 block">🏆 FAVOURITE CLUB JERSEY 👕</span>
                    <p className="text-sm font-semibold text-slate-100 mt-2 text-center">
                      Recipient of a personalized official jersey representing the champion player's selected pro team!
                    </p>
                    <span className="text-[10px] text-slate-500 block mt-4 font-mono font-bold">
                      Organized by United Democratic Students Front
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-5 bg-slate-900/60 border border-slate-850 rounded-full text-slate-500">
                    <Trophy className="w-12 h-12" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl md:text-2xl font-bold text-slate-300">
                      🏆 Champion Yet To Be Decided
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Fill in match results for the group matches and the consecutive knockout stages. Once the Grand Final is completed, the champion will be dynamically crowned here with live confetti!
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        window.scrollTo({ top: document.getElementById('bracket')?.offsetTop, behavior: 'smooth' });
                      }}
                      className="px-5 py-2 hover:bg-slate-900 border border-slate-800 rounded-full text-xs font-mono font-bold tracking-wider text-slate-400 hover:text-white transition-colors"
                    >
                      EXPLORE BRACKETS ➔
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* 9. ADMIN EDITING SYSTEM DISPLAY & HELP DOCS */}
        

      </main>

      {/* 10. SYSTEM FOOTER */}
      <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Col */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-black text-white tracking-widest text-sm font-sans uppercase">
                <span className="p-1 px-2 bg-emerald-500 rounded text-slate-950 text-xs">⚽</span>
                CORNER 26' eFOOTBALL
              </div>
              <p className="text-xs text-slate-500 tracking-wide font-mono leading-relaxed">
                The premier collegiate eFootball tournament platform. Designed with passion for competitive gamers & football enthusiasts alike.
              </p>
            </div>

            {/* Central Col */}
            <div className="space-y-2">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-widest font-extrabold block">
                ORGANIZERS & GUILD
              </span>
              <div className="text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-white">UDSF (United Democratic Students Front)</p>
                <p className="text-slate-500">NSS College of Engineering, Palakkad</p>
                <p className="font-semibold text-sky-400 mt-1">FIFA ARISES Gaming League</p>
              </div>
            </div>

            {/* Right Col */}
            <div className="space-y-2">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-widest font-extrabold block">
                TOURNAMENT LINKS
              </span>
              <div className="text-xs font-mono space-y-1.5">
                <a href="#hero" className="block text-slate-400 hover:text-emerald-400 transition-colors">➔ Welcome Deck</a>
                <a href="#standings" className="block text-slate-400 hover:text-emerald-400 transition-colors">➔ Interactive Standings</a>
                <a href="#bracket" className="block text-slate-400 hover:text-emerald-400 transition-colors">➔ Knockout Grid Bracket</a>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-900"></div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
            <p>
              © 2026 CORNER 26'. All rights preserved. Made with ❤️ for football lovers.
            </p>
            <div className="flex items-center gap-4 text-[11px]">
              <span>UDSF • NSSCE</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">FIFA ARISES</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

// ======================== COMPONENT CODE BLOCKS ========================

interface GroupStandingCardProps {
  key?: React.Key | string;
  groupId: string;
  standings: Standing[];
}

function GroupStandingTableCard({ groupId, standings }: GroupStandingCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/10 overflow-hidden backdrop-blur-md">
      {/* Group Header Title */}
      <div className="px-5 py-3 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-slate-850 flex items-center justify-between">
        <span className="font-extrabold tracking-wide text-sm text-slate-100 flex items-center gap-1.5 font-sans">
          <span className="w-1.5 h-3 bg-emerald-400 rounded-full inline-block"></span>
          GROUP {groupId}
        </span>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Group Stage
        </span>
      </div>

      {/* Standing header list */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-850 bg-slate-950/20 text-[10px] font-mono text-slate-400 uppercase font-extrabold">
              <th className="py-2.5 px-3 text-center">POS</th>
              <th className="py-2.5 px-2">TEAM</th>
              <th className="py-2.5 px-1.5 text-center">GP</th>
              <th className="py-2.5 px-1 text-center">W</th>
              <th className="py-2.5 px-1 text-center">D</th>
              <th className="py-2.5 px-1 text-center">L</th>
              <th className="py-2.5 px-1.5 text-center">GD</th>
              <th className="py-2.5 px-3 text-center bg-slate-950/30">PTS</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, idx) => {
              const isQualified = idx < 2; // Top 2 qualify
              const hasPlayed = s.played > 0;
              return (
                <tr 
                  key={s.team.id}
                  className={`border-b border-slate-900/60 text-xs font-mono transition-colors ${
                    isQualified 
                      ? 'bg-emerald-500/[0.015] hover:bg-emerald-500/[0.03]' 
                      : 'hover:bg-slate-900/40'
                  }`}
                >
                  {/* Position */}
                  <td className="py-2.5 px-3 text-center">
                    <span 
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-md font-bold text-[10px] ${
                        isQualified 
                          ? 'bg-emerald-500 text-slate-950 font-black' 
                          : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </td>

                  {/* Team Name */}
                  <td className="py-2.5 px-2 font-bold max-w-[120px] truncate" title={s.team.name}>
                    <div className="flex flex-col">
                      <span className="text-slate-100 font-sans tracking-wide leading-tight text-xs truncate">
                        {s.team.name}
                      </span>
                      {isQualified && (
                        <span className="text-[9px] text-emerald-400/90 tracking-widest uppercase font-mono mt-0.5 transform scale-90 origin-left">
                          ★ QUALIFIED
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Played */}
                  <td className="py-2.5 px-1.5 text-center text-slate-400">{s.played}</td>
                  {/* Wins */}
                  <td className="py-2.5 px-1 text-center text-slate-300 font-bold">{s.wins}</td>
                  {/* Draws */}
                  <td className="py-2.5 px-1 text-center text-slate-400">{s.draws}</td>
                  {/* Losses */}
                  <td className="py-2.5 px-1 text-center text-slate-400">{s.losses}</td>
                  {/* GD */}
                  <td className={`py-2.5 px-1.5 text-center font-bold ${
                    s.gd > 0 ? 'text-emerald-400' : s.gd < 0 ? 'text-red-400' : 'text-slate-400'
                  }`}>
                    {s.gd > 0 ? `+${s.gd}` : s.gd}
                  </td>
                  {/* Points */}
                  <td className={`py-2.5 px-3 text-center font-extrabold text-sm ${
                    isQualified ? 'text-emerald-400 bg-emerald-500/[0.03]' : 'text-slate-200 bg-slate-950/20'
                  }`}>
                    {s.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ======================== BRACKET MATCH CARD ========================

interface BracketMatchProps {
  key?: React.Key | string;
  match: {
    id: string;
    stage: string;
    title: string;
    team1: { id: number; name: string; shortName: string; source: string; color: string } | null;
    team2: { id: number; name: string; shortName: string; source: string; color: string } | null;
    team1Score: number | null;
    team2Score: number | null;
    penalties1?: number | null;
    penalties2?: number | null;
    completed: boolean;
    winner: { id: number; name: string; shortName: string; source: string; color: string } | null;
    isTied: boolean;
  };
}

function BracketMatchCard({ match }: BracketMatchProps) {
  const isT1Winner = match.completed && match.team1Score !== null && match.team2Score !== null && (
    match.team1Score > match.team2Score || (match.team1Score === match.team2Score && match.penalties1 !== undefined && match.penalties2 !== undefined && match.penalties1 !== null && match.penalties2 !== null && match.penalties1 > match.penalties2)
  );

  const isT2Winner = match.completed && match.team1Score !== null && match.team2Score !== null && (
    match.team2Score > match.team1Score || (match.team1Score === match.team2Score && match.penalties1 !== undefined && match.penalties2 !== undefined && match.penalties1 !== null && match.penalties2 !== null && match.penalties2 > match.penalties1)
  );

  return (
    <div className="w-[280px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative transition-all duration-300 hover:border-slate-700">
      
      {/* Top Banner indicating title / stage progress */}
      <div className="bg-slate-950 px-3 py-1.5 border-b border-slate-850 flex items-center justify-between text-[9px] font-mono font-extrabold uppercase tracking-widest text-slate-400">
        <span>{match.title}</span>
        <span className={match.completed ? 'text-emerald-400' : 'text-slate-500'}>
          {match.completed ? 'Completed' : 'PENDING'}
        </span>
      </div>

      <div className="p-3 space-y-2">
        {/* TEAM 1 */}
        <div className={`flex items-center justify-between p-2 rounded-lg ${isT1Winner ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-slate-950/40 border border-transparent'}`}>
          <div className="space-y-0.5 max-w-[170px] truncate">
            {match.team1 ? (
              <>
                <span className={`block text-xs font-bold truncate leading-tight ${isT1Winner ? 'text-white' : match.completed ? 'text-slate-500' : 'text-slate-200'}`}>
                  {match.team1.name}
                </span>
                <span className="text-[8px] font-mono text-slate-500 block leading-tight truncate">
                  {match.team1.source}
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-500 italic block">Team To Be Decided</span>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {match.isTied && match.penalties1 !== undefined && match.penalties1 !== null && (
              <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-1 py-0.5 rounded" title="Penalties score">
                ({match.penalties1})
              </span>
            )}
            <span className={`w-8 text-center text-sm font-extrabold font-mono ${isT1Winner ? 'text-emerald-400' : 'text-slate-200'}`}>
              {match.completed && match.team1Score !== null ? match.team1Score : '-'}
            </span>
          </div>
        </div>

        {/* TEAM 2 */}
        <div className={`flex items-center justify-between p-2 rounded-lg ${isT2Winner ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-slate-950/40 border border-transparent'}`}>
          <div className="space-y-0.5 max-w-[170px] truncate">
            {match.team2 ? (
              <>
                <span className={`block text-xs font-bold truncate leading-tight ${isT2Winner ? 'text-white' : match.completed ? 'text-slate-500' : 'text-slate-200'}`}>
                  {match.team2.name}
                </span>
                <span className="text-[8px] font-mono text-slate-500 block leading-tight truncate">
                  {match.team2.source}
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-500 italic block">Team To Be Decided</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {match.isTied && match.penalties2 !== undefined && match.penalties2 !== null && (
              <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-1 py-0.5 rounded" title="Penalties score">
                ({match.penalties2})
              </span>
            )}
            <span className={`w-8 text-center text-sm font-extrabold font-mono ${isT2Winner ? 'text-emerald-400' : 'text-slate-200'}`}>
              {match.completed && match.team2Score !== null ? match.team2Score : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
