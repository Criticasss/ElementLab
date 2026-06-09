import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { doc, onSnapshot, updateDoc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import GameConceptCatalog from "./components/GameConceptCatalog";
import PlayablePrototype from "./components/PlayablePrototype";
import AICoDesigner from "./components/AICoDesigner";
import AccountManager, { Account } from "./components/AccountManager";
import AchievementsPanel from "./components/AchievementsPanel";
import TutorialOverlay from "./components/TutorialOverlay";
import AlchemicalEclipseEvent from "./components/AlchemicalEclipseEvent";
import AdminPanel from "./components/AdminPanel";
import AnnouncementsModal from "./components/AnnouncementsModal";
import { ElementSymbol } from "./types";
import { toggleSound, playSound, startBackgroundMusic, stopBackgroundMusic } from "./utils/audio";
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
  ShieldAlert,
  Wrench,
  Lock,
  Award,
  Megaphone,
  ExternalLink
} from "lucide-react";

// Minimalist animated alchemical brand logo
function MinimalistLogo() {
  return (
    <div className="relative w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center select-none scale-100 hover:scale-[1.05] transition-all duration-300 shrink-0">
      {/* Outer spinning ring representing the cosmic wheel */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/35"
      />
      {/* Middle pulsing counter-rotating track */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute w-[80%] h-[80%] rounded-full border border-pink-500/25"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22D3EE]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-pink-500 shadow-[0_0_8px_#EC4899]" />
      </motion.div>
      {/* Inner sacred geometry: fire/water interlocking triangles */}
      <div className="absolute w-[50%] h-[50%] flex items-center justify-center">
        {/* Fire Triangle (pointing up, warm amber) */}
        <motion.div
          animate={{ scale: [1, 1.08, 1], rotate: [0, 4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)] fill-none stroke-current stroke-[6] stroke-linejoin-round">
            <polygon points="50,15 88,85 12,85" />
          </svg>
        </motion.div>
        {/* Water Triangle (pointing down, cool magenta) */}
        <motion.div
          animate={{ scale: [1, 1.12, 1], rotate: [0, -4, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] text-pink-500 drop-shadow-[0_0_4px_rgba(236,72,153,0.5)] fill-none stroke-current stroke-[6] stroke-linejoin-round">
            <polygon points="50,85 88,15 12,15" />
          </svg>
        </motion.div>
        {/* Center essence star */}
        <motion.div
          animate={{ scale: [0.8, 1.25, 0.8], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_10px_#fff]"
        />
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"prototype" | "catalog" | "designer" | "achievements">("prototype");
  const [customUnlockedCards, setCustomUnlockedCards] = useState<ElementSymbol[]>([]);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [showHowToPlay, setShowHowToPlay] = useState(true);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState(false);
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
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [localBypassMaintenance, setLocalBypassMaintenance] = useState(() => {
    try {
      return sessionStorage.getItem("local_maintenance_bypass") === "true";
    } catch {
      return false;
    }
  });

  const [showBypassModal, setShowBypassModal] = useState(false);
  const [bypassPassword, setBypassPassword] = useState("");
  const [bypassError, setBypassError] = useState<string | null>(null);

  // No keyboard shortcut needed as we use the clearly visible bypass button on screen

  const handleDisableMaintenance = async () => {
    if (bypassPassword === "0072" || bypassPassword.toUpperCase() === "FORJA_MAESTRA") {
      try {
        sessionStorage.setItem("local_maintenance_bypass", "true");
        setLocalBypassMaintenance(true);
        setShowBypassModal(false);
        setBypassPassword("");
        setBypassError(null);
        playSound("levelUp");
      } catch (e) {
        console.error("Error setting bypass state:", e);
        setBypassError("Error al guardar acceso local.");
        playSound("fail");
      }
    } else {
      playSound("fail");
      setBypassError("Código maestro incorrecto.");
    }
  };

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

    // 1b. Subscribe to Maintenance Mode in real-time
    const maintRef = doc(db, "broadcasts", "maintenance");
    const unsubscribeMaintenance = onSnapshot(maintRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setMaintenanceActive(data.message === "MAINTENANCE_ACTIVE");
        } else {
          setMaintenanceActive(false);
        }
      } catch (e) {
        console.error("Error reading maintenance status:", e);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "broadcasts/maintenance");
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
      unsubscribeMaintenance();
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

  // Background music trigger on first user interaction gesture
  useEffect(() => {
    const initMusic = () => {
      if (isSoundOn) {
        startBackgroundMusic();
      }
      window.removeEventListener("click", initMusic);
      window.removeEventListener("touchend", initMusic);
      window.removeEventListener("keydown", initMusic);
    };
    if (isSoundOn) {
      window.addEventListener("click", initMusic);
      window.addEventListener("touchend", initMusic);
      window.addEventListener("keydown", initMusic);
    } else {
      stopBackgroundMusic();
    }
    return () => {
      window.removeEventListener("click", initMusic);
      window.removeEventListener("touchend", initMusic);
      window.removeEventListener("keydown", initMusic);
    };
  }, [isSoundOn]);

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

  const handleTabChange = (tab: "prototype" | "catalog" | "designer" | "achievements") => {
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
    <>
      {/* Real-time Global Maintenance Lock Screen Overlaid early */}
      {(maintenanceActive && !localBypassMaintenance) && (
        <div className="fixed inset-0 z-[9999] bg-[#060a13] text-slate-100 font-sans flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden select-none">
          {/* Background cosmic glow */}
          <div className="absolute top-1/4 left-1/4 w-[35rem] h-[35rem] rounded-full filter blur-[120px] bg-amber-500/10 pointer-events-none animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[35rem] h-[35rem] rounded-full filter blur-[120px] bg-[#4f46e5]/10 pointer-events-none animate-pulse"></div>

          {/* Floating dust particles */}
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <div className="absolute top-12 left-1/4 w-1 h-1 bg-yellow-400 rounded-full animate-ping"></div>
            <div className="absolute bottom-24 right-1/3 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
            <div className="absolute top-1/3 right-12 w-1.5 h-1.5 bg-pink-400 rounded-full animate-ping"></div>
            <div className="absolute bottom-1/3 left-10 w-1 h-1 bg-cyan-400 rounded-full animate-bounce"></div>
          </div>

          {/* Container Card */}
          <div className="max-w-xl w-full text-center bg-[#0d1527] border-4 border-black rounded-[2.5rem] p-8 md:p-12 shadow-[10px_10px_0px_#000] relative z-10 flex flex-col items-center gap-6">
            
            {/* Animated Alchemical Spinner */}
            <div className="relative w-24 h-24 flex items-center justify-center scale-110">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-4 border-dashed border-amber-400/40"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute w-[80%] h-[80%] rounded-full border-2 border-dashed border-indigo-400/35"
              />
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute w-12 h-12 bg-black border-4 border-black rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]"
              >
                <Wrench className="w-6 h-6 text-amber-400 animate-pulse" />
              </motion.div>
            </div>

            <div className="space-y-3 p-1">
              <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-pink-500 to-indigo-400 uppercase tracking-tight italic select-none">
                REINO EN MANTENIMIENTO
              </h1>
              <p className="text-cyan-400 text-xs sm:text-xs font-black tracking-widest uppercase font-mono select-none animate-pulse">
                🧪 TRANSMUTANDO EL CÓDIGO SAGRADO 🧪
              </p>
            </div>

            <p className="text-gray-400 text-xs md:text-sm font-medium leading-relaxed max-w-sm font-sans">
              Las forjas alquímicas del laboratorio se encuentran actualmente apagadas por labores de mantenimiento y mejora estructural del sistema. Estamos canalizando nuevas energías cósmicas y fórmulas de fusión.
            </p>

            <div className="w-full bg-black/40 border-2 border-black rounded-2xl p-4 flex flex-col justify-center items-center gap-2.5">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold font-mono">
                <Lock className="w-4 h-4 animate-bounce" /> ACCESO TEMPORALMENTE RESTRINGIDO
              </div>
              <p className="text-[10px] text-gray-500 font-mono leading-relaxed">
                ¡Regresaremos pronto! Conservaremos tus récords, elementos descubiertos y oro acumulado intactos.
              </p>
            </div>

            {/* Highly visible Admin button to open password prompt */}
            <button
              onClick={() => {
                playSound("click");
                setShowBypassModal(true);
              }}
              className="mt-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs rounded-xl border-2 border-black shadow-[4px_4px_0px_#000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] cursor-pointer transition select-none tracking-wider font-mono flex items-center gap-2"
            >
              <Wrench className="w-4 h-4" /> Acceso Administrativo (Apagar)
            </button>
          </div>
        </div>
      )}

      {/* Emergency Bypass Password Modal */}
      <AnimatePresence>
        {showBypassModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4 font-sans"
            onClick={() => {
              setShowBypassModal(false);
              setBypassPassword("");
              setBypassError(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0b0f19] border-4 border-black w-full max-w-sm rounded-[2rem] p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  playSound("click");
                  setShowBypassModal(false);
                  setBypassPassword("");
                  setBypassError(null);
                }}
                className="absolute top-4 right-4 p-1.5 rounded-xl border-2 border-black bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white cursor-pointer active:translate-y-0.5"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-amber-500/20 text-amber-400 border-2 border-amber-500/50 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-md uppercase font-mono tracking-tight">
                    Forzar Desactivación
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono mt-1 leading-normal">
                    Introduce la clave de administración para restaurar el acceso universal inmediato.
                  </p>
                </div>

                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="••••"
                    value={bypassPassword}
                    onChange={(e) => setBypassPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleDisableMaintenance();
                      }
                    }}
                    className="w-full bg-black border-2 border-black rounded-xl p-3 text-center text-sm font-mono text-white placeholder-slate-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all text-lg tracking-widest cursor-text"
                    autoFocus
                  />

                  {bypassError && (
                    <p className="text-rose-500 text-[10px] font-mono bg-rose-950/20 border border-rose-900/50 py-1.5 px-3 rounded-lg font-bold leading-normal">
                      ⚠️ {bypassError}
                    </p>
                  )}

                  <button
                    onClick={handleDisableMaintenance}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs rounded-xl border-2 border-black shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] cursor-pointer transition select-none tracking-wider font-mono"
                  >
                    Desactivar Mantenimiento
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
          <div className="flex items-center gap-4 max-w-2xl">
            <MinimalistLogo />
            <div>
              <h1 className="text-4.5xl sm:text-6xl font-black text-white uppercase tracking-tighter leading-none select-none">
                Element<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-yellow-400">Lab</span>
              </h1>
              {/* Elegant, animated, minimalist brand slogan */}
              <p className="text-cyan-400 text-[10px] sm:text-xs font-black tracking-widest uppercase font-mono mt-1.5 select-none flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-pulse shrink-0" />
                Transmuta lo simple, crea lo extraordinario
              </p>
              <p className="text-gray-400 mt-2 text-xs sm:text-sm font-medium leading-relaxed font-sans">
                Combina elementos sagrados y desata poderosas fusiones para batir tus deudas y cuotas de oro.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto lg:justify-end">
            {/* White status badge with custom neon shadow */}
            <div className="bg-white px-5 py-2.5 rounded-full text-black font-black text-[11px] sm:text-xs tracking-widest uppercase border-4 border-black shadow-[4px_4px_0px_#EC4899] select-none">
              LABORATORIO ABIERTO 🧪
            </div>

            {/* Los Andeleros Partner Link */}
            <a
              href="https://losandeleros.onrender.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                playSound("click");
              }}
              className="px-4 py-2 bg-[#EAB308] hover:bg-[#CA8A04] border-4 border-black rounded-2xl text-xs font-black text-black tracking-widest uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:shadow-[0px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-1.5 shrink-0 cursor-pointer text-center"
            >
              <ExternalLink className="w-4 h-4 shrink-0 text-black animate-pulse" /> LOS ANDELEROS 🎸
            </a>

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

            {/* Announcements Trigger Button */}
            <button
              id="btn-announcements-trigger"
              onClick={() => {
                playSound("click");
                setIsAnnouncementsOpen(true);
              }}
              className="px-4 py-2 bg-[#E11D48] hover:bg-rose-700 border-4 border-black rounded-2xl text-xs font-black text-white tracking-widest uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:shadow-[0px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Megaphone className="w-4 h-4 shrink-0 text-white animate-bounce" /> ANUNCIOS
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
                  3. <strong className="underline decoration-yellow-300 decoration-2">Crea tus propias cartas</strong> en la pestaña <strong className="font-extrabold">3. Alquimia de IA</strong> de forma libre y compártelas con el cosmos.<br />
                  4. <strong className="underline decoration-yellow-300 decoration-2">Desbloquea logros y asciende de rango</strong> en la pestaña <strong className="font-extrabold">4. Logros y Rangos</strong> cumpliendo desafíos locos para convertirte en el Gran Maestro del de la Rejilla.
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
            <div className="flex flex-col sm:flex-row bg-[#111827] p-2 rounded-[2rem] border-4 border-black max-w-3xl w-full font-mono text-xs gap-2 select-none">
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
              <button
                id="tab-btn-achievements"
                onClick={() => handleTabChange("achievements")}
                className={`flex-1 py-3.5 px-4 rounded-2xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === "achievements"
                    ? "bg-[#EC4899] text-white border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] scale-[1.03]"
                    : "text-gray-400 bg-slate-900/30 border-4 border-transparent hover:border-black/40 hover:text-white"
                }`}
              >
                <Award className="w-4 h-4 shrink-0" /> 4. Logros y Rangos
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

              {activeTab === "achievements" && (
                <AchievementsPanel activeAccount={activeAccount} />
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

      {/* Announcements & Bulletin Board Modal */}
      <AnnouncementsModal
        isOpen={isAnnouncementsOpen}
        onClose={() => setIsAnnouncementsOpen(false)}
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
    </>
  );
}
