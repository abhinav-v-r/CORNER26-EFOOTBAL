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
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const [teams] = useState<Team[]>(initialTeams);
  const [groupMatches, setGroupMatches] = useState<Match[]>(initialGroupMatches);
  const [knockoutMatches, setKnockoutMatches] = useState<KnockoutMatch[]>(initialKnockoutMatchesConfig);
  
  const [currentPath, setCurrentPath] = useState(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path === '/admin' || hash === '#/admin' || hash === '#admin') {
      return '/admin';
    }
    return '/';
  });

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return sessionStorage.getItem('corner26_admin_logged_in_v1') === 'true';
  });

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [adminMode, setAdminMode] = useState(false);

  React.useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path === '/admin' || hash === '#/admin' || hash === '#admin') {
        setCurrentPath('/admin');
      } else {
        setCurrentPath('/');
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    
    handleUrlChange();

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  React.useEffect(() => {
    if (currentPath === '/admin' && isAdminLoggedIn) {
      setAdminMode(true);
    } else {
      setAdminMode(false);
    }
  }, [currentPath, isAdminLoggedIn]);

  // Auth State Listener
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === 'admin12@corner.com') {
        setIsAdminLoggedIn(true);
        sessionStorage.setItem('corner26_admin_logged_in_v1', 'true');
      } else {
        setIsAdminLoggedIn(false);
        setAdminMode(false);
        sessionStorage.removeItem('corner26_admin_logged_in_v1');
      }
    });
    return () => unsubscribe();
  }, []);

  // Connection Test Effect
  React.useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Real-time synchronization of group stage matches
  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, 'group_matches'), (snapshot) => {
      const firestoreGroupMap = new Map();
      snapshot.forEach((doc) => {
        firestoreGroupMap.set(doc.id, doc.data());
      });
      
      setGroupMatches(() => {
        return initialGroupMatches.map(m => {
          const dbMatch = firestoreGroupMap.get(m.id);
          if (dbMatch) {
            return {
              ...m,
              team1Score: dbMatch.team1Score !== undefined ? dbMatch.team1Score : null,
              team2Score: dbMatch.team2Score !== undefined ? dbMatch.team2Score : null,
              completed: !!dbMatch.completed
            };
          }
          return m;
        });
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'group_matches');
    });

    return () => unsub();
  }, []);

  // Real-time synchronization of knockout matches
  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, 'knockout_matches'), (snapshot) => {
      const firestoreKoMap = new Map();
      snapshot.forEach((doc) => {
        firestoreKoMap.set(doc.id, doc.data());
      });
      
      setKnockoutMatches(() => {
        return initialKnockoutMatchesConfig.map(m => {
          const dbMatch = firestoreKoMap.get(m.id);
          if (dbMatch) {
            return {
              ...m,
              team1Score: dbMatch.team1Score !== undefined ? dbMatch.team1Score : null,
              team2Score: dbMatch.team2Score !== undefined ? dbMatch.team2Score : null,
              completed: !!dbMatch.completed,
              penalties1: dbMatch.penalties1 !== undefined ? dbMatch.penalties1 : null,
              penalties2: dbMatch.penalties2 !== undefined ? dbMatch.penalties2 : null
            };
          }
          return m;
        });
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'knockout_matches');
    });

    return () => unsub();
  }, []);

  const [editingMatch, setEditingMatch] = useState<{
    id: string;
    isKnockout: boolean;
    team1Name: string;
    team2Name: string;
    team1Score: number | null;
    team2Score: number | null;
    completed: boolean;
    penalties1?: number | null;
    penalties2?: number | null;
  } | null>(null);

  // Score updater handlers
  const handleSaveMatch = async (
    id: string, 
    isKnockout: boolean, 
    score1: number | null, 
    score2: number | null, 
    completed: boolean,
    pen1?: number | null,
    pen2?: number | null
  ) => {
    if (isKnockout) {
      try {
        await setDoc(doc(db, 'knockout_matches', id), {
          id,
          team1Score: completed ? score1 : null,
          team2Score: completed ? score2 : null,
          completed,
          penalties1: completed && score1 === score2 ? (pen1 ?? null) : null,
          penalties2: completed && score1 === score2 ? (pen2 ?? null) : null
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `knockout_matches/${id}`);
      }
    } else {
      try {
        await setDoc(doc(db, 'group_matches', id), {
          id,
          team1Score: completed ? score1 : null,
          team2Score: completed ? score2 : null,
          completed
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `group_matches/${id}`);
      }
    }
    setEditingMatch(null);
  };

  const handleResetTournament = async () => {
    if (window.confirm("Are you sure you want to reset all tournament scores and results to not started?")) {
      try {
        const groupToDelete = groupMatches.filter(m => m.completed || m.team1Score !== null || m.team2Score !== null);
        const koToDelete = knockoutMatches.filter(m => m.completed || m.team1Score !== null || m.team2Score !== null);
        
        const deletePromises = [
          ...groupToDelete.map(m => deleteDoc(doc(db, 'group_matches', m.id))),
          ...koToDelete.map(m => deleteDoc(doc(db, 'knockout_matches', m.id)))
        ];
        
        await Promise.all(deletePromises);
      } catch (error) {
        console.error("Failed to reset Firestore matches:", error);
      }
      setAdminMode(false);
      setEditingMatch(null);
    }
  };

  const openKoMatchEditor = (m: any) => {
    setEditingMatch({
      id: m.id,
      isKnockout: true,
      team1Name: m.team1?.name || m.team1Placeholder || 'TBD',
      team2Name: m.team2?.name || m.team2Placeholder || 'TBD',
      team1Score: m.team1Score,
      team2Score: m.team2Score,
      completed: m.completed,
      penalties1: m.penalties1,
      penalties2: m.penalties2
    });
  };
  
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
  const groupIds = ["A", "B", "C", "D", "E", "F", "G", "H"];

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

  if (currentPath === '/admin' && !isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0c0014] text-slate-100 football-pitch overflow-x-hidden flex flex-col justify-between selection:bg-[#ee005f] selection:text-white pb-8 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-[#ee005f]/15 rounded-full blur-[100px] pointer-events-none" />
        
        <header className="w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800 py-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-xl">
              <Trophy className="w-5 h-5 text-fuchsia-400" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest font-extrabold bg-blue-600 px-1.5 py-0.5 rounded text-white font-mono">
                CORNER 26'
              </span>
              <span className="text-xs font-bold text-slate-400 font-sans block">UDSF NSSCE eFOOTBALL</span>
            </div>
          </div>
          <button 
            onClick={() => {
              window.history.pushState({}, '', '/');
              setCurrentPath('/');
            }}
            className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition-all cursor-pointer"
          >
            ← Public Portal
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900/95 border border-slate-800 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-6 backdrop-blur-sm">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 mb-2">
                <Shield className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="text-xl font-black tracking-wider uppercase text-white font-mono">
                ADMINISTRATOR LOGIN
              </h2>
              <p className="text-xs text-slate-400">
                Authorized credentials required to access the score management consoles.
              </p>
            </div>

            {loginError && (
              <div className="p-3 bg-red-400/10 border border-red-500/20 rounded-xl text-center text-xs text-red-200 font-semibold tracking-wide flex items-center justify-center gap-2">
                <span>⚠️</span>
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
                setLoginError('');
              } catch (signInErr: any) {
                if (loginEmail === 'admin12@corner.com' && loginPassword === 'corner#admin$5') {
                  try {
                    await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
                    setLoginError('');
                  } catch (signUpErr: any) {
                    setLoginError(signUpErr.message || 'Error occurred authenticating session.');
                  }
                } else {
                  setLoginError('Invalid administrator credentials.');
                }
              }
            }} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1.55">
                  Email Address
                </label>
                <input 
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1.55">
                  Password
                </label>
                <input 
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500 transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl text-xs font-mono font-bold bg-[#ee005f] hover:bg-[#ff1f7b] text-white font-black shadow-[0_0_25px_rgba(238,0,95,0.25)] transition-all cursor-pointer"
                >
                  Authenticate Session
                </button>
              </div>
            </form>
          </div>
        </div>

        <footer className="w-full text-center text-[10px] font-mono text-slate-550">
          UDSF NSSCE • © 2026 CORNER 26' • ALL RIGHTS RESERVED
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0014] text-slate-100 football-pitch overflow-x-hidden selection:bg-[#ee005f] selection:text-white">
      
      {/* 🔴 Active Session Bar for logged in admin */}
      {currentPath === '/admin' && isAdminLoggedIn && (
        <div className="bg-emerald-500 text-slate-950 px-4 py-2 text-xs font-semibold font-mono flex items-center justify-between shadow-lg relative z-50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-950 animate-pulse inline-block shrink-0" />
            <span>SESSION: admin12@corner.com (ADMIN PRIVILEGES CHANNELS LIVE)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                window.history.pushState({}, '', '/');
                setCurrentPath('/');
              }}
              className="px-2.5 py-1 rounded bg-slate-950 text-emerald-400 text-[10px] font-bold hover:bg-slate-900 transition-all cursor-pointer"
            >
              Public Mode
            </button>
            <button
              onClick={async () => {
                try {
                  await signOut(auth);
                } catch (err) {
                  console.error("Sign out error", err);
                }
                setIsAdminLoggedIn(false);
                setAdminMode(false);
                sessionStorage.removeItem('corner26_admin_logged_in_v1');
                window.history.pushState({}, '', '/');
                setCurrentPath('/');
              }}
              className="px-2.5 py-1 rounded bg-red-600 text-white text-[10px] font-bold hover:bg-rose-700 transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
      
      {/* Dynamic Confetti Shower for Champion Decided state */}
      {resolvedKnockout.champion && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden flex flex-wrap justify-between">
          {[...Array(60)].map((_, i) => {
            const randomLeft = Math.floor(Math.random() * 100);
            const randomDelay = Math.random() * 8;
            const randomDuration = 4 + Math.random() * 5;
            const colors = ['bg-yellow-400', 'bg-fuchsia-400', 'bg-sky-400', 'bg-pink-500', 'bg-purple-400'];
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
            <div className="p-2 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-xl glow-magenta">
              <Trophy className="w-6 h-6 text-fuchsia-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest font-extrabold bg-blue-600 px-1.5 py-0.5 rounded text-white font-mono">
                  CORNER 26'
                </span>
                <span className="text-[10px] text-slate-400 font-mono">UDSF NSSCE</span>
              </div>
              <h1 className="text-base font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 via-white to-sky-400">
                eFOOTBALL TOURNAMENT
              </h1>
            </div>
          </div>

          {/* Quick Header Progress Stats */}
          <div className="flex items-center gap-6">
            <div className="hidden lg:block text-right">
              <span className="text-xs text-slate-400 block font-mono uppercase tracking-widest">Live Stage</span>
              <span className="text-sm font-bold text-[#00E536] font-sans tracking-wide">
                {liveStats.stageName}
              </span>
            </div>
            <div className="hidden lg:block h-8 w-px bg-slate-800"></div>
            <div className="hidden lg:block w-48 text-right">
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
            <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
            
            {currentPath === '/admin' && isAdminLoggedIn && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAdminMode(!adminMode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 border transition-all ${
                    adminMode 
                      ? 'bg-rose-500 border-rose-400 text-slate-950 shadow-[0_0_15px_rgba(244,63,94,0.4)]' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                  title="Toggle Editing Mode to update scores"
                  id="admin-mode-toggle"
                >
                  <Settings className={`w-3.5 h-3.5 ${adminMode ? 'animate-spin' : ''}`} />
                  <span>{adminMode ? 'EDIT: ON' : 'EDIT SCORE'}</span>
                </button>

                {adminMode && (
                  <button
                    onClick={handleResetTournament}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-950 border border-slate-800 text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all"
                    title="Reset all results to unplayed"
                    id="tournament-reset-btn"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* QUICK FLOATING TELEPORT LINKS */}
      <div className="bg-slate-900/40 border-b border-slate-850 py-3 scrollbar-none overflow-x-auto whitespace-nowrap">
        <div className="max-w-7xl mx-auto px-4 select-none flex items-center gap-3 md:justify-center text-xs font-semibold tracking-wider uppercase font-mono">
          <a href="#hero" className="text-slate-400 hover:text-fuchsia-400 transition-colors px-2 py-1">Home</a>
          <span className="text-slate-700">•</span>
          <a href="#overview" className="text-slate-400 hover:text-fuchsia-400 transition-colors px-2 py-1">Overview</a>
          <span className="text-slate-700">•</span>
          <a href="#standings" className="text-slate-400 hover:text-fuchsia-400 transition-colors px-2 py-1">Groups</a>
          <span className="text-slate-700">•</span>
          <a href="#fixtures" className="text-slate-400 hover:text-fuchsia-400 transition-colors px-2 py-1">Fixtures</a>
          <span className="text-slate-700">•</span>
          <a href="#qualification" className="text-slate-400 hover:text-fuchsia-400 transition-colors px-2 py-1">Qualification</a>
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
                eFOOTBALL
              </span>
              <span className="block mt-1 bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-fuchsia-500 to-rose-500">
                TOURNAMENT
              </span>
            </h1>

            <p className="text-lg sm:text-2xl font-semibold italic text-slate-200 tracking-wide pt-2 max-w-xl mx-auto">
              "Time to prove who the real gamer is. Come, participate, and win prizes!"
            </p>
          </div>

          {/* Organizer tag */}
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-12 border-y border-slate-800/60 py-6 max-w-3xl w-full text-xs font-mono tracking-widest uppercase text-slate-400">
            <div className="flex flex-col items-center justify-center p-2">
              <span className="text-[10px] text-slate-500 block mb-1">Organized By</span>
              <span className="font-bold text-white tracking-wide text-lg">UDSF NSSCE</span>
            </div>
            <div className="hidden md:block w-px h-12 bg-slate-800/60"></div>
            <div className="flex flex-col items-center justify-center p-2">
              <span className="text-[10px] text-slate-500 block mb-1">Presented By</span>
              <span className="font-bold text-fuchsia-400 tracking-wide text-lg">CORNER 26'</span>
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
                Football Jersey of your Favorite Team
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Rise to the top, become the champion, and wear the colors of your favorite club with pride
              </p>
            </div>
          </div>
        </section>

        {/* 2. TOURNAMENT OVERVIEW SECTION */}
        <section id="overview" className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-8 h-px bg-fuchsia-500"></span>
            <h2 className="text-xs font-mono font-black uppercase tracking-widest text-fuchsia-400">
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
                <span className="text-3xl font-extrabold font-mono text-white">32 Teams</span>
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
                <span className="text-3xl font-extrabold font-mono text-white">8 Groups</span>
                <span className="text-xs text-slate-400 block mt-1">A through H brackets</span>
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
            <div className="glass-pane rounded-2xl p-5 border-fuchsia-500/20 bg-fuchsia-950/10 rounded-2xl p-5 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/25">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">Qualification</span>
                <span className="text-3xl font-extrabold font-mono text-fuchsia-400">Top 2 Teams</span>
                <span className="text-xs text-slate-400 block mt-1">Advance to Round of 16</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. GROUP STAGES */}
        <section id="standings" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="w-8 h-px bg-fuchsia-500"></span>
                <h2 className="text-xs font-mono font-black uppercase tracking-widest text-fuchsia-400">
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
                    ? 'bg-fuchsia-500 text-slate-950 shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                GRID VIEW
              </button>
              <button
                onClick={() => setGroupStageView('TAB')}
                className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition-all ${
                  groupStageView === 'TAB' 
                    ? 'bg-fuchsia-500 text-slate-950 shadow' 
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
                      ? 'bg-fuchsia-500 text-slate-950 border-fuchsia-400 font-extrabold' 
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
                  groupMatches={groupMatches}
                />
              ))}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              <GroupStandingTableCard 
                groupId={activeGroupTab}
                standings={groupStandings[activeGroupTab] || []}
                groupMatches={groupMatches}
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
                        ? 'bg-slate-800 text-fuchsia-400 font-bold'
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
                const isT1Winner = m.completed && m.team1Score !== null && m.team2Score !== null && m.team1Score > m.team2Score;
                const isT2Winner = m.completed && m.team1Score !== null && m.team2Score !== null && m.team2Score > m.team1Score;

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
                      <span className={`font-semibold ${m.completed ? 'text-fuchsia-400' : 'text-yellow-500'}`}>
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
                              isT1Winner ? 'text-white underline decoration-fuchsia-400 decoration-2' : m.completed ? 'text-slate-400' : 'text-slate-200'
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
                              isT2Winner ? 'text-white underline decoration-fuchsia-400 decoration-2' : m.completed ? 'text-slate-400' : 'text-slate-200'
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

                      {currentPath === '/admin' && isAdminLoggedIn && adminMode && (
                        <button
                          onClick={() => setEditingMatch({
                            id: m.id,
                            isKnockout: false,
                            team1Name: team1.name,
                            team2Name: team2.name,
                            team1Score: m.team1Score,
                            team2Score: m.team2Score,
                            completed: m.completed
                          })}
                          className="w-full py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-[#00E536] hover:border-[#00E536]/40 hover:text-slate-950 font-mono text-[10px] font-bold tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Settings className="w-3 h-3" />
                          UPDATE RESULT
                        </button>
                      )}
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
                          <span className="text-[9px] uppercase font-mono text-fuchsia-400 block tracking-widest">
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
                <span className="w-8 h-px bg-fuchsia-500"></span>
                <h2 className="text-xs font-mono font-black uppercase tracking-widest text-fuchsia-400">
                  Knockout Stage Bracket
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Automatic slots resolve according to standings and outcomes. Side scroll to view the complete road to the Grand Final.
              </p>
            </div>
          </div>

          <div className="w-full overflow-x-auto pb-6 pt-4 scrollbar-thin scrollbar-thumb-slate-800">
            {/* The Bracket Core grid columns representing stages: R16 -> QF -> SF -> F -> Champion */}
            <div className="min-w-[1250px] grid grid-cols-5 gap-8 items-stretch relative px-2 min-h-[1150px]">
              
              {/* ROUND OF 16 (8 matches) */}
              <div className="flex flex-col h-full">
                <div className="text-center py-2 bg-slate-900 border border-slate-800 rounded-lg shrink-0 h-[52px] flex flex-col justify-center mb-6">
                  <span className="text-xs font-extrabold text-blue-400 uppercase tracking-widest font-mono">
                    Round of 16
                  </span>
                  <p className="text-[9px] text-slate-500 mt-0.5">16 teams (Group Winners & RUs)</p>
                </div>
                <div className="flex-1 flex flex-col justify-around py-2">
                  {resolvedKnockout.r16Matches.map((m, idx) => (
                    <BracketMatchCard 
                      key={m.id} 
                      match={m}
                      adminMode={adminMode}
                      onEdit={() => openKoMatchEditor(m)}
                    />
                  ))}
                </div>
              </div>

              {/* QUARTER FINALS (4 matches) */}
              <div className="flex flex-col h-full">
                <div className="text-center py-2 bg-slate-900 border border-slate-800 rounded-lg shrink-0 h-[52px] flex flex-col justify-center mb-6">
                  <span className="text-xs font-extrabold text-yellow-500 uppercase tracking-widest font-mono">
                    Quarter-Finals
                  </span>
                  <p className="text-[9px] text-slate-500 mt-0.5">8 Winners of R16</p>
                </div>
                <div className="flex-1 flex flex-col justify-around py-2">
                  {resolvedKnockout.qfMatches.map((m, idx) => (
                    <BracketMatchCard 
                      key={m.id} 
                      match={m}
                      adminMode={adminMode}
                      onEdit={() => openKoMatchEditor(m)}
                    />
                  ))}
                </div>
              </div>

              {/* SEMI FINALS (2 matches) */}
              <div className="flex flex-col h-full">
                <div className="text-center py-2 bg-slate-900 border border-slate-800 rounded-lg shrink-0 h-[52px] flex flex-col justify-center mb-6">
                  <span className="text-xs font-extrabold text-pink-500 uppercase tracking-widest font-mono">
                    Semi-Finals
                  </span>
                  <p className="text-[9px] text-slate-500 mt-0.5">Final 4 Duel</p>
                </div>
                <div className="flex-1 flex flex-col justify-around py-2">
                  {resolvedKnockout.sfMatches.map((m, idx) => (
                    <BracketMatchCard 
                      key={m.id} 
                      match={m}
                      adminMode={adminMode}
                      onEdit={() => openKoMatchEditor(m)}
                    />
                  ))}
                </div>
              </div>

              {/* GRAND FINAL + CHAMPION */}
              <div className="flex flex-col h-full">
                <div className="text-center py-2 bg-slate-900 border border-slate-800 rounded-lg shrink-0 h-[52px] flex flex-col justify-center mb-6">
                  <span className="text-xs font-extrabold text-amber-500 uppercase tracking-widest font-mono">
                    Grand Final
                  </span>
                  <p className="text-[9px] text-slate-500 mt-0.5">Championship Match</p>
                </div>
                <div className="flex-1 flex flex-col justify-around py-2">
                  {resolvedKnockout.finalMatch && (
                    <BracketMatchCard 
                      match={resolvedKnockout.finalMatch}
                      adminMode={adminMode}
                      onEdit={() => openKoMatchEditor(resolvedKnockout.finalMatch)}
                    />
                  )}
                </div>
              </div>

              {/* CHAMPION SHOWCASE */}
              <div className="flex flex-col h-full">
                <div className="text-center py-2 bg-slate-900 border border-slate-800 rounded-lg shrink-0 h-[52px] flex flex-col justify-center mb-6">
                  <span className="text-xs font-extrabold text-[#EAB308] uppercase tracking-widest font-mono">
                    Champion
                  </span>
                  <p className="text-[9px] text-slate-500 mt-0.5">Grand Coronation</p>
                </div>
                <div className="flex-1 flex flex-col justify-center py-2 whitespace-nowrap">
                  <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl text-center flex flex-col items-center justify-center space-y-4 max-w-sm mx-auto w-full transition-all duration-500 hover:border-yellow-500/30 overflow-hidden relative">
                    {/* Background glow when champion exists */}
                    {resolvedKnockout.champion && (
                      <div className="absolute inset-0 bg-yellow-400/5 blur-2xl rounded-full scale-110 pointer-events-none" />
                    )}
                    
                    <div className={`p-5 bg-gradient-to-br from-slate-950 to-slate-900 border rounded-2xl flex items-center justify-center relative z-10 ${resolvedKnockout.champion ? 'border-yellow-500/40 shadow-[0_0_30px_rgba(234,179,8,0.2)] animate-bounce' : 'border-slate-800/80 opacity-40'}`}>
                      <Trophy className={`w-12 h-12 ${resolvedKnockout.champion ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]' : 'text-slate-600'}`} />
                    </div>
                    
                    <div className="space-y-1.5 relative z-10 w-full">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#EAB308] font-bold block">
                        TOURNAMENT CHAMPION
                      </span>
                      <div className="h-10 flex items-center justify-center">
                        {resolvedKnockout.champion ? (
                          <span className="text-base font-black tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-amber-200 to-yellow-500 uppercase truncate px-2 block max-w-full">
                            🏆 {resolvedKnockout.champion.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 italic">
                            Waiting for results...
                          </span>
                        )}
                      </div>
                      
                      {resolvedKnockout.champion && (
                        <div className="pt-2 border-t border-slate-850/60">
                          <p className="text-[8px] font-mono text-slate-500 uppercase">
                            REPRESENTING
                          </p>
                          <p className="text-[10px] font-sans font-bold text-slate-300 truncate">
                            {resolvedKnockout.champion.source}
                          </p>
                        </div>
                      )}
                    </div>
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
              <span className="text-4xl font-extrabold font-mono text-fuchsia-400">
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

          <div className="glass-pane p-6 rounded-2xl border border-fuchsia-500/10 flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-fuchsia-500/5 rounded-full blur-2xl" />
            <span className="text-xs text-slate-400 font-mono uppercase tracking-widest">
              🎮 Active Tournament Stage
            </span>
            <div className="flex items-baseline gap-2 mt-4 relative z-10">
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-sky-400 truncate max-w-full">
                {liveStats.stageName}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 relative z-10">
              UDSF NSSCE Live eFOOTBALL Arena.
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
                      Organized by UDSF NSSCE
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
                <span className="p-1 px-2 bg-fuchsia-500 rounded text-slate-950 text-xs">⚽</span>
                CORNER 26' eFOOTBALL
              </div>
              <p className="text-xs text-slate-500 tracking-wide font-mono leading-relaxed">
                The premier collegiate eFOOTBALL tournament platform. Designed with passion for competitive gamers & football enthusiasts alike.
              </p>
            </div>

            {/* Central Col */}
            <div className="space-y-2">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-widest font-extrabold block">
                ORGANIZERS & GUILD
              </span>
              <div className="text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-white">UDSF NSSCE</p>
                <p className="text-slate-500">NSS College of Engineering, Palakkad</p>
                <p className="font-semibold text-sky-400 mt-1">eFOOTBALL Tournament</p>
              </div>
            </div>

            {/* Right Col */}
            <div className="space-y-2">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-widest font-extrabold block">
                TOURNAMENT LINKS
              </span>
              <div className="text-xs font-mono space-y-1.5">
                <a href="#hero" className="block text-slate-400 hover:text-fuchsia-400 transition-colors">➔ Welcome Deck</a>
                <a href="#standings" className="block text-slate-400 hover:text-fuchsia-400 transition-colors">➔ Interactive Standings</a>
                <a href="#bracket" className="block text-slate-400 hover:text-fuchsia-400 transition-colors">➔ Knockout Grid Bracket</a>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-900"></div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
            <p>
              © 2026 CORNER 26'. All rights preserved. Made with ❤️ by <a href="https://github.com/abhinav-v-r" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-fuchsia-400 transition-colors underline decoration-fuchsia-400/40 hover:decoration-fuchsia-400 font-bold">Abhinav</a>.
            </p>
            <div className="flex items-center gap-4 text-[11px]">
              <span>UDSF • NSSCE</span>
              <span>•</span>
            </div>
          </div>
        </div>
      </footer>

      {/* 11. MATCH CONSOLE SCORE EDITOR MODAL */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" id="score-editor-modal">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-850 flex items-center justify-between">
              <span className="font-extrabold tracking-wider text-xs font-mono text-slate-400 flex items-center gap-2">
                <Settings className="w-4 h-4 text-fuchsia-400 animate-spin" />
                {editingMatch.isKnockout ? 'KNOCKOUT CONSOLE' : 'GROUP CONSOLE'}
              </span>
              <button 
                onClick={() => setEditingMatch(null)}
                className="text-slate-500 hover:text-white transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="p-6 space-y-6">
              
              {/* Score Input Matchup header */}
              <div className="text-center space-y-1">
                <span className="text-[10px] font-mono text-[#00f0ff] uppercase tracking-widest font-extrabold block">
                  Active Fixture Score Entry
                </span>
                <div className="flex items-center justify-between gap-4 py-2">
                  <div className="flex-1 text-right">
                    <p className="text-sm font-black text-white truncate">{editingMatch.team1Name}</p>
                    <span className="text-[9px] font-mono text-slate-500">HOMETEAM</span>
                  </div>
                  <div className="px-3 py-1 bg-slate-950 border border-slate-850 rounded-lg text-xs font-mono text-slate-400 font-bold shrink-0">
                    VS
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-black text-white truncate">{editingMatch.team2Name}</p>
                    <span className="text-[9px] font-mono text-slate-500">AWAYTEAM</span>
                  </div>
                </div>
              </div>

              {/* Played status toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950/50 border border-slate-850/60 rounded-2xl mx-1">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold block text-slate-100">Match Completed</span>
                  <span className="text-[10px] text-slate-500 font-mono">Has this fixture been played?</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editingMatch.completed} 
                    onChange={(e) => setEditingMatch({ ...editingMatch, completed: e.target.checked, team1Score: e.target.checked ? (editingMatch.team1Score ?? 0) : null, team2Score: e.target.checked ? (editingMatch.team2Score ?? 0) : null })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-gray-305 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00E536] peer-checked:after:bg-slate-950"></div>
                </label>
              </div>

              {/* Interactive Score Steppers */}
              {editingMatch.completed && (
                <div className="space-y-4">
                  
                  {/* Goals inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Team 1 Score */}
                    <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-850/50 space-y-2 flex flex-col items-center">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold">Goals Home</span>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            const cur = editingMatch.team1Score ?? 0;
                            setEditingMatch({ ...editingMatch, team1Score: Math.max(0, cur - 1) });
                          }}
                          className="w-8 h-8 rounded-full bg-slate-900 border border-slate-850 hover:bg-slate-800 flex items-center justify-center text-sm font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <input 
                          type="number"
                          value={editingMatch.team1Score ?? 0}
                          min="0"
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setEditingMatch({ ...editingMatch, team1Score: Math.max(0, val) });
                          }}
                          className="w-12 text-center bg-transparent border-b border-slate-800 text-lg font-extrabold font-mono text-white focus:border-fuchsia-500 focus:outline-none"
                        />
                        <button 
                          onClick={() => {
                            const cur = editingMatch.team1Score ?? 0;
                            setEditingMatch({ ...editingMatch, team1Score: cur + 1 });
                          }}
                          className="w-8 h-8 rounded-full bg-slate-900 border border-slate-850 hover:bg-slate-800 flex items-center justify-center text-sm font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Team 2 Score */}
                    <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-850/50 space-y-2 flex flex-col items-center">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold">Goals Away</span>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            const cur = editingMatch.team2Score ?? 0;
                            setEditingMatch({ ...editingMatch, team2Score: Math.max(0, cur - 1) });
                          }}
                          className="w-8 h-8 rounded-full bg-slate-900 border border-slate-850 hover:bg-slate-800 flex items-center justify-center text-sm font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <input 
                          type="number"
                          value={editingMatch.team2Score ?? 0}
                          min="0"
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setEditingMatch({ ...editingMatch, team2Score: Math.max(0, val) });
                          }}
                          className="w-12 text-center bg-transparent border-b border-slate-800 text-lg font-extrabold font-mono text-white focus:border-fuchsia-500 focus:outline-none"
                        />
                        <button 
                          onClick={() => {
                            const cur = editingMatch.team2Score ?? 0;
                            setEditingMatch({ ...editingMatch, team2Score: cur + 1 });
                          }}
                          className="w-8 h-8 rounded-full bg-slate-900 border border-slate-850 hover:bg-slate-800 flex items-center justify-center text-sm font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Penalty Shootout section (only for knockout draw match) */}
                  {editingMatch.isKnockout && (editingMatch.team1Score ?? 0) === (editingMatch.team2Score ?? 0) && (
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-3">
                      <div className="text-center">
                        <span className="text-[10px] font-mono text-amber-400 font-extrabold uppercase tracking-widest block">
                          ⚡ PENALTY SHOOTOUT REQUIRED
                        </span>
                        <p className="text-[9px] text-slate-400 mt-1">Knockout stages cannot end in a draw. Register shootout scores to resolve winner.</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 items-center">
                        <div className="flex flex-col items-center space-y-1">
                          <label className="text-[8px] font-mono text-slate-500 font-bold uppercase">Home Pens</label>
                          <input 
                            type="number"
                            min="0"
                            value={editingMatch.penalties1 ?? 0}
                            onChange={(e) => setEditingMatch({ ...editingMatch, penalties1: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-16 text-center bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm font-bold font-mono text-amber-400"
                          />
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                          <label className="text-[8px] font-mono text-slate-500 font-bold uppercase">Away Pens</label>
                          <input 
                            type="number"
                            min="0"
                            value={editingMatch.penalties2 ?? 0}
                            onChange={(e) => setEditingMatch({ ...editingMatch, penalties2: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-16 text-center bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm font-bold font-mono text-amber-400"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Status information if unplayed */}
              {!editingMatch.completed && (
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850 text-center text-xs text-slate-500 tracking-wide font-mono leading-relaxed">
                  ⏸ Match is marked as <span className="text-rose-400 font-bold">Upcoming / Pending</span>. Saving will clear previous scores, resetting the standing calculations and parent brackets.
                </div>
              )}

              {/* CTA buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="w-full py-2.5 bg-slate-950 border border-slate-850 hover:bg-slate-900 rounded-xl text-xs font-mono font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveMatch(
                      editingMatch.id,
                      editingMatch.isKnockout,
                      editingMatch.team1Score,
                      editingMatch.team2Score,
                      editingMatch.completed,
                      editingMatch.penalties1,
                      editingMatch.penalties2
                    );
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-[#ee005f] to-[#00f0ff] hover:from-[#f31a72] hover:to-[#21f3ff] text-slate-950 font-black shadow-[0_0_20px_rgba(238,0,95,0.2)] transition-all cursor-pointer"
                >
                  Save Result
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// ======================== COMPONENT CODE BLOCKS ========================

interface GroupStandingCardProps {
  key?: React.Key | string;
  groupId: string;
  standings: Standing[];
  groupMatches: Match[];
}

function GroupStandingTableCard({ groupId, standings, groupMatches }: GroupStandingCardProps) {
  // Check if group is fully completed
  const groupMatchesFiltered = groupMatches.filter(m => m.group === groupId);
  const isGroupCompleted = groupMatchesFiltered.length > 0 && groupMatchesFiltered.every(m => m.completed);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/10 overflow-hidden backdrop-blur-md">
      {/* Group Header Title */}
      <div className="px-5 py-3 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-slate-850 flex items-center justify-between">
        <span className="font-extrabold tracking-wide text-sm text-slate-100 flex items-center gap-1.5 font-sans">
          <span className="w-1.5 h-3 bg-fuchsia-400 rounded-full inline-block"></span>
          GROUP {groupId}
        </span>
        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${isGroupCompleted ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20'}`}>
          {isGroupCompleted ? 'COMPLETED' : 'PLAYING'}
        </span>
      </div>

      {/* Standing header list */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-850 bg-slate-950/20 text-[10px] font-mono text-slate-400 uppercase font-extrabold font-sans">
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
              const isQualified = idx < 2 && isGroupCompleted; // Top 2 qualify ONLY once group is completed
              return (
                <tr 
                  key={s.team.id}
                  className={`border-b border-slate-900/60 text-xs font-mono transition-colors ${
                    isQualified 
                      ? 'bg-fuchsia-500/[0.015] hover:bg-fuchsia-500/[0.03]' 
                      : 'hover:bg-slate-900/40'
                  }`}
                >
                  {/* Position */}
                  <td className="py-2.5 px-3 text-center">
                    <span 
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-md font-bold text-[10px] ${
                        isQualified 
                          ? 'bg-fuchsia-500 text-slate-950 font-black' 
                          : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </td>

                  {/* Team Name */}
                  <td className="py-2.5 px-2 font-bold max-w-[125px] truncate" title={s.team.name}>
                    <div className="flex flex-col">
                      <span className="text-slate-100 font-sans tracking-wide leading-tight text-xs truncate">
                        {s.team.name}
                      </span>
                      {isQualified && (
                        <span className="text-[9px] text-fuchsia-400/90 tracking-widest uppercase font-mono mt-0.5 transform scale-90 origin-left">
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
                    s.gd > 0 ? 'text-fuchsia-400' : s.gd < 0 ? 'text-red-400' : 'text-slate-400'
                  }`}>
                    {s.gd > 0 ? `+${s.gd}` : s.gd}
                  </td>
                  {/* Points */}
                  <td className={`py-2.5 px-3 text-center font-extrabold text-sm ${
                    isQualified ? 'text-fuchsia-400 bg-fuchsia-500/[0.03]' : 'text-slate-200 bg-slate-950/20'
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
    team1Placeholder?: string;
    team2Placeholder?: string;
    team1Score: number | null;
    team2Score: number | null;
    penalties1?: number | null;
    penalties2?: number | null;
    completed: boolean;
    winner: { id: number; name: string; shortName: string; source: string; color: string } | null;
    isTied: boolean;
  };
  adminMode?: boolean;
  onEdit?: () => void;
}

function BracketMatchCard({ match, adminMode, onEdit }: BracketMatchProps) {
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
        <span className={match.completed ? 'text-[#00E536]' : 'text-slate-500'}>
          {match.completed ? 'Completed' : 'PENDING'}
        </span>
      </div>

      <div className="p-3 space-y-2">
        {/* TEAM 1 */}
        <div className={`flex items-center justify-between p-2 rounded-lg ${isT1Winner ? 'bg-fuchsia-500/5 border border-fuchsia-500/20' : 'bg-slate-950/40 border border-transparent'}`}>
          <div className="space-y-0.5 max-w-[170px] truncate">
            {match.team1 ? (
              <>
                <span className={`block text-xs font-bold truncate leading-tight ${isT1Winner ? 'text-white' : match.completed ? 'text-slate-500' : 'text-slate-200'}`}>
                  {match.team1.name}
                </span>
                <span className="text-[8px] font-mono text-slate-500 block leading-none truncate">
                  {match.team1.source}
                </span>
              </>
            ) : (
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-slate-450 block font-bold leading-none truncate">{match.team1Placeholder || 'TBD'}</span>
                <span className="text-[8px] font-mono text-slate-500 block leading-none">Slot Pending</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {match.isTied && match.penalties1 !== undefined && match.penalties1 !== null && (
              <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-1 py-0.5 rounded" title="Penalties score">
                ({match.penalties1})
              </span>
            )}
            <span className={`w-8 text-center text-sm font-extrabold font-mono ${isT1Winner ? 'text-[#00E536]' : 'text-slate-200'}`}>
              {match.completed && match.team1Score !== null ? match.team1Score : '-'}
            </span>
          </div>
        </div>

        {/* TEAM 2 */}
        <div className={`flex items-center justify-between p-2 rounded-lg ${isT2Winner ? 'bg-fuchsia-500/5 border border-fuchsia-500/20' : 'bg-slate-950/40 border border-transparent'}`}>
          <div className="space-y-0.5 max-w-[170px] truncate">
            {match.team2 ? (
              <>
                <span className={`block text-xs font-bold truncate leading-tight ${isT2Winner ? 'text-white' : match.completed ? 'text-slate-500' : 'text-slate-200'}`}>
                  {match.team2.name}
                </span>
                <span className="text-[8px] font-mono text-slate-500 block leading-none truncate">
                  {match.team2.source}
                </span>
              </>
            ) : (
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-slate-455 block font-bold leading-none truncate">{match.team2Placeholder || 'TBD'}</span>
                <span className="text-[8px] font-mono text-slate-500 block leading-none">Slot Pending</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {match.isTied && match.penalties2 !== undefined && match.penalties2 !== null && (
              <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-1 py-0.5 rounded" title="Penalties score">
                ({match.penalties2})
              </span>
            )}
            <span className={`w-8 text-center text-sm font-extrabold font-mono ${isT2Winner ? 'text-[#00E536]' : 'text-slate-200'}`}>
              {match.completed && match.team2Score !== null ? match.team2Score : '-'}
            </span>
          </div>
        </div>

        {/* Inline edit button for knockout matches */}
        {adminMode && onEdit && (
          <button
            onClick={onEdit}
            className="w-full mt-2 py-1.5 bg-rose-500/10 border border-rose-500/35 rounded-lg text-[10px] font-mono font-bold text-rose-400 hover:bg-[#ee005f] hover:border-[#ee005f] hover:text-slate-920 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-3 h-3" />
            UPDATE BRACKET
          </button>
        )}

      </div>
    </div>
  );
}
