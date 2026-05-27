import React, { useState, useEffect } from "react";
import { playSound } from "../utils/audio";
import { User, UserPlus, Users, Trophy, Trash2, Check, KeyRound, Lock, Eye, EyeOff, LogIn} from "lucide-react";
import { collection, doc, setDoc, getDoc, deleteDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";

export interface Account {
  username: string;
  password?: string;
  highscore: number;
  gamesPlayed: number;
  etherGems?: number;
  relics?: string[];
  potions?: {
    midas: number;
    time: number;
    chaos: number;
  };
  tutorialCompleted?: boolean;
}

interface AccountManagerProps {
  onAccountChange: (account: Account | null) => void;
  activeAccount: Account | null;
}

type AuthMode = "register" | "login" | "delete_confirm";

export default function AccountManager({ onAccountChange, activeAccount }: AccountManagerProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Auth & Deletion States
  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [targetAccount, setTargetAccount] = useState<Account | null>(null);
  const [authPasswordInput, setAuthPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Listen to accounts from Firestore in real-time
  useEffect(() => {
    const q = query(collection(db, "accounts"), orderBy("username"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Account[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Account);
      });
      setAccounts(list);

      // Restore active user from localStorage if exists
      const savedActive = localStorage.getItem("alquimia_viral_active_user");
      if (savedActive && !activeAccount) {
        const matched = list.find((acc) => acc.username === savedActive);
        if (matched) {
          // Note: To preserve device-specific password typing if desired,
          // we can restore it directly if they are already logged in on this browser.
          onAccountChange(matched);
        }
      }
    }, (error) => {
      console.error("Error fetching accounts:", error);
    });

    return () => unsubscribe();
  }, [activeAccount]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newUsername.trim();
    const cleanPassword = newPassword.trim();

    if (!cleanName) {
      playSound("click");
      setErrorMsg("El nombre de usuario no puede estar vacío.");
      return;
    }

    if (cleanName.length > 15) {
      playSound("click");
      setErrorMsg("El apodo es demasiado largo (máx 15 caracteres).");
      return;
    }

    if (cleanPassword.length < 3) {
      playSound("click");
      setErrorMsg("La contraseña debe tener al menos 3 caracteres.");
      return;
    }

    // Check duplication locally first
    const exists = accounts.some((acc) => acc.username.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      playSound("click");
      setErrorMsg("Este apodo ya existe. ¡Elige uno único!");
      return;
    }

    try {
      const newAcc: Account = {
        username: cleanName,
        password: cleanPassword, // Stored safely for real-time login matching
        highscore: 0,
        gamesPlayed: 0,
        etherGems: 15, // Starts with some premium starter currency for potions!
        relics: [],
        potions: { midas: 1, time: 0, chaos: 0 },
        tutorialCompleted: false
      };

      await setDoc(doc(db, "accounts", cleanName), newAcc);
      playSound("levelUp");

      // Set active
      onAccountChange(newAcc);
      localStorage.setItem("alquimia_viral_active_user", cleanName);

      // Clean inputs
      setNewUsername("");
      setNewPassword("");
      setErrorMsg("");
      setAuthMode("register");
      setTargetAccount(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `accounts/${cleanName}`);
    }
  };

  const handleSelectAccountClick = (acc: Account) => {
    playSound("click");
    setErrorMsg("");
    setAuthPasswordInput("");

    if (activeAccount?.username === acc.username) {
      // Already logged in, do nothing or show info
      return;
    }

    // Switch left panel to LOGIN mode
    setTargetAccount(acc);
    setAuthMode("login");
  };

  const handleVerifyLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAccount) return;

    if (targetAccount.password === authPasswordInput.trim()) {
      playSound("levelUp");
      onAccountChange(targetAccount);
      localStorage.setItem("alquimia_viral_active_user", targetAccount.username);

      // Reset
      setAuthPasswordInput("");
      setTargetAccount(null);
      setAuthMode("register");
      setErrorMsg("");
    } else {
      playSound("fail");
      setErrorMsg("Contraseña incorrecta. Inténtalo de nuevo.");
    }
  };

  const handleDeleteClick = (acc: Account, e: React.MouseEvent) => {
    e.stopPropagation();
    playSound("click");
    setErrorMsg("");
    setAuthPasswordInput("");
    setTargetAccount(acc);
    setAuthMode("delete_confirm");
  };

  const handleVerifyDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAccount) return;

    if (targetAccount.password === authPasswordInput.trim()) {
      playSound("click");
      try {
        await deleteDoc(doc(db, "accounts", targetAccount.username));
        
        if (activeAccount?.username === targetAccount.username) {
          onAccountChange(null);
          localStorage.removeItem("alquimia_viral_active_user");
        }

        // Reset
        setAuthPasswordInput("");
        setTargetAccount(null);
        setAuthMode("register");
        setErrorMsg("");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `accounts/${targetAccount.username}`);
      }
    } else {
      playSound("fail");
      setErrorMsg("Contraseña incorrecta. No se puede borrar la cuenta sin verificar el propietario.");
    }
  };

  const handleLogout = () => {
    playSound("click");
    onAccountChange(null);
    localStorage.removeItem("alquimia_viral_active_user");
    setAuthMode("register");
    setTargetAccount(null);
    setErrorMsg("");
  };

  return (
    <div id="account-manager" className="bg-[#1f2937] border-4 border-black rounded-[2.5rem] p-6 shadow-[10px_10px_0px_rgba(0,0,0,0.55)] flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-4 border-black pb-5 gap-3">
        <div className="flex items-center gap-3 select-none">
          <div className="w-12 h-12 rounded-2xl bg-[#0EA5E9] text-white border-4 border-black flex items-center justify-center shrink-0 shadow-[4px_4px_0px_#000]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase text-white tracking-widest font-mono flex items-center gap-1.5">
              // Alquimistas Registrados
            </h2>
            <p className="text-xs text-gray-400 font-semibold mt-0.5">
              Crea o autentícate con tu contraseña para sincronizar tu mazo, récords y elíxires.
            </p>
          </div>
        </div>

        {/* Current Active User Display */}
        <div className="w-full md:w-auto">
          {activeAccount ? (
            <div className="bg-white text-black font-black uppercase tracking-wider text-xs px-4 py-2.5 rounded-2xl border-4 border-black shadow-[4px_4px_0px_#EC4899] flex items-center justify-between sm:justify-start gap-2 select-none">
              <div className="flex items-center gap-2 truncate">
                <span className="text-base">🧙‍♂️</span>
                <span className="truncate max-w-[120px]">Activo: {activeAccount.username}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] bg-[#0EA5E9] text-white px-2 py-0.5 rounded-full border border-black flex items-center gap-1 shrink-0 font-mono">
                  💎 {activeAccount.etherGems || 0} GE
                </span>
                {activeAccount.highscore > 0 && (
                  <span className="text-[10px] bg-yellow-400 px-2 py-0.5 rounded-full border border-black flex items-center gap-1.5 shrink-0">
                    <Trophy className="w-3 h-3 text-black fill-current" /> {activeAccount.highscore}
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="px-2 py-0.5 bg-red-650 hover:bg-red-700 hover:text-white border border-black rounded text-[9px] font-black uppercase tracking-wider text-white transition-all cursor-pointer"
                  title="Cerrar sesión"
                >
                  Salir
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-red-500 text-white font-black uppercase tracking-wider text-xs px-4 py-2.5 rounded-2xl border-4 border-black shadow-[4px_4px_0px_#000] select-none animate-pulse text-center">
              ⚠️ Inicia sesión abajo para jugar
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Creation / Login Auth / Delete Forms based on state */}
        <div className="lg:col-span-4 bg-slate-900 border-4 border-black p-5 rounded-3xl shadow-[4px_4px_0px_rgba(0,0,0,0.4)]">
          {authMode === "register" && (
            <form onSubmit={handleCreateAccount} className="flex flex-col gap-4">
              <h3 className="text-xs font-black font-mono text-gray-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
                <UserPlus className="w-4 h-4 text-[#EC4899]" /> Registrar nuevo alquimista
              </h3>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] uppercase font-bold tracking-wider text-gray-500 font-mono">// Apodo Único (Máx 15)</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Introduce tu apodo..."
                  className="bg-black border-2 border-slate-800 text-xs font-black uppercase tracking-wider rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#EC4899] shadow-inner"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] uppercase font-bold tracking-wider text-gray-500 font-mono">// Contraseña de Seguridad</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Establece contraseña..."
                    className="w-full bg-black border-2 border-slate-800 text-xs font-black uppercase tracking-wider rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#EC4899] shadow-inner pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <p className="text-[9px] text-red-400 font-black tracking-wide bg-red-950/20 px-3 py-1.5 rounded-xl border border-red-500/20 text-left font-mono">
                  ❌ {errorMsg}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-[#10B981] hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 active:translate-y-1 transition-all cursor-pointer"
              >
                Agregar Alquimista ✨
              </button>
            </form>
          )}

          {authMode === "login" && targetAccount && (
            <form onSubmit={handleVerifyLogin} className="flex flex-col gap-4 animate-fade-in">
              <h3 className="text-xs font-black font-mono text-amber-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
                <Lock className="w-4 h-4 text-amber-400" /> Autenticar alquimista
              </h3>
              
              <div className="bg-black/40 p-3 rounded-2xl border-2 border-slate-850 text-left">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block font-mono">Usuario seleccionado:</span>
                <span className="text-sm font-black uppercase text-white font-mono">{targetAccount.username}</span>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[9px] uppercase font-bold tracking-wider text-gray-500 font-mono">// Contraseña de la cuenta</label>
                <input
                  type="password"
                  value={authPasswordInput}
                  onChange={(e) => setAuthPasswordInput(e.target.value)}
                  placeholder="Introduce la contraseña para entrar..."
                  autoFocus
                  className="bg-black border-2 border-slate-800 text-xs font-black uppercase tracking-wider rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-amber-400 shadow-inner"
                />
              </div>

              {errorMsg && (
                <p className="text-[9px] text-red-400 font-black tracking-wide bg-red-950/20 px-3 py-1.5 rounded-xl border border-red-500/20 text-left font-mono">
                  ❌ {errorMsg}
                </p>
              )}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setAuthMode("register");
                    setTargetAccount(null);
                    setErrorMsg("");
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-gray-300 rounded-xl font-black uppercase text-[10px] tracking-wider border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-black rounded-xl font-black uppercase text-[10px] tracking-wider border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-1"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Entrar
                </button>
              </div>
            </form>
          )}

          {authMode === "delete_confirm" && targetAccount && (
            <form onSubmit={handleVerifyDelete} className="flex flex-col gap-4 animate-fade-in">
              <h3 className="text-xs font-black font-mono text-red-500 uppercase tracking-widest flex items-center gap-1.5 select-none">
                <Trash2 className="w-4 h-4 text-red-500 animate-pulse" /> Confirmar Eliminación
              </h3>

              <p className="text-[10px] text-gray-400 font-semibold leading-relaxed text-left">
                Por seguridad, debes ingresar la contraseña de <strong className="text-white font-mono uppercase">{targetAccount.username}</strong> para confirmar que eres el propietario y autorizar su borrado definitivo en la nube.
              </p>

              <div className="flex flex-col gap-2">
                <label className="text-[9px] uppercase font-bold tracking-wider text-gray-500 font-mono">// Contraseña del Propietario</label>
                <input
                  type="password"
                  value={authPasswordInput}
                  onChange={(e) => setAuthPasswordInput(e.target.value)}
                  placeholder="Introduce contraseña para confirmar..."
                  autoFocus
                  className="bg-black border-2 border-red-900 text-xs font-black uppercase tracking-wider rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-500 shadow-inner"
                />
              </div>

              {errorMsg && (
                <p className="text-[9px] text-red-400 font-black tracking-wide bg-red-950/20 px-3 py-1.5 rounded-xl border border-red-500/20 text-left font-mono">
                  ❌ {errorMsg}
                </p>
              )}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setAuthMode("register");
                    setTargetAccount(null);
                    setErrorMsg("");
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-gray-300 rounded-xl font-black uppercase text-[10px] tracking-wider border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-650 hover:bg-red-700 text-white rounded-xl font-black uppercase text-[10px] tracking-wider border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-1"
                >
                  Confirmar Destrucción
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Side: Saved Cloud Accounts Grid */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <h3 className="text-xs font-black font-mono text-gray-400 uppercase tracking-widest pl-1 select-none text-left">
            👤 Alquimistas Registrados en la Nube (Selecciona para identificarte)
          </h3>
          
          {accounts.length === 0 ? (
            <div className="h-44 border-4 border-dashed border-black/55 rounded-3xl flex flex-col items-center justify-center text-center p-4 text-gray-500 select-none bg-black/15">
              <Lock className="w-8 h-8 opacity-45 mb-1 text-slate-500" />
              <p className="text-xs italic font-bold text-slate-400">Sin alquimistas registrados todavía.</p>
              <p className="text-[10px] text-gray-500 mt-1 font-semibold max-w-sm">
                Sé el pionero en registrar tu personaje con contraseña en el panel de la izquierda para comenzar el viaje sagrado.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin">
              {accounts.map((acc) => {
                const isActive = activeAccount?.username === acc.username;
                return (
                  <div
                    key={acc.username}
                    onClick={() => handleSelectAccountClick(acc)}
                    className={`p-3.5 rounded-2xl border-4 border-black transition-all cursor-pointer select-none relative flex flex-col justify-between overflow-hidden group hover:scale-[1.02] active:scale-[0.98] ${
                      isActive
                        ? "bg-[#EC4899] text-white shadow-[6px_6px_0px_rgba(0,0,0,1)] font-black"
                        : "bg-[#1d2433] text-gray-300 hover:text-white shadow-[3px_3px_0px_rgba(0,0,0,0.5)] font-bold border-l-8 border-l-slate-400 hover:border-l-pink-400"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <span className="truncate text-sm uppercase tracking-wider block font-mono">
                        {acc.username}
                      </span>
                      {isActive ? (
                        <span className="bg-white text-[#EC4899] p-0.5 rounded-full border-2 border-black flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[4px]" />
                        </span>
                      ) : (
                        <span className="text-gray-500 group-hover:text-amber-400 text-[10px] shrink-0 font-mono">
                          🔑 Identificarse
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-3 border-t border-black/15 pt-2 flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-mono flex items-center gap-1 ${isActive ? "text-yellow-200" : "text-amber-400"}`}>
                          <Trophy className="w-3.5 h-3.5 fill-current" /> {acc.highscore}
                        </span>
                        <span className={`text-[9px] font-mono flex items-center gap-1 ${isActive ? "text-white/90" : "text-[#0ea5e9] font-extrabold"}`}>
                          💎 {acc.etherGems || 0}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteClick(acc, e)}
                        className={`p-1.5 rounded-lg border-2 border-black text-red-500 bg-white hover:bg-red-50 shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-y-[1px] transition-all cursor-pointer opacity-90 group-hover:opacity-100 shrink-0`}
                        title="Eliminar cuenta utilizando tu contraseña"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
