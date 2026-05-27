import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle2, ShieldAlert, GraduationCap, X } from "lucide-react";
import { playSound } from "../utils/audio";
import { motion, AnimatePresence } from "motion/react";

interface TutorialStep {
  targetId: string;
  title: string;
  description: string;
  position: "bottom" | "top" | "left" | "right" | "center";
}

interface TutorialOverlayProps {
  onComplete: () => void;
  activeUsername: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    targetId: "account-manager",
    title: "🧙‍♂️ ¡Primeros Pasos en la Alquimia!",
    description: "Estás identificado de forma segura, tu cuenta está conectada en tiempo real. Aquí arriba puedes revisar tu apodo, tus Ether Gems acumuladas para pociones y tus puntos récord de misiones.",
    position: "bottom"
  },
  {
    targetId: "tab-btn-prototype",
    title: "🧱 1. Rejilla Alquímica",
    description: "Este es el núcleo jugable de ElementLab. Pulsa aquí para jugar partidas rápidas de 3x3, combinar agua, sol y fuego, pagar tus cuotas y ascender de nivel.",
    position: "bottom"
  },
  {
    targetId: "tab-btn-catalog",
    title: "📖 2. Libro de Fórmulas",
    description: "Un compendio sagrado que enumera combos legendarios de proximidad (fórmulas). Consúltalo para planear mejor el arrastre de tus cartas secundarias.",
    position: "bottom"
  },
  {
    targetId: "tab-btn-designer",
    title: "🤖 3. Alquimia de IA",
    description: "¡Invoca la inteligencia cósmica de Gemini! Describe cualquier concepto para crear cartas temáticas personalizadas e inyectar dinamismo a tus partidas.",
    position: "bottom"
  },
  {
    targetId: "tab-btn-achievements",
    title: "🏆 4. Logros y Rangos del Alquimista",
    description: "¡Supera desafíos fantásticos para desbloquear logros, acumular medallas de honor y ascender tu rango desde Novato de Cobre hasta Supremo del canónigo!",
    position: "bottom"
  },
  {
    targetId: "btn-admin-trigger",
    title: "👑 Panel de Reglas Cósmicas",
    description: "Si eres Administrador, puedes alterar el clima estético del laboratorio (Selva, Infierno, Mar, Cyberpunk) o emitir anuncios globales para todos los usuarios en la nube.",
    position: "left"
  },
  {
    targetId: "btn-announcements-trigger",
    title: "📢 Tablón de Anuncios y Avisos",
    description: "¡Mantente al día! Pulsa este botón para abrir la cartelera del laboratorio, descubrir eventos de tiempo limitado, nuevas mecánicas añadidas y los últimos balances de transmutación.",
    position: "bottom"
  },
  {
    targetId: "btn-guide-trigger",
    title: "💡 Guía Completa",
    description: "Usa este botón de acceso rápido siempre que quieras revisar las instrucciones generales del juego de un solo vistazo.",
    position: "bottom"
  }
];

export default function TutorialOverlay({ onComplete, activeUsername }: TutorialOverlayProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [highlightCoords, setHighlightCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const resizeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentStep = TUTORIAL_STEPS[currentStepIdx];

  const updateHighlightCoords = () => {
    if (!currentStep || currentStep.position === "center") {
      setHighlightCoords(null);
      return;
    }

    const element = document.getElementById(currentStep.targetId);
    if (element) {
      const rect = element.getBoundingClientRect();
      setHighlightCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      });
    } else {
      setHighlightCoords(null);
    }
  };

  useEffect(() => {
    // Play subtle chime on mount
    playSound("levelUp");

    updateHighlightCoords();

    // Re-check target coordinates continuously on window resize or layout updates
    window.addEventListener("resize", updateHighlightCoords);
    window.addEventListener("scroll", updateHighlightCoords);
    
    // Interval check in case of rendering delay
    resizeIntervalRef.current = setInterval(updateHighlightCoords, 500);

    return () => {
      window.removeEventListener("resize", updateHighlightCoords);
      window.removeEventListener("scroll", updateHighlightCoords);
      if (resizeIntervalRef.current) clearInterval(resizeIntervalRef.current);
    };
  }, [currentStepIdx]);

  const handleNext = () => {
    playSound("click");
    if (currentStepIdx < TUTORIAL_STEPS.length - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    playSound("click");
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  const handleFinish = () => {
    playSound("levelUp");
    onComplete();
  };

  const skipTour = () => {
    playSound("click");
    onComplete();
  };

  return (
    <div id="tutorial-overlay-backdrop" className="fixed inset-0 z-50 overflow-hidden select-none pointer-events-auto">
      {/* Dimmed Overlay Backdrop */}
      <div className="absolute inset-0 bg-black/75 transition-opacity duration-300" />

      {/* Dynamic Highlight Border on top of backdrop */}
      {highlightCoords && (
        <div
          style={{
            position: "absolute",
            top: highlightCoords.top - 8,
            left: highlightCoords.left - 8,
            width: highlightCoords.width + 16,
            height: highlightCoords.height + 16,
            pointerEvents: "none",
            borderRadius: "1.25rem",
          }}
          className="ring-4 ring-offset-4 ring-offset-[#111827] ring-[#EC4899] animate-pulse shadow-[0_0_30px_rgba(236,72,153,0.65)] bg-pink-500/10 transition-all duration-300 z-50"
        />
      )}

      {/* Guided Popover Dialog Card */}
      <div className="absolute inset-x-4 bottom-10 sm:bottom-auto sm:top-1/4 max-w-md mx-auto z-50">
        <div className="bg-[#1f2937] border-4 border-black p-6 rounded-[2.5rem] shadow-[10px_10px_0px_#000] flex flex-col gap-4 text-left relative overflow-hidden">
          {/* Neon side accent */}
          <div className="absolute top-0 left-0 w-2.5 h-full bg-[#EC4899]" />

          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 border-b-2 border-slate-700 pb-3 pl-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#EC4899]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-[#EC4899] font-mono">
                Paso {currentStepIdx + 1} de {TUTORIAL_STEPS.length}
              </span>
            </div>
            <button
              onClick={skipTour}
              className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Saltar Tutorial"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Info Area */}
          <div className="flex flex-col gap-1.5 pl-2">
            <h4 className="text-lg font-black uppercase tracking-tight text-white font-mono flex items-center gap-1.5">
              {currentStep.title}
            </h4>
            <p className="text-xs text-slate-300 font-medium leading-relaxed mt-1 font-sans">
              {currentStep.description}
            </p>
          </div>

          {/* Action Row */}
          <div className="flex justify-between items-center mt-2 border-t border-slate-700 pt-4 pl-2">
            <button
              onClick={skipTour}
              className="text-[10px] text-gray-500 hover:text-gray-300 font-black uppercase tracking-wider font-mono cursor-pointer"
            >
              Cerrar Guía
            </button>

            <div className="flex items-center gap-2">
              {currentStepIdx > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-xl border-2 border-black text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Anterior
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-4.5 py-2.5 bg-[#EC4899] hover:bg-pink-600 text-white rounded-xl border-2 border-black text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_#000] active:translate-y-0.5"
              >
                {currentStepIdx < TUTORIAL_STEPS.length - 1 ? (
                  <>Siguiente <ArrowRight className="w-3.5 h-3.5" /></>
                ) : (
                  <>¡Entendido! <CheckCircle2 className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
