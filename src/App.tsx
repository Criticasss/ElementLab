import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import GameConceptCatalog from "./components/GameConceptCatalog";
import PlayablePrototype from "./components/PlayablePrototype";
import AICoDesigner from "./components/AICoDesigner";
import AccountManager, { Account } from "./components/AccountManager";
import TutorialOverlay from "./components/TutorialOverlay";
import AlchemicalEclipseEvent from "./components/AlchemicalEclipseEvent";
import AdminPanel from "./components/AdminPanel";
import { ElementSymbol } from "./types";
import { toggleSound, playSound } from "./utils/audio";
import {
  Sparkles,
  HelpCircle,
  Volume2,
  VolumeX,
  Layers,
  Zap,
  BookOpen,
  X,
  Terminal,
  Play,
  ShieldAlert
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"prototype" | "catalog" | "designer">("prototype");
  const [customUnlockedCards, setCustomUnlockedCards] = useState<ElementSymbol[]>([]);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [showHowToPlay, setShowHowToPlay] = useState(true);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState<string>(() => {
    try {
      return localStorage.getItem("alquimia_global_theme") || "default";
    } catch {
      return "default";
    }
  });

  const [globalBroadcast, setGlobalBroadcast] = useState<{
    message: string;
    author: string;
    timestamp: number;
  } | null>(null);

  useEffect(() => {
    // 1. Subscribe to Firestore broadcasts in real-time
    const docRef = doc(db, "broadcasts", "global");
    const unsubscribeBroadcast = onSnapshot(docRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setGlobalBroadcast({
            message: data.message || "",
            author: data.author || "Administrador",
            timestamp: data.timestamp || Date.now()
          });
        } else {
          setGlobalBroadcast(null);
        }
      } catch (e) {
        console.error("Error reading broadcast data:", e);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "broadcasts/global");
    });

    // 2. Storage event listener for local themes or older storage sync
    const handleStorageChange = () => {
      try {
        const savedTheme = localStorage.getItem("alquimia_global_theme");
        setActiveTheme(savedTheme || "default");
      } catch (e) {
        // Safe play
      }
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("local-broadcast-update", handleStorageChange);

    return () => {
      unsubscribeBroadcast();
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-broadcast-update", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (!globalBroadcast) return;
    const elapsed = Date.now() - globalBroadcast.timestamp;
    const remaining = 5000 - elapsed;
    if (remaining <= 0) {
      setGlobalBroadcast(null);
      return;
    }
    const timer = setTimeout(() => {
      setGlobalBroadcast(null);
    }, remaining);
    return () => clearTimeout(timer);
  }, [globalBroadcast]);

  const handleUnlockCard = (newCard: ElementSymbol) => {
    setCustomUnlockedCards((prev) => [...prev, newCard]);
  };

  const handleToggleSound = () => {
    const nextVal = toggleSound();
    setIsSoundOn(nextVal);
    if (nextVal) {
      playSound("click");
    }
  };

  const handleTabChange = (tab: "prototype" | "catalog" | "designer") => {
    playSound("click");
    setActiveTab(tab);
  };

  const handleAccountChange = (acc: Account | null) => {
    setActiveAccount(acc);
  };

  const handleUpdateHighScore = async (finalScore: number) => {
    if (!activeAccount) return;
    if (finalScore > activeAccount.highscore) {
      try {
        const docRef = doc(db, "accounts", activeAccount.username);
        await updateDoc(docRef, { highscore: finalScore });
        setActiveAccount({ ...activeAccount, highscore: finalScore });
      } catch (e) {
        console.error("Error updating highscore:", e);
      }
    }
  };

  const handleUpdateAccountData = async (updatedFields: Partial<Account>) => {
    if (!activeAccount) return;
    try {
      const docRef = doc(db, "accounts", activeAccount.username);
      await updateDoc(docRef, updatedFields);
      setActiveAccount((prev) => (prev ? { ...prev, ...updatedFields } : null));
    } catch (e) {
      console.error("Error updating account data:", e);
    }
  };

  const handleRecordGamePlay = async () => {
    if (!activeAccount) return;
    try {
      const docRef = doc(db, "accounts", activeAccount.username);
      const nextGamesPlayed = activeAccount.gamesPlayed + 1;
      await updateDoc(docRef, { gamesPlayed: nextGamesPlayed });
      setActiveAccount({ ...activeAccount, gamesPlayed: nextGamesPlayed });
    } catch (e) {
      console.error("Error recording gameplay:", e);
    }
  };

  const themeConfig = {
    default: {
      wrapperBg: "bg-[#111827] text-slate-100",
      glow1: "bg-pink-500/5",
      glow2: "bg-cyan-500/5",
      selectionColor: "selection:bg-[#F43F5E] selection:text-white"
    },
    selva: {
      wrapperBg: "bg-[#021f14] text-emerald-100",
      glow1: "bg-emerald-500/10",
      glow2: "bg-amber-400/10",
      selectionColor: "selection:bg-emerald-500 selection:text-black"
    },
    mar: {
      wrapperBg: "bg-[#021325] text-cyan-200",
      glow1: "bg-cyan-400/10",
      glow2: "bg-teal-500/10",
      selectionColor: "selection:bg-cyan-400 selection:text-black"
    },
    infierno: {
      wrapperBg: "bg-[#1c0202] text-red-200",
      glow1: "bg-red-600/10",
      glow2: "bg-amber-600/10",
      selectionColor: "selection:bg-red-500 selection:text-white"
    },
    cyberpunk: {
      wrapperBg: "bg-[#07070a] text-[#a5f3fc]",
      glow1: "bg-[#EC4899]/10",
      glow2: "bg-[#22C55E]/10",
      selectionColor: "selection:bg-[#EC4899] selection:text-black"
    }
  };

  const currentTheme = themeConfig[activeTheme as keyof typeof themeConfig] || themeConfig.default;

  const renderThemeAtmosphericEffects = () => {
    switch (activeTheme) {
      case "selva":
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute left-[10%] text-emerald-400/30 text-2xl animate-rise-up-slow" style={{ animationDelay: "0s" }}>🍃</div>
            <div className="absolute left-[30%] text-amber-500/20 text-3xl animate-rise-up-medium" style={{ animationDelay: "2s" }}>🍂</div>
            <div className="absolute left-[55%] text-emerald-500/25 text-xl animate-rise-up-fast" style={{ animationDelay: "1s" }}>🌱</div>
            <div className="absolute left-[70%] text-green-300/30 text-2xl animate-rise-up-slow" style={{ animationDelay: "3s" }}>🌿</div>
            <div className="absolute left-[85%] text-emerald-400/20 text-4xl animate-rise-up-medium" style={{ animationDelay: "5s" }}>🍁</div>
            <div className="absolute left-[45%] text-emerald-500/15 text-2xl animate-rise-up-fast" style={{ animationDelay: "4s" }}>🍀</div>
          </div>
        );
      case "mar":
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute left-[15%] text-cyan-400/25 text-2xl animate-rise-up-slow" style={{ animationDelay: "0s" }}>🫧</div>
            <div className="absolute left-[25%] text-teal-400/20 text-3xl animate-rise-up-medium" style={{ animationDelay: "3s" }}>💧</div>
            <div className="absolute left-[40%] text-cyan-300/20 text-xl animate-rise-up-fast" style={{ animationDelay: "1.5s" }}>🫧</div>
            <div className="absolute left-[65%] text-blue-400/25 text-4xl animate-rise-up-slow" style={{ animationDelay: "4s" }}>🫧</div>
            <div className="absolute left-[80%] text-cyan-400/20 text-2xl animate-rise-up-medium" style={{ animationDelay: "2s" }}>💧</div>
            <div className="absolute left-[90%] text-sky-300/15 text-3xl animate-rise-up-fast" style={{ animationDelay: "5s" }}>🫧</div>
          </div>
        );
      case "infierno":
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute left-[12%] text-red-500/20 text-3xl animate-rise-up-slow" style={{ animationDelay: "0s" }}>🔥</div>
            <div className="absolute left-[28%] text-amber-500/25 text-xl animate-rise-up-medium" style={{ animationDelay: "2.5s" }}>✨</div>
            <div className="absolute left-[48%] text-red-600/15 text-4xl animate-rise-up-fast" style={{ animationDelay: "1s" }}>🌋</div>
            <div className="absolute left-[68%] text-orange-500/25 text-2xl animate-rise-up-slow" style={{ animationDelay: "3.5s" }}>🔥</div>
            <div className="absolute left-[83%] text-amber-400/20 text-xl animate-rise-up-medium" style={{ animationDelay: "5s" }}>✨</div>
            <div className="absolute left-[58%] text-red-500/10 text-3xl animate-rise-up-fast" style={{ animationDelay: "4.2s" }}>💥</div>
          </div>
        );
      case "cyberpunk":
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute left-[8%] text-[#EC4899]/25 text-xl animate-rise-up-slow" style={{ animationDelay: "0s" }}>👾</div>
            <div className="absolute left-[24%] text-[#22C55E]/20 text-2xl animate-rise-up-medium" style={{ animationDelay: "2s" }}>⚡</div>
            <div className="absolute left-[46%] text-[#a5f3fc]/25 text-3xl animate-rise-up-fast" style={{ animationDelay: "1s" }}>🧬</div>
            <div className="absolute left-[62%] text-[#EC4899]/15 text-2xl animate-rise-up-slow" style={{ animationDelay: "3s" }}>✨</div>
            <div className="absolute left-[78%] text-[#22C55E]/25 text-xl animate-rise-up-medium" style={{ animationDelay: "5s" }}>👾</div>
            <div className="absolute left-[92%] text-[#EC4899]/10 text-3xl animate-rise-up-fast" style={{ animationDelay: "4s" }}>⚡</div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen text-slate-100 font-sans relative overflow-x-hidden flex flex-col justify-between transition-colors duration-1000 ${currentTheme.wrapperBg} ${currentTheme.selectionColor}`}>
      {/* Background Gradients */}
      <div className={`absolute top-0 left-1/4 w-[35rem] h-[35rem] rounded-full filter blur-[100px] pointer-events-none transition-colors duration-1000 ${currentTheme.glow1}`}></div>
      <div className={`absolute bottom-10 right-1/4 w-[30rem] h-[30rem] rounded-full filter blur-[100px] pointer-events-none transition-colors duration-1000 ${currentTheme.glow2}`}></div>

      {/* Floating Elements Atmospheric Overlays */}
      {renderThemeAtmosphericEffects()}

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-8 flex-1 flex flex-col gap-8 relative z-10">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes globalMarquee {
            0% { transform: translateX(60%); }
            100% { transform: translateX(-100%); }
          }
          .animate-global-marquee {
            animation: globalMarquee 30s linear infinite;
          }
          @keyframes riseUp {
            0% { transform: translateY(110vh) rotate(0deg); opacity: 0; }
            10% { opacity: 0.6; }
            90% { opacity: 0.6; }
            100% { transform: translateY(-20vh) rotate(360deg); opacity: 0; }
          }
          .animate-rise-up-slow {
            animation: riseUp 14s linear infinite;
          }
          .animate-rise-up-medium {
            animation: riseUp 9s linear infinite;
          }
          .animate-rise-up-fast {
            animation: riseUp 6s linear infinite;
          }
        `}} />

        {/* Real-time Global Admin Broadcast Banner (Fixed floating at top center with clean animations) */}
        <AnimatePresence>
          {globalBroadcast && (
            <motion.div
              initial={{ y: -80, x: "-50%", opacity: 0 }}
              animate={{ y: 0, x: "-50%", opacity: 1 }}
              exit={{ y: -80, x: "-50%", opacity: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 120 }}
              className="fixed top-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-xl bg-red-650 border-4 border-black text-white px-5 py-3 rounded-[2rem] flex items-center justify-between gap-4 shadow-[8px_8px_0px_rgba(0,0,0,0.6)] overflow-hidden select-none font-mono"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <span className="animate-pulse shrink-0">📢</span>
                <p className="text-xs font-black uppercase tracking-wider truncate">
                  <span className="text-yellow-300">{globalBroadcast.author}</span>: "{globalBroadcast.message}"
                </p>
              </div>

              <button
                onClick={() => {
                  playSound("click");
                  setGlobalBroadcast(null);
                }}
                className="p-1.5 rounded-xl bg-black/30 hover:bg-black/50 text-white border-2 border-black shrink-0 cursor-pointer active:translate-y-0.5"
                title="Ocultar transmisión"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation & Header */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end pb-8 border-b-4 border-black gap-6">
          <div className="max-w-2xl">
            <h1 className="text-4.5xl sm:text-6xl font-black text-white uppercase tracking-tighter leading-none select-none">
              Element<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-yellow-400">Lab</span>
            </h1>
            <p className="text-gray-400 mt-3 text-sm sm:text-lg font-medium leading-relaxed font-sans">
              Combina elementos sagrados y desata poderosas fusiones para batir tus deudas y cuotas de oro.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto lg:justify-end">
            {/* White status badge with custom neon shadow */}
            <div className="bg-white px-5 py-2.5 rounded-full text-black font-black text-[11px] sm:text-xs tracking-widest uppercase border-4 border-black shadow-[4px_4px_0px_#EC4899] select-none">
              LABORATORIO ABIERTO 🧪
            </div>

            {/* Admin Keypad Trigger Button */}
            <button
              id="btn-admin-trigger"
              onClick={() => {
                playSound("click");
                setIsAdminOpen(true);
              }}
              className="px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 border-4 border-black rounded-2xl text-xs font-black text-white tracking-widest uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:shadow-[0px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 text-white animate-pulse" /> ADMIN
            </button>

            {/* Guide Button */}
            <button
              id="btn-guide-trigger"
              onClick={() => {
                playSound("click");
                setShowHowToPlay(true);
              }}
              className="px-4 py-2 bg-[#1f2937] hover:bg-slate-800 border-4 border-black rounded-2xl text-xs font-bold text-white tracking-widest uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:shadow-[0px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 shrink-0" /> Guía
            </button>

            {/* Sound Toggle */}
            <button
              onClick={handleToggleSound}
              className="p-2.5 bg-[#1f2937] hover:bg-slate-800 border-4 border-black rounded-2xl text-xs font-bold text-white tracking-widest uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:shadow-[0px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer shrink-0"
              title={isSoundOn ? "Silenciar sonido" : "Activar sonido"}
            >
              {isSoundOn ? <Volume2 className="w-4 h-4 text-yellow-400 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Dynamic Instructional Alert */}
        {showHowToPlay && (
          <div className="p-6 sm:p-8 bg-[#0EA5E9] text-white border-4 border-black rounded-[2rem] shadow-[10px_10px_0px_rgba(0,0,0,0.3)] relative animate-fade-in flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <button
              onClick={() => {
                playSound("click");
                setShowHowToPlay(false);
              }}
              className="absolute top-4 right-4 text-white/85 hover:text-white transition-colors cursor-pointer p-1 bg-black/20 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white text-[#0EA5E9] border-4 border-black flex items-center justify-center shrink-0 shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <div className="max-w-3xl font-sans text-left">
                <h3 className="font-extrabold text-2xl uppercase tracking-tight italic">¿CÓMO SE JUEGA A ESTA ALQUIMIA?</h3>
                <p className="text-sm text-white/95 mt-2 leading-relaxed font-medium">
                  1. <strong className="underline decoration-yellow-300 decoration-2">Revisa las recetas</strong> en la pestaña <strong className="font-extrabold">2. Libro de Fórmulas</strong> para dominar las combinaciones y sus suculentos bonos.<br />
                  2. <strong className="underline decoration-yellow-300 decoration-2">Coloca elementos</strong> de tu mano en la pestaña <strong className="font-extrabold">1. Rejilla Alquímica</strong> (tablero 3x3) de forma adyacente para detonar fusiones espontáneas y ganar oro.<br />
                  3. <strong className="underline decoration-yellow-300 decoration-2">Crea tus propias cartas</strong> en la pestaña <strong className="font-extrabold">3. Alquimia de IA</strong> usando tus ideas más ingeniosas e inyéctalas directamente al tablero en tiempo real.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                playSound("click");
                setShowHowToPlay(false);
              }}
              className="shrink-0 text-sm px-6 py-3 bg-white text-black font-black uppercase tracking-wider rounded-2xl border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all cursor-pointer w-full md:w-auto text-center"
            >
              ¡ENTENDIDO, JUGAR!
            </button>
          </div>
        )}

        {/* USER ACCOUNT PERSISTENCE & REGISTRATION */}
        <AccountManager onAccountChange={handleAccountChange} activeAccount={activeAccount} />

        {activeAccount ? (
          <>
            {/* MAIN NAVIGATION TABS */}
            <div className="flex flex-col sm:flex-row bg-[#111827] p-2 rounded-[2rem] border-4 border-black max-w-2xl w-full font-mono text-xs gap-2 select-none">
              <button
                id="tab-btn-prototype"
                onClick={() => handleTabChange("prototype")}
                className={`flex-1 py-3.5 px-4 rounded-2xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === "prototype"
                    ? "bg-[#F43F5E] text-white border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] scale-[1.03]"
                    : "text-gray-400 bg-slate-900/30 border-4 border-transparent hover:border-black/40 hover:text-white"
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" /> 1. Rejilla Alquímica
              </button>
              <button
                id="tab-btn-catalog"
                onClick={() => handleTabChange("catalog")}
                className={`flex-1 py-3.5 px-4 rounded-2xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === "catalog"
                    ? "bg-[#F59E0B] text-black border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] scale-[1.03]"
                    : "text-gray-400 bg-slate-900/30 border-4 border-transparent hover:border-black/40 hover:text-white"
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" /> 2. Libro de Fórmulas
              </button>
              <button
                id="tab-btn-designer"
                onClick={() => handleTabChange("designer")}
                className={`flex-1 py-3.5 px-4 rounded-2xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === "designer"
                    ? "bg-[#10B981] text-white border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] scale-[1.03]"
                    : "text-gray-400 bg-slate-900/30 border-4 border-transparent hover:border-black/40 hover:text-white"
                }`}
              >
                <Zap className="w-4 h-4 shrink-0" /> 3. Alquimia de IA
              </button>
            </div>

            {/* ACTIVE MODULE CONTAINER */}
            <div className="flex-1 bg-[#1f2937] border-4 border-black p-6 sm:p-8 rounded-[2.5rem] shadow-[12px_12px_0px_rgba(0,0,0,0.35)] relative overflow-hidden">
              {activeTab === "prototype" && (
                <PlayablePrototype
                  customUnlockedCards={customUnlockedCards}
                  activeAccount={activeAccount}
                  onUpdateScore={handleUpdateHighScore}
                  onRecordGamePlay={handleRecordGamePlay}
                  onUpdateAccountData={handleUpdateAccountData}
                />
              )}

              {activeTab === "catalog" && (
                <GameConceptCatalog onPlayDemo={() => handleTabChange("prototype")} />
              )}

              {activeTab === "designer" && (
                <AICoDesigner
                  onUnlockCustomCard={handleUnlockCard}
                  gameContext={{
                    score: 0,
                    round: 1,
                    quota: 30,
                  }}
                />
              )}
            </div>
          </>
        ) : (
          <div className="w-full flex-1 max-w-4xl bg-[#111827] border-4 border-dashed border-black/80 rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center gap-4 shadow-[8px_8px_0px_rgba(0,0,0,0.4)] select-none">
            <span className="text-6xl animate-bounce">🔒</span>
            <h3 className="text-2xl font-black text-amber-400 uppercase tracking-tight italic mt-2">
              🔮 LABORATORIO BLOQUEADO • SIN ALQUIMISTA
            </h3>
            <p className="text-sm font-semibold text-gray-400 max-w-lg leading-relaxed">
              Debes registrar un nuevo apodo o seleccionar uno de la sección de <strong className="text-white">"Cuentas Guardadas"</strong> arriba para desbloquear la Rejilla Alquímica, abrir el Libro de Fórmulas de fusión y utilizar el Forjador Inteligente de IA.
            </p>
          </div>
        )}

      </div>

      {/* Dynamic step-by-step Tutorial Overlay */}
      {activeAccount && !activeAccount.tutorialCompleted && (
        <TutorialOverlay
          activeUsername={activeAccount.username}
          onComplete={() => handleUpdateAccountData({ tutorialCompleted: true })}
        />
      )}

      {/* Real-time Global Alchemical Eclipse Mode Overlay */}
      <AlchemicalEclipseEvent />

      {/* Admin Control Center Modal */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        activeAccount={activeAccount}
        onUpdateAccountData={handleUpdateAccountData}
        activeTheme={activeTheme}
        onThemeChange={(newTheme) => {
          setActiveTheme(newTheme);
          try {
            localStorage.setItem("alquimia_global_theme", newTheme);
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new CustomEvent("local-broadcast-update"));
          } catch (e) {
            console.error(e);
          }
        }}
      />

      {/* Footer */}
      <footer className="w-full border-t border-slate-900/60 bg-slate-950/40 py-4 font-mono text-[10px] text-gray-400 text-center relative z-10 select-none pb-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5 text-gray-500" />
            <span>HECHO POR IZAN • 2026</span>
          </div>
          <div>
            <span>2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
