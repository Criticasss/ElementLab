import { useState, useEffect, useRef } from "react";
import { Account } from "./AccountManager";
import { playSound } from "../utils/audio";
import { motion, AnimatePresence } from "motion/react";
import { doc, setDoc, deleteDoc, collection, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
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
  AlertTriangle,
  Palette,
  Flame,
  Waves,
  Trees,
  Gem,
  Ticket,
  Gift
} from "lucide-react";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeAccount: Account | null;
  onUpdateAccountData: (updatedFields: Partial<Account>) => void;
  activeTheme: string;
  onThemeChange: (theme: string) => void;
}

export default function AdminPanel({
  isOpen,
  onClose,
  activeAccount,
  onUpdateAccountData,
  activeTheme,
  onThemeChange
}: AdminPanelProps) {
  const [pinCode, setPinCode] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [statusLog, setStatusLog] = useState<string>("ESPERANDO CÓDIGO DE AUTORIZACIÓN...");
  const [broadcastInput, setBroadcastInput] = useState<string>("");
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [gemsAmountInput, setGemsAmountInput] = useState<string>("");
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [newPromoCode, setNewPromoCode] = useState<string>("");
  const [newPromoRewardType, setNewPromoRewardType] = useState<"gems" | "potions" | "all_relics">("gems");
  const [newPromoGemsValue, setNewPromoGemsValue] = useState<string>("500");
  const [newPromoPotionsValue, setNewPromoPotionsValue] = useState<string>("10");
  const broadcastTimeoutRef = useRef<any>(null);

  // Clean up any pending broadcast automatic clear timer on unmount
  useEffect(() => {
    return () => {
      if (broadcastTimeoutRef.current) {
        clearTimeout(broadcastTimeoutRef.current);
      }
    };
  }, []);

  // Listen to all accounts when authenticated for administrator safety actions
  useEffect(() => {
    if (!isAuthenticated) {
      setAllAccounts([]);
      return;
    }
    const unsub = onSnapshot(collection(db, "accounts"), (snapshot) => {
      const list: Account[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Account);
      });
      setAllAccounts(list);
    }, (error) => {
      console.error("Error subscribiendo a cuentas de admin:", error);
    });
    return () => unsub();
  }, [isAuthenticated]);

  // Listen to all promo_codes when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setPromoCodes([]);
      return;
    }
    const unsub = onSnapshot(collection(db, "promo_codes"), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data());
      });
      setPromoCodes(list);
    }, (error) => {
      console.error("Error subscribing to promo codes:", error);
    });
    return () => unsub();
  }, [isAuthenticated]);

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

  const handleSendBroadcast = async () => {
    if (!broadcastInput.trim()) return;
    playSound("levelUp");
    const docData = {
      message: broadcastInput.trim(),
      author: activeAccount?.username || "Administrador Supremo",
      timestamp: Date.now()
    };
    try {
      await setDoc(doc(db, "broadcasts", "global"), docData);
      setStatusLog(`Anuncio global emitido: "${broadcastInput}" (desaparece en 5s por defecto)`);
      setBroadcastInput("");

      // Clear any previous pending auto-delete
      if (broadcastTimeoutRef.current) {
        clearTimeout(broadcastTimeoutRef.current);
      }

      // Auto-delete from Firestore after 5 seconds
      broadcastTimeoutRef.current = setTimeout(async () => {
        try {
          await deleteDoc(doc(db, "broadcasts", "global"));
        } catch (err) {
          console.error("Error doing auto-delete of broadcast from db:", err);
        }
      }, 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "broadcasts/global");
    }
  };

  const handlePresetBroadcast = (preset: string) => {
    setBroadcastInput(preset);
  };

  const handleClearBroadcast = async () => {
    playSound("click");
    try {
      await deleteDoc(doc(db, "broadcasts", "global"));
      setStatusLog("Mensaje global retirado de los cielos (sincronizado).");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "broadcasts/global");
    }
  };

  const handleDefaultAccountAdmin = async (acc: Account) => {
    playSound("levelUp");
    
    // Find next available user number in the list
    let index = 1;
    let candidate = `user${index}`;
    while (allAccounts.some((a) => a.username.toLowerCase() === candidate.toLowerCase())) {
      index++;
      candidate = `user${index}`;
    }

    try {
      const oldUsername = acc.username;
      const newUsername = candidate;

      const updatedAcc: Account = {
        ...acc,
        username: newUsername
      };

      await setDoc(doc(db, "accounts", newUsername), updatedAcc);
      await deleteDoc(doc(db, "accounts", oldUsername));

      setStatusLog(`Cuenta de [${oldUsername}] renombrada a [${newUsername}] (DEFAULT) exitosamente.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `accounts/rename_admin`);
    }
  };

  const handleDeleteAccount = async (username: string) => {
    if (activeAccount && activeAccount.username === username) {
      playSound("fail");
      setStatusLog("Error: No puedes eliminar la cuenta que tienes activa en tu sesión.");
      return;
    }
    if (username.toLowerCase() === "default") {
      playSound("fail");
      setStatusLog("Error: La cuenta 'default' está protegida y no se puede eliminar.");
      return;
    }

    const confirmDelete = window.confirm(`¿Estás seguro de que quieres eliminar permanentemente la cuenta de [${username}] de la base de datos celestial?`);
    if (!confirmDelete) return;

    playSound("click");
    try {
      await deleteDoc(doc(db, "accounts", username));
      setStatusLog(`Cuenta [${username}] eliminada permanentemente.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `accounts/${username}`);
      setStatusLog(`Error al intentar eliminar la cuenta ${username}.`);
    }
  };

  const handleBulkGemsUpdate = async (action: "add" | "remove") => {
    const amount = parseInt(gemsAmountInput.trim(), 10);
    if (isNaN(amount) || amount <= 0) {
      playSound("fail");
      setStatusLog("Por favor, introduce una cantidad válida mayor que 0.");
      return;
    }

    if (allAccounts.length === 0) {
      playSound("fail");
      setStatusLog("No hay cuentas activas registradas en el servidor.");
      return;
    }

    playSound("levelUp");
    setStatusLog(`Procesando transmutación de gemas para ${allAccounts.length} usuarios...`);

    let updatedCount = 0;
    try {
      for (const acc of allAccounts) {
        const currentGems = acc.etherGems || 0;
        const newGems = action === "add" 
          ? currentGems + amount 
          : Math.max(0, currentGems - amount);

        const updatedAcc: Account = {
          ...acc,
          etherGems: newGems
        };

        await setDoc(doc(db, "accounts", acc.username), updatedAcc);

        // If this is the active user playing right now, sync their active state as well
        if (activeAccount && activeAccount.username === acc.username) {
          onUpdateAccountData({ etherGems: newGems });
        }
        updatedCount++;
      }

      setGemsAmountInput("");
      if (action === "add") {
        setStatusLog(`¡Se han añadido +${amount} Gemas de Éter a todos los usuarios (${updatedCount} cuentas)!`);
      } else {
        setStatusLog(`¡Se han descontado -${amount} Gemas de Éter a todos los usuarios (${updatedCount} cuentas)!`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "accounts/bulk_gems_update");
      setStatusLog("Error al propagar gemas en la nube de ElementLab.");
    }
  };

  const handleCreatePromoCode = async () => {
    const rawCode = newPromoCode.trim().toUpperCase();
    if (!rawCode) {
      playSound("fail");
      setStatusLog("Error: El código promocional no puede estar vacío.");
      return;
    }
    // Code validation for id requirements
    if (!/^[a-zA-Z0-9_-]+$/.test(rawCode)) {
      playSound("fail");
      setStatusLog("Error: El código contiene caracteres inválidos. Solo letras, números, '-' o '_'.");
      return;
    }

    const payload: any = {
      code: rawCode,
      rewardType: newPromoRewardType,
      createdAt: Date.now(),
      isActive: true
    };

    if (newPromoRewardType === "gems") {
      const gVal = parseInt(newPromoGemsValue, 10);
      if (isNaN(gVal) || gVal <= 0) {
        playSound("fail");
        setStatusLog("Error: Cantidad de gemas inválida.");
        return;
      }
      payload.gemsValue = gVal;
    } else if (newPromoRewardType === "potions") {
      const pVal = parseInt(newPromoPotionsValue, 10);
      if (isNaN(pVal) || pVal <= 0) {
        playSound("fail");
        setStatusLog("Error: Cantidad de pociones inválida.");
        return;
      }
      payload.potionsValue = pVal;
    }

    try {
      playSound("levelUp");
      await setDoc(doc(db, "promo_codes", rawCode), payload);
      setStatusLog(`Código de Regalo [${rawCode}] creado con éxito.`);
      setNewPromoCode("");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `promo_codes/${rawCode}`);
      setStatusLog("Error al guardar el código de regalo en la nube.");
    }
  };

  const handleDeletePromoCode = async (code: string) => {
    playSound("click");
    try {
      await deleteDoc(doc(db, "promo_codes", code));
      setStatusLog(`Código [${code}] eliminado / expirado.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `promo_codes/${code}`);
      setStatusLog("Error al eliminar el código de regalo.");
    }
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

                      {/* Section: Custom Themes / Style Sintonizer */}
                      <div className="space-y-2 bg-[#1f2937]/50 p-4 rounded-3xl border-2 border-slate-800 text-left">
                        <h4 className="text-[10px] uppercase font-black tracking-widest text-[#A855F7] flex items-center gap-1.5 border-b border-slate-800 pb-1 mb-2.5 font-mono">
                          🎨 Sintonizador de Estilos (Temas Atmosféricos)
                        </h4>
                        <p className="text-[10px] text-gray-400 font-semibold mb-2">
                          Cambia el ambiente celestial de toda la web en tiempo real. Activa efectos y esquemas de color:
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {/* Selva Theme Button */}
                          <button
                            onClick={() => {
                              onThemeChange("selva");
                              playSound("levelUp");
                              setStatusLog("Ambiente sintonizado: ¡Selva Esmeralda de Gaea!");
                            }}
                            className={`px-3 py-2.5 rounded-xl border-2 border-black flex items-center justify-between text-left cursor-pointer transition-all ${
                              activeTheme === "selva"
                                ? "bg-emerald-600 text-white font-black shadow-[3px_3px_0px_rgba(0,0,0,1)] translate-y-[-2px]"
                                : "bg-slate-900 text-gray-300 hover:bg-slate-800"
                            }`}
                          >
                            <span className="text-xs uppercase font-extrabold flex items-center gap-2">
                              <Trees className="w-4 h-4 text-emerald-400 shrink-0" />
                              Selva
                            </span>
                            <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-white shrink-0">🍃</span>
                          </button>

                          {/* Mar Theme Button */}
                          <button
                            onClick={() => {
                              onThemeChange("mar");
                              playSound("levelUp");
                              setStatusLog("Ambiente sintonizado: ¡Fondo Marino de Poseidón!");
                            }}
                            className={`px-3 py-2.5 rounded-xl border-2 border-black flex items-center justify-between text-left cursor-pointer transition-all ${
                              activeTheme === "mar"
                                ? "bg-cyan-600 text-white font-black shadow-[3px_3px_0px_rgba(0,0,0,1)] translate-y-[-2px]"
                                : "bg-slate-900 text-gray-300 hover:bg-slate-800"
                            }`}
                          >
                            <span className="text-xs uppercase font-extrabold flex items-center gap-2">
                              <Waves className="w-4 h-4 text-cyan-300 shrink-0" />
                              Mar
                            </span>
                            <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-white shrink-0">🫧</span>
                          </button>

                          {/* Infierno Theme Button */}
                          <button
                            onClick={() => {
                              onThemeChange("infierno");
                              playSound("levelUp");
                              setStatusLog("Ambiente sintonizado: ¡Foso de Alquimia de Lava!");
                            }}
                            className={`px-3 py-2.5 rounded-xl border-2 border-black flex items-center justify-between text-left cursor-pointer transition-all ${
                              activeTheme === "infierno"
                                ? "bg-red-700 text-white font-black shadow-[3px_3px_0px_rgba(0,0,0,1)] translate-y-[-2px]"
                                : "bg-slate-900 text-gray-300 hover:bg-slate-800"
                            }`}
                          >
                            <span className="text-xs uppercase font-extrabold flex items-center gap-2">
                              <Flame className="w-4 h-4 text-amber-500 shrink-0" />
                              Lava
                            </span>
                            <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-white shrink-0">🔥</span>
                          </button>

                          {/* Cyberpunk Theme Button */}
                          <button
                            onClick={() => {
                              onThemeChange("cyberpunk");
                              playSound("levelUp");
                              setStatusLog("Ambiente sintonizado: ¡Fisión Neón Cyberpunk!");
                            }}
                            className={`px-3 py-2.5 rounded-xl border-2 border-black flex items-center justify-between text-left cursor-pointer transition-all ${
                              activeTheme === "cyberpunk"
                                ? "bg-[#EC4899] text-white font-black shadow-[3px_3px_0px_rgba(0,0,0,1)] translate-y-[-2px]"
                                : "bg-slate-900 text-gray-300 hover:bg-slate-800"
                            }`}
                          >
                            <span className="text-xs uppercase font-extrabold flex items-center gap-2">
                              <Palette className="w-4 h-4 text-yellow-300 shrink-0" />
                              Cyberpunk
                            </span>
                            <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-white shrink-0">🧬</span>
                          </button>
                        </div>

                        {/* Reset / Eliminate Custom Theme Button */}
                        <div className="pt-2 border-t border-slate-800/80 mt-2">
                          <button
                            onClick={() => {
                              onThemeChange("default");
                              playSound("click");
                              setStatusLog("Tema restablecido. Retorno al Vacío Astral.");
                            }}
                            className="w-full py-2 bg-slate-900 text-slate-400 hover:text-white hover:bg-indigo-950 border-2 border-dashed border-slate-800 hover:border-indigo-500 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Eliminar Tema / Estilo Personalizado
                          </button>
                        </div>
                      </div>

                      {/* Section: Live Multiplayer Events (Alchemical Cosmic Eclipse Mode - 45-second astral field) */}
                      <div className="space-y-2 bg-[#1f2937]/50 p-4 rounded-3xl border-2 border-slate-800 text-left">
                        <h4 className="text-[10px] uppercase font-black tracking-widest text-[#d946ef] flex items-center gap-1.5 border-b border-slate-800 pb-1 mb-2.5 font-mono">
                          🌌 EVENTO EN VIVO: ECLIPSE ALQUÍMICO (SÍNCRO)
                        </h4>
                        <p className="text-[10px] text-gray-400 font-semibold mb-2 leading-tight">
                          Inicia un eclipse místico de 45 segundos para todas las pantallas de ElementLab de forma síncrona. La web entra en penumbra astral y las cartas de la rejilla brillarán intensamente en neón:
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={async () => {
                              playSound("levelUp");
                              try {
                                await setDoc(doc(db, "broadcasts", "event"), {
                                  message: "eclipse_mode",
                                  author: activeAccount?.username || "Administrador Supremo",
                                  timestamp: Date.now()
                                });
                                setStatusLog("¡Eclipse Alquímico activado globalmente por 45s!");
                              } catch (e) {
                                handleFirestoreError(e, OperationType.WRITE, "broadcasts/event");
                              }
                            }}
                            className="px-3 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl border-2 border-black font-black text-[10px] uppercase tracking-wider shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            🌌 Desatar Eclipse (45s)
                          </button>

                          <button
                            onClick={async () => {
                              playSound("fail");
                              try {
                                await setDoc(doc(db, "broadcasts", "event"), {
                                  message: "inactive",
                                  author: activeAccount?.username || "Administrador Supremo",
                                  timestamp: Date.now()
                                });
                                setStatusLog("Eclipse celestial terminado/apagado.");
                              } catch (e) {
                                handleFirestoreError(e, OperationType.WRITE, "broadcasts/event");
                              }
                            }}
                            className="px-3 py-2.5 bg-slate-900 border-2 border-dashed border-red-500/50 hover:bg-red-950/40 text-red-400 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            🚫 Apagar Eclipse
                          </button>
                        </div>
                      </div>

                      {/* Section: Bulk Ether Gems Dispatcher / Reducer */}
                      <div className="space-y-3 bg-[#1f2937]/50 p-4 rounded-3xl border-2 border-slate-800 text-left">
                        <h4 className="text-[10px] uppercase font-black tracking-widest text-cyan-400 flex items-center gap-1.5 border-b border-slate-800 pb-1 mb-2 font-mono">
                          💎 TRANSMUTADOR GLOBAL DE GEMAS DE ÉTER
                        </h4>
                        <p className="text-[10px] text-gray-400 font-semibold mb-2 leading-tight">
                          Introduce una cantidad de gemas para enviar (añadir) o eliminar (descontar) a todos los usuarios activos registrados en el grimorio:
                        </p>

                        <div className="flex flex-col gap-2">
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              value={gemsAmountInput}
                              onChange={(e) => setGemsAmountInput(e.target.value)}
                              placeholder="Ej: 50, 100, 1000..."
                              className="w-full bg-black border-2 border-black rounded-xl text-xs font-black p-3 pr-10 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-mono"
                            />
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-cyan-400 pointer-events-none select-none">
                              <Gem className="w-4 h-4 text-cyan-400 animate-pulse" />
                              <span className="text-[10px] font-black">GE</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <button
                              onClick={() => handleBulkGemsUpdate("add")}
                              className="px-3 py-2.5 bg-[#0ea5e9] hover:bg-sky-600 active:translate-y-0.5 border-2 border-black rounded-xl text-[10px] font-black text-black tracking-wider uppercase shadow-[3px_3px_0px_rgba(0,0,0,1)] active:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              <span>➕ ENVIAR A TODOS</span>
                            </button>

                            <button
                              onClick={() => handleBulkGemsUpdate("remove")}
                              className="px-3 py-2.5 bg-rose-600 hover:bg-rose-700 active:translate-y-0.5 border-2 border-black rounded-xl text-[10px] font-black text-white tracking-wider uppercase shadow-[3px_3px_0px_rgba(0,0,0,1)] active:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              <span>➖ ELIMINAR DE TODOS</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Section: Gift Promo Code Generator (Gift Code Factory) */}
                      <div className="space-y-3 bg-[#1f2937]/50 p-4 rounded-3xl border-2 border-slate-800 text-left">
                        <h4 className="text-[10px] uppercase font-black tracking-widest text-amber-400 flex items-center gap-1.5 border-b border-slate-800 pb-1 mb-2 font-mono">
                          🎫 FÁBRICA DE CÓDIGOS DE REGALO
                        </h4>
                        <p className="text-[10px] text-gray-400 font-semibold mb-2 leading-tight">
                          Genera cupones que los alquimistas pueden canjear en sus perfiles para obtener beneficios instantáneos en la nube:
                        </p>

                        <div className="flex flex-col gap-2 bg-black/30 p-2.5 rounded-2xl border border-slate-850">
                          {/* Code Input */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] uppercase font-bold text-gray-500 font-mono">Código Cupón (Solo letras/num)</label>
                            <input
                              type="text"
                              value={newPromoCode}
                              onChange={(e) => setNewPromoCode(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                              placeholder="Ej: ALQUIMIA2026..."
                              className="w-full bg-black border border-slate-800 rounded-xl text-xs font-black p-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-400 font-mono uppercase"
                            />
                          </div>

                          {/* Reward Type Selector */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] uppercase font-bold text-gray-500 font-mono">Tipo Recompensa</label>
                              <select
                                value={newPromoRewardType}
                                onChange={(e) => setNewPromoRewardType(e.target.value as any)}
                                className="w-full bg-black border border-slate-800 rounded-xl text-xs font-bold p-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                              >
                                <option value="gems">💎 Éter Gems</option>
                                <option value="potions">🧪 Pociones (+X)</option>
                                <option value="all_relics">👑 Todas las Reliquias</option>
                              </select>
                            </div>

                            {/* Value Input depending on rewardType */}
                            {newPromoRewardType !== "all_relics" && (
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] uppercase font-bold text-gray-500 font-mono">Cantidad</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={newPromoRewardType === "gems" ? newPromoGemsValue : newPromoPotionsValue}
                                  onChange={(e) => {
                                    if (newPromoRewardType === "gems") {
                                      setNewPromoGemsValue(e.target.value);
                                    } else {
                                      setNewPromoPotionsValue(e.target.value);
                                    }
                                  }}
                                  className="w-full bg-black border border-slate-800 rounded-xl text-xs font-black p-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                                />
                              </div>
                            )}
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={handleCreatePromoCode}
                            className="w-full mt-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-black text-[10px] uppercase tracking-wider rounded-xl border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Gift className="w-4 h-4" /> Crear Cupón de Regalo
                          </button>
                        </div>

                        {/* List of active codes */}
                        <div className="pt-1">
                          <label className="text-[9px] uppercase font-bold text-gray-500 font-mono block mb-1.5">// Cupones Activos Sincronizados ({promoCodes.length})</label>
                          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                            {promoCodes.map((codeObj) => (
                              <div
                                key={codeObj.code}
                                className="bg-black/40 border border-slate-850 p-2 rounded-xl flex items-center justify-between gap-3 font-mono text-xs"
                              >
                                <div className="truncate text-left text-white">
                                  <span className="font-black bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/25 mr-1.5">
                                    {codeObj.code}
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-semibold">
                                    {codeObj.rewardType === "gems" && `💎 +${codeObj.gemsValue} Gemas`}
                                    {codeObj.rewardType === "potions" && `🧪 +${codeObj.potionsValue} Pociones`}
                                    {codeObj.rewardType === "all_relics" && "👑 Desbloqueo Total Reliquias"}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleDeletePromoCode(codeObj.code)}
                                  className="px-2 py-1 bg-red-950/40 border border-red-500/40 hover:bg-red-900 override-btn text-red-400 rounded text-[9px] font-black uppercase transition-all cursor-pointer shrink-0"
                                >
                                  ELIMINAR
                                </button>
                              </div>
                            ))}
                            {promoCodes.length === 0 && (
                              <div className="text-center py-3 text-[10px] text-gray-500 italic">
                                No hay códigos mágicos en el reino.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Section: Direct Account Management (Secure admin power alternative) */}
                      <div className="space-y-2.5 bg-[#1f2937]/50 p-4 rounded-3xl border-2 border-slate-800 text-left">
                        <h4 className="text-[10px] uppercase font-black tracking-widest text-[#ef4444] flex items-center gap-1.5 border-b border-slate-800 pb-1 mb-2.5 font-mono">
                          🛡️ GESTIÓN DE USUARIOS MÁGICOS (SEGURA)
                        </h4>
                        <p className="text-[10px] text-gray-400 font-semibold mb-2 leading-tight">
                          ¿Alguien se hace pasar por un administrador o creador (ej. "[founder]")? Elimínalos o modéralos instantáneamente con un solo clic de forma segura, sin tener que usar ni revelar contraseñas:
                        </p>

                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                          {allAccounts.map((acc) => (
                            <div 
                              key={acc.username}
                              className="bg-black/40 border border-slate-850 p-2.5 rounded-xl flex items-center justify-between gap-3 font-mono"
                            >
                              <div className="min-w-0">
                                <span className="text-xs font-black uppercase text-white tracking-wide block truncate">
                                  {acc.username}
                                </span>
                                <span className="text-[9px] font-mono text-gray-500 block mt-0.5">
                                  Récord CO: <strong className="text-amber-400">{acc.highscore}</strong> • Éter: <strong className="text-cyan-400">{acc.etherGems || 0}</strong>
                                </span>
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                <button
                                  onClick={() => handleDefaultAccountAdmin(acc)}
                                  className="px-2 py-1 bg-amber-500 hover:bg-amber-600 border-2 border-black text-black rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center"
                                  title="Renombrar temporalmente de forma aleatoria"
                                >
                                  DEFAULT
                                </button>
                                <button
                                  onClick={() => handleDeleteAccount(acc.username)}
                                  className="px-2 py-1 bg-red-600 hover:bg-red-700 border-2 border-black text-white rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center"
                                  title="Eliminar permanentemente de la nube"
                                >
                                  ELIMINAR
                                </button>
                              </div>
                            </div>
                          ))}
                          {allAccounts.length === 0 && (
                            <div className="text-center py-4 text-[10px] text-gray-500 italic">
                              Cargando alquimistas de la nube...
                            </div>
                          )}
                        </div>
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
