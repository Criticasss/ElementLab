import React, { useState, useEffect, useRef } from "react";
import { ElementSymbol, Rarity } from "../types";
import { playSound } from "../utils/audio";
import { Account } from "./AccountManager";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Lock,
  Unlock,
  Coins,
  ArrowRight,
  RotateCcw,
  Zap,
  Trash2,
  HelpCircle,
  X,
  Play,
  Layers,
  Sparkle,
  Wand2,
  Trash
} from "lucide-react";

// List of all 18 known alchemical symbols for free-form experimentation
const CATALOG_ELEMENTS: Omit<ElementSymbol, "id">[] = [
  { name: "Agua", symbol: "💧", rarity: "común", baseValue: 1, description: "Nutre las plantas. Se combina con Semilla 🌱 para crear Flores 🌸." },
  { name: "Semilla", symbol: "🌱", rarity: "común", baseValue: 0, description: "Esperanza de vida. Combínala con Agua 💧 para crear Flores 🌸." },
  { name: "Sol", symbol: "☀️", rarity: "común", baseValue: 1, description: "Dador de energía. Hace madurar las Flores 🌸 a Flores de Oro ⚜️ o potencia Girasoles 🌻." },
  { name: "Fuego", symbol: "🔥", rarity: "común", baseValue: 2, description: "Fuerza destructiva y creativa. Se fusiona con Tierra 🧱 para hacer Piedra 🪨." },
  { name: "Tierra", symbol: "🧱", rarity: "común", baseValue: 0, description: "Soporte estable. Combínala con Fuego 🔥 para Piedra 🪨 y con Agua 💧 para Arcilla 🏺." },
  { name: "Piedra", symbol: "🪨", rarity: "común", baseValue: 2, description: "Roca sólida. Se puede templar con Volcanes 🌋 para hacer Obsidiana 💎." },
  { name: "Arcilla", symbol: "🏺", rarity: "común", baseValue: 3, description: "Arcilla porosa cocida de alta estabilidad." },
  { name: "Flor Silvestre", symbol: "🌸", rarity: "común", baseValue: 4, description: "Flor brillante. Atrae Abejas 🐝 y madura con Sol ☀️." },
  { name: "Flor de Oro", symbol: "⚜️", rarity: "raro", baseValue: 12, description: "Planta de Alquimista pura. Genera oro pasivo masivo." },
  { name: "Abeja", symbol: "🐝", rarity: "raro", baseValue: 1, description: "Poliniza flores. Genera +6 de oro por cada Flor 🌸, Flor de Oro ⚜️ o Girasol 🌻 adyacente." },
  { name: "Girasol", symbol: "🌻", rarity: "raro", baseValue: 4, description: "Genera +8 de oro si está adyacente a un Sol ☀️." },
  { name: "Volcán", symbol: "🌋", rarity: "legendario", baseValue: 3, description: "Calor tectónico masivo. Convierte la Piedra 🪨 adyacente en Obsidiana 💎." },
  { name: "Alquimista", symbol: "🧙", rarity: "legendario", baseValue: 2, description: "Especialista espacial. Multiplica x2 el oro de todos los símbolos adyacentes." },
  { name: "Lluvia Fuerte", symbol: "🌧️", rarity: "común", baseValue: 1, description: "Clima húmedo. Al colocarse transforma todas las Semillas 🌱 del tablero en Flores 🌸." },
  { name: "Giga-Nube", symbol: "💨", rarity: "común", baseValue: 2, description: "Viento purificador estable que disipa malos elementos." },
  { name: "Obsidiana", symbol: "💎", rarity: "legendario", baseValue: 15, description: "Gema forjada en magma volcánico. Oro excelente." },
  { name: "Árbol Mágico", symbol: "🌲", rarity: "raro", baseValue: 5, description: "Rendimiento constante de alta estabilidad y durabilidad." },
  { name: "Mago de Oro", symbol: "🧙‍♂️", rarity: "legendario", baseValue: 15, description: "Canalizador supremo de oro puro cuántico." }
];

interface SecondaryLabsManagerProps {
  activeAccount: Account | null;
  onUpdateAccountData: (updatedFields: Partial<Account>) => void;
  isSoundOn: boolean;
  mainGold: number;
  setMainGold?: React.Dispatch<React.SetStateAction<number>>;
}

export default function SecondaryLabsManager({
  activeAccount,
  onUpdateAccountData,
  isSoundOn,
  mainGold,
  setMainGold
}: SecondaryLabsManagerProps) {
  // Main states
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [labGrid, setLabGrid] = useState<(ElementSymbol | null)[]>(Array(9).fill(null));
  const [selectedCatalogElement, setSelectedCatalogElement] = useState<Omit<ElementSymbol, "id"> | null>(null);
  const [dragOverCellIndex, setDragOverCellIndex] = useState<number | null>(null);
  const [trashModeActive, setTrashModeActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [estimatedTally, setEstimatedTally] = useState(0);

  // Simulation logger state
  const [labLogs, setLabLogs] = useState<string[]>([
    "Bienvenido al Simulador Alquímico Libre.",
    "Arrastra elementos del catálogo o selecciónalos para estudiar sus reacciones sin límites."
  ]);

  // Floating effects inside the lab for extreme visual feedback
  const [labEffects, setLabEffects] = useState<{
    id: string;
    gridIndex: number;
    text: string;
    colorClass: string;
  }[]>([]);

  // Calculate grid passive estimated tally whenever anything changes
  useEffect(() => {
    evaluateTheoreticalGrid(labGrid);
  }, [labGrid, selectedCatalogElement]);

  // Helper log function
  const addLabLog = (text: string) => {
    setLabLogs((prev) => [text, ...prev].slice(0, 50));
  };

  // Helper flash effects
  const triggerLabEffect = (idx: number, text: string, colorClass: string) => {
    const timestamp = Date.now();
    const newEffect = {
      id: `${timestamp}-${idx}-${Math.random()}`,
      gridIndex: idx,
      text,
      colorClass
    };
    setLabEffects((prev) => [...prev, newEffect]);

    setTimeout(() => {
      setLabEffects((prev) => prev.filter((e) => e.id !== newEffect.id));
    }, 2000);
  };

  // Unlock laboratory flow
  const handlePayUnlockFee = () => {
    const playerGems = activeAccount?.etherGems || 0;
    if (playerGems < 100) {
      playSound("fail");
      setErrorMessage("¡No dispones de suficientes Gemas de Éter! Requieres 100 GE superando rondas en el tablero principal.");
      return;
    }

    playSound("levelUp");
    onUpdateAccountData({
      etherGems: playerGems - 100
    });
    setIsUnlocked(true);
    setErrorMessage(null);
    addLabLog("🔮 Reactor encendido: Se han deducido 100 Gemas de Éter (GE). ¡Disfruta con los ensayos!");
  };

  // Adjacency mapper (3x3 matching)
  const getAdjacents = (idx: number) => {
    const adj: number[] = [];
    const row = Math.floor(idx / 3);
    const col = idx % 3;
    if (row > 0) adj.push(idx - 3);
    if (row < 2) adj.push(idx + 3);
    if (col > 0) adj.push(idx - 1);
    if (col < 2) adj.push(idx + 1);
    return adj;
  };

  // React-based Grid Reaction Engine Sandbox
  const evaluateTheoreticalGrid = (gridState: (ElementSymbol | null)[]) => {
    let newGrid = [...gridState];
    let runningGold = 0;
    
    // Evaluate base values first
    for (let i = 0; i < 9; i++) {
      if (newGrid[i]) {
        runningGold += newGrid[i]!.baseValue;
      }
    }

    // Evaluate booster effects
    for (let i = 0; i < 9; i++) {
      const card = newGrid[i];
      if (!card) continue;
      const adjs = getAdjacents(i);

      // Bee (🐝) pollinators
      if (card.symbol === "🐝") {
        let flowerCount = 0;
        adjs.forEach((adjIdx) => {
          const adjCell = newGrid[adjIdx];
          if (adjCell && (adjCell.symbol === "🌸" || adjCell.symbol === "⚜️" || adjCell.symbol === "🌻")) {
            flowerCount++;
          }
        });
        if (flowerCount > 0) {
          runningGold += flowerCount * 6;
        }
      }

      // Alchemist (🧙) multiplies adjs
      if (card.symbol === "🧙") {
        adjs.forEach((adjIdx) => {
          const adjCell = newGrid[adjIdx];
          if (adjCell && adjCell.symbol !== "🧙") {
            runningGold += adjCell.baseValue; // doubles base value mathematically
          }
        });
      }

      // Sunflower (🌻) meeting Sun (☀️)
      if (card.symbol === "🌻") {
        let nearSun = false;
        adjs.forEach((adjIdx) => {
          if (newGrid[adjIdx]?.symbol === "☀️") nearSun = true;
        });
        if (nearSun) {
          runningGold += 8;
        }
      }
    }

    setEstimatedTally(runningGold);
  };

  // Process manual or incremental reactions / mergers
  const runActiveReactionStep = (currentGrid: (ElementSymbol | null)[]) => {
    let nextGrid = [...currentGrid];
    let mergerHappened = false;
    let processedIndices = new Set<number>();

    // Step 1: Sequential mergers (A + B)
    for (let i = 0; i < 9; i++) {
      if (processedIndices.has(i) || !nextGrid[i]) continue;
      const cardA = nextGrid[i]!;
      const adjs = getAdjacents(i);

      for (const adjIdx of adjs) {
        if (processedIndices.has(adjIdx) || !nextGrid[adjIdx]) continue;
        const cardB = nextGrid[adjIdx]!;

        // Water (💧) + Seed (🌱) -> Flor Silvestre (🌸)
        if (
          (cardA.symbol === "💧" && cardB.symbol === "🌱") ||
          (cardA.symbol === "🌱" && cardB.symbol === "💧")
        ) {
          processedIndices.add(i);
          processedIndices.add(adjIdx);
          nextGrid[i] = {
            id: `lab-item-${Date.now()}-flower`,
            name: "Flor Silvestre",
            symbol: "🌸",
            rarity: "común",
            baseValue: 4,
            description: "Flor hermosa cultivada mediante el agua."
          };
          nextGrid[adjIdx] = null;
          mergerHappened = true;
          addLabLog("🧬 Reacción: ¡Agua (💧) + Semilla (🌱) sintetizan Flor Silvestre (🌸)! (+10 Oro)");
          triggerLabEffect(i, "🌸 Fusión", "text-pink-400 font-extrabold animate-pulse");
          break;
        }

        // Flower (🌸) + Sun (☀️) -> Flor de Oro (⚜️)
        if (
          (cardA.symbol === "🌸" && cardB.symbol === "☀️") ||
          (cardA.symbol === "☀️" && cardB.symbol === "🌸")
        ) {
          processedIndices.add(i);
          processedIndices.add(adjIdx);
          nextGrid[i] = {
            id: `lab-item-${Date.now()}-gflower`,
            name: "Flor de Oro",
            symbol: "⚜️",
            rarity: "raro",
            baseValue: 12,
            description: "Regia flor dorada que prospera bajo el fuego del mediodía celestial."
          };
          nextGrid[adjIdx] = null;
          mergerHappened = true;
          addLabLog("⚜️ Super Fisión: ¡Maduración de Flor (🌸) a Flor de Oro (⚜️) por el Sol! (+25 Oro)");
          triggerLabEffect(i, "⚜️ Magnífica", "text-amber-400 font-black italic");
          break;
        }

        // Fire (🔥) + Tierra (🧱) -> Piedra (🪨)
        if (
          (cardA.symbol === "🔥" && cardB.symbol === "🧱") ||
          (cardA.symbol === "🧱" && cardB.symbol === "🔥")
        ) {
          processedIndices.add(i);
          processedIndices.add(adjIdx);
          nextGrid[i] = {
            id: `lab-item-${Date.now()}-stone`,
            name: "Piedra",
            symbol: "🪨",
            rarity: "común",
            baseValue: 2,
            description: "Bloque sólido de tierra calcinada por el calor."
          };
          nextGrid[adjIdx] = null;
          mergerHappened = true;
          addLabLog("🪨 Estructura: Fuego (🔥) y Tierra (🧱) fraguan Piedra sólida (🪨). (+5 Oro)");
          triggerLabEffect(i, "🪨 Piedra", "text-stone-300 font-bold");
          break;
        }

        // Water (💧) + Tierra (🧱) -> Arcilla (🏺)
        if (
          (cardA.symbol === "💧" && cardB.symbol === "🧱") ||
          (cardA.symbol === "🧱" && cardB.symbol === "💧")
        ) {
          processedIndices.add(i);
          processedIndices.add(adjIdx);
          nextGrid[i] = {
            id: `lab-item-${Date.now()}-clay`,
            name: "Arcilla",
            symbol: "🏺",
            rarity: "común",
            baseValue: 3,
            description: "Soporte denso modelado mediante humedad terrestre."
          };
          nextGrid[adjIdx] = null;
          mergerHappened = true;
          addLabLog("🏺 Cohesión: Barro y humedad compactan Arcilla moldeada (🏺). (+7 Oro)");
          triggerLabEffect(i, "🏺 Arcilla", "text-amber-600 font-semibold");
          break;
        }
      }
    }

    // Step 2: Indirect/Environmental triggers (e.g. Volcano transforming adjacent stone)
    for (let i = 0; i < 9; i++) {
      const card = nextGrid[i];
      if (card && card.symbol === "🌋") {
        const adjs = getAdjacents(i);
        adjs.forEach((adjIdx) => {
          const adjCell = nextGrid[adjIdx];
          if (adjCell && adjCell.symbol === "🪨") {
            nextGrid[adjIdx] = {
              id: `lab-item-${Date.now()}-obsidian-${adjIdx}`,
              name: "Obsidiana",
              symbol: "💎",
              rarity: "legendario",
              baseValue: 15,
              description: "Roca vítrea pulida por calor tectónico extremo."
            };
            mergerHappened = true;
            addLabLog("🌋 ¡Presión Volcánica! Transfórmase Piedra (🪨) en cristal de Obsidiana (💎). (+15 Oro)");
            triggerLabEffect(adjIdx, "💎 Obsidiana", "text-cyan-400 font-black animate-pulse");
          }
        });
      }
    }

    if (mergerHappened) {
      playSound("merge");
    }

    return nextGrid;
  };

  // Place custom element inside experimental plate
  const placeElementInLab = (gridIndex: number, element: Omit<ElementSymbol, "id">) => {
    if (labGrid[gridIndex] !== null) {
      playSound("fail");
      addLabLog("❌ Esa celda está ocupada. Limpia el espacio o usa la Herramienta de Borrado.");
      return;
    }

    playSound("place");
    const instantiated: ElementSymbol = {
      ...element,
      id: `lab-${element.symbol}-${Date.now()}-${Math.random()}`
    };

    let nextGrid = [...labGrid];
    nextGrid[gridIndex] = instantiated;

    // Special trigger: Lluvia Fuerte (🌧️)
    if (element.symbol === "🌧️") {
      addLabLog("🌧️ Simulación de temporal lluvioso nutriendo semillas...");
      for (let i = 0; i < 9; i++) {
        if (nextGrid[i]?.symbol === "🌱") {
          nextGrid[i] = {
            id: `lab-item-rain-${Date.now()}-${i}`,
            name: "Flor Silvestre",
            symbol: "🌸",
            rarity: "común",
            baseValue: 4,
            description: "Cosechada por lluvia abundante en reactor."
          };
          triggerLabEffect(i, "🌸 Regado", "text-pink-400 font-extrabold animate-bounce");
        }
      }
    }

    // Run active transformations
    nextGrid = runActiveReactionStep(nextGrid);

    setLabGrid(nextGrid);
    addLabLog(`Colocado ${element.symbol} ${element.name} en celda S${gridIndex + 1}.`);
    
    // Clear selection state after placing to keep interaction elegant
    setSelectedCatalogElement(null);
  };

  // Eraser cell action
  const handleEraserAction = (gridIndex: number) => {
    if (labGrid[gridIndex] === null) return;
    playSound("click");
    const removedSymbol = labGrid[gridIndex]!.symbol;
    let nextGrid = [...labGrid];
    nextGrid[gridIndex] = null;
    setLabGrid(nextGrid);
    addLabLog(`🧹 Cenizas aventadas: Removiste ${removedSymbol} de la celda S${gridIndex + 1}.`);
  };

  // Empty chemical table
  const clearLabGrid = () => {
    playSound("click");
    setLabGrid(Array(9).fill(null));
    setSelectedCatalogElement(null);
    setTrashModeActive(false);
    addLabLog("🧹 Tablero purificado: La mesa de experimentación ha sido vaciada por completo.");
  };

  if (!isUnlocked) {
    return (
      <div className="bg-[#1f2937] border-4 border-black p-6 sm:p-10 rounded-[2.5rem] shadow-[12px_12px_0px_rgba(0,0,0,0.45)] select-none text-center relative overflow-hidden animate-fade-in">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="w-16 h-16 rounded-3xl bg-purple-700/20 text-purple-400 flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] mx-auto mb-5">
          <Lock className="w-8 h-8 animate-pulse" />
        </div>

        <h3 className="text-2xl font-black text-white uppercase tracking-tight italic font-mono flex items-center justify-center gap-2">
          REACTOR DE ENSAYOS CUÁNTICOS
        </h3>
        
        <p className="text-xs text-purple-300 font-bold tracking-widest uppercase font-mono mt-1 select-none">
          Sandbox de Alquimia Libre No Premia
        </p>

        <p className="text-xs text-gray-300 max-w-lg mx-auto mt-4 leading-relaxed font-semibold">
          Activa el simulador cuántico para experimentar libremente con las <strong className="text-purple-400">18 fórmulas y elementos</strong> del Grimorio de Alquimia de forma ilimitada. Estudia proximidades de abejas, potenciación de alquimistas o reacciones volcánicas con seguridad.
        </p>

        <div className="my-8 max-w-sm mx-auto bg-black rounded-2xl border-4 border-black p-4 text-center font-mono shadow-[4px_4px_0px_rgba(0,0,0,0.3)]">
          <div className="text-[10px] text-gray-400 uppercase font-black">Requisito de Activación</div>
          <div className="text-2xl font-black text-yellow-300 mt-1">100 Gemas de Éter <span className="text-xs text-gray-500">GE</span></div>
          <p className="text-[9.5px] text-gray-400 mt-1.5 leading-normal">Se descontarán permanentemente de tu perfil de alquimista por cada acceso experimental.</p>
        </div>

        {errorMessage && (
          <div className="mb-4 text-xs font-mono text-red-400 font-black px-4 py-2 rounded-xl bg-red-950/20 border-2 border-red-900 border-dashed max-w-md mx-auto">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handlePayUnlockFee}
            className="px-8 py-3.5 bg-[#D946EF] hover:bg-pink-600 text-white font-black uppercase tracking-wider text-sm rounded-2xl border-4 border-black shadow-[5px_5px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-[4px] transition-all cursor-pointer flex items-center gap-2"
          >
            <Unlock className="w-4 h-4" /> ACTIVAR REACTOR sandbox
          </button>
        </div>

        <div className="mt-8 text-[10px] font-mono text-gray-500">// Consigues gemas de éter completando rondas en la Rejilla de Destilación principal.</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 select-none animate-fade-in">
      {/* LEFT COLUMN: Catalog panel of elements */}
      <div className="lg:col-span-5 flex flex-col bg-[#111827] border-4 border-black p-6 rounded-[2.5rem] shadow-[10px_10px_0px_rgba(0,0,0,0.5)]">
        <div className="border-b-4 border-black pb-3 mb-4 select-none">
          <h4 className="text-sm font-mono font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" /> Catálogo de Elementos Alquímicos
          </h4>
          <p className="text-[10px] text-gray-400 mt-0.5 leading-normal font-semibold">
            Haz clic en un elemento para cargarlo al puntero, o arrástralo y suéltalo directamente sobre cualquiera de las 9 celdas.
          </p>
        </div>

        {/* Scrollable Catalog elements list */}
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2.5 max-h-[450px] overflow-y-auto pr-1 scrollbar-thin">
          {CATALOG_ELEMENTS.map((el) => {
            const isSelected = selectedCatalogElement?.symbol === el.symbol && !trashModeActive;
            let rarityBg = "bg-[#F59E0B]/20 border-[#F59E0B]/50 hover:bg-[#F59E0B]/30 text-amber-300";
            if (el.rarity === "legendario") rarityBg = "bg-[#EC4899]/20 border-[#EC4899]/50 hover:bg-[#EC4899]/30 text-pink-400";
            else if (el.rarity === "raro") rarityBg = "bg-[#0EA5E9]/20 border-[#0EA5E9]/50 hover:bg-[#0EA5E9]/30 text-sky-400";

            return (
              <button
                key={el.name + el.symbol}
                draggable={true}
                onDragStart={(e) => {
                  setSelectedCatalogElement(el);
                  setTrashModeActive(false);
                  e.dataTransfer.setData("text/plain", el.symbol);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => {
                  playSound("click");
                  setTrashModeActive(false);
                  setSelectedCatalogElement(isSelected ? null : el);
                }}
                className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-between text-center gap-1.5 transition-all duration-300 cursor-grab active:cursor-grabbing group hover:scale-[1.03] ${
                  isSelected
                    ? "bg-[#D946EF] border-[#fff] text-white scale-[1.03] shadow-[3px_3px_0px_#000]"
                    : `${rarityBg} border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]`
                }`}
                title={`${el.name}: ${el.description}`}
              >
                <span className="text-3xl filter drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)] transform group-hover:scale-110 transition-transform duration-200">
                  {el.symbol}
                </span>
                
                <div>
                  <div className="text-[10px] font-black uppercase tracking-tight leading-none truncate max-w-[90px]">{el.name}</div>
                  <div className="text-[8px] opacity-75 font-mono mt-0.5 font-bold uppercase truncate">// Base: +{el.baseValue}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Pointer Status Box */}
        <div className="mt-4 p-3 bg-slate-900 border-2 border-black rounded-xl text-center select-none">
          {trashModeActive ? (
            <div className="text-[10px] uppercase font-black tracking-wider text-red-400 animate-pulse flex items-center justify-center gap-1.5">
              <span>🧹 MODO BORRADOR OPERATIVO: Haz clic en elementos de la mesa para disiparlos.</span>
            </div>
          ) : selectedCatalogElement ? (
            <div className="flex items-center justify-center gap-2 text-xs font-semibold">
              <span className="text-2xl">{selectedCatalogElement.symbol}</span>
              <div className="text-left leading-snug">
                <div className="font-mono text-[9px] text-[#D946EF] uppercase font-black tracking-widest">// ELEMENTO CARGADO:</div>
                <div className="text-white font-extrabold uppercase text-[10.5px]">{selectedCatalogElement.name} (Base +{selectedCatalogElement.baseValue})</div>
              </div>
              <button
                onClick={() => setSelectedCatalogElement(null)}
                className="ml-auto text-gray-500 hover:text-white"
                title="Cancelar Selección"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-black leading-normal select-none">
              PUNTERO LIBRE • Selecciona un elemento arriba o arrástralo
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Experimental grid and controller logs */}
      <div className="lg:col-span-7 flex flex-col bg-[#1f2937] border-4 border-black p-6 sm:p-8 rounded-[2.5rem] shadow-[10px_10px_0px_rgba(0,0,0,0.5)] relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b-4 border-black mb-4 gap-3">
          <div>
            <h4 className="text-sm font-mono font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-400" /> Reactor Cuántico: Laboratorio Central
            </h4>
            <p className="text-[10px] text-gray-400 font-semibold select-none leading-normal">
              Combina cualquier número de elementos en la placa base para testear reacciones químicas.
            </p>
          </div>
          
          <div className="bg-purple-950 border-2 border-purple-500 px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs font-mono font-black text-purple-300 shadow-[3px_3px_0px_#000] shrink-0">
            <span>PRODUCCIÓN PASIVA:</span>
            <span className="text-yellow-300 font-bold font-mono">+{estimatedTally} 💰</span>
          </div>
        </div>

        {/* 3x3 EXPERIMENTAL PLATE GRID */}
        <div className="flex items-center justify-center my-4">
          <div className="grid grid-cols-3 gap-3.5 w-full max-w-[310px] aspect-square relative z-10 p-3 bg-black/40 rounded-3xl border-4 border-black shadow-[inset_0px_0px_20px_#000]">
            {labGrid.map((cell, idx) => {
              const isEmpty = cell === null;
              const hasSelection = selectedCatalogElement !== null && !trashModeActive;
              const isTargeted = dragOverCellIndex === idx;

              // Assign colors dynamically based on rarity
              let cardBgClass = "bg-[#F59E0B] text-black"; // common (Amber)
              if (cell) {
                if (cell.rarity === "legendario") cardBgClass = "bg-[#EC4899] text-white"; // legendario (Pink-Red)
                else if (cell.rarity === "raro") cardBgClass = "bg-[#0EA5E9] text-white"; // raro (Sky Blue)
              }

              return (
                <button
                  key={idx}
                  onDragOver={(e) => {
                    if (isEmpty && hasSelection) {
                      e.preventDefault();
                    }
                  }}
                  onDragEnter={() => {
                    if (isEmpty && hasSelection) {
                      setDragOverCellIndex(idx);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverCellIndex === idx) {
                      setDragOverCellIndex(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverCellIndex(null);
                    if (isEmpty && selectedCatalogElement !== null) {
                      placeElementInLab(idx, selectedCatalogElement);
                    }
                  }}
                  onClick={() => {
                    if (trashModeActive) {
                      handleEraserAction(idx);
                    } else if (selectedCatalogElement !== null) {
                      placeElementInLab(idx, selectedCatalogElement);
                    }
                  }}
                  className={`relative p-2 rounded-2xl border-4 flex flex-col items-center justify-center gap-1 transition-all duration-300 aspect-square group ${
                    isEmpty
                      ? isTargeted
                        ? "bg-purple-500/20 border-purple-400 ring-4 ring-purple-400/35 scale-[1.03] cursor-pointer"
                        : hasSelection
                          ? "bg-slate-800/20 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-400 cursor-pointer shadow-[inset_0_0_10px_rgba(168,85,247,0.1)]"
                          : "bg-[#111827] border-black/45 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.95)]"
                      : trashModeActive
                        ? "bg-red-950/20 border-red-500/80 text-red-400 hover:bg-red-500/20 hover:scale-105 cursor-pointer shadow-[inset_0_0_8px_rgba(239,68,68,0.2)]"
                        : `${cardBgClass} border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:scale-105 active:translate-y-0.5 transition-transform cursor-pointer`
                  }`}
                >
                  {/* Floating numbers visual effects overlay */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center overflow-visible z-30">
                    {labEffects
                      .filter((e) => e.gridIndex === idx)
                      .map((e) => (
                        <span
                          key={e.id}
                          className={`absolute font-black tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] select-none text-xs md:text-sm animate-float-up-fade ${e.colorClass}`}
                        >
                          {e.text}
                        </span>
                      ))}
                  </div>

                  {/* Cell target position ID */}
                  <span className={`absolute top-1.5 right-1.5 text-[8px] font-mono tracking-tight font-extrabold ${isEmpty ? "text-gray-700 font-black" : "text-black/40 font-black"}`}>
                    S{idx + 1}
                  </span>

                  {!isEmpty ? (
                    <>
                      <span className="text-3xl filter drop-shadow-[2px_2px_0px_rgba(0,0,0,0.4)] transform group-hover:scale-110 transition-transform duration-250">
                        {cell.symbol}
                      </span>
                      <span className="text-[9.5px] font-black uppercase tracking-tight line-clamp-1">{cell.name}</span>
                      <span className="text-[7.5px] font-mono font-black uppercase px-1 py-0.2 rounded-full bg-white text-black border-2 border-black inline-flex items-center gap-0.5 select-none font-bold">
                        +{cell.baseValue}
                      </span>

                      {/* Hover Info Tooltip */}
                      <div className="absolute hidden group-hover:block z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-black/95 text-white border-4 border-black p-3 rounded-2xl text-[10.5px] leading-relaxed shadow-xl text-center pointer-events-none">
                        <div className="font-black text-white flex items-center justify-center gap-1 mb-1">
                          <span>{cell.symbol}</span>
                          <span className="text-purple-400 font-mono uppercase tracking-tight">{cell.name}</span>
                        </div>
                        <p className="text-gray-300 text-[10px] font-medium leading-normal">{cell.description}</p>
                      </div>
                    </>
                  ) : (
                    <span className="text-[8.5px] text-gray-700/80 font-black uppercase tracking-widest select-none">VACÍO</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* UTILITY CONTROL COMMAND BAR */}
        <div className="grid grid-cols-2 xs:flex xs:items-center justify-center gap-2.5 my-3 text-xs">
          <button
            onClick={() => {
              playSound("click");
              setSelectedCatalogElement(null);
              setTrashModeActive(!trashModeActive);
            }}
            className={`px-4 py-2 rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border-2 border-black ${
              trashModeActive
                ? "bg-red-500 text-white shadow-[2px_2px_0px_#000]"
                : "bg-slate-800 text-gray-300 hover:text-white shadow-[2px_2px_0px_#000]"
            }`}
          >
            <Trash2 className="w-4 h-4 text-red-400" /> REMOVER ELEMENTO
          </button>

          <button
            onClick={clearLabGrid}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-gray-200 font-black border-2 border-black uppercase tracking-wider rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] active:translate-y-[1.5px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4 text-emerald-400 font-black" /> REINICIAR PLACA
          </button>

          <button
            onClick={() => {
              playSound("click");
              setIsUnlocked(false);
              setLabGrid(Array(9).fill(null));
              setSelectedCatalogElement(null);
            }}
            className="px-4 py-2 bg-black hover:bg-slate-950 text-gray-400 hover:text-white font-black border-2 border-black uppercase tracking-wider rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[1.5px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4 text-red-500 font-black" /> APAGAR HORNO
          </button>
        </div>

        {/* SCROLLING SIMULATION REACTION LOGGER */}
        <div className="mt-3.5 flex flex-col">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest font-black select-none">
              // Registro de Reacciones del Reactor (Simulador)
            </span>
            <span className="text-[8.5px] text-purple-400 font-bold font-mono">⚠️ Modo Ensayo Activo</span>
          </div>
          
          <div className="bg-black border-4 border-black rounded-2xl p-4 shadow-[4px_4px_0px_rgba(0,0,0,0.6)] h-28 overflow-y-auto font-mono text-[10.5px] leading-relaxed text-purple-400 space-y-1 scrollbar-thin">
            {labLogs.map((log, index) => (
              <div key={index} className={`pb-0.5 border-b border-white/5 last:border-0 ${index === 0 ? "text-yellow-300 font-extrabold animate-pulse" : "text-purple-500/90"}`}>
                &gt; {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
