import { motion } from "motion/react";
import { Trophy, Award, Lock, CheckCircle2, ChevronRight, Sparkles, Zap, Flame, Star } from "lucide-react";
import { Account } from "./AccountManager";
import { playSound } from "../utils/audio";

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
  criteria: string;
  difficulty: "Fácil" | "Medio" | "Legendario";
}

export const ACHIEVEMENTS_LIST: AchievementDef[] = [
  {
    id: "piromano",
    name: "Pirómano Alquímico",
    description: "¡Fuego sagrado purificador! Juega un total de 10 elementos que involucren fuego (Fuego 🔥 o Volcán 🌋).",
    emoji: "🔥",
    criteria: "Coloca 10 veces Fuego o Volcán en tu cuadrícula",
    difficulty: "Fácil"
  },
  {
    id: "vacio",
    name: "Descubridor del Vacío",
    description: "¡Has quebrado las leyes de la transmutación! Coloca o crea tu primer elemento de rareza legendaria.",
    emoji: "🌌",
    criteria: "Coloca un Alquimista, Volcán, Mago de Oro u Obsidiana en el tablero",
    difficulty: "Legendario"
  },
  {
    id: "rey_midas",
    name: "El Toque de Midas",
    description: "Un verdadero maestro transmuta la vida silvestre ordinaria en lingotes celestiales de oro puro.",
    emoji: "⚜️",
    criteria: "Consigue la combinación perfecta: Agua + Semilla + Sol para crear la Flor de Oro (⚜️)",
    difficulty: "Medio"
  },
  {
    id: "gran_cosecha",
    name: "Cosecha Dorada",
    description: "Multiplicadores por las nubes. Genera una cantidad masiva de oro en un solo turno.",
    emoji: "💰",
    criteria: "Genera 60+ de Oro en un único turno con combos adyacentes",
    difficulty: "Medio"
  },
  {
    id: "apicultor",
    name: "Maestro Apicultor",
    description: "Has aprendido el baile sagrado que sintoniza el zumbido de las abejas con la salud floral.",
    emoji: "🐝",
    criteria: "Coloca una Abeja adyacente a cualquier Girasol, Flor Silvestre o Flor de Oro",
    difficulty: "Fácil"
  },
  {
    id: "rejilla_llena",
    name: "Rejilla de Oricalco",
    description: "Saturación molecular completa. Llena la totalidad del tablero de 3x3 sin dejar espacios vacíos.",
    emoji: "🧱",
    criteria: "Consigue tener las 9 celdas ocupadas al final de un turno",
    difficulty: "Medio"
  }
];

export function getAlchemistRank(unlockedCount: number) {
  if (unlockedCount === 0) {
    return {
      name: "Soplador de Fuelle",
      title: "Aprendiz de Crisol",
      color: "text-slate-400 bg-slate-950/40 border-slate-700",
      description: "Apenas sabes limpiar el hollín de los frascos. ¡Comienza a fundir!",
      badge: "🧪",
      stars: 1
    };
  } else if (unlockedCount <= 2) {
    return {
      name: "Alquimista de Cobre",
      title: "Novato de los Elementos",
      color: "text-amber-500 bg-amber-950/20 border-amber-800",
      description: "Entiendes cómo regar semillas, pero las pociones aún te explotan en la cara.",
      badge: "🏺",
      stars: 2
    };
  } else if (unlockedCount <= 4) {
    return {
      name: "Destilador de Plata",
      title: "Trismegisto de la Rejilla",
      color: "text-cyan-400 bg-cyan-950/20 border-cyan-800",
      description: "Dominas las sinergias espaciales y dejas a tus abejas bien alimentadas.",
      badge: "🔮",
      stars: 3
    };
  } else if (unlockedCount === 5) {
    return {
      name: "Transmutador de Áureo",
      title: "Adepto de la Flor de Oro",
      color: "text-yellow-400 bg-yellow-950/30 border-yellow-700",
      description: "Has visto la luz de la verdad cósmica. Las flores de oro se rinden ante tu voluntad.",
      badge: "⚜️",
      stars: 4
    };
  } else {
    return {
      name: "Gran Maestro del Vacío",
      title: "Supremo de la Escribanía",
      color: "text-pink-500 bg-rose-950/30 border-rose-700 animate-pulse",
      description: "Has desbloqueado todos los arcanos de ElementLab. Eres un dios de la rejilla sagrada.",
      badge: "🌌",
      stars: 5
    };
  }
}

interface AchievementsPanelProps {
  activeAccount: Account;
}

export default function AchievementsPanel({ activeAccount }: AchievementsPanelProps) {
  const unlockedIds = activeAccount.achievements || [];
  const rankInfo = getAlchemistRank(unlockedIds.length);
  const percent = Math.round((unlockedIds.length / ACHIEVEMENTS_LIST.length) * 100);

  const handleCardClick = () => {
    playSound("click");
  };

  return (
    <div id="achievements-panel" className="flex flex-col gap-8 text-left select-none">
      
      {/* Header Visual with Rank Card */}
      <div className="bg-[#111827] border-4 border-black p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-[8px_8px_0px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-[1.5rem] bg-black border-4 border-black flex items-center justify-center text-4xl shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-radial from-slate-800 to-slate-950 shrink-0">
            {rankInfo.badge}
          </div>
          <div>
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">
              // TU RANGO DE ALQUIMISTA
            </span>
            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2 mt-0.5">
              {rankInfo.name}
            </h2>
            <p className="text-xs text-slate-400 font-medium max-w-md mt-1 leading-relaxed">
              "{rankInfo.description}"
            </p>
          </div>
        </div>

        {/* Level / Stars and stats */}
        <div className="flex flex-col items-center md:items-end gap-1.5 shrink-0">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${
                  i < rankInfo.stars
                    ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_2px_4px_rgba(234,179,8,0.3)]"
                    : "text-slate-800"
                }`}
              />
            ))}
          </div>
          <p className="text-[10px] font-mono text-gray-500 font-extrabold uppercase tracking-widest mt-0.5">
            Clase: <span className="text-pink-400">{rankInfo.title}</span>
          </p>
        </div>
      </div>

      {/* Progress metrics */}
      <div className="bg-black/25 border-4 border-black p-5 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="w-full sm:w-auto text-center sm:text-left">
          <p className="text-[10px] uppercase font-bold text-gray-500 font-mono tracking-wider">Avance del Grimorio</p>
          <p className="text-lg font-black font-mono text-amber-400 mt-0.5">
            {unlockedIds.length} <span className="text-xs text-gray-500">de</span> {ACHIEVEMENTS_LIST.length} DESBLOQUEADOS
          </p>
        </div>

        <div className="flex-1 max-w-md w-full">
          <div className="w-full h-5 bg-black rounded-lg border-2 border-slate-850 p-0.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-pink-500 to-amber-500 rounded-md"
            />
          </div>
        </div>

        <div className="shrink-0">
          <span className="text-2xl font-black font-mono text-white tracking-widest">
            {percent}%
          </span>
        </div>
      </div>

      {/* Grid of Achievements */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {ACHIEVEMENTS_LIST.map((ach, idx) => {
          const isUnlocked = unlockedIds.includes(ach.id);
          
          return (
            <motion.div
              key={ach.id}
              onClick={handleCardClick}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className={`p-5 rounded-[2.2rem] border-4 border-black transition-all duration-300 relative flex flex-col justify-between cursor-pointer select-none group hover:scale-[1.02] active:scale-[0.98] ${
                isUnlocked
                  ? "bg-[#182333] hover:bg-[#1c293c] shadow-[6px_6px_0px_rgba(0,0,0,1)]"
                  : "bg-slate-900/40 opacity-70 border-dashed hover:opacity-85 shadow-[3px_3px_0px_rgba(0,0,0,0.5)]"
              }`}
            >
              {/* Badge visual inside */}
              <div className="flex gap-4 items-start">
                <div
                  className={`w-12 h-12 rounded-[1.2rem] border-2 border-black flex items-center justify-center text-2xl shrink-0 shadow-[2px_2px_0px_rgba(0,0,0,1)] ${
                    isUnlocked
                      ? "bg-[#253952] text-white"
                      : "bg-[#0b1320] text-gray-600 grayscale"
                  }`}
                >
                  {isUnlocked ? ach.emoji : "🔒"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-1.5 flex-wrap">
                    <h3 className={`text-sm font-black uppercase tracking-wider ${isUnlocked ? "text-amber-400" : "text-gray-500"}`}>
                      {ach.name}
                    </h3>
                    <span className={`text-[8px] font-sans font-black uppercase px-2 py-0.5 rounded-full border border-black/40 ${
                      ach.difficulty === "Legendario"
                        ? "bg-fuchsia-950/40 text-fuchsia-400 border-fuchsia-800"
                        : ach.difficulty === "Medio"
                        ? "bg-amber-950/40 text-amber-500 border-amber-800"
                        : "bg-emerald-950/40 text-emerald-500 border-emerald-800"
                    }`}>
                      {ach.difficulty}
                    </span>
                  </div>

                  <p className={`text-xs mt-1.5 leading-relaxed font-medium ${isUnlocked ? "text-slate-300" : "text-gray-600 italic"}`}>
                    {ach.description}
                  </p>
                </div>
              </div>

              {/* Requirement footer */}
              <div className="mt-4 pt-3 border-t border-black/20 flex justify-between items-center bg-black/15 -mx-5 -mb-5 px-5 pb-4 rounded-b-[2.2rem] gap-2">
                <div>
                  <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block font-bold">
                    REQUISITO DE LOGRO:
                  </span>
                  <span className={`text-[10px] font-sans font-bold leading-tight block ${isUnlocked ? "text-slate-400" : "text-gray-500"}`}>
                    {ach.criteria}
                  </span>
                </div>
                {isUnlocked ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-[10px] font-mono bg-emerald-950/30 px-2.5 py-1 rounded-xl border border-emerald-800/40 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> GANADO
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-gray-500 font-extrabold text-[10px] font-mono bg-black/40 px-2.5 py-1 rounded-xl border border-slate-855 shrink-0">
                    <Lock className="w-3.5 h-3.5" /> BLOQUEADO
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
