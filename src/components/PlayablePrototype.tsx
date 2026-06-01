import { useState, useEffect } from "react";
import { ElementSymbol, GameState, Rarity, Duel } from "../types";
import { playSound } from "../utils/audio";
import { Account } from "./AccountManager";
import { motion, AnimatePresence } from "motion/react";
import { collection, doc, setDoc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Swords, LogIn, Target, ChevronDown } from "lucide-react";
import { ACHIEVEMENTS_LIST } from "./AchievementsPanel";
import SecondaryLabsManager from "./SecondaryLabsManager";
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
  Sparkle,
  ShoppingBag,
  Wand2,
  Clock,
  RotateCw,
  Award
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
  activeAccount: Account | null;
  onUpdateScore: (finalScore: number) => void;
  onRecordGamePlay: () => void;
  onUpdateAccountData: (updatedFields: Partial<Account>) => void;
}

export default function PlayablePrototype({
  customUnlockedCards,
  activeAccount,
  onUpdateScore,
  onRecordGamePlay,
  onUpdateAccountData
}: PlayablePrototypeProps) {
  // Masteries check
  const hasBotany = activeAccount?.labMasteries?.includes("botanical_mastery") || localStorage.getItem("alquimia_viral_masteries")?.includes("botanical_mastery");
  const hasThermal = activeAccount?.labMasteries?.includes("thermal_mastery") || localStorage.getItem("alquimia_viral_masteries")?.includes("thermal_mastery");
  const hasQuantum = activeAccount?.labMasteries?.includes("quantum_mastery") || localStorage.getItem("alquimia_viral_masteries")?.includes("quantum_mastery");

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
  const [dragOverCellIndex, setDragOverCellIndex] = useState<number | null>(null);

  // Active Achievement Unlock Toast State
  const [toastNotification, setToastNotification] = useState<{
    id: string;
    name: string;
    emoji: string;
    criteria: string;
  } | null>(null);

  // Helper trigger to unlock achievement
  const triggerAchievementUnlock = (achievementId: string) => {
    if (!activeAccount) return;
    const currentAchievements = activeAccount.achievements || [];
    if (currentAchievements.includes(achievementId)) return;

    const match = ACHIEVEMENTS_LIST.find((a) => a.id === achievementId);
    if (match) {
      playSound("levelUp");
      setToastNotification({
        id: achievementId,
        name: match.name,
        emoji: match.emoji,
        criteria: match.criteria
      });

      // Show toast on-screen and automatically fade out in 4.5 seconds
      setTimeout(() => {
        setToastNotification(null);
      }, 4500);
    }

    const updatedAchievements = [...currentAchievements, achievementId];

    // Propagate updates to the global active account state
    onUpdateAccountData({
      achievements: updatedAchievements
    });
  };

  // Floating Effects Visual FX for Game Juice
  const [floatingEffects, setFloatingEffects] = useState<{
    id: string;
    gridIndex: number;
    text: string;
    colorClass: string;
  }[]>([]);

  const triggerEffectsDirectly = (effects: { gridIndex: number; text: string; colorClass: string }[]) => {
    const timestamp = Date.now();
    const newEffects = effects.map((e, idx) => ({
      id: `${timestamp}-${idx}-${Math.random()}`,
      gridIndex: e.gridIndex,
      text: e.text,
      colorClass: e.colorClass
    }));

    setFloatingEffects(prev => [...prev, ...newEffects]);

    // Clean up after 2000ms animation has processed
    setTimeout(() => {
      const idsToRemove = new Set(newEffects.map(ne => ne.id));
      setFloatingEffects(prev => prev.filter(e => !idsToRemove.has(e.id)));
    }, 2000);
  };

  // Screen selector including duels arena
  const [activeScreen, setActiveScreen] = useState<"board" | "shop" | "labs" | "duels">("board");

  // Duel states
  const [allDuels, setAllDuels] = useState<Duel[]>([]);
  const [currentActiveDuel, setCurrentActiveDuel] = useState<Duel | null>(null);
  const [opponentsList, setOpponentsList] = useState<string[]>([]);
  const [selectedOpponentName, setSelectedOpponentName] = useState<string>("");
  const [challengeMsg, setChallengeMsg] = useState<string>("");

  // Listen to all duels in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "duels"), (snapshot) => {
      try {
        const list: Duel[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as Duel);
        });
        setAllDuels(list);
      } catch (e) {
        console.error("Error charging duels:", e);
      }
    });
    return () => unsub();
  }, []);

  // Fetch registered alchemist list dynamically for challenging
  useEffect(() => {
    if (!activeAccount) return;
    const unsub = onSnapshot(collection(db, "accounts"), (snapshot) => {
      try {
        const list: string[] = [];
        snapshot.forEach((doc) => {
          const accName = doc.id;
          if (activeAccount && accName.toLowerCase() !== activeAccount.username.toLowerCase()) {
            list.push(accName);
          }
        });
        setOpponentsList(list);
        if (list.length > 0 && !selectedOpponentName) {
          setSelectedOpponentName(list[0]);
        }
      } catch (e) {
        console.error("Error charging opponents:", e);
      }
    });
    return () => unsub();
  }, [activeAccount]);

  const handleLaunchChallenge = async () => {
    if (!activeAccount || !selectedOpponentName) {
      playSound("fail");
      setChallengeMsg("Selecciona un oponente válido.");
      return;
    }

    const matchExists = allDuels.some(d => 
      (d.status === "active" || d.status === "pending") && 
      ((d.challenger.toLowerCase() === activeAccount.username.toLowerCase() && d.opponent.toLowerCase() === selectedOpponentName.toLowerCase()) ||
       (d.challenger.toLowerCase() === selectedOpponentName.toLowerCase() && d.opponent.toLowerCase() === activeAccount.username.toLowerCase()))
    );

    if (matchExists) {
      playSound("fail");
      setChallengeMsg(`Ya existe un reto pendiente o activo con ${selectedOpponentName}.`);
      return;
    }

    const id = `duel_${activeAccount.username}_${selectedOpponentName}_${Date.now()}`;
    const newDuel: Duel = {
      id,
      challenger: activeAccount.username,
      opponent: selectedOpponentName,
      currentPhase: 1,
      challengerStatus: "playing",
      opponentStatus: "playing",
      challengerScores: {},
      opponentScores: {},
      status: "pending",
      winner: null,
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };

    try {
      playSound("levelUp");
      await setDoc(doc(db, "duels", id), newDuel);
      setChallengeMsg(`⚡ ¡Has retado a [${selectedOpponentName}]!`);
      setTimeout(() => setChallengeMsg(""), 4000);
    } catch (e) {
      console.error("Error creating duel challenge:", e);
      setChallengeMsg("Error al enviar el reto.");
    }
  };

  const handleAcceptDuel = async (duel: Duel) => {
    playSound("levelUp");
    try {
      await updateDoc(doc(db, "duels", duel.id), {
        status: "active",
        lastUpdated: Date.now()
      });
    } catch (e) {
      console.error("Error accepting duel:", e);
    }
  };

  const handleDeclineDuel = async (duelId: string) => {
    playSound("click");
    try {
      const record = allDuels.find(d => d.id === duelId);
      if (record) {
        await setDoc(doc(db, "duels", duelId), {
          ...record,
          status: "completed",
          winner: "declinado",
          lastUpdated: Date.now()
        });
      }
    } catch (e) {
      console.error("Error declining duel:", e);
    }
  };

  // Activate Potion: Midas
  const usePotionMidas = () => {
    if (!activeAccount) return;
    const currentMidas = activeAccount.potions?.midas || 0;
    if (currentMidas <= 0) {
      playSound("fail");
      addLog("❌ No tienes Pociones de Midas en tu inventario.");
      return;
    }

    playSound("levelUp");
    setGold(prev => prev + 40);
    addLog("🧪 ¡POCIÓN DE MIDAS USADA! Generas instantáneamente +40 de Oro.");
    
    // Trigger floating effects on center cell
    triggerEffectsDirectly([
      { gridIndex: 4, text: "+40 💰", colorClass: "text-amber-300 font-extrabold text-lg animate-bounce animate-pulse" },
      { gridIndex: 4, text: "👑 Midas", colorClass: "text-yellow-400 font-black italic" }
    ]);

    // Update account inventory
    onUpdateAccountData({
      potions: {
        midas: currentMidas - 1,
        time: activeAccount.potions?.time || 0,
        chaos: activeAccount.potions?.chaos || 0
      }
    });
  };

  // Activate Potion: Tiempo
  const usePotionTime = () => {
    if (!activeAccount) return;
    const currentTime = activeAccount.potions?.time || 0;
    if (currentTime <= 0) {
      playSound("fail");
      addLog("❌ No tienes Pociones del Tiempo en tu inventario.");
      return;
    }

    playSound("levelUp");
    setTurnsLeft(prev => prev + 2);
    addLog("🕰️ ¡POCIÓN DEL TIEMPO USADA! Se añaden +2 turnos de colocación.");
    
    triggerEffectsDirectly([
      { gridIndex: 4, text: "+2 ⏳", colorClass: "text-emerald-400 font-extrabold text-lg" }
    ]);

    // Update account inventory
    onUpdateAccountData({
      potions: {
        midas: activeAccount.potions?.midas || 0,
        time: currentTime - 1,
        chaos: activeAccount.potions?.chaos || 0
      }
    });
  };

  // Activate Potion: Chaos
  const usePotionChaos = () => {
    if (!activeAccount) return;
    const currentChaos = activeAccount.potions?.chaos || 0;
    if (currentChaos <= 0) {
      playSound("fail");
      addLog("❌ No tienes Pociones de Caos en tu inventario.");
      return;
    }

    playSound("click");
    // Redraw hand
    const freshDeck = [...deck, ...hand].sort(() => Math.random() - 0.5);
    const initialDraw = drawCard(freshDeck, []);
    const secondDraw = drawCard(initialDraw.deck, initialDraw.hand);
    const thirdDraw = drawCard(secondDraw.deck, secondDraw.hand);

    setDeck(thirdDraw.deck);
    setHand(thirdDraw.hand);
    setSelectedHandIndex(null);

    addLog("🌪️ ¡POCIÓN DE CAOS USADA! Tu mano entera ha sido transmutada robando desde tu mazo.");
    triggerEffectsDirectly([
      { gridIndex: 4, text: "🌪️ Caos", colorClass: "text-purple-400 font-black animate-pulse" }
    ]);

    // Update account inventory
    onUpdateAccountData({
      potions: {
        midas: activeAccount.potions?.midas || 0,
        time: activeAccount.potions?.time || 0,
        chaos: currentChaos - 1
      }
    });
  };

  // Purchase items
  const buyPotion = (type: "midas" | "time" | "chaos", cost: number) => {
    if (!activeAccount) return;
    const gems = activeAccount.etherGems || 0;
    if (gems < cost) {
      playSound("fail");
      addLog("❌ Gemas de Éter insuficientes en tu balance.");
      return;
    }

    playSound("levelUp");
    const currentPotions = activeAccount.potions || { midas: 0, time: 0, chaos: 0 };
    const updatedGems = gems - cost;
    const updatedPotions = {
      ...currentPotions,
      [type]: (currentPotions[type] || 0) + 1
    };

    onUpdateAccountData({
      etherGems: updatedGems,
      potions: updatedPotions
    });

    addLog(`🛒 Compraste 1 Poción de ${type === "midas" ? "Midas" : type === "time" ? "Tiempo" : "Caos"} por ${cost} Gemas.`);
  };

  const buyRelic = (relicId: string, cost: number) => {
    if (!activeAccount) return;
    const gems = activeAccount.etherGems || 0;
    if (gems < cost) {
      playSound("fail");
      addLog("❌ Gemas de Éter insuficientes para forjar la reliquia.");
      return;
    }

    const currentRelics = activeAccount.relics || [];
    if (currentRelics.includes(relicId)) {
      playSound("fail");
      addLog("❌ Ya posees esta reliquia alquímica sagrada en tu altar.");
      return;
    }

    playSound("levelUp");
    const updatedGems = gems - cost;
    const updatedRelics = [...currentRelics, relicId];

    onUpdateAccountData({
      etherGems: updatedGems,
      relics: updatedRelics
    });

    addLog(`💎 ¡FORJASTE LA RELIQUIA! Adquiriste ${relicId === "crisol" ? "Crisol Sagrado" : relicId === "espejo" ? "Espejo Astral" : "Sello del Infinito"} por ${cost} Gemas.`);
  };

  // Drafting phase
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftChoices, setDraftChoices] = useState<ElementSymbol[]>([]);

  const handleStartDuelRound = (duel: Duel) => {
    playSound("click");
    setCurrentActiveDuel(duel);
    
    // Set board stats to exactly this Duel's phase setup
    const phase = duel.currentPhase;
    let phaseQuota = 30;
    if (phase === 2) phaseQuota = 75;
    else if (phase === 3) phaseQuota = 150;
    else if (phase === 4) phaseQuota = 300;
    else phaseQuota = 300 + (phase - 4) * 150;
    
    setRound(phase);
    setQuota(phaseQuota);
    setGold(0);
    
    const initialTurns = (activeAccount?.relics?.includes("sello") ? 7 : 6) + (hasQuantum ? 1 : 0);
    setTurnsLeft(initialTurns);
    setGrid(Array(9).fill(null));
    setGameLog([`⚔️ ¡DUELO INICIADO contra ${duel.challenger === activeAccount?.username ? duel.opponent : duel.challenger}! Fase ${phase}. Tienes ${initialTurns} turnos. Cuota ${phaseQuota} de oro.`]);
    setIsGameOver(false);
    setIsVictory(false);
    setIsDrafting(false);
    setSelectedHandIndex(null);

    // Prepare starter deck (shuffled)
    const shuffled = [...STARTER_DECK].sort(() => Math.random() - 0.5);
    setDeck(shuffled.slice(3));
    setHand(shuffled.slice(0, 3));

    // Move screen to board to play!
    setActiveScreen("board");
  };

  const handleSaveDuelRoundResult = async (finalGold: number) => {
    if (!currentActiveDuel || !activeAccount) return;
    
    const isChallenger = currentActiveDuel.challenger === activeAccount.username;
    const reachedQuota = finalGold >= quota;
    const newStatus = reachedQuota ? "passed" : "eliminated";
    
    const updatedChallengerScores = { ...currentActiveDuel.challengerScores };
    const updatedOpponentScores = { ...currentActiveDuel.opponentScores };
    
    let challengerStatus = currentActiveDuel.challengerStatus;
    let opponentStatus = currentActiveDuel.opponentStatus;
    
    if (isChallenger) {
      updatedChallengerScores[currentActiveDuel.currentPhase] = finalGold;
      challengerStatus = newStatus;
    } else {
      updatedOpponentScores[currentActiveDuel.currentPhase] = finalGold;
      opponentStatus = newStatus;
    }
    
    // Check if both players have played this phase
    let nextPhase = currentActiveDuel.currentPhase;
    let duelStatus = currentActiveDuel.status;
    let winner = currentActiveDuel.winner;
    
    const bothPlayed = (isChallenger && opponentStatus !== "playing") || (!isChallenger && challengerStatus !== "playing");
    
    if (bothPlayed) {
      // Determine outcome of this phase!
      const challengerScoreVal = isChallenger ? finalGold : (currentActiveDuel.challengerScores[currentActiveDuel.currentPhase] || 0);
      const opponentScoreVal = !isChallenger ? finalGold : (currentActiveDuel.opponentScores[currentActiveDuel.currentPhase] || 0);
      
      const challengerPassed = challengerStatus === "passed";
      const opponentPassed = opponentStatus === "passed";
      
      if (challengerPassed && !opponentPassed) {
        duelStatus = "completed";
        winner = currentActiveDuel.challenger;
      } else if (!challengerPassed && opponentPassed) {
        duelStatus = "completed";
        winner = currentActiveDuel.opponent;
      } else if (!challengerPassed && !opponentPassed) {
        // Both failed! Determine by highest score on this last phase
        if (challengerScoreVal > opponentScoreVal) {
          duelStatus = "completed";
          winner = currentActiveDuel.challenger;
        } else if (opponentScoreVal > challengerScoreVal) {
          duelStatus = "completed";
          winner = currentActiveDuel.opponent;
        } else {
          duelStatus = "completed";
          winner = "tie";
        }
      } else {
        // Both succeeded, escalate to next phase!
        nextPhase = currentActiveDuel.currentPhase + 1;
        challengerStatus = "playing";
        opponentStatus = "playing";
      }
    }
    
    const updatedDuel = {
      ...currentActiveDuel,
      currentPhase: nextPhase,
      challengerStatus,
      opponentStatus,
      challengerScores: updatedChallengerScores,
      opponentScores: updatedOpponentScores,
      status: duelStatus,
      winner,
      lastUpdated: Date.now()
    };
    
    try {
      playSound(reachedQuota ? "quota" : "fail");
      
      // Update the duel record in cloud
      const duelRef = doc(db, "duels", currentActiveDuel.id);
      await setDoc(duelRef, updatedDuel);
      
      addLog(`🚀 ¡Resultado de Duelo Guardado! Logrado: ${finalGold}/${quota} Oro [${newStatus}].`);
      
      // Reward 100 Éter Gems to the winner if completed
      if (duelStatus === "completed" && winner && winner !== "tie" && winner !== "declinado") {
        try {
          const winnerRef = doc(db, "accounts", winner);
          const winnerSnap = await getDoc(winnerRef);
          if (winnerSnap.exists()) {
            const winnerData = winnerSnap.data() as Account;
            const currentGems = winnerData.etherGems || 0;
            const gemsReward = 100;
            await updateDoc(winnerRef, {
              etherGems: currentGems + gemsReward,
              highscore: Math.max(winnerData.highscore || 0, finalGold)
            });
            addLog(`🏆 ¡El Duelo Alquímico terminó! Ganador: ${winner}. Se han acreditado +${gemsReward} Gemas de Éter.`);
          }
        } catch (error) {
          console.error("Error rewarding winner:", error);
        }
      }
      
      setCurrentActiveDuel(null);
      setIsGameOver(false);
      startNewGame(); // Reset to standard play
      setActiveScreen("duels"); // Return to duels arena to see scores!
    } catch (e) {
      console.error("Error saving duel round:", e);
      addLog("❌ Error de red al guardar el duelo en Firestore.");
    }
  };

  // Initialize a new game
  const startNewGame = () => {
    playSound("levelUp");
    setGold(0);
    setQuota(30);
    setRound(1);
    const initialTurns = (activeAccount?.relics?.includes("sello") ? 7 : 6) + (hasQuantum ? 1 : 0);
    setTurnsLeft(initialTurns);
    setGrid(Array(9).fill(null));
    setGameLog([`Partida iniciada. Cuota objetivo: 30 de oro. ¡Tienes e inicias con ${initialTurns} turnos de colocación! ¡Buena suerte!`]);
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
    const effectsList: { gridIndex: number; text: string; colorClass: string }[] = [];

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
            baseValue: hasBotany ? 6 : 4,
            description: "Flor brillante. Atrae abejas."
          };
          newGrid[adjIdx] = null; // consume slot
          goldAwarded += 10; // Merger bonus
          mergersHappened = true;
          addLog("✨ ¡FUSIÓN! Agua + Semilla crearon una Flor Silvestre (+10 Oro)");
          effectsList.push({ gridIndex: i, text: "+10 💰", colorClass: "text-yellow-400 font-extrabold" });
          effectsList.push({ gridIndex: i, text: "🌸 Fusión", colorClass: "text-pink-400 font-black italic animate-bounce" });
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
            baseValue: hasBotany ? 15 : 12,
            description: "Planta de Alquimista pura. Genera oro masivo."
          };
          newGrid[adjIdx] = null;
          goldAwarded += 25;
          mergersHappened = true;
          addLog("✨ ¡GRAN FUSIÓN! Flor + Sol crearon la sabia Flor de Oro (+25 Oro)");
          effectsList.push({ gridIndex: i, text: "+25 💰", colorClass: "text-yellow-400 font-extrabold" });
          effectsList.push({ gridIndex: i, text: "⚜️ Magna Fusión", colorClass: "text-amber-400 font-black italic animate-bounce" });
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
          goldAwarded += hasThermal ? 9 : 5;
          mergersHappened = true;
          addLog(hasThermal ? "✨ ¡FUSIÓN POTENCIADA! Fuego + Tierra hicieron una Piedra (Térmica Activa: +9 Oro)" : "✨ ¡FUSIÓN! Fuego + Tierra cementaron una Piedra resistente (+5 Oro)");
          effectsList.push({ gridIndex: i, text: "+5 💰", colorClass: "text-yellow-400 font-extrabold" });
          effectsList.push({ gridIndex: i, text: "🪨 Piedra", colorClass: "text-zinc-400 font-black italic" });
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
          effectsList.push({ gridIndex: i, text: "+7 💰", colorClass: "text-yellow-400 font-extrabold" });
          effectsList.push({ gridIndex: i, text: "🏺 Arcilla", colorClass: "text-orange-400 font-black italic" });
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
          effectsList.push({ gridIndex: i, text: `+${nearbyFlowers * 6} 💰`, colorClass: "text-yellow-400 font-extrabold" });
          effectsList.push({ gridIndex: i, text: "🐝 Néctar", colorClass: "text-amber-300 font-black" });
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
              baseValue: hasThermal ? 20 : 15,
              description: "Forjada en calor volcánico. Da oro masivo por turno."
            };
            goldAwarded += 15;
            mergersHappened = true;
            addLog("🌋 ¡VOLCÁN! Derritió Piedra en hermosa Obsidiana Cristalizada (+15 Oro y +15 base)");
            effectsList.push({ gridIndex: adjIdx, text: "+15 💰", colorClass: "text-yellow-400 font-extrabold" });
            effectsList.push({ gridIndex: adjIdx, text: "💎 Obsidiana", colorClass: "text-cyan-400 font-black italic" });
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
            if (neighbor.baseValue > 0) {
              effectsList.push({ gridIndex: adjIdx, text: `+${neighbor.baseValue} 💰`, colorClass: "text-yellow-400 font-extrabold" });
              effectsList.push({ gridIndex: adjIdx, text: "x2 ✨", colorClass: "text-purple-400 font-black" });
            }
          }
        });
        if (doubles > 0) {
          addLog(`🧙 Alquimista canalizó magias para duplicar producción de ${doubles} vecinos.`);
          mergersHappened = true;
          effectsList.push({ gridIndex: i, text: "🧙 Magia x2", colorClass: "text-fuchsia-400 font-bold" });
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
          effectsList.push({ gridIndex: i, text: "+8 💰", colorClass: "text-yellow-400 font-extrabold" });
          effectsList.push({ gridIndex: i, text: "🌻 Fotosíntesis", colorClass: "text-yellow-300 font-bold animate-pulse" });
        }
      }
    }

    if (mergersHappened) {
      playSound("merge");
      if (activeAccount?.relics?.includes("crisol")) {
        goldAwarded += 4;
        addLog("🏺 ¡CRISOL SAGRADO! La reacción catalizó +4 de oro de reliquia.");
        const firstFilledIdx = newGrid.findIndex(cell => cell !== null);
        effectsList.push({ gridIndex: firstFilledIdx !== -1 ? firstFilledIdx : 4, text: "+4 🏺", colorClass: "text-amber-400 font-bold" });
      }
    }

    return { updatedGrid: newGrid, bonusGold: goldAwarded, effects: effectsList };
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

    const rainEffects: { gridIndex: number; text: string; colorClass: string }[] = [];

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
          rainEffects.push({ gridIndex: i, text: "🌸 Regado", colorClass: "text-pink-400 font-extrabold animate-pulse" });
        }
      }
    }

    // Special instant placement trigger: Giga-Nube (💨)
    if (selectedCard.symbol === "💨") {
      // Cleans grid a bit? Or just plays.
      addLog("💨 Nube sopla el tablero, despejando malas energías...");
      rainEffects.push({ gridIndex: gridIndex, text: "💨 Limpieza", colorClass: "text-sky-300 font-extrabold" });
    }

    // Remove from hand and draw new one
    let newHand = hand.filter((_, idx) => idx !== selectedHandIndex);
    const drawRes = drawCard(deck, newHand);
    setDeck(drawRes.deck);
    setHand(drawRes.hand);

    // Grid score generation
    let turnGold = selectedCard.baseValue;
    
    // Evaluate chain synergies and mergers
    const { updatedGrid, bonusGold, effects } = evaluateGridTransformations(newGrid);
    turnGold += bonusGold;

    // Trigger floating effects visual pipeline
    const finalTurnEffects = [...rainEffects, ...effects];
    if (selectedCard.baseValue > 0) {
      finalTurnEffects.push({
        gridIndex: gridIndex,
        text: `+${selectedCard.baseValue} 💰`,
        colorClass: "text-[#10B981] font-black"
      });
    }
    if (finalTurnEffects.length > 0) {
      triggerEffectsDirectly(finalTurnEffects);
    }

    // Award gold
    setGold((prev) => prev + turnGold);
    setGrid(updatedGrid);
    setTurnsLeft((prev) => prev - 1);
    setSelectedHandIndex(null);

    // Evaluate Achievements triggers on placement
    if (activeAccount) {
      // 1. "piromano" (10 fire elements placed)
      if (selectedCard.symbol === "🔥" || selectedCard.symbol === "🌋") {
        const usernameKey = activeAccount.username || "anonymous";
        const currentCount = parseInt(localStorage.getItem(`fire_placed_${usernameKey}`) || "0") + 1;
        localStorage.setItem(`fire_placed_${usernameKey}`, currentCount.toString());
        if (currentCount >= 10) {
          triggerAchievementUnlock("piromano");
        }
      }

      // 2. "vacio" (create legendary)
      if (selectedCard.rarity === "legendario" || updatedGrid.some(cell => cell?.rarity === "legendario")) {
        triggerAchievementUnlock("vacio");
      }

      // 3. "rey_midas" (Flor de Oro created ⚜️)
      if (updatedGrid.some(cell => cell?.symbol === "⚜️")) {
        triggerAchievementUnlock("rey_midas");
      }

      // 4. "gran_cosecha" (generate 60+ gold)
      if (turnGold >= 60) {
        triggerAchievementUnlock("gran_cosecha");
      }

      // 5. "apicultor" (Bee adyacent to a flower/girasol/golden_flower)
      const hasApicultorCombo = updatedGrid.some((cell, cellIdx) => {
        if (cell?.symbol === "🐝") {
          const row = Math.floor(cellIdx / 3);
          const col = cellIdx % 3;
          const neighbors: number[] = [];
          if (row > 0) neighbors.push(cellIdx - 3);
          if (row < 2) neighbors.push(cellIdx + 3);
          if (col > 0) neighbors.push(cellIdx - 1);
          if (col < 2) neighbors.push(cellIdx + 1);

          return neighbors.some(nIdx => {
            const neighbor = updatedGrid[nIdx];
            return neighbor && (neighbor.symbol === "🌸" || neighbor.symbol === "⚜️" || neighbor.symbol === "🌻");
          });
        }
        return false;
      });
      if (hasApicultorCombo) {
        triggerAchievementUnlock("apicultor");
      }

      // 6. "rejilla_llena" (9 grid cells occupied)
      const allFilled = updatedGrid.every(cell => cell !== null);
      if (allFilled) {
        triggerAchievementUnlock("rejilla_llena");
      }
    }

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
    const roundHarvestEffects: { gridIndex: number; text: string; colorClass: string }[] = [];
    finalGrid.forEach((card, idx) => {
      if (card) {
        extraHarvest += card.baseValue;
        if (card.baseValue > 0) {
          roundHarvestEffects.push({
            gridIndex: idx,
            text: `+${card.baseValue} 💰`,
            colorClass: "text-yellow-400 font-extrabold font-mono"
          });
        }
      }
    });

    if (roundHarvestEffects.length > 0) {
      // Trigger harvesting gold effects
      triggerEffectsDirectly(roundHarvestEffects);
    }

    // Gold magi checks (e.g. Mago de oro desvanecimiento)
    let cleanedGrid = [...finalGrid];
    let magiciansLeaving = 0;
    const hasAstralMirror = activeAccount?.relics?.includes("espejo");

    for (let i = 0; i < 9; i++) {
      const card = cleanedGrid[i];
      if (card && card.name === "Mago de Oro") {
        if (hasAstralMirror) {
          // stabilized by relic
          continue;
        }
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

    if (currentActiveDuel) {
      handleSaveDuelRoundResult(roundFinalGold);
      return;
    }

    if (roundFinalGold >= quota) {
      // Quota paid! Play victory sound
      playSound("quota");
      
      const gemsEarned = 10 + (round * 5);
      addLog(`👑 ¡PAGASTE LA CUOTA! Logrado: ${roundFinalGold}/${quota}.`);
      addLog(`💎 ¡GANASTE +${gemsEarned} GEMAS DE ÉTER por superar la Fase ${round}!`);
      
      if (activeAccount) {
        onUpdateAccountData({
          etherGems: (activeAccount.etherGems || 0) + gemsEarned
        });
      }
      
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
    const initialTurns = (activeAccount?.relics?.includes("sello") ? 7 : 6) + (hasQuantum ? 1 : 0);
    setTurnsLeft(initialTurns);
    setIsDrafting(false);
    setGrid(Array(9).fill(null)); // Clear layout for fresh placement puzzle

    // Recheck hand
    const initialDraw = drawCard(newDeck, []);
    const secondDraw = drawCard(initialDraw.deck, initialDraw.hand);
    const thirdDraw = drawCard(secondDraw.deck, secondDraw.hand);
    
    setDeck(thirdDraw.deck);
    setHand(thirdDraw.hand);
    addLog(`Ronda ${nextRound} iniciada. Nueva cuota objetivo: ${nextQuota} oro. ¡Tienes ${initialTurns} turnos!`);
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
    const initialTurns = (activeAccount?.relics?.includes("sello") ? 7 : 6) + (hasQuantum ? 1 : 0);
    setTurnsLeft(initialTurns);
    setGrid(Array(9).fill(null));

    // Refill hand
    const initialDraw = drawCard(deck, []);
    const secondDraw = drawCard(initialDraw.deck, initialDraw.hand);
    const thirdDraw = drawCard(secondDraw.deck, secondDraw.hand);
    setDeck(thirdDraw.deck);
    setHand(thirdDraw.hand);
    addLog(`Ronda ${nextRound} iniciada. Nueva cuota objetivo: ${nextQuota} oro. ¡Tienes ${initialTurns} turnos!`);
  };

  return (
    <div id="playable-prototype" className="flex flex-col gap-8">
      {/* Toast Notification for Achievements Unlocks with clean slide / scale animations */}
      <AnimatePresence>
        {toastNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: -40, scale: 0.95, transition: { duration: 0.25 }, x: "-50%" }}
            className="fixed bottom-10 left-1/2 z-[999] w-[calc(100%-2rem)] max-w-md bg-gradient-to-r from-amber-500 via-amber-600 to-rose-600 border-4 border-black text-white px-5 py-3.5 rounded-[2rem] flex items-center gap-4 shadow-[8px_8px_0px_rgba(0,0,0,0.8)] outline-none overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-black border-2 border-white flex items-center justify-center text-2xl shrink-0 shadow-lg select-none">
              {toastNotification.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-mono text-yellow-200 uppercase tracking-widest font-black block animate-pulse">
                🏆 ¡LOGRO DESBLOQUEADO!
              </span>
              <p className="text-sm font-black uppercase text-white tracking-wide truncate">
                {toastNotification.name}
              </p>
              <p className="text-[10px] text-white/90 font-medium tracking-tight">
                {toastNotification.criteria}
              </p>
            </div>
            <div className="shrink-0 text-white font-black text-xs bg-black/40 px-3 py-1 rounded-full border border-white/20 select-none animate-bounce font-mono">
              +AR 🎖️
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom float keyframes for Game Juice Visual FX */}
      <style>{`
        @keyframes float-up-fade {
          0% {
            transform: translateY(15px) scale(0.8);
            opacity: 0;
          }
          15% {
            transform: translateY(0px) scale(1.15);
            opacity: 1;
          }
          85% {
            transform: translateY(-28px) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-48px) scale(0.8);
            opacity: 0;
          }
        }
        .animate-float-up-fade {
          animation: float-up-fade 1.6s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}</style>

      {/* Upper Status Line */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 bg-[#111827]/80 border-4 border-black p-5 rounded-[2rem] shadow-[6px_6px_0px_rgba(0,0,0,0.5)] select-none">
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

        <div className="flex items-center gap-3 px-2 col-span-2 lg:col-span-1 border-t-2 border-dashed border-slate-800 lg:border-t-0 lg:border-l-2 lg:pl-4">
          <div className="w-10 h-10 rounded-xl bg-[#0ea5e9]/10 text-[#0ea5e9] flex items-center justify-center border-4 border-black shadow-[2px_2px_0px_#000] shrink-0 font-black text-lg">
            💎
          </div>
          <div>
            <div className="text-[10px] uppercase font-black tracking-widest text-[#0ea5e9] font-mono">Éter Balance</div>
            <div className="text-2xl font-black font-mono text-yellow-300 leading-tight">
              {activeAccount?.etherGems || 0} <span className="text-[10px] text-gray-400">GE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Screen selector tabs */}
      <div className="flex flex-wrap border-4 border-black bg-slate-900 rounded-2xl p-1.5 gap-2 font-mono text-xs select-none">
        <button
          onClick={() => { playSound("click"); setActiveScreen("board"); }}
          className={`flex-1 py-3 px-4 rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeScreen === "board"
              ? "bg-[#0ea5e9] text-white border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] scale-[1.01]"
              : "text-gray-400 hover:text-white"
          }`}
        >
          🔮 Rejilla
        </button>
        <button
          onClick={() => { playSound("click"); setActiveScreen("shop"); }}
          className={`flex-1 py-3 px-4 rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeScreen === "shop"
              ? "bg-[#10B981] text-white border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] scale-[1.01]"
              : "text-gray-400 hover:text-white"
          }`}
        >
          🛒 Bazar
        </button>
        <button
          onClick={() => { playSound("click"); setActiveScreen("labs"); }}
          className={`flex-1 py-3 px-4 rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeScreen === "labs"
              ? "bg-[#D946EF] text-white border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] scale-[1.01]"
              : "text-gray-400 hover:text-[#D946EF]"
          }`}
        >
          🧪 Lab
        </button>
        <button
          onClick={() => { playSound("click"); setActiveScreen("duels"); }}
          className={`flex-1 py-3 px-4 rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
            activeScreen === "duels"
              ? "bg-[#F43F5E] text-white border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] scale-[1.01]"
              : "text-gray-400 hover:text-[#F43F5E]"
          }`}
        >
          <Swords className="w-3.5 h-3.5 shrink-0" />
          <span>Duelos</span>
          {activeAccount && allDuels.filter(d => d.status === "pending" && d.opponent.toLowerCase() === activeAccount.username.toLowerCase()).length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-yellow-400 text-black font-black flex items-center justify-center rounded-full text-[9px] border border-black animate-bounce shrink-0">
              !
            </span>
          )}
        </button>
      </div>

      {activeScreen === "board" && (
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
                    if (isEmpty && selectedHandIndex !== null) {
                      placeCardOnGrid(idx);
                    }
                  }}
                  disabled={isEmpty && !hasSelection}
                  className={`relative p-2 rounded-2xl border-4 flex flex-col items-center justify-center gap-1 transition-all duration-300 aspect-square group ${
                    isEmpty
                      ? dragOverCellIndex === idx
                        ? "bg-emerald-500/20 border-emerald-400 ring-4 ring-emerald-400/40 scale-[1.03] cursor-pointer"
                        : hasSelection
                          ? "bg-slate-800/20 border-blue-500/50 hover:bg-blue-500/10 hover:border-blue-500 cursor-pointer shadow-[inset_0_0_10px_rgba(59,130,246,0.15)] animate-pulse"
                          : "bg-[#111827] border-black/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.9)]"
                      : `${cardBgClass} border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:scale-105 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] active:translate-y-1 transition-transform`
                  }`}
                >
                  {/* Floating numbers visual effects overlay */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center overflow-visible z-30">
                    {floatingEffects
                      .filter((e) => e.gridIndex === idx)
                      .map((e, fxIdx) => (
                        <span
                          key={e.id}
                          className={`absolute font-black tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] select-none text-sm md:text-base animate-float-up-fade ${e.colorClass}`}
                          style={{
                            animationDelay: `${fxIdx * 0.15}s`,
                            marginTop: `${fxIdx * -12}px`
                          }}
                        >
                          {e.text}
                        </span>
                      ))}
                  </div>

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
                    draggable={true}
                    onDragStart={(e) => {
                      setSelectedHandIndex(idx);
                      e.dataTransfer.setData("text/plain", idx.toString());
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => selectHandCard(idx)}
                    className={`p-3 rounded-2xl border-4 border-black flex flex-col items-center justify-between text-center gap-1 transition-all duration-300 cursor-grab active:cursor-grabbing ${
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

            {/* Quick Elixirs Belt */}
            <div className="bg-[#111827] p-4 rounded-2xl border-4 border-black text-xs mb-4 shadow-[4px_4px_0px_rgba(0,0,0,0.3)]">
              <h5 className="text-[10px] uppercase font-mono tracking-widest text-[#10B981] font-black mb-2.5 flex items-center justify-between select-none">
                <span className="flex items-center gap-1.5">
                  <Wand2 className="w-4 h-4 text-[#10B981]" /> Cinturón de Pociones de Combate:
                </span>
                <span className="text-[8.5px] text-gray-500 font-bold font-mono">// Haz clic para activarlas</span>
              </h5>
              
              {!activeAccount ? (
                <div className="text-center py-2 text-gray-500 font-bold text-[10px] uppercase font-mono">
                  Registra tu cuenta para activar pociones en juego
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 select-none">
                  {/* Midas custom potion button */}
                  {(() => {
                    const count = activeAccount.potions?.midas || 0;
                    return (
                      <button
                        onClick={usePotionMidas}
                        disabled={count <= 0}
                        className={`p-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                          count > 0
                            ? "bg-slate-800 border-amber-400 hover:bg-amber-400/10 cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_rgba(0,0,0,1)] text-[#fff]"
                            : "bg-slate-900 border-slate-800/80 text-gray-600 cursor-not-allowed opacity-50"
                        }`}
                        title="Poción de Midas: Genera +40 de Oro instantáneamente"
                      >
                        <span className="text-xl">🧪</span>
                        <span className="text-[9.5px] font-black uppercase text-white mt-1 font-mono">Midas</span>
                        <span className={`text-[8.5px] font-mono font-black mt-0.5 px-1.5 py-0.2 rounded ${count > 0 ? "bg-amber-500 text-black animate-pulse" : "bg-black/40 text-gray-500"}`}>
                          Cant: {count}
                        </span>
                      </button>
                    );
                  })()}

                  {/* Time custom potion button */}
                  {(() => {
                    const count = activeAccount.potions?.time || 0;
                    return (
                      <button
                        onClick={usePotionTime}
                        disabled={count <= 0}
                        className={`p-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                          count > 0
                            ? "bg-slate-800 border-emerald-400 hover:bg-emerald-400/10 cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_rgba(0,0,0,1)] text-[#fff]"
                            : "bg-slate-900 border-slate-800/80 text-gray-600 cursor-not-allowed opacity-50"
                        }`}
                        title="Filtro de Tiempo: Añade +2 turnos de colocación"
                      >
                        <span className="text-xl">🕰️</span>
                        <span className="text-[9.5px] font-black uppercase text-white mt-1 font-mono">Tiempo</span>
                        <span className={`text-[8.5px] font-mono font-black mt-0.5 px-1.5 py-0.2 rounded ${count > 0 ? "bg-emerald-400 text-black animate-pulse" : "bg-black/40 text-gray-500"}`}>
                          Cant: {count}
                        </span>
                      </button>
                    );
                  })()}

                  {/* Chaos custom potion button */}
                  {(() => {
                    const count = activeAccount.potions?.chaos || 0;
                    return (
                      <button
                        onClick={usePotionChaos}
                        disabled={count <= 0}
                        className={`p-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                          count > 0
                            ? "bg-slate-800 border-purple-400 hover:bg-purple-400/10 cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_rgba(0,0,0,1)] text-[#fff]"
                            : "bg-slate-900 border-slate-800/80 text-gray-600 cursor-not-allowed opacity-50"
                        }`}
                        title="Elíxir de Inestabilidad: Descarta y roba tu mano al completo"
                      >
                        <span className="text-xl">🌪️</span>
                        <span className="text-[9.5px] font-black uppercase text-white mt-1 font-mono">Caos</span>
                        <span className={`text-[8.5px] font-mono font-black mt-0.5 px-1.5 py-0.2 rounded ${count > 0 ? "bg-purple-500 text-black animate-pulse" : "bg-black/40 text-gray-500"}`}>
                          Cant: {count}
                        </span>
                      </button>
                    );
                  })()}
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
      )}

      {activeScreen === "shop" && (
        <div className="bg-[#1f2937] border-4 border-black p-6 sm:p-8 rounded-[2.5rem] shadow-[12px_12px_0px_rgba(0,0,0,0.35)] relative overflow-hidden select-none">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-4 border-black pb-4 mb-6">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                <ShoppingBag className="w-5 h-5 text-emerald-400" /> Gran Bazar de Éter y Reliquias
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Utiliza tus Gemas de Éter acumuladas al superar fases para forjar amuletos pasivos o preparar pociones.
              </p>
            </div>
            
            <div className="bg-[#0EA5E9] border-4 border-black px-4 py-2 rounded-2xl flex items-center gap-2 shadow-[3px_3px_0px_#000] shrink-0 font-mono text-xs font-black text-white">
              <span>SALDO DISPONIBLE:</span>
              <span className="text-sm bg-black px-2 py-0.5 rounded-lg border border-white/10 text-yellow-300">
                💎 {activeAccount?.etherGems || 0} GE
              </span>
            </div>
          </div>

          {!activeAccount ? (
            <div className="text-center py-12 bg-[#111827] border-4 border-black rounded-3xl p-6">
              <span className="text-4xl">🧙‍♂️</span>
              <h4 className="font-mono text-sm font-black text-yellow-500 uppercase mt-2">Crea una Cuenta para Usar la Tienda</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1 font-semibold leading-relaxed">
                Necesitas un perfil de Alquimista activo para registrar monedas de éter y guardar tus reliquias forjadas permanentemente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Consumible potions section */}
              <div className="space-y-4">
                <h4 className="text-xs font-mono font-black text-amber-400 uppercase tracking-widest border-b-2 border-black pb-1.5 flex items-center gap-1.5">
                  🧪 Elixires y Consumibles
                </h4>
                
                <div className="space-y-3">
                  {/* Potion Card: Midas */}
                  <div className="bg-[#111827] p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0px_#000] flex justify-between items-center gap-4 hover:border-amber-400/50 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <span className="text-2xl bg-slate-800 p-2.5 rounded-xl border-2 border-black shrink-0">🧪</span>
                      <div>
                        <h5 className="text-xs font-black text-white uppercase tracking-wider">Poción de Midas</h5>
                        <p className="text-[10px] text-gray-400 font-semibold leading-normal mt-0.5 max-w-[180px]">
                          Añade inmediatamente <span className="text-yellow-400 font-bold">+40 de oro</span> pasivo a tu contador de ronda.
                        </p>
                        <div className="text-[9px] font-mono text-[#0ea5e9] mt-1 font-black">
                          Tienes: {activeAccount.potions?.midas || 0} un.
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => buyPotion("midas", 15)}
                      className="px-3.5 py-2 bg-[#10B981] hover:bg-emerald-600 font-black text-white rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] text-[10px] uppercase font-mono tracking-wider active:translate-y-0.5 cursor-pointer shrink-0"
                    >
                      💎 15 GE
                    </button>
                  </div>

                  {/* Potion Card: Time */}
                  <div className="bg-[#111827] p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0px_#000] flex justify-between items-center gap-4 hover:border-emerald-400/50 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <span className="text-2xl bg-slate-800 p-2.5 rounded-xl border-2 border-black shrink-0">🕰️</span>
                      <div>
                        <h5 className="text-xs font-black text-white uppercase tracking-wider">Filtro del Tiempo</h5>
                        <p className="text-[10px] text-gray-400 font-semibold leading-normal mt-0.5 max-w-[180px]">
                          Añade <span className="text-emerald-400 font-bold">+2 turnos</span> extras a la fase de colocación activa.
                        </p>
                        <div className="text-[9px] font-mono text-[#0ea5e9] mt-1 font-black">
                          Tienes: {activeAccount.potions?.time || 0} un.
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => buyPotion("time", 20)}
                      className="px-3.5 py-2 bg-[#10B981] hover:bg-emerald-600 font-black text-white rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] text-[10px] uppercase font-mono tracking-wider active:translate-y-0.5 cursor-pointer shrink-0"
                    >
                      💎 20 GE
                    </button>
                  </div>

                  {/* Potion Card: Chaos */}
                  <div className="bg-[#111827] p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0px_#000] flex justify-between items-center gap-4 hover:border-purple-400/50 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <span className="text-2xl bg-slate-800 p-2.5 rounded-xl border-2 border-black shrink-0">🌪️</span>
                      <div>
                        <h5 className="text-xs font-black text-white uppercase tracking-wider">Elíxir de Inestabilidad</h5>
                        <p className="text-[10px] text-gray-400 font-semibold leading-normal mt-0.5 max-w-[180px]">
                          Descarta tu mano al completo y <span className="text-purple-400 font-bold">roba 3 elementos</span> desde tu mazo.
                        </p>
                        <div className="text-[9px] font-mono text-[#0ea5e9] mt-1 font-black">
                          Tienes: {activeAccount.potions?.chaos || 0} un.
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => buyPotion("chaos", 10)}
                      className="px-3.5 py-2 bg-[#10B981] hover:bg-emerald-600 font-black text-white rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] text-[10px] uppercase font-mono tracking-wider active:translate-y-0.5 cursor-pointer shrink-0"
                    >
                      💎 10 GE
                    </button>
                  </div>
                </div>
              </div>

              {/* Permanent relics section */}
              <div className="space-y-4">
                <h4 className="text-xs font-mono font-black text-pink-500 uppercase tracking-widest border-b-2 border-black pb-1.5 flex items-center gap-1.5">
                  🏆 Amuletos y Reliquias Pasivas
                </h4>

                <div className="space-y-3">
                  {/* Relic Card: Crisol */}
                  {(() => {
                    const owned = activeAccount.relics?.includes("crisol");
                    return (
                      <div className="bg-[#111827] p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0px_#000] flex justify-between items-center gap-4 hover:border-pink-500/50 transition-colors">
                        <div className="flex items-start gap-2.5">
                          <span className="text-2xl bg-slate-800 p-2.5 rounded-xl border-2 border-black shrink-0">🏺</span>
                          <div>
                            <h5 className="text-xs font-black text-white uppercase tracking-wider">Crisol Sagrado</h5>
                            <p className="text-[10px] text-gray-400 font-semibold leading-normal mt-0.5 max-w-[180px]">
                              Toda fusión o sinergia en la rejilla genera <span className="text-amber-300 font-bold">+4 de oro extra</span> de forma permanente.
                            </p>
                            <span className={`text-[8.5px] font-mono font-black uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full inline-block ${owned ? "bg-[#10B981] text-white" : "bg-slate-800 text-gray-400"}`}>
                              {owned ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => buyRelic("crisol", 60)}
                          disabled={owned}
                          className={`px-3 py-2.5 font-black rounded-xl border-2 border-black text-[10px] uppercase font-mono tracking-wider transition-all select-none shrink-0 ${
                            owned
                              ? "bg-slate-700 text-gray-400 cursor-not-allowed shadow-none"
                              : "bg-[#10B981] hover:bg-emerald-600 text-white shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer"
                          }`}
                        >
                          {owned ? "Forjado" : "💎 60 GE"}
                        </button>
                      </div>
                    );
                  })()}

                  {/* Relic Card: Espejo */}
                  {(() => {
                    const owned = activeAccount.relics?.includes("espejo");
                    return (
                      <div className="bg-[#111827] p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0px_#000] flex justify-between items-center gap-4 hover:border-pink-500/50 transition-colors">
                        <div className="flex items-start gap-2.5">
                          <span className="text-2xl bg-slate-800 p-2.5 rounded-xl border-2 border-black shrink-0">🪞</span>
                          <div>
                            <h5 className="text-xs font-black text-white uppercase tracking-wider">Espejo Astral</h5>
                            <p className="text-[10px] text-gray-400 font-semibold leading-normal mt-0.5 max-w-[180px]">
                              Los cotizados <span className="text-yellow-400">Magos de Oro (🧙‍♂️)</span> son estables y ya <span className="text-[#EC4899] font-bold">no mueren</span> al finalizar turnos.
                            </p>
                            <span className={`text-[8.5px] font-mono font-black uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full inline-block ${owned ? "bg-[#10B981] text-white" : "bg-slate-800 text-gray-400"}`}>
                              {owned ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => buyRelic("espejo", 100)}
                          disabled={owned}
                          className={`px-3 py-2.5 font-black rounded-xl border-2 border-black text-[10px] uppercase font-mono tracking-wider transition-all select-none shrink-0 ${
                            owned
                              ? "bg-slate-700 text-gray-400 cursor-not-allowed shadow-none"
                              : "bg-[#10B981] hover:bg-emerald-600 text-white shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer"
                          }`}
                        >
                          {owned ? "Forjado" : "💎 100 GE"}
                        </button>
                      </div>
                    );
                  })()}

                  {/* Relic Card: Sello */}
                  {(() => {
                    const owned = activeAccount.relics?.includes("sello");
                    return (
                      <div className="bg-[#111827] p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0px_#000] flex justify-between items-center gap-4 hover:border-pink-500/50 transition-colors">
                        <div className="flex items-start gap-2.5">
                          <span className="text-2xl bg-slate-800 p-2.5 rounded-xl border-2 border-black shrink-0">♾️</span>
                          <div>
                            <h5 className="text-xs font-black text-white uppercase tracking-wider">Sello del Infinito</h5>
                            <p className="text-[10px] text-gray-400 font-semibold leading-normal mt-0.5 max-w-[180px]">
                              Inicias cada ronda con <span className="text-emerald-400 font-bold">+1 turno extra de colocación</span> (7 turnos en total).
                            </p>
                            <span className={`text-[8.5px] font-mono font-black uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full inline-block ${owned ? "bg-[#10B981] text-[#fff]" : "bg-slate-800 text-gray-400"}`}>
                              {owned ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => buyRelic("sello", 140)}
                          disabled={owned}
                          className={`px-3 py-2.5 font-black rounded-xl border-2 border-black text-[10px] uppercase font-mono tracking-wider transition-all select-none shrink-0 ${
                            owned
                              ? "bg-slate-700 text-gray-400 cursor-not-allowed shadow-none"
                              : "bg-[#10B981] hover:bg-emerald-600 text-white shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer"
                          }`}
                        >
                          {owned ? "Forjado" : "💎 140 GE"}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeScreen === "labs" && (
        <SecondaryLabsManager
          activeAccount={activeAccount}
          onUpdateAccountData={onUpdateAccountData}
          isSoundOn={isSoundOn}
          mainGold={gold}
          setMainGold={setGold}
        />
      )}

      {activeScreen === "duels" && (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto select-none font-sans">
          {/* Header banner */}
          <div className="bg-gradient-to-r from-red-950 to-slate-900 border-4 border-black rounded-3xl p-6 relative overflow-hidden shadow-[6px_6px_0px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-4 text-9xl opacity-10">⚔️</div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-rose-500 uppercase font-mono tracking-tight flex items-center gap-2">
                  <Swords className="w-6 h-6 text-yellow-500 animate-pulse" />
                  Arena de Duelos Alquímicos
                </h2>
                <p className="text-xs text-rose-200/80 font-mono mt-1 leading-relaxed">
                  Enfréntate a otros Alquimistas activos por turnos. Cosechen y superen las mismas fases, ¡el sobreviviente levanta la copa!
                </p>
              </div>
            </div>
          </div>

          {/* Current ongoing matches / challenges received */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Retos y Desafíos */}
            <div className="bg-[#111827]/80 border-4 border-black rounded-[2rem] p-6 shadow-[5px_5px_0px_#000]">
              <h3 className="text-sm font-black text-yellow-400 uppercase tracking-wider font-mono mb-4 flex items-center gap-2 border-b-2 border-dashed border-slate-800 pb-2">
                ⚔️ ENFRENTAMIENTOS EN VIVO
              </h3>

              {activeAccount ? (
                <div className="flex flex-col gap-3">
                  {allDuels.filter(d => 
                    (d.status === "active" || d.status === "pending") &&
                    (d.challenger.toLowerCase() === activeAccount.username.toLowerCase() || 
                     d.opponent.toLowerCase() === activeAccount.username.toLowerCase())
                  ).map((duel) => {
                    const isChallenger = duel.challenger.toLowerCase() === activeAccount.username.toLowerCase();
                    const opponent = isChallenger ? duel.opponent : duel.challenger;
                    const isPending = duel.status === "pending";
                    
                    const myStatus = isChallenger ? duel.challengerStatus : duel.opponentStatus;
                    const opponentStatus = isChallenger ? duel.opponentStatus : duel.challengerStatus;
                    
                    // It is my turn to play if status is "playing"
                    const isMyTurn = myStatus === "playing";
                    
                    return (
                      <div key={duel.id} className="border-4 border-black bg-slate-900 rounded-2xl p-4 flex flex-col gap-3 shadow-[2px_2px_0px_#000]">
                        <div className="flex justify-between items-center bg-slate-950 p-2 rounded-xl border border-slate-800">
                          <span className="text-xs font-black font-mono text-pink-400">
                            🆚 Rival: <span className="text-white bg-pink-900/50 px-2 py-0.5 rounded-md border border-pink-700">{opponent}</span>
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#10B981] text-black font-black uppercase">
                            Fase {duel.currentPhase}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-center font-mono my-1 bg-black/30 p-2.5 rounded-xl border border-slate-800/40">
                          <div>
                            <div className="text-[9px] uppercase font-bold text-gray-400">Tú ({activeAccount.username})</div>
                            <div className={`text-xs font-black mt-1 uppercase ${
                              myStatus === "passed" ? "text-emerald-400" : myStatus === "eliminated" ? "text-rose-500" : "text-amber-400"
                            }`}>
                              {myStatus === "passed" ? "Aprobado ✅" : myStatus === "eliminated" ? "Eliminado ❌" : "Pendiente ⏳"}
                            </div>
                            {duel.challengerScores[duel.currentPhase] !== undefined && isChallenger && (
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5">{duel.challengerScores[duel.currentPhase]} Oro</div>
                            )}
                            {duel.opponentScores[duel.currentPhase] !== undefined && !isChallenger && (
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5">{duel.opponentScores[duel.currentPhase]} Oro</div>
                            )}
                          </div>
                          <div>
                            <div className="text-[9px] uppercase font-bold text-gray-400">Rival ({opponent})</div>
                            <div className={`text-xs font-black mt-1 uppercase ${
                              opponentStatus === "passed" ? "text-emerald-400" : opponentStatus === "eliminated" ? "text-rose-500" : "text-amber-400"
                            }`}>
                              {opponentStatus === "passed" ? "Aprobado ✅" : opponentStatus === "eliminated" ? "Eliminado ❌" : "Pendiente ⏳"}
                            </div>
                            {duel.opponentScores[duel.currentPhase] !== undefined && isChallenger && (
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5">{duel.opponentScores[duel.currentPhase]} Oro</div>
                            )}
                            {duel.challengerScores[duel.currentPhase] !== undefined && !isChallenger && (
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5">{duel.challengerScores[duel.currentPhase]} Oro</div>
                            )}
                          </div>
                        </div>

                        {isPending ? (
                          isChallenger ? (
                            <div className="text-center py-1.5 text-[11px] font-mono text-gray-400 bg-slate-950/50 rounded-xl border border-slate-800">
                              Esperando aceptación de {opponent}...
                            </div>
                          ) : (
                            <div className="flex gap-2 w-full mt-1">
                              <button
                                onClick={() => handleAcceptDuel(duel)}
                                className="flex-1 py-2 bg-[#10B981] text-white border-2 border-black font-black uppercase font-mono tracking-wider text-[11px] rounded-xl hover:bg-emerald-600 transition-all cursor-pointer shadow-[2px_2px_0px_#000] active:translate-y-0.5"
                              >
                                Aceptar
                              </button>
                              <button
                                onClick={() => handleDeclineDuel(duel.id)}
                                className="py-2 px-3 bg-red-950 text-rose-200 border-2 border-black font-black uppercase font-mono text-[11px] rounded-xl hover:bg-red-950 transition-all cursor-pointer"
                              >
                                Rechazar
                              </button>
                            </div>
                          )
                        ) : (
                          isMyTurn ? (
                            <div>
                              {currentActiveDuel?.id === duel.id ? (
                                <div className="text-center py-2 text-[11px] font-black font-mono text-yellow-400 bg-yellow-950/40 border border-yellow-800 rounded-xl animate-pulse">
                                  🎮 Duelo activo... ¡Cosecha en la Rejilla!
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleStartDuelRound(duel)}
                                  className="w-full py-2 bg-[#F43F5E] text-white border-2 border-black font-black uppercase font-mono tracking-wider text-xs rounded-xl hover:bg-rose-600 transition-all cursor-pointer shadow-[3px_3px_0px_#000] active:translate-y-0.5 flex items-center justify-center gap-2 mt-1"
                                >
                                  <Swords className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                                  ¡Jugar Turno Fase {duel.currentPhase}!
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-2 text-[11px] font-mono text-amber-300 bg-amber-950/20 border border-amber-900/40 rounded-xl">
                              ⏳ Esperando turno del rival para resolver...
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}

                  {allDuels.filter(d => 
                    (d.status === "active" || d.status === "pending") &&
                    (d.challenger.toLowerCase() === activeAccount.username.toLowerCase() || 
                     d.opponent.toLowerCase() === activeAccount.username.toLowerCase())
                  ).length === 0 && (
                    <div className="text-center py-8 text-gray-500 font-mono text-xs border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/50">
                      🛡️ No tienes enfrentamientos en curso.<br />
                      ¡Reta a un alchemist para iniciar la contienda!
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 font-mono text-xs">
                  Inicia sesión para ver tu historial y participar en duelos.
                </div>
              )}
            </div>

            {/* Reta a otros Alquimistas */}
            <div className="bg-[#111827]/80 border-4 border-black rounded-[2rem] p-6 shadow-[5px_5px_0px_#000] flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-rose-400 uppercase tracking-wider font-mono mb-4 flex items-center gap-2 border-b-2 border-dashed border-slate-800 pb-2">
                  🗡️ DESAFIAR AL ALQUIMISTA
                </h3>
                
                <p className="text-xs text-gray-400 font-mono leading-relaxed mb-4">
                  Selecciona de la lista un alchemist activo para enviarle una propuesta de enfrentamiento. Se notificará a tu adversario al instante.
                </p>

                <div className="space-y-4 my-2">
                  <div>
                    <label className="text-[10px] text-pink-500 font-black uppercase font-mono block mb-1.5">
                      ⚔️ SELECCIONAR ALQUIMISTA RIVAL:
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedOpponentName}
                        onChange={(e) => setSelectedOpponentName(e.target.value)}
                        className="flex-1 bg-slate-950 text-white font-mono text-xs rounded-xl p-3 border-2 border-black outline-none focus:border-rose-500 cursor-pointer"
                      >
                        {opponentsList.map((opp) => (
                          <option key={opp} value={opp}>
                            🔮 {opp}
                          </option>
                        ))}
                        {opponentsList.length === 0 && (
                          <option value="">No hay otros oponentes registrados</option>
                        )}
                      </select>
                      
                      <button
                        onClick={handleLaunchChallenge}
                        disabled={opponentsList.length === 0}
                        className={`px-5 py-3 font-black uppercase tracking-wider font-mono text-xs text-black border-2 border-black rounded-xl transition-all shadow-[2px_2px_0px_#000] active:translate-y-0.5 shrink-0 ${
                          opponentsList.length === 0 
                            ? "bg-slate-800 text-gray-600 border-gray-900 cursor-not-allowed" 
                            : "bg-[#F59E0B] hover:bg-amber-500 cursor-pointer"
                        }`}
                      >
                        RETAR ⚔️
                      </button>
                    </div>
                  </div>

                  {challengeMsg && (
                    <div className="font-mono text-xs p-3 bg-red-950/50 border border-rose-800 text-pink-300 rounded-xl text-center font-bold">
                      {challengeMsg}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 border-t-2 border-dashed border-slate-800/80 pt-4 text-[10px] text-gray-500 font-mono flex flex-col gap-1 leading-relaxed">
                <span>💡 **Estructura y Reglas del Duelo**:</span>
                <span>• Se disputa sincronizado por turnos: los dos juegan la Fase actual en la Rejilla de forma independiente.</span>
                <span>• Si superas la cuota de oro y tu oponente no, ¡ganas inmediatamente!</span>
                <span>• Si ambos fracasan, ganará quien tenga la mayor cantidad de oro absoluto cosechada.</span>
                <span>• ¡El vencedor absoluto recibe un botín de 💎 +100 Gemas de Éter!</span>
              </div>
            </div>
          </div>

          {/* Historial completado de duelos */}
          <div className="bg-[#111827]/80 border-4 border-black rounded-[2rem] p-6 shadow-[5px_5px_0px_#000]">
            <h3 className="text-sm font-black text-rose-500 uppercase tracking-wider font-mono mb-4 flex items-center gap-2 border-b-2 border-dashed border-slate-800 pb-2">
              🏆 SALÓN DE GLORIA Y VICTORIAS ALQUÍMICAS
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {allDuels.filter(d => d.status === "completed").map((duel) => {
                const isWinner = activeAccount && duel.winner === activeAccount.username;
                const isTie = duel.winner === "tie";
                const isDeclinado = duel.winner === "declinado";
                
                return (
                  <div key={duel.id} className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-4 flex flex-col gap-2 font-mono text-xs relative overflow-hidden">
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <span>Rondas jugadas: {duel.currentPhase}</span>
                      <span className="uppercase text-[9px] px-1.5 py-0.5 bg-slate-955 rounded border border-slate-800 font-bold">Resuelto</span>
                    </div>

                    <div className="text-xs font-black text-white py-1">
                      ⚔️ {duel.challenger} contra {duel.opponent}
                    </div>

                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center mt-1">
                      {isDeclinado ? (
                        <span className="text-gray-500 font-bold italic">Desafío Declinado ❌</span>
                      ) : isTie ? (
                        <span className="text-amber-400 font-black">Empate Técnico 🤝</span>
                      ) : (
                        <div>
                          <span className="text-gray-400 text-[9px] block">CROWNED VICTOR:</span>
                          <span className="text-yellow-400 block uppercase tracking-tight font-black text-xs">👑 {duel.winner}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {allDuels.filter(d => d.status === "completed").length === 0 && (
                <div className="col-span-full text-center py-6 text-gray-500 font-mono text-xs">
                  Aún no hay batallas registradas en el Salón de la Gloria.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
