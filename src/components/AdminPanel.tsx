import { useState, useEffect } from "react";
import { Account } from "./AccountManager";
import { playSound } from "../utils/audio";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  X,
  Plus,
  Wand2,
  Trophy,
  History,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeAccount: Account | null;
  onUpdateAccountData: (updatedFields: Partial<Account>) => void;
}

export default function AdminPanel({
  isOpen,
  onClose,
  activeAccount,
  onUpdateAccountData
}: AdminPanelProps) {
  const [pinCode, setPinCode] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [statusLog, setStatusLog] = useState<string>("ESPERANDO CÓDIGO DE AUTORIZACIÓN...");
  const [broadcastInput, setBroadcastInput] = useState<string>("");

  // Keyboard listener for pin-pad entry
  useEffect(() => {
    if (!isOpen || isAuthenticated) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key >= "0" && e.key <= "9") {
        handlePressDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Enter") {
        // Auto-triggers if length matches, but lets user hit Enter too
        if (pinCode.length === 4) {
          verifyPin(pinCode);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, pinCode, isAuthenticated]);

  // Reset states on opening/closing
  useEffect(() => {
    if (isOpen) {
      setPinCode("");
      setIsError(false);
      setStatusLog("SISTEMA DE SEGURIDAD RECONFIGURADO. INGRESA PIN DE 4 DÍGITOS.");
    }
  }, [isOpen]);

  const handlePressDigit = (digit: string) => {
    if (pinCode.length >= 4) return;
    playSound("click");
    const nextCode = pinCode + digit;
    setPinCode(nextCode);
    setIsError(false);

    if (nextCode.length === 4) {
      verifyPin(nextCode);
    }
  };

  const handleBackspace = () => {
    if (pinCode.length === 0) return;
    playSound("click");
    setPinCode(prev => prev.slice(0, -1));
    setIsError(false);
  };

  const handleClear = () => {
    playSound("click");
    setPinCode("");
    setIsError(false);
    setStatusLog("SISTEMA LIMPIO.");
  };

  const verifyPin = (code: string) => {
    if (code === "0072") {
      playSound("levelUp");
      setIsAuthenticated(true);
      setStatusLog("ACCESO COMPLETO CONCEDIDO. BIENVENIDO, SUPERUSER.");
    } else {
      playSound("fail");
      setIsError(true);
      setPinCode("");
      setStatusLog("ERROR: CÓDIGO INVÁLIDO. REINTENTE.");
    }
  };

  // Direct Account Modifiers
  const addGems = (amount: number) => {
    if (!activeAccount) return;
    playSound("levelUp");
    const currentGems = activeAccount.etherGems || 0;
    const newGems = Math.max(0, currentGems + amount);
    onUpdateAccountData({ etherGems: newGems });
    setStatusLog(`Muelle de Éter: Se añadieron ${amount} GE. Total: ${newGems} GE.`);
  };

  const setGemsToMax = () => {
    if (!activeAccount) return;
    playSound("levelUp");
    onUpdateAccountData({ etherGems: 9999 });
    setStatusLog(`Muelle de Éter forzado a: 9999 GE.`);
  };

  const toggleAllRelics = () => {
    if (!activeAccount) return;
    playSound("levelUp");
    const currentRelics = activeAccount.relics || [];
    const hasAll = currentRelics.includes("crisol") && currentRelics.includes("espejo") && currentRelics.includes("sello");
    
    if (hasAll) {
      onUpdateAccountData({ relics: [] });
      setStatusLog("Reliquias vaciadas del altar maestro.");
    } else {
      onUpdateAccountData({ relics: ["crisol", "espejo", "sello"] });
      setStatusLog("¡Reliquias sagradas infundidas al completo! Crisol, Espejo y Sello forjados.");
    }
  };

  const grantPotionsSet = (amount: number) => {
    if (!activeAccount) return;
    playSound("levelUp");
    const currentPotions = activeAccount.potions || { midas: 0, time: 0, chaos: 0 };
    onUpdateAccountData({
      potions: {
        midas: Math.max(0, (currentPotions.midas || 0) + amount),
        time: Math.max(0, (currentPotions.time || 0) + amount),
        chaos: Math.max(0, (currentPotions.chaos || 0) + amount)
      }
    });
    setStatusLog(`Inyección de pócimas: +${amount} unidades de cada elixir.`);
  };

  const setCustomHighScore = (amount: number) => {
    if (!activeAccount) return;
    playSound("levelUp");
    onUpdateAccountData({ highscore: amount });
    setStatusLog(`Récord de Alquimia ajustado: ${amount} de Oro.`);
  };

  const setCustomGamesPlayed = (amount: number) => {
    if (!activeAccount) return;
    playSound("levelUp");
    onUpdateAccountData({ gamesPlayed: Math.max(0, amount) });
    setStatusLog(`Partidas registradas reescritas a: ${amount}.`);
  };

  const handleRelicToggleSingle = (relicId: string) => {
    if (!activeAccount) return;
    playSound("click");
    const currentRelics = activeAccount.relics || [];
    const isOwned = currentRelics.includes(relicId);
    const updatedRelics = isOwned
      ? currentRelics.filter(r => r !== relicId)
      : [...currentRelics, relicId];
    
    onUpdateAccountData({ relics: updatedRelics });
    setStatusLog(`Reliquia [${relicId}] ${isOwned ? "desactivada" : "activada"} en el panel principal.`);
  };

  const handleSendBroadcast = () => {
    if (!broadcastInput.trim()) return;
    playSound("levelUp");
    const payload = JSON.stringify({
      message: broadcastInput.trim(),
      author: activeAccount?.username || "Administrador Supremo",
      timestamp: Date.now()
    });
    localStorage.setItem("alquimia_global_broadcast", payload);
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("local-broadcast-update"));
    setStatusLog(`Anuncio global emitido: "${broadcastInput}"`);
    setBroadcastInput("");
  };

  const handlePresetBroadcast = (preset: string) => {
    setBroadcastInput(preset);
  };

  const handleClearBroadcast = () => {
    playSound("click");
    localStorage.removeItem("alquimia_global_broadcast");
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("local-broadcast-update"));
    setStatusLog("Mensaje global retirado de los cielos.");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop screen filter */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-[#111827] border-4 border-black w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-[12px_12px_0px_#4F46E5] relative z-10 flex flex-col font-mono select-none"
          >
            {/* Custom Header Bar */}
            <div className="flex justify-between items-center px-6 py-4 bg-indigo-600 text-white border-b-4 border-black">
              <span className="font-extrabold text-xs tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-4.5 h-4.5" /> ACCESO ADMINISTRATIVO V.0.72
              </span>
              <button
                onClick={onClose}
                className="p-1 rounded-lg bg-black/25 hover:bg-black/40 text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Authentication Lock / PIN Screen */}
            {!isAuthenticated ? (
              <div className="p-6 flex flex-col items-center gap-6">
                <div className="text-center max-w-sm">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/10 border-4 border-black flex items-center justify-center mx-auto mb-3">
                    <KeyRound className="w-7 h-7 text-indigo-400" />
                  </div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">ENTRADA CON CLAVE SECRETA</h3>
                  <p className="text-[11px] text-gray-400 font-semibold mt-1">
                    Introduce el código maestro de 4 dígitos para autorizar privilegios y modificar deudas de éter.
                  </p>
                </div>

                {/* Display Screen */}
                <div className={`w-full max-w-xs bg-black/60 border-4 border-black rounded-2xl p-4 text-center transition-colors ${isError ? "bg-red-950/40 border-red-500" : "border-black"}`}>
                  <div className="flex justify-center gap-3 text-2xl font-black mb-1.5 min-h-[36px]">
                    {[0, 1, 2, 3].map((idx) => {
                      const char = pinCode[idx];
                      return (
                        <div
                          key={idx}
                          className={`w-10 h-12 flex items-center justify-center border-2 rounded-xl transition-all ${
                            char
                              ? "bg-indigo-500 text-white border-indigo-400 font-black animate-scale-in"
                              : "bg-slate-900 text-slate-700 border-slate-800"
                          } ${isError ? "border-red-500 text-red-400" : ""}`}
                        >
                          {char ? "•" : "_"}
                        </div>
                      );
                    })}
                  </div>
                  <div className={`text-[9px] font-black uppercase tracking-wider ${isError ? "text-red-400 animate-shake" : "text-gray-500"}`}>
                    {statusLog}
                  </div>
                </div>

                {/* PIN Grid Keys */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      onClick={() => handlePressDigit(num)}
                      className="py-3 bg-slate-800 hover:bg-indigo-600 active:bg-indigo-700 hover:text-white border-4 border-black rounded-2xl font-black text-lg text-slate-200 shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all cursor-pointer flex items-center justify-center"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={handleClear}
                    className="py-3 bg-red-800 hover:bg-red-700 active:bg-red-900 border-4 border-black text-xs font-black text-white uppercase tracking-widest rounded-2xl shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all cursor-pointer flex items-center justify-center"
                  >
                    CLR
                  </button>
                  <button
                    onClick={() => handlePressDigit("0")}
                    className="py-3 bg-slate-800 hover:bg-indigo-600 active:bg-indigo-700 hover:text-white border-4 border-black rounded-2xl font-black text-lg text-slate-200 shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all cursor-pointer flex items-center justify-center"
                  >
                    0
                  </button>
                  <button
                    onClick={handleBackspace}
                    className="py-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 border-4 border-black text-xs font-black text-white uppercase tracking-widest rounded-2xl shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all cursor-pointer flex items-center justify-center"
                  >
                    DEL
                  </button>
                </div>
              </div>
            ) : (
              // ADMIN CONTROL CENTER
              <div className="flex-1 flex flex-col overflow-y-auto max-h-[80vh]">
                <div className="p-6 space-y-6">
                  {/* Authorized Indicator */}
                  <div className="bg-indigo-950/40 border-4 border-indigo-500/80 p-4 rounded-3xl flex items-center gap-3.5 relative overflow-hidden">
                    <div className="absolute right-2 -bottom-2 text-indigo-500/10 pointer-events-none select-none">
                      <ShieldCheck className="w-24 h-24" />
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center border-2 border-black shrink-0 shadow-[2px_2px_0px_rgba(0,0,0,0.5)] font-bold text-center text-lg">
                      🔑
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[11px] font-black text-indigo-300 uppercase tracking-widest leading-none">ROOT ACCESS AUTHORIZED</h4>
                      <h3 className="text-xs font-bold text-white uppercase mt-1">OPERADOR ADMIN: CONSOLA DE ACCIONES</h3>
                      <p className="text-[9px] text-[#0ea5e9] mt-0.5 font-semibold">
                        Modo Alquimista Activo: <strong className="underline decoration-indigo-400">{activeAccount?.username || "Ninguno"}</strong>
                      </p>
                    </div>
                  </div>

                  {!activeAccount ? (
                    <div className="text-center py-6 bg-red-950/20 border-4 border-dashed border-red-900 rounded-3xl p-4">
                      <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                      <h4 className="text-xs font-black text-red-400 uppercase">SIN ALQUIMISTA ACTIVO</h4>
                      <p className="text-[9px] text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
                        Crea un usuario o selecciona un perfil primero para poder hackear y ajustar sus parámetros alquímicos.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Section: Ether Gem Generation */}
                      <div className="space-y-2 bg-[#1f2937]/50 p-4 rounded-3xl border-2 border-slate-800">
                        <h4 className="text-[10px] uppercase font-black tracking-widest text-[#0ea5e9] flex items-center gap-1.5 border-b border-slate-800 pb-1 mb-2.5">
                          💎 Gemas de Éter (GE) • Saldo actual: {activeAccount.etherGems || 0}
                        </h4>
                        <div className="grid grid-cols-2 gap-2 flex-wrap">
                          <button
                            onClick={() => addGems(100)}
                            className="px-3 py-2 text-[10px] font-black uppercase text-white bg-slate-800 border-2 border-black hover:bg-[#0ea5e9] hover:border-[#0ea5e9] rounded-xl shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> 100 Éter
                          </button>
                          <button
                            onClick={() => addGems(1000)}
                            className="px-3 py-2 text-[10px] font-black uppercase text-white bg-slate-800 border-2 border-black hover:bg-[#0ea5e9] hover:border-[#0ea5e9] rounded-xl shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> 1000 Éter
                          </button>
                          <button
                            onClick={setGemsToMax}
                            className="px-3 py-2 text-[10px] font-black uppercase text-yellow-300 bg-slate-900 border-2 border-black hover:bg-yellow-500 hover:text-black hover:border-black rounded-xl shadow-[2px_2px_0px_#000] active:translate-y-0.5 col-span-2 transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 fill-current" /> Fijar a 9999 GE
                          </button>
                        </div>
                      </div>

                      {/* Section: Brew Inventory */}
                      <div className="space-y-2 bg-[#1f2937]/50 p-4 rounded-3xl border-2 border-slate-800">
                        <h4 className="text-[10px] uppercase font-black tracking-widest text-amber-500 flex items-center gap-1.5 border-b border-slate-800 pb-1 mb-2.5">
                          🧪 Elixires y Inventario de Pócimas
                        </h4>
                        <div className="text-[9.5px] text-gray-400 font-semibold mb-2">
                          Midas: {activeAccount.potions?.midas || 0} • Tiempo: {activeAccount.potions?.time || 0} • Caos: {activeAccount.potions?.chaos || 0}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => grantPotionsSet(1)}
                            className="px-2.5 py-2 text-[10px] font-black uppercase text-white bg-slate-800 border-2 border-black hover:bg-emerald-600 rounded-xl shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-1 cursor-pointer text-center"
                          >
                            <Plus className="w-3.5 h-3.5" /> +1 de Todo
                          </button>
                          <button
                            onClick={() => grantPotionsSet(5)}
                            className="px-2.5 py-2 text-[10px] font-black uppercase text-white bg-slate-800 border-2 border-black hover:bg-emerald-600 rounded-xl shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-1 cursor-pointer text-center"
                          >
                            <Plus className="w-3.5 h-3.5" /> +5 de Todo
                          </button>
                        </div>
                      </div>

                      {/* Section: Altar Relics */}
                      <div className="space-y-2 bg-[#1f2937]/50 p-4 rounded-3xl border-2 border-slate-800">
                        <h4 className="text-[10px] uppercase font-black tracking-widest text-pink-500 flex items-center gap-1.5 border-b border-slate-800 pb-1 mb-2.5">
                          🏆 Forjar Amuleto • Reliquias Pasivas
                        </h4>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: "crisol", name: "Crisol🏺" },
                            { id: "espejo", name: "Espejo🪞" },
                            { id: "sello", name: "Sello♾️" }
                          ].map((relic) => {
                            const active = activeAccount.relics?.includes(relic.id) || false;
                            return (
                              <button
                                key={relic.id}
                                onClick={() => handleRelicToggleSingle(relic.id)}
                                className={`px-2 py-2 text-[9px] font-black uppercase rounded-lg border-2 border-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                                  active
                                    ? "bg-pink-600 text-white shadow-[2px_2px_0px_#000]"
                                    : "bg-slate-900 text-gray-500 border-slate-800/80 hover:bg-slate-800"
                                }`}
                              >
                                <span>{relic.name}</span>
                                <span className="text-[7.5px] bg-black/40 px-1 py-0.2 rounded font-mono">
                                  {active ? "ON" : "OFF"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={toggleAllRelics}
                          className="w-full mt-2 px-3 py-2 text-[10px] font-black uppercase bg-indigo-950/40 hover:bg-indigo-600 border-2 border-black text-indigo-400 hover:text-white rounded-xl shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Wand2 className="w-3.5 h-3.5" /> Alternar Todas las Reliquias
                        </button>
                      </div>

                      {/* Section: Highscores and Stats */}
                      <div className="space-y-2 bg-[#1f2937]/50 p-4 rounded-3xl border-2 border-slate-800">
                        <h4 className="text-[10px] uppercase font-black tracking-widest text-[#F59E0B] flex items-center gap-1.5 border-b border-slate-800 pb-1 mb-2.5">
                          📊 Mutación de Destino (Estadísticas)
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[8px] font-black text-gray-400 block mb-1 uppercase">Récord de Oro ({activeAccount.highscore} o):</label>
                            <div className="flex gap-1">
                              <button
                                onClick={() => setCustomHighScore((activeAccount.highscore || 0) + 100)}
                                className="px-2 py-1 bg-slate-850 border border-slate-700 hover:bg-[#F59E0B] hover:text-black rounded text-[8px] font-black uppercase text-center flex items-center gap-0.5 cursor-pointer shrink-0"
                              >
                                <Plus className="w-2.5 h-2.5" /> 100
                              </button>
                              <button
                                onClick={() => setCustomHighScore((activeAccount.highscore || 0) + 1000)}
                                className="px-2 py-1 bg-slate-850 border border-slate-700 hover:bg-[#F59E0B] hover:text-black rounded text-[8px] font-black uppercase text-center flex items-center gap-0.5 cursor-pointer shrink-0"
                              >
                                <Plus className="w-2.5 h-2.5" /> 1k
                              </button>
                              <button
                                onClick={() => setCustomHighScore(0)}
                                className="p-1 px-2.5 bg-red-950 border border-red-900 rounded text-red-400 hover:bg-red-800 hover:text-white text-[8px] font-black uppercase flex items-center justify-center cursor-pointer font-mono"
                                title="Resetear récord"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-[8px] font-black text-gray-400 block mb-1 uppercase">Partidas Jugadas ({activeAccount.gamesPlayed}):</label>
                            <div className="flex gap-1">
                              <button
                                onClick={() => setCustomGamesPlayed((activeAccount.gamesPlayed || 0) + 1)}
                                className="px-2.5 py-1 bg-slate-850 border border-slate-700 hover:bg-indigo-500 rounded text-[8px] font-black uppercase text-center flex items-center gap-0.5 cursor-pointer select-none"
                              >
                                <Plus className="w-2.5 h-2.5" /> 1
                              </button>
                              <button
                                onClick={() => setCustomGamesPlayed((activeAccount.gamesPlayed || 0) + 10)}
                                className="px-2.5 py-1 bg-slate-850 border border-slate-700 hover:bg-indigo-500 rounded text-[8px] font-black uppercase text-center flex items-center gap-0.5 cursor-pointer select-none"
                              >
                                <Plus className="w-2.5 h-2.5" /> 10
                              </button>
                              <button
                                onClick={() => setCustomGamesPlayed(0)}
                                className="p-1 px-2.5 bg-red-950 border border-red-900 rounded text-red-400 hover:bg-red-800 hover:text-white text-[8px] font-black uppercase flex items-center justify-center cursor-pointer font-mono"
                                title="Resetear contador"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section: Broadcast Message to Everyone */}
                      <div className="space-y-2 bg-[#1f2937]/50 p-4 rounded-3xl border-2 border-slate-800 text-left">
                        <h4 className="text-[10px] uppercase font-black tracking-widest text-[#10B981] flex items-center gap-1.5 border-b border-slate-800 pb-1 mb-2.5 font-mono">
                          📢 Transmisión de Comunicados (Marquesina Celestial)
                        </h4>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Introduce el anuncio sagrado para todo el reino..."
                            value={broadcastInput}
                            onChange={(e) => setBroadcastInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSendBroadcast();
                            }}
                            className="flex-1 px-3 py-1.5 bg-black/40 border-2 border-slate-700 rounded-xl text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-[#10B981]"
                          />
                          <button
                            onClick={handleSendBroadcast}
                            className="px-3 py-1.5 bg-[#10B981] hover:bg-emerald-600 active:bg-[#10B981]/80 border-2 border-black text-black font-black text-[10px] uppercase rounded-xl transition-all cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_rgba(0,0,0,1)] shrink-0"
                          >
                            Emitir
                          </button>
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <button
                            onClick={() => handlePresetBroadcast("🔥 ¡Tormenta de Éter iniciada por el Consejo!")}
                            className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[8.5px] font-black text-slate-300 rounded-md hover:text-white"
                          >
                            Preset 🔥
                          </button>
                          <button
                            onClick={() => handlePresetBroadcast("🏆 Concurso Maestro: Sinergia de Doble Oro activa")}
                            className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[8.5px] font-black text-slate-300 rounded-md hover:text-white"
                          >
                            Preset 🏆
                          </button>
                          <button
                            onClick={() => handlePresetBroadcast("⚠️ Mantenimiento cósmico inminente en 5 minutos")}
                            className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[8.5px] font-black text-slate-300 rounded-md hover:text-white"
                          >
                            Preset ⚠️
                          </button>
                        </div>

                        <button
                          onClick={handleClearBroadcast}
                          className="w-full mt-2.5 px-3 py-2 text-[10px] bg-red-950/40 hover:bg-red-900 border-2 border-black text-red-400 hover:text-white font-black uppercase rounded-xl shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          Apagar Marquesina Activa
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sub-system Status Log */}
                <div className="p-3 bg-slate-950 border-t-2 border-black text-[#0ea5e9] text-[8.5px] font-bold uppercase tracking-wider text-center select-none font-mono">
                  🔊 {statusLog}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
