import { useState, useEffect } from "react";
import { ElementSymbol, GameState, Rarity } from "../types";
import { playSound } from "../utils/audio";
import {
  RotateCcw,
  Sparkles,
  Trophy,
  Coins,
  ChevronRight,
  HelpCircle,
  Volume2,
  VolumeX,
  Play,
  Share2,
  Info,
  Layers,
  Sparkle
} from "lucide-react";

// Standard starter elements
const STARTER_DECK: ElementSymbol[] = [
  { id: "s1", name: "Agua", symbol: "💧", rarity: "común", baseValue: 1, description: "Nutre las plantas. Se combina con la Semilla para crear Flores." },
  { id: "s2", name: "Semilla", symbol: "🌱", rarity: "común", baseValue: 0, description: "Esperanza de vida. Combínala con Agua para crear Flores." },
  { id: "s3", name: "Sol", symbol: "☀️", rarity: "común", baseValue: 1, description: "Dador de energía. Hace madurar las Flores a Flores de Oro." },
  { id: "s4", name: "Fuego", symbol: "🔥", rarity: "común", baseValue: 2, description: "Fuerza destructiva y creativa. Se fusiona con Tierra para hacer Piedra." },
  { id: "s5", name: "Tierra", symbol: "🧱", rarity: "común", baseValue: 0, description: "Soporte estable. Combínala con Fuego para hornear Piedra." },
  { id: "s6", name: "Agua", symbol: "💧", rarity: "común", baseValue: 1, description: "Nutre las plantas. Combina con Tierra para hacer Arcilla." },
  { id: "s7", name: "Sol", symbol: "☀️", rarity: "común", baseValue: 1, description: "Dador de energía." },
];

// Special draftable cards
const CARD_POOL: ElementSymbol[] = [
  { id: "d1", name: "Abeja", symbol: "🐝", rarity: "raro", baseValue: 1, description: "Genera +5 de oro por cada Flor (🌸) o FlorDorada (⚜️) adyacente." },
  { id: "d2", name: "Alquimista", symbol: "🧙", rarity: "legendario", baseValue: 2, description: "Multiplica x2 el oro de todos los símbolos adyacentes." },
  { id: "d3", name: "Girasol", symbol: "🌻", rarity: "raro", baseValue: 4, description: "Genera +6 de oro si está adyacente a un Sol (☀️)." },
  { id: "d4", name: "Volcán", symbol: "🌋", rarity: "legendario", baseValue: 3, description: "Convierte cualquier Piedra (🪨) adyacente en Obsidiana (💎)." },
  { id: "d5", name: "Lluvia Fuerte", symbol: "🌧️", rarity: "común", baseValue: 1, description: "Sinergia: Al colocarse, irriga y transforma instantáneamente todas las Semillas en Flores." },
  { id: "d6", name: "Giga-Nube", symbol: "💨", rarity: "común", baseValue: 2, description: "Purifica el tablero. Al colocarla, elimina las Cenizas adyacentes." },
  { id: "d7", name: "Árbol Mágico", symbol: "🌲", rarity: "raro", baseValue: 5, description: "Oro estable de alto rendimiento. No requiere combinaciones." },
  { id: "d8", name: "Mago de Oro", symbol: "🧙‍♂️", rarity: "legendario", baseValue: 15, description: "Genera +15 de oro. Al final de cada ronda, tiene un 10% de probabilidad de desvanecerse." },
];

interface PlayablePrototypeProps {
  customUnlockedCards: ElementSymbol[];
  activeAccount: { username: string; highscore: number; gamesPlayed: number } | null;
  onUpdateScore: (finalScore: number) => void;
  onRecordGamePlay: () => void;
}

export default function PlayablePrototype({
  customUnlockedCards,
  activeAccount,
  onUpdateScore,
  onRecordGamePlay
}: PlayablePrototypeProps) {
  // Game values
  const [gold, setGold] = useState(0);
  const [quota, setQuota] = useState(30);
  const [round, setRound] = useState(1);
  const [turnsLeft, setTurnsLeft] = useState(6);
  const [grid, setGrid] = useState<(ElementSymbol | null)[]>(Array(9).fill(null));
  const [deck, setDeck] = useState<ElementSymbol[]>([]);
  const [hand, setHand] = useState<ElementSymbol[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [gameLog, setGameLog] = useState<string[]>(["¡Bienvenido a la Rejilla de Alquimia! Coloca elementos en el tablero para generar sinergias y oro."]);
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);

  // Drafting phase
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftChoices, setDraftChoices] = useState<ElementSymbol[]>([]);

  // Initialize a new game
  const startNewGame = () => {
    playSound("levelUp");
    setGold(0);
    setQuota(30);
    setRound(1);
    setTurnsLeft(6);
    setGrid(Array(9).fill(null));
    setGameLog(["Partida iniciada. Cuota objetivo: 30 de oro. ¡Buena suerte!"]);
    setIsGameOver(false);
    setIsVictory(false);
    setIsDrafting(false);
    setSelectedHandIndex(null);

    // Prepare deck
    const shuffled = [...STARTER_DECK].sort(() => Math.random() - 0.5);
    setDeck(shuffled.slice(3));
    setHand(shuffled.slice(0, 3));

    // Register active user game counter increase
    if (activeAccount) {
      onRecordGamePlay();
    }
  };

  useEffect(() => {
    startNewGame();
  }, [activeAccount?.username]);

  // Helper log message
  const addLog = (msg: string) => {
    setGameLog((prev) => [msg, ...prev.slice(0, 15)]);
  };

  const drawCard = (currentDeck: ElementSymbol[], currentHand: ElementSymbol[]) => {
    if (currentHand.length >= 3) return { deck: currentDeck, hand: currentHand };
    
    let tempDeck = [...currentDeck];
    let tempHand = [...currentHand];

    if (tempDeck.length === 0) {
      // Reshuffle starter elements + any drafted
      addLog("Mazo vacío. Barajando descarte...");
      tempDeck = [...STARTER_DECK].sort(() => Math.random() - 0.5);
    }

    const card = tempDeck.pop();
    if (card) {
      tempHand.push(card);
    }
    return { deck: tempDeck, hand: tempHand };
  };

  // Check board reactions/transformations
  const evaluateGridTransformations = (currentGrid: (ElementSymbol | null)[]) => {
    let newGrid = [...currentGrid];
    let goldAwarded = 0;
    let mergersHappened = false;

    // We do combinations!
    // Water (💧) + Seed (🌱) = Flower (🌸, baseValue 4)
    // Flower (🌸) + Sun (☀️) = Golden Flower (⚜️, baseValue 12)
    // Fire (🔥) + Tierra (🧱) = Stone (🪨, baseValue 2)
    // Agua (💧) + Tierra (🧱) = Clay (🏺, baseValue 3)
    // Stone (🪨) + Volcano (🌋) adjacent = Obsidiana (💎, baseValue 15)

    // Helper: find adjacent indexes in a 3x3 grid
    const getAdjacents = (idx: number) => {
      const adj: number[] = [];
      const row = Math.floor(idx / 3);
      const col = idx % 3;

      if (row > 0) adj.push(idx - 3); // top
      if (row < 2) adj.push(idx + 3); // bottom
      if (col > 0) adj.push(idx - 1); // left
      if (col < 2) adj.push(idx + 1); // right
      return adj;
    };

    let processedIndices = new Set<number>();

    // 1. Scan for dual merges (Water + Seed etc.) Map grid indexes
    for (let i = 0; i < 9; i++) {
      if (processedIndices.has(i) || !newGrid[i]) continue;
      const cardA = newGrid[i]!;
      const adjs = getAdjacents(i);

      for (const adjIdx of adjs) {
        if (processedIndices.has(adjIdx) || !newGrid[adjIdx]) continue;
        const cardB = newGrid[adjIdx]!;

        // Water + Seed -> Flower
        if (
          (cardA.symbol === "💧" && cardB.symbol === "🌱") ||
          (cardA.symbol === "🌱" && cardB.symbol === "💧")
        ) {
          processedIndices.add(i);
          processedIndices.add(adjIdx);
          newGrid[i] = {
            id: `f-${Date.now()}-${i}`,
            name: "Flor Silvestre",
            symbol: "🌸",
            rarity: "común",
            baseValue: 4,
            description: "Flor brillante. Atrae abejas."
          };
          newGrid[adjIdx] = null; // consume slot
          goldAwarded += 10; // Merger bonus
          mergersHappened = true;
          addLog("✨ ¡FUSIÓN! Agua + Semilla crearon una Flor Silvestre (+10 Oro)");
          break;
        }

        // Flower + Sun -> Golden Flower
        if (
          (cardA.symbol === "🌸" && cardB.symbol === "☀️") ||
          (cardA.symbol === "☀️" && cardB.symbol === "🌸")
        ) {
          processedIndices.add(i);
          processedIndices.add(adjIdx);
          newGrid[i] = {
            id: `gf-${Date.now()}-${i}`,
            name: "Flor de Oro",
            symbol: "⚜️",
            rarity: "raro",
            baseValue: 12,
            description: "Planta de Alquimista pura. Genera oro masivo."
          };
          newGrid[adjIdx] = null;
          goldAwarded += 25;
          mergersHappened = true;
          addLog("✨ ¡GRAN FUSIÓN! Flor + Sol crearon la sabia Flor de Oro (+25 Oro)");
          break;
        }

        // Fire + Soil -> Stone
        if (
          (cardA.symbol === "🔥" && cardB.symbol === "🧱") ||
          (cardA.symbol === "🧱" && cardB.symbol === "🔥")
        ) {
          processedIndices.add(i);
          processedIndices.add(adjIdx);
          newGrid[i] = {
            id: `st-${Date.now()}-${i}`,
            name: "Mineral de Piedra",
            symbol: "🪨",
            rarity: "común",
            baseValue: 2,
            description: "Roca sólida. Se puede forjar con volcanes para hacer Obsidiana."
          };
          newGrid[adjIdx] = null;
          goldAwarded += 5;
          mergersHappened = true;
          addLog("✨ ¡FUSIÓN! Fuego + Tierra cementaron una Piedra resistente (+5 Oro)");
          break;
        }

        // Water + Soil -> Clay
        if (
          (cardA.symbol === "💧" && cardB.symbol === "🧱") ||
          (cardA.symbol === "🧱" && cardB.symbol === "💧")
        ) {
          processedIndices.add(i);
          processedIndices.add(adjIdx);
          newGrid[i] = {
            id: `cl-${Date.now()}-${i}`,
            name: "Montículo de Arcilla",
            symbol: "🏺",
            rarity: "común",
            baseValue: 3,
            description: "Arcilla dócil. Otorga oro base estable."
          };
          newGrid[adjIdx] = null;
          goldAwarded += 7;
          mergersHappened = true;
          addLog("✨ ¡FUSIÓN! Agua + Tierra moldearon Arcilla Alquímica (+7 Oro)");
          break;
        }
      }
    }

    // 2. Scan for special proximity triggers (like Bee, Volcan, Alchemist)
    for (let i = 0; i < 9; i++) {
      if (!newGrid[i]) continue;
      const card = newGrid[i]!;
      const adjs = getAdjacents(i);

      // Bee (🐝) proximity boost
      if (card.symbol === "🐝") {
        let nearbyFlowers = 0;
        adjs.forEach((adjIdx) => {
          const neighbor = newGrid[adjIdx];
          if (neighbor && (neighbor.symbol === "🌸" || neighbor.symbol === "⚜️" || neighbor.symbol === "🌻")) {
            nearbyFlowers++;
          }
        });
        if (nearbyFlowers > 0) {
          goldAwarded += nearbyFlowers * 6;
          addLog(`🐝 Abeja adyacente a ${nearbyFlowers} flores recolectó néctar (+${nearbyFlowers * 6} Oro)`);
          mergersHappened = true;
        }
      }

      // Volcan (🌋) proximity turning Stone to Obsidian
      if (card.symbol === "🌋") {
        adjs.forEach((adjIdx) => {
          const neighbor = newGrid[adjIdx];
          if (neighbor && neighbor.symbol === "🪨") {
            newGrid[adjIdx] = {
              id: `obs-${Date.now()}-${adjIdx}`,
              name: "Obsidiana",
              symbol: "💎",
              rarity: "legendario",
              baseValue: 15,
              description: "Forjada en calor volcánico. Da oro masivo por turno."
            };
            goldAwarded += 15;
            mergersHappened = true;
            addLog("🌋 ¡VOLCÁN! Derritió Piedra en hermosa Obsidiana Cristalizada (+15 Oro y +15 base)");
          }
        });
      }

      // Alchemist (🧙) doubling adjacents
      if (card.symbol === "🧙") {
        let doubles = 0;
        adjs.forEach((adjIdx) => {
          const neighbor = newGrid[adjIdx];
          if (neighbor && neighbor.symbol !== "🧙") {
            goldAwarded += neighbor.baseValue; // double its production
            doubles++;
          }
        });
        if (doubles > 0) {
          addLog(`🧙 Alquimista canalizó magias para duplicar producción de ${doubles} vecinos.`);
          mergersHappened = true;
        }
      }

      // Sunflower (🌻) meeting Sun (☀️)
      if (card.symbol === "🌻") {
        let nearSun = false;
        adjs.forEach((adjIdx) => {
          const neighbor = newGrid[adjIdx];
          if (neighbor && neighbor.symbol === "☀️") nearSun = true;
        });
        if (nearSun) {
          goldAwarded += 8;
          addLog("🌻 Girasol brilla intensamente enfocado por el Sol (+8 Oro)");
          mergersHappened = true;
        }
      }
    }

    if (mergersHappened) {
      playSound("merge");
    }

    return { updatedGrid: newGrid, bonusGold: goldAwarded };
  };

  const selectHandCard = (index: number) => {
    if (isGameOver || isDrafting) return;
    playSound("click");
    setSelectedHandIndex(index);
  };

  // Place card onto the grid
  const placeCardOnGrid = (gridIndex: number) => {
    if (selectedHandIndex === null || isGameOver || isDrafting) return;
    if (grid[gridIndex] !== null) {
      addLog("Esa celda ya está ocupada. Conserva tu espacio de cuadrícula.");
      return;
    }

    // Play place sound
    playSound("place");

    const selectedCard = hand[selectedHandIndex];
    let newGrid = [...grid];
    newGrid[gridIndex] = selectedCard;

    // Special instant placement trigger: Lluvia Fuerte (🌧️)
    if (selectedCard.symbol === "🌧️") {
      addLog("🌧️ Tormenta de lluvia nutre el campo...");
      for (let i = 0; i < 9; i++) {
        if (newGrid[i]?.symbol === "🌱") {
          newGrid[i] = {
            id: `f-rain-${Date.now()}-${i}`,
            name: "Flor Silvestre",
            symbol: "🌸",
            rarity: "común",
            baseValue: 4,
            description: "Nutrida por la tormenta."
          };
          addLog("🌧️ Semilla irrigada creció a Flor Silvestre.");
        }
      }
    }

    // Special instant placement trigger: Giga-Nube (💨)
    if (selectedCard.symbol === "💨") {
      // Cleans grid a bit? Or just plays.
      addLog("💨 Nube sopla el tablero, despejando malas energías...");
    }

    // Remove from hand and draw new one
    let newHand = hand.filter((_, idx) => idx !== selectedHandIndex);
    const drawRes = drawCard(deck, newHand);
    setDeck(drawRes.deck);
    setHand(drawRes.hand);

    // Grid score generation
    let turnGold = selectedCard.baseValue;
    
    // Evaluate chain synergies and mergers
    const { updatedGrid, bonusGold } = evaluateGridTransformations(newGrid);
    turnGold += bonusGold;

    // Award gold
    setGold((prev) => prev + turnGold);
    setGrid(updatedGrid);
    setTurnsLeft((prev) => prev - 1);
    setSelectedHandIndex(null);

    // Log the turn
    addLog(`Colocaste ${selectedCard.symbol} ${selectedCard.name}. Generó +${turnGold} Oro (Base + Sinergias).`);

    // Check end of round or turn limits
    const remainingTurns = turnsLeft - 1;
    if (remainingTurns <= 0) {
      handleRoundFinish(updatedGrid);
    }
  };

  // End of Round Checking
  const handleRoundFinish = (finalGrid: (ElementSymbol | null)[]) => {
    // 1. Calculate static turn-over bonuses for gold
    let extraHarvest = 0;
    finalGrid.forEach((card) => {
      if (card) {
        extraHarvest += card.baseValue;
      }
    });

    // Gold magi checks (e.g. Mago de oro desvanecimiento)
    let cleanedGrid = [...finalGrid];
    let magiciansLeaving = 0;

    for (let i = 0; i < 9; i++) {
      const card = cleanedGrid[i];
      if (card && card.name === "Mago de Oro") {
        if (Math.random() < 0.15) {
          cleanedGrid[i] = null;
          magiciansLeaving++;
        }
      }
    }

    const roundFinalGold = gold + extraHarvest;
    setGold(roundFinalGold);
    setGrid(cleanedGrid);

    if (magiciansLeaving > 0) {
      addLog(`✨ ${magiciansLeaving} Mago(s) de Oro desapareció en una ráfaga de humo al terminar la ronda.`);
    }

    addLog(`Fin de la ronda ${round}. Cosecha pasiva de rejilla: +${extraHarvest} Oro.`);

    if (roundFinalGold >= quota) {
      // Quota paid! Play victory sound
      playSound("quota");
      addLog(`👑 ¡PAGASTE LA CUOTA! Logrado: ${roundFinalGold}/${quota}.`);
      
      // Start card draft selection phase
      triggerDraftingPhase();
    } else {
      // Fail!
      playSound("fail");
      setIsGameOver(true);
      addLog(`❌ Fin del juego. No pudiste pagar la cuota de ${quota} de oro. Puntuación final: ${roundFinalGold}.`);
      
      // Record user highscore if activeAccount exists
      if (activeAccount) {
        onUpdateScore(roundFinalGold);
      }
    }
  };

  // Generate 3 random cards for selection
  const triggerDraftingPhase = () => {
    setIsDrafting(true);
    // Combine standard CARD_POOL and any custom generated cards
    const fullPool = [...CARD_POOL, ...customUnlockedCards];
    const shuffled = fullPool.sort(() => Math.random() - 0.5);
    setDraftChoices(shuffled.slice(0, 3));
  };

  // User chooses a drafted card
  const handleDraftChoice = (selectedCard: ElementSymbol) => {
    playSound("levelUp");
    addLog(`Añadiste ${selectedCard.symbol} ${selectedCard.name} a tu mazo.`);

    // Add card to player's deck list representation
    const newDeck = [...deck, selectedCard];
    setDeck(newDeck);

    // ESCALATING THE QUOTA
    const nextRound = round + 1;
    let nextQuota = quota;
    if (nextRound === 2) nextQuota = 75;
    else if (nextRound === 3) nextQuota = 150;
    else if (nextRound === 4) nextQuota = 300;
    else nextQuota = quota + 150 + round * 10;

    // Reset board variables for next round
    setRound(nextRound);
    setQuota(nextQuota);
    setTurnsLeft(6);
    setIsDrafting(false);
    setGrid(Array(9).fill(null)); // Clear layout for fresh placement puzzle

    // Recheck hand
    const initialDraw = drawCard(newDeck, []);
    const secondDraw = drawCard(initialDraw.deck, initialDraw.hand);
    const thirdDraw = drawCard(secondDraw.deck, secondDraw.hand);
    
    setDeck(thirdDraw.deck);
    setHand(thirdDraw.hand);
    addLog(`Ronda ${nextRound} iniciada. Nueva cuota objetivo: ${nextQuota} oro. ¡Tienes 6 turnos!`);
  };

  // Skip drafting or manual trash
  const handleSkipDraft = () => {
    playSound("click");
    addLog("Omitiste el reclutamiento de cartas.");
    setIsDrafting(false);

    const nextRound = round + 1;
    let nextQuota = quota;
    if (nextRound === 2) nextQuota = 75;
    else if (nextRound === 3) nextQuota = 150;
    else nextQuota = quota + 150 + round * 15;

    setRound(nextRound);
    setQuota(nextQuota);
    setTurnsLeft(6);
    setGrid(Array(9).fill(null));

    // Refill hand
    const initialDraw = drawCard(deck, []);
    const secondDraw = drawCard(initialDraw.deck, initialDraw.hand);
    const thirdDraw = drawCard(secondDraw.deck, secondDraw.hand);
    setDeck(thirdDraw.deck);
    setHand(thirdDraw.hand);
  };

  return (
    <div id="playable-prototype" className="flex flex-col gap-8">
      {/* Upper Status Line */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#111827]/80 border-4 border-black p-5 rounded-[2rem] shadow-[6px_6px_0px_rgba(0,0,0,0.5)] select-none">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center border-4 border-black shadow-[2px_2px_0px_#000] shrink-0 font-black">
            💰
          </div>
          <div>
            <div className="text-[10px] uppercase font-black tracking-widest text-pink-500 font-mono">Oro Acumulado</div>
            <div className="text-2xl font-black font-mono text-white leading-tight">{gold}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center border-4 border-black shadow-[2px_2px_0px_#000] shrink-0 font-black">
            🎯
          </div>
          <div>
            <div className="text-[10px] uppercase font-black tracking-widest text-[#0EA5E9] font-mono">Cuota Objetivo</div>
            <div className="text-2xl font-black font-mono text-white leading-tight">
              {gold}/{quota}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center border-4 border-black shadow-[2px_2px_0px_#000] shrink-0 font-black">
            ⚡
          </div>
          <div>
            <div className="text-[10px] uppercase font-black tracking-widest text-amber-500 font-mono">Ronda / Fase</div>
            <div className="text-2xl font-black font-mono text-white leading-tight">{round}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center border-4 border-black shadow-[2px_2px_0px_#000] shrink-0 font-black">
            ⏳
          </div>
          <div>
            <div className="text-[10px] uppercase font-black tracking-widest text-emerald-400 font-mono">Turnos Restantes</div>
            <div className="text-2xl font-black font-mono text-white leading-tight">{turnsLeft}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Play board GRID (3x3) */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center bg-[#111827] p-6 rounded-[2.5rem] border-4 border-black relative shadow-[10px_10px_0px_rgba(0,0,0,0.5)]">
          <div className="mb-4 flex justify-between w-full items-center px-1">
            <span className="text-xs text-white font-black uppercase tracking-widest font-mono flex items-center gap-1.5 select-none">
              <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" /> Rejilla Alquímica
            </span>
            <div className="text-[10px] text-black font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white border-2 border-black">
              R1 30 • R2 75 • R3 150
            </div>
          </div>

          {/* Actual 3x3 playgrid */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[320px] aspect-square relative z-10 my-4">
            {grid.map((cell, idx) => {
              const isEmpty = cell === null;
              const hasSelection = selectedHandIndex !== null;

              // Assign colors dynamically based on rarity
              let cardBgClass = "bg-[#F59E0B] text-black"; // common (Amber)
              if (cell) {
                if (cell.rarity === "legendario") cardBgClass = "bg-[#EC4899] text-white"; // legendario (Pink-Red)
                else if (cell.rarity === "raro") cardBgClass = "bg-[#0EA5E9] text-white"; // raro (Sky Blue)
              }

              return (
                <button
                  key={idx}
                  onClick={() => placeCardOnGrid(idx)}
                  disabled={isEmpty && !hasSelection}
                  className={`relative p-2 rounded-2xl border-4 flex flex-col items-center justify-center gap-1 transition-all duration-300 aspect-square group ${
                    isEmpty
                      ? hasSelection
                        ? "bg-slate-800/20 border-blue-500/50 hover:bg-blue-500/10 hover:border-blue-500 cursor-pointer shadow-[inset_0_0_10px_rgba(59,130,246,0.15)] animate-pulse"
                        : "bg-[#111827] border-black/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.9)]"
                      : `${cardBgClass} border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:scale-105 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] active:translate-y-1 transition-transform`
                  }`}
                >
                  {/* Position label for visual help */}
                  <span className={`absolute top-1 right-1 text-[8px] font-black font-mono ${isEmpty ? "text-gray-600 opacity-60" : "text-black/45"}`}>
                    S{idx + 1}
                  </span>

                  {!isEmpty ? (
                    <>
                      <span className="text-3.5xl md:text-4xl filter drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)] transform group-hover:scale-110 transition-transform duration-300 select-none">
                        {cell.symbol}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-tight line-clamp-1">{cell.name}</span>
                      <span className="text-[8px] font-mono tracking-wider font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-white text-black border-2 border-black inline-flex items-center gap-0.5 select-none font-bold">
                        +{cell.baseValue}
                      </span>

                      {/* Floating hover detail */}
                      <div className="absolute hidden group-hover:block z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-black text-white border-4 border-black p-3 rounded-2xl text-[11px] leading-relaxed shadow-xl text-center pointer-events-none">
                        <div className="font-black text-white flex items-center justify-center gap-1 mb-1">
                          <span>{cell.symbol}</span>
                          <span className="text-[#F59E0B] font-mono uppercase tracking-tight">{cell.name}</span>
                        </div>
                        <p className="text-gray-300 text-[10px] leading-normal font-medium">{cell.description}</p>
                      </div>
                    </>
                  ) : (
                    <span className="text-[10px] text-gray-700 font-extrabold uppercase tracking-widest select-none">Empty</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Draft overlay screen modal */}
          {isDrafting && (
            <div className="absolute inset-0 bg-[#111827]/98 border-4 border-black rounded-[2.5rem] flex flex-col items-center justify-center p-6 z-20 text-center animate-fade-in shadow-[12px_12px_0px_rgba(0,0,0,1)]">
              <div className="w-12 h-12 rounded-full bg-[#EC4899] text-white border-4 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center mb-3 animate-bounce shrink-0">
                <Sparkle className="w-6 h-6 fill-current" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight italic">¡OBJETIVO SUPERADO!</h3>
              <p className="text-xs text-gray-300 max-w-sm mb-6 font-semibold">
                Recluta una nueva carta con sinergias potenciadoras para tu mazo permanente. Escoge con sabiduría:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full mb-6 max-h-[290px] overflow-y-auto pr-1">
                {draftChoices.map((choice) => {
                  let draftBgClass = "bg-[#F59E0B] text-black"; // común
                  if (choice.rarity === "legendario") draftBgClass = "bg-[#EC4899] text-white";
                  else if (choice.rarity === "raro") draftBgClass = "bg-[#0EA5E9] text-white";

                  return (
                    <button
                      key={choice.id}
                      onClick={() => handleDraftChoice(choice)}
                      className={`flex flex-col items-center justify-between p-4 rounded-2xl border-4 border-black ${draftBgClass} hover:scale-[1.04] transition-all duration-300 text-center gap-2 shadow-[4px_4px_0px_rgba(0,0,0,15)] active:translate-y-1 group cursor-pointer`}
                    >
                      <span className="text-4xl filter drop-shadow-md group-hover:scale-110 transition-transform duration-300">
                        {choice.symbol}
                      </span>
                      <div>
                        <h4 className="font-extrabold text-xs uppercase tracking-tight">{choice.name}</h4>
                        <p className="text-[9.5px] font-semibold mt-1 leading-normal line-clamp-3">
                          {choice.description}
                        </p>
                      </div>
                      <span className="text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-white text-black border-2 border-black select-none">
                        {choice.rarity}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleSkipDraft}
                className="text-xs font-black uppercase text-gray-400 hover:text-white underline underline-offset-4 cursor-pointer"
              >
                Omitir y avanzar ronde
              </button>
            </div>
          )}

          {/* Game Over / Reset Screen Modal */}
          {isGameOver && (
            <div className="absolute inset-0 bg-[#111827]/98 border-4 border-black rounded-[2.5rem] flex flex-col items-center justify-center p-6 z-20 text-center shadow-[12px_12px_0px_rgba(0,0,0,1)]">
              <span className="text-6xl mb-4 select-none animate-pulse">💀</span>
              <h3 className="text-2xl font-black text-red-500 uppercase tracking-tight italic">BANCARROTA ALQUÍMICA</h3>
              <p className="text-xs text-gray-300 max-w-xs mb-4 font-semibold">
                No pudiste satisfacer la cuota de {quota} oro requerida en la ronda {round}.
              </p>

              {activeAccount && (
                <div className="mb-5 bg-slate-900 border-4 border-black px-5 py-3 rounded-2xl text-xs font-black uppercase text-gray-300 flex flex-col items-center gap-1 shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
                  <span>Alquimista: <strong className="text-[#0EA5E9]">{activeAccount.username}</strong></span>
                  <span>Oro logrado: <strong className="text-[#EC4899]">{gold} 💰</strong></span>
                  <span>Récord personal: <strong className="text-yellow-400">{Math.max(activeAccount.highscore, gold)} 🏆</strong></span>
                </div>
              )}

              <button
                onClick={startNewGame}
                className="px-6 py-3 bg-[#EC4899] hover:bg-pink-600 text-white font-black uppercase tracking-wider text-xs rounded-2xl border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[4px] transition-all cursor-pointer flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> RECOMENZAR PARTIDA
              </button>
            </div>
          )}
        </div>

        {/* Player controls & hand deck */}
        <div className="lg:col-span-6 flex flex-col justify-between bg-[#1f2937] border-4 border-black p-6 rounded-[2.5rem] shadow-[10px_10px_0px_rgba(0,0,0,0.5)]">
          <div>
            <div className="flex justify-between items-center mb-4 pb-2 border-b-4 border-black select-none">
              <h4 className="text-xs font-mono font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#0EA5E9]" /> Tu Mano Alquímica
              </h4>
              <span className="text-[10px] font-black font-mono text-gray-400">// Coloca cartas en rejilla</span>
            </div>

            {/* Hand Cards list */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {hand.map((card, idx) => {
                const isSelected = selectedHandIndex === idx;
                
                let rarityClass = "bg-[#F59E0B] text-black"; // común
                if (card.rarity === "legendario") rarityClass = "bg-[#EC4899] text-white";
                else if (card.rarity === "raro") rarityClass = "bg-[#0EA5E9] text-white";

                return (
                  <button
                    key={card.id + idx}
                    onClick={() => selectHandCard(idx)}
                    className={`p-3 rounded-2xl border-4 border-black flex flex-col items-center justify-between text-center gap-1 transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? "bg-[#10B981] text-white scale-[1.08] shadow-[5px_5px_0px_rgba(0,0,0,1)] z-10"
                        : `${rarityClass} hover:scale-[1.02] shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-y-0.5`
                    }`}
                  >
                    <span className="text-3.5xl filter drop-shadow-[1px_1px_0px_rgba(0,0,0,0.4)] select-none">{card.symbol}</span>
                    <span className="text-xs font-black uppercase leading-none tracking-tight line-clamp-1">{card.name}</span>
                    <span className="text-[9px] font-semibold mt-0.5 line-clamp-2 h-6 leading-normal opacity-85">{card.description}</span>
                    <div className="mt-1.5 flex items-center bg-white text-black px-1.5 py-0.5 rounded-full border-2 border-black text-[9px] font-black select-none">
                      +{card.baseValue}
                    </div>
                  </button>
                );
              })}
              {hand.length === 0 && (
                <div className="col-span-3 text-center py-8 text-black font-black uppercase bg-white border-4 border-black shadow-[4px_4px_0px_#000] rounded-2xl">
                  Sin cartas en mano. Colocación final.
                </div>
              )}
            </div>

            {/* Fusions recipe helper box */}
            <div className="bg-[#111827] p-4 rounded-2xl border-4 border-black text-xs mb-4 shadow-[4px_4px_0px_rgba(0,0,0,0.3)]">
              <h5 className="text-[10px] uppercase font-mono tracking-widest text-[#F59E0B] font-black mb-2.5 flex items-center gap-1.5 select-none">
                <HelpCircle className="w-4 h-4 fill-current text-[#F59E0B]" /> Fórmulas de Fusión Comunes:
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 font-mono text-gray-300 text-[11px] font-semibold">
                <div className="flex items-center gap-1 shrink-0">
                  <span>💧 Agua</span> + <span>🌱 Semilla</span> <ChevronRight className="w-3.5 h-3.5 text-gray-500" /> <span className="text-pink-400 font-bold">🌸 Flor</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span>🌸 Flor</span> + <span>☀️ Sol</span> <ChevronRight className="w-3.5 h-3.5 text-gray-500" /> <span className="text-[#F59E0B] font-bold">⚜️ Flor de Oro</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span>🔥 Fuego</span> + <span>🧱 Tierra</span> <ChevronRight className="w-3.5 h-3.5 text-gray-500" /> <span className="text-stone-400 font-bold">🪨 Piedra</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span>💧 Agua</span> + <span>🧱 Tierra</span> <ChevronRight className="w-3.5 h-3.5 text-gray-500" /> <span className="text-orange-400 font-bold font-semibold">🏺 Arcilla</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Action Game Logger */}
          <div className="mt-2 flex flex-col">
            <h5 className="text-[10px] font-mono text-gray-400 mb-2 uppercase tracking-wide font-black select-none">// Registro de Alquimia y Combates</h5>
            <div className="bg-black border-4 border-black rounded-2xl p-4 shadow-[4px_4px_0px_rgba(0,0,0,0.6)] h-36 overflow-y-auto font-mono text-[10.5px] leading-relaxed text-emerald-400 space-y-1.5 scrollbar-thin">
              {gameLog.map((log, index) => (
                <div key={index} className={`pb-0.5 border-b border-white/5 last:border-0 ${index === 0 ? "text-yellow-300 font-bold" : "text-emerald-500/85"}`}>
                  &gt; {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
