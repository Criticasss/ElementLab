import React, { useState, useEffect, useRef } from "react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { playSound } from "../utils/audio";
import { Sparkles, Moon, Sun, ToggleLeft, ToggleRight, Sparkle } from "lucide-react";

interface LiveEventState {
  message: string;
  author: string;
  timestamp: number;
}

export default function AlchemicalEclipseEvent() {
  const [activeEvent, setActiveEvent] = useState<LiveEventState | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [disableEclipseEffect, setDisableEclipseEffect] = useState<boolean>(false);
  const lastActiveTimestamp = useRef<number | null>(null);

  // 1. Listen to real-time events from Firestore
  useEffect(() => {
    const docRef = doc(db, "broadcasts", "event");
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.data() as LiveEventState;
          
          // Only process if it is a valid "eclipse_mode" event initiated within the last 45 seconds
          const elapsed = Date.now() - (data.timestamp || 0);
          if (data.message === "eclipse_mode" && elapsed < 45000) {
            setActiveEvent(data);
          } else {
            setActiveEvent(null);
          }
        } else {
          setActiveEvent(null);
        }
      } catch (err) {
        console.error("Error subscribing to global visual event document:", err);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "broadcasts/event");
    });

    return () => unsubscribe();
  }, []);

  // 2. Play levelUp / sci-fi hum sound once when the celestial event starts
  useEffect(() => {
    if (activeEvent && activeEvent.timestamp !== lastActiveTimestamp.current) {
      playSound("levelUp");
      lastActiveTimestamp.current = activeEvent.timestamp;
    }
  }, [activeEvent]);

  // 3. Document body class assignment
  useEffect(() => {
    if (activeEvent && !disableEclipseEffect) {
      document.body.classList.add("eclipse-active");
    } else {
      document.body.classList.remove("eclipse-active");
    }
    return () => {
      document.body.classList.remove("eclipse-active");
    };
  }, [activeEvent, disableEclipseEffect]);

  // 4. Time left countdown (45 seconds length)
  useEffect(() => {
    if (!activeEvent) {
      setTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - activeEvent.timestamp;
      const remaining = 45000 - elapsed;

      if (remaining <= 0) {
        // Event finished! Play subtle chime
        playSound("victory");
        setActiveEvent(null);
        setTimeLeft(0);
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [activeEvent]);

  if (!activeEvent || timeLeft <= 0) return null;

  const secondsRatio = timeLeft / 45000;
  const displaySeconds = (timeLeft / 1000).toFixed(1);

  return (
    <>
      {/* Immersive Cyber-Mystic Eclipse Styling Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Dark Astral body background with smooth twilight Night transition */
        body.eclipse-active {
          background-color: #080314 !important;
          background-image: radial-gradient(circle at top right, #1b0a33 0%, #05010a 100%) !important;
          color: #e2dcfa !important;
          transition: background-color 1.5s ease;
        }

        /* Ambient cosmic dusk active animations */
        body.eclipse-active::after {
          content: "";
          position: fixed;
          inset: 0;
          background-image: 
            radial-gradient(circle at 25% 25%, rgba(217, 70, 239, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(6, 182, 212, 0.08) 0%, transparent 50%);
          z-index: 2;
          pointer-events: none;
          animation: ambientCosmicGlow 10s infinite ease-in-out;
        }

        @keyframes ambientCosmicGlow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.08); }
        }

        /* Make panels and dashboard containers slightly translucent so cosmic field shines through */
        body.eclipse-active .bg-[#111827],
        body.eclipse-active .bg-[#111827]/80,
        body.eclipse-active .bg-[#111827]/90,
        body.eclipse-active .bg-slate-900,
        body.eclipse-active .bg-slate-900/80,
        body.eclipse-active .bg-slate-950,
        body.eclipse-active div.bg-slate-900,
        body.eclipse-active div.rounded-[2rem],
        body.eclipse-active div.rounded-3xl {
          background-color: rgba(14, 8, 28, 0.88) !important;
          border-color: #c084fc !important; /* Glowing purple border */
          box-shadow: 0 0 16px rgba(168, 85, 247, 0.3), inset 0 0 12px rgba(168, 85, 247, 0.1) !important;
        }

        /* HIGH-POWER GLOW FOR ACTIVE GAME BUTTONS, PLAYGRID CELLS, HAND CARDS & POTION SLOTS */
        body.eclipse-active button,
        body.eclipse-active select,
        body.eclipse-active textarea,
        body.eclipse-active input {
          border-width: 3.5px !important;
          border-color: #d946ef !important; /* Hot neon magenta */
          box-shadow: 0 0 22px rgba(217, 70, 239, 0.95), 
                      0 0 8px rgba(6, 182, 212, 0.95), 
                      inset 0 0 10px rgba(217, 70, 239, 0.6) !important;
          text-shadow: 0 0 8px rgba(255, 255, 255, 1), 0 0 12px rgba(217, 70, 239, 0.8) !important;
          animation: cyberNeonpulse 2s infinite alternate !important;
          position: relative !important;
          z-index: 40 !important; /* Raised above the dim overlay veil so they glow bright and remain perfectly interactive */
          transition: all 0.2s ease-in-out !important;
        }

        /* Amplify physical card grid buttons and player hand cards */
        body.eclipse-active div.grid button,
        body.eclipse-active .grid button,
        body.eclipse-active button.relative.aspect-square {
          background-color: #0e0724 !important;
          color: #ffffff !important;
          box-shadow: 0 0 25px rgba(236, 72, 153, 0.95), 
                      0 0 10px rgba(6, 182, 212, 0.95), 
                      inset 0 0 12px rgba(236, 72, 153, 0.6) !important;
        }

        /* Super-charged hover values */
        body.eclipse-active button:hover,
        body.eclipse-active div.grid button:hover,
        body.eclipse-active .grid button:hover,
        body.eclipse-active button.relative.aspect-square:hover {
          box-shadow: 0 0 35px rgba(236, 72, 153, 1), 
                      0 0 15px rgba(6, 182, 212, 1), 
                      inset 0 0 12px rgba(255, 255, 255, 0.9) !important;
          transform: translateY(-3px) scale(1.05) !important;
          border-color: #ffffff !important;
        }

        @keyframes cyberNeonpulse {
          0%, 100% {
            border-color: #d946ef;
            box-shadow: 0 0 22px rgba(217, 70, 239, 0.95), 
                        0 0 8px rgba(6, 182, 212, 0.95), 
                        inset 0 0 10px rgba(217, 70, 239, 0.6) !important;
          }
          50% {
            border-color: #06b6d4; /* vibrant neon cyan pulse */
            box-shadow: 0 0 25px rgba(6, 182, 212, 0.95), 
                        0 0 10px rgba(217, 70, 239, 0.95), 
                        inset 0 0 12px rgba(6, 182, 212, 0.6) !important;
          }
        }
      `}} />

      {/* 🌌 Penumbra Veil background layer: placed at z-[35] to dim non-interactive page elements but stay behind controls */}
      {!disableEclipseEffect && (
        <div
          id="eclipse-astral-veil"
          className="fixed inset-0 pointer-events-none select-none transition-opacity duration-1000"
          style={{ 
            background: "radial-gradient(circle, rgba(14, 5, 26, 0.73) 0%, rgba(2, 1, 6, 0.81) 100%)",
            zIndex: 35
          }}
        />
      )}

      {/* Interactive solar crown crown animation on background */}
      {!disableEclipseEffect && (
        <div 
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] rounded-full bg-gradient-to-r from-purple-500/25 via-pink-500/15 to-transparent blur-[80px] pointer-events-none animate-spin" 
          style={{ animationDuration: "12s", zIndex: 36 }} 
        />
      )}

      {/* Floating Eclipse Info & Controls Widget (Floating top-center below broadcast bar) */}
      <div id="live-event-eclipse-widget" className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-[48] w-[calc(100%-2rem)] max-w-lg md:max-w-xl">
        <div className="bg-[#0e071c] border-4 border-[#d946ef] p-4.5 rounded-[2rem] shadow-[0_0_40px_rgba(217,70,239,0.8)] flex flex-col gap-2 relative overflow-hidden text-left font-mono">
          
          {/* Animated Purple Gradient Aura */}
          <div className="absolute top-0 right-0 w-44 h-full bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 left-0 w-44 h-full bg-pink-500/10  rounded-full blur-3xl pointer-events-none" />

          {/* Title row */}
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75 mr-2"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500 mr-2"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#d946ef]">
                FENÓMENO CELESTIAL ACTIVO
              </span>
            </div>

            {/* In-App Toggle to shut off twilight overlay locally in case elements are hard to see */}
            <button
              onClick={() => {
                playSound("click");
                setDisableEclipseEffect(!disableEclipseEffect);
              }}
              className="px-3 py-1 bg-slate-900 border-2 border-slate-700 hover:border-[#d946ef] rounded-xl text-[9px] font-black uppercase text-purple-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
            >
              {disableEclipseEffect ? (
                <>Ver Eclipse <Sun className="w-3.5 h-3.5 text-yellow-500 animate-spin" /></>
              ) : (
                <>Modo Normal <Moon className="w-3.5 h-3.5 text-indigo-400" /></>
              )}
            </button>
          </div>

          {/* Details Row */}
          <div className="flex items-center justify-between gap-4 mt-1 relative z-10">
            <div className="flex-1">
              <h4 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5 uppercase">
                🌌 Eclipse Alquímico (Penumbra)
              </h4>
              <p className="text-[10px] text-zinc-300 leading-tight mt-1 font-semibold">
                ¡El laboratorio entra en un plano astral nocturno! Invocado por <span className="text-cyan-400">{activeEvent.author}</span>.
              </p>
            </div>

            {/* Remaining countdown display */}
            <div className="bg-[#180f29] border-2 border-purple-500 px-3.5 py-2 rounded-2xl shrink-0 text-center min-w-[70px] shadow-[3px_3px_0px_#000]">
              <span className="text-lg font-black text-[#d946ef] tracking-tighter">
                {displaySeconds}s
              </span>
            </div>
          </div>

          {/* Timeline remaining bar indicator */}
          <div className="w-full bg-slate-950 h-2.5 rounded-full mt-1.5 overflow-hidden border border-purple-900/30">
            <div
              style={{ width: `${secondsRatio * 100}%` }}
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 transition-all duration-100 ease-linear"
            />
          </div>
        </div>
      </div>
    </>
  );
}
