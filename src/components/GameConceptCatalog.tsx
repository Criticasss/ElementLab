import { useState } from "react";
import { playSound } from "../utils/audio";
import { Sparkles, Trophy, Zap, Compass, Flame, Coins, Search } from "lucide-react";

interface GameConceptCatalogProps {
  onPlayDemo: () => void;
}

interface AlchemyFormula {
  id: string;
  name: string;
  symbolClass: string;
  rarity: "común" | "raro" | "legendario";
  baseValue: number;
  recipe: string[];
  result: string;
  bonus: string;
  description: string;
  proTip: string;
}

const FORMULAS_LIST: AlchemyFormula[] = [
  {
    id: "f1",
    name: "Flor Silvestre",
    symbolClass: "🌸",
    rarity: "común",
    baseValue: 4,
    recipe: ["💧 Agua", "🌱 Semilla"],
    result: "🌸 Flor Silvestre",
    bonus: "+10 Oro de fusión",
    description: "La chispa de la vida vegetal. Se crea al regar una semilla. Este símbolo es crucial porque atrae a las abejas y es la base para lograr alquimia dorada.",
    proTip: "Coloca Agua y Semilla juntas en la rejilla. Una vez creadas, sitúa una Abeja (🐝) de forma adyacente para conseguir jugosos bonos adicionales."
  },
  {
    id: "f2",
    name: "Flor de Oro",
    symbolClass: "⚜️",
    rarity: "raro",
    baseValue: 12,
    recipe: ["🌸 Flor Silvestre", "☀️ Sol"],
    result: "⚜️ Flor de Oro",
    bonus: "+25 Oro de gran fusión",
    description: "El máximo apogeo de la botánica mística. Cuando la luz solar pura toca los pétalos de una Flor Silvestre, cristaliza sus esporas en oro macizo.",
    proTip: "Genera la masiva cantidad de +12 de oro neto por turno. Combínala con un Alquimista (🧙) adyacente para duplicar ese rendimiento a +24."
  },
  {
    id: "f3",
    name: "Mineral de Piedra",
    symbolClass: "🪨",
    rarity: "común",
    baseValue: 2,
    recipe: ["🔥 Fuego", "🧱 Tierra"],
    result: "🪨 Mineral de Piedra",
    bonus: "+5 Oro de fusión",
    description: "Una roca endurecida endurecida por choque térmicos. Aunque aporta poco de forma aislada, es la base geológica para forjar obsidiana legendaria.",
    proTip: "Si tienes un Volcán (🌋) en mano, pon Piedras en el tablero. Al colocar el Volcán adyacente, derretirá todas las Piedras a Obsidiana instantáneamente."
  },
  {
    id: "f4",
    name: "Montículo de Arcilla",
    symbolClass: "🏺",
    rarity: "común",
    baseValue: 3,
    recipe: ["💧 Agua", "🧱 Tierra"],
    result: "🏺 Montículo de Arcilla",
    bonus: "+7 Oro de fusión",
    description: "Barro húmedo moldeable y resistente. Otorga un buen flujo de oro constante y estable en rondas tempranas sin depender de elementos celestiales.",
    proTip: "Úsala para cubrir casillas sobrantes y mantener tu economía sólida mientras buscas el combo de Sol o de Flores."
  },
  {
    id: "f5",
    name: "Obsidiana Cristalina",
    symbolClass: "💎",
    rarity: "legendario",
    baseValue: 15,
    recipe: ["🪨 Mineral de Piedra", "🌋 Volcán"],
    result: "💎 Obsidiana",
    bonus: "+15 Oro inmediato",
    description: "Cristal volcánico negro de increíble valor económico. Se forja al situar un magma volcánico adyacente a cualquier Piedra previamente colocada.",
    proTip: "La Obsidiana produce +15 de oro cada turno de forma estable y sostenida. Es la mejor forma de batir la cuota final de ronda 3 (150 de oro)."
  },
  {
    id: "synergy_bee",
    name: "Sinergia de la Abeja",
    symbolClass: "🐝",
    rarity: "raro",
    baseValue: 1,
    recipe: ["🐝 Abeja", "🌸 o ⚜️ o 🌻"],
    result: "Polinización Mística",
    bonus: "+6 Oro por cada flor",
    description: "La abeja poliniza y recolecta néctar. Funciona de manera asombrosa cuando se ubica entre múltiples ejemplares de flores adyacentes.",
    proTip: "Ubicando una Abeja en el centro de la rejilla (S5) y rodeándola con flores en cruz, puedes multiplicar tu economía exponencialmente."
  },
  {
    id: "synergy_alchemist",
    name: "Canalización del Alquimista",
    symbolClass: "🧙",
    rarity: "legendario",
    baseValue: 2,
    recipe: ["🧙 Alquimista", "Cualquier Símbolo"],
    result: "Efecto Duplicador x2",
    bonus: "x2 Oro adyacentes",
    description: "Sabio conocedor del intercambio equivalente. Duplica la producción de sus acompañantes en cruz (arriba, abajo, izquierda, derecha).",
    proTip: "Ideal para rodear cartas de altísimo rendimiento base, como la Flor de Oro (⚜️) o la mística Obsidiana (💎). ¡Potencia letal si lo dominas!"
  },
  {
    id: "synergy_sunflower",
    name: "Sinergia del Girasol",
    symbolClass: "🌻",
    rarity: "raro",
    baseValue: 4,
    recipe: ["🌻 Girasol", "☀️ Sol"],
    result: "Girasol Radiante",
    bonus: "+8 Oro adicional",
    description: "Una planta majestuosa que absorbe la radiación solar. Florece de forma salvaje cuando comparte un lado inmediato con el astro rey.",
    proTip: "Coloca siempre tu Girasol compartiendo un lado con un Sol (☀️) para detonar el bono de +8 oro y sumar un rendimiento de +12 neto por turno."
  }
];

export default function GameConceptCatalog({ onPlayDemo }: GameConceptCatalogProps) {
  const [selectedFormula, setSelectedFormula] = useState<AlchemyFormula>(FORMULAS_LIST[0]);

  const handleFormulaSelect = (formula: AlchemyFormula) => {
    playSound("click");
    setSelectedFormula(formula);
  };

  const colors = ["bg-[#F43F5E]", "bg-[#0EA5E9]", "bg-[#F59E0B]", "bg-[#10B981]", "bg-[#8B5CF6]"];

  return (
    <div id="game-concept-catalog" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Side list of formulas */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <h3 className="text-xs font-black tracking-widest text-[#EC4899] uppercase font-mono px-2 select-none">
          // Grimorio de Fusiones
        </h3>
        <div className="flex flex-col gap-4 max-h-[580px] overflow-y-auto pr-2 scrollbar-thin">
          {FORMULAS_LIST.map((formula, index) => {
            const isSelected = formula.id === selectedFormula.id;
            const themeBg = colors[index % colors.length];
            return (
              <button
                key={formula.id}
                onClick={() => handleFormulaSelect(formula)}
                className={`w-full text-left p-4 rounded-[2rem] transition-all duration-300 border-4 border-black ${
                  isSelected
                    ? `${themeBg} text-white shadow-[8px_8px_0px_rgba(0,0,0,1)] scale-[1.03]`
                    : "bg-[#1d2433] hover:bg-[#2e374a] text-gray-300 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.6)]"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border-2 border-black ${isSelected ? "bg-white text-black" : "bg-slate-800 text-amber-400 border-slate-700"} font-mono`}>
                    {formula.rarity}
                  </span>
                  <span className={`text-[10px] font-mono ${isSelected ? "text-white" : "text-emerald-400"} flex items-center gap-1 font-black`}>
                    <Coins className="w-3.5 h-3.5 animate-pulse" /> Valor Base: +{formula.baseValue}
                  </span>
                </div>
                <h4 className={`font-black text-lg line-clamp-1 uppercase tracking-tight flex items-center gap-2 ${isSelected ? "text-white italic" : "text-gray-100"}`}>
                  <span className="text-2xl">{formula.symbolClass}</span>
                  <span>{formula.name}</span>
                </h4>
                <div className="flex flex-wrap gap-1 mt-1.5 font-mono select-none">
                  {formula.recipe.map((r, rIdx) => (
                    <span key={rIdx} className={`text-[9px] px-1.5 py-0.5 rounded border ${isSelected ? "bg-black/20 border-white/20 text-white" : "bg-black/40 border-slate-800 text-gray-300"}`}>
                      {r}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Alchemy Golden Rule */}
        <div className="bg-[#10B981] text-white border-4 border-black rounded-[2rem] p-5 shadow-[6px_6px_0px_rgba(0,0,0,0.55)]">
          <h4 className="text-white font-black text-xs uppercase tracking-widest font-mono mb-2 flex items-center gap-1.5">
            <Zap className="w-4 h-4 fill-current text-yellow-300" /> REGLA DE EXPANSIÓN ALQUÍMICA:
          </h4>
          <p className="text-xs leading-relaxed font-semibold">
            "Para desatar fusiones místicas, coloca los elementos requeridos <strong className="underline decoration-yellow-300 decoration-2">uno al lado del otro</strong> (adyacentes de forma horizontal o vertical). Ambos reaccionarán fusionándose automáticamente."
          </p>
          <div className="mt-4 border-t border-black/20 pt-3">
            <p className="text-[11px] text-white/85 italic font-medium leading-normal">
              Bono extra: Las fusiones otorgan un considerable pago de oro inmediato en tu cuenta, ideal para costear deudas justo antes del final del turno.
            </p>
          </div>
        </div>
      </div>

      {/* Main Selected Formula Detailed View */}
      <div className="lg:col-span-8 bg-[#111827] border-4 border-black rounded-[2.5rem] p-6 lg:p-8 flex flex-col justify-between shadow-[10px_10px_0px_rgba(0,0,0,0.55)]">
        <div>
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-4 border-black pb-5 mb-6 gap-3">
            <div>
              <span className="text-xs font-black font-mono text-[#F43F5E] uppercase tracking-widest bg-white border-2 border-black px-2.5 py-1 rounded-full shadow-[2px_2px_0px_#000]">
                {selectedFormula.rarity}
              </span>
              <h2 className="text-3xl sm:text-4.5xl font-black uppercase text-white mt-3 italic tracking-tight flex items-center gap-3">
                <span className="text-4xl sm:text-5xl filter drop-shadow-[3px_3px_0px_rgba(0,0,0,0.4)]">{selectedFormula.symbolClass}</span>
                <span>{selectedFormula.name}</span>
              </h2>
            </div>
            <button
              onClick={() => {
                playSound("click");
                onPlayDemo();
              }}
              className="px-5 py-3 bg-[#EC4899] hover:bg-pink-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:shadow-[0px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-yellow-300 fill-current" /> ¡FUSIONAR ESTO EN JUEGO!
            </button>
          </div>

          {/* Body Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* Formula ingredients */}
              <div>
                <label className="text-xs font-black text-yellow-400 flex items-center gap-1.5 uppercase tracking-wider mb-2 font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 border-2 border-black"></span> Ingredientes de Reacción
                </label>
                <div className="bg-slate-900 border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,0.4)] flex items-center gap-3">
                  <div className="flex items-center gap-1 font-black text-lg text-white">
                    {selectedFormula.recipe.map((ingredient, iIdx) => (
                      <span key={iIdx} className="flex items-center">
                        {iIdx > 0 && <span className="mx-2 text-pink-500 font-sans">+</span>}
                        <span className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-75 *text-white">
                          {ingredient}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reaction result */}
              <div>
                <label className="text-xs font-black text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider mb-2 font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-black"></span> Resultado Alquímico
                </label>
                <p className="text-sm leading-relaxed text-gray-200 bg-slate-900 border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,0.4)] font-black uppercase tracking-wide flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" /> Output: {selectedFormula.result} (Base +{selectedFormula.baseValue} Oro)
                </p>
              </div>

              {/* Gold Bonus */}
              <div>
                <label className="text-xs font-black text-[#F43F5E] flex items-center gap-1.5 uppercase tracking-wider mb-2 font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E] border-2 border-black"></span> Botín Extra por Reacción
                </label>
                <p className="text-sm leading-relaxed text-[#F43F5E] bg-[#F43F5E]/10 border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,0.4)] font-extrabold uppercase tracking-widest font-mono">
                  🤑 {selectedFormula.bonus}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Detailed lore / instructions */}
              <div>
                <label className="text-xs font-black text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider mb-2 font-mono">
                  <Compass className="w-4 h-4 text-emerald-400 shrink-0" /> Comentario Científico
                </label>
                <p className="text-sm leading-relaxed text-gray-200 bg-slate-900 border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,0.4)]">
                  {selectedFormula.description}
                </p>
              </div>

              {/* Alchemy pro tip */}
              <div>
                <label className="text-xs font-black text-amber-400 flex items-center gap-1.5 uppercase tracking-wider mb-2 font-mono">
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0" /> Estrategia de Combate
                </label>
                <p className="text-sm leading-relaxed text-gray-200 bg-[#F59E0B]/10 border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,0.4)] font-medium">
                  💡 <span className="font-extrabold text-amber-400 uppercase">Consejo de Maestros: </span>{selectedFormula.proTip}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action card trigger */}
        <div className="mt-8 border-t-4 border-black pt-6">
          <div className="bg-white p-5 rounded-[2rem] border-4 border-black flex flex-col sm:flex-row justify-between items-center gap-4 shadow-[6px_6px_0px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EC4899] text-white flex items-center justify-center shrink-0 border-4 border-black shadow-[2px_2px_0px_#000]">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase text-black">¿Domina todas las Leyes del Laboratorio?</h4>
                <p className="text-[11px] text-gray-700 font-semibold">Ejecuta estas recetas y bates la cuota requerida para alzarte supremo.</p>
              </div>
            </div>
            <button
              onClick={() => {
                playSound("click");
                onPlayDemo();
              }}
              className="w-full sm:w-auto px-5 py-3 bg-[#EC4899] hover:bg-pink-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[4px] transition-all cursor-pointer text-center"
            >
              Iniciar Partida 🕹️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
