import React, { useState, useEffect } from "react";
import { playSound } from "../utils/audio";
import { User, UserPlus, Users, Trophy, Trash2, Check, Shield } from "lucide-react";

export interface Account {
  username: string;
  highscore: number;
  gamesPlayed: number;
  etherGems?: number;
  relics?: string[];
  potions?: {
    midas: number;
    time: number;
    chaos: number;
  };
}

interface AccountManagerProps {
  onAccountChange: (account: Account | null) => void;
  activeAccount: Account | null;
}

export default function AccountManager({ onAccountChange, activeAccount }: AccountManagerProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Load accounts from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("alquimia_viral_accounts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Account[];
        setAccounts(parsed);
        
        // Also load active account if previously set
        const savedActive = localStorage.getItem("alquimia_viral_active_user");
        if (savedActive) {
          const matched = parsed.find(acc => acc.username === savedActive);
          if (matched) {
            onAccountChange(matched);
          } else if (parsed.length > 0) {
            onAccountChange(parsed[0]);
            localStorage.setItem("alquimia_viral_active_user", parsed[0].username);
          }
        } else if (parsed.length > 0) {
          // Default to first account if none selected
          onAccountChange(parsed[0]);
          localStorage.setItem("alquimia_viral_active_user", parsed[0].username);
        }
      } catch (e) {
        console.error("Error reading accounts", e);
      }
    }
  }, []);

  const saveAccountsToStorage = (updatedList: Account[]) => {
    localStorage.setItem("alquimia_viral_accounts", JSON.stringify(updatedList));
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newUsername.trim();
    
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

    // Check if duplicate
    const exists = accounts.some(acc => acc.username.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      playSound("click");
      setErrorMsg("Este apodo ya existe. ¡Elige uno único!");
      return;
    }

    playSound("levelUp");
    const newAcc: Account = {
      username: cleanName,
      highscore: 0,
      gamesPlayed: 0,
      etherGems: 0,
      relics: [],
      potions: { midas: 0, time: 0, chaos: 0 }
    };

    const updated = [...accounts, newAcc];
    setAccounts(updated);
    saveAccountsToStorage(updated);
    
    // Auto-select newly created account
    onAccountChange(newAcc);
    localStorage.setItem("alquimia_viral_active_user", newAcc.username);

    setNewUsername("");
    setErrorMsg("");
  };

  const handleSelectAccount = (acc: Account) => {
    playSound("click");
    onAccountChange(acc);
    localStorage.setItem("alquimia_viral_active_user", acc.username);
    setErrorMsg("");
  };

  const handleDeleteAccount = (usernameToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent selecting
    playSound("click");
    
    const updated = accounts.filter(acc => acc.username !== usernameToDelete);
    setAccounts(updated);
    saveAccountsToStorage(updated);

    if (activeAccount?.username === usernameToDelete) {
      if (updated.length > 0) {
        onAccountChange(updated[0]);
        localStorage.setItem("alquimia_viral_active_user", updated[0].username);
      } else {
        onAccountChange(null);
        localStorage.removeItem("alquimia_viral_active_user");
      }
    }
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
              Crea o selecciona tu cuenta para el registro de récords.
            </p>
          </div>
        </div>

        {/* Current Active User Display */}
        <div className="w-full md:w-auto">
          {activeAccount ? (
            <div className="bg-white text-black font-black uppercase tracking-wider text-xs px-4 py-2.5 rounded-2xl border-4 border-black shadow-[4px_4px_0px_#EC4899] flex items-center gap-2 select-none">
              <span className="text-base">🧙‍♂️</span>
              <span className="truncate max-w-[120px]">Activo: {activeAccount.username}</span>
              <span className="text-[10px] bg-[#0EA5E9] text-white px-2 py-0.5 rounded-full border border-black flex items-center gap-1 shrink-0 ml-1 font-mono">
                💎 {activeAccount.etherGems || 0} GE
              </span>
              {activeAccount.highscore > 0 && (
                <span className="text-[10px] bg-yellow-400 px-2 py-0.5 rounded-full border border-black flex items-center gap-1.5 shrink-0 ml-1">
                  <Trophy className="w-3 h-3 text-black fill-current" /> {activeAccount.highscore}
                </span>
              )}
            </div>
          ) : (
            <div className="bg-red-500 text-white font-black uppercase tracking-wider text-xs px-4 py-2.5 rounded-2xl border-4 border-black shadow-[4px_4px_0px_#000] select-none animate-pulse">
              ⚠️ Sin Alquimista Activo
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Create Account Form */}
        <form onSubmit={handleCreateAccount} className="lg:col-span-4 flex flex-col gap-4 bg-slate-900 border-4 border-black p-5 rounded-3xl shadow-[4px_4px_0px_rgba(0,0,0,0.4)]">
          <h3 className="text-xs font-black font-mono text-gray-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
            <UserPlus className="w-4 h-4 text-[#EC4899]" /> Registrar nuevo alquimista
          </h3>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Introduce tu apodo..."
              className="bg-black border-4 border-black text-xs font-black uppercase tracking-wider rounded-2xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#EC4899] shadow-inner"
            />
            {errorMsg && (
              <p className="text-[10px] text-red-400 font-black tracking-wide bg-red-950/20 px-3 py-1.5 rounded-xl border border-red-500/20">
                {errorMsg}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-[#10B981] hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 active:translate-y-1 transition-all cursor-pointer"
          >
            Agregar Alquimista ✨
          </button>
        </form>

        {/* Right Side: Saved Accounts Grid */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <h3 className="text-xs font-black font-mono text-gray-400 uppercase tracking-widest pl-1 select-none">
            👤 Cuentas Guardadas (Haz click para iniciar sesión)
          </h3>
          
          {accounts.length === 0 ? (
            <div className="h-32 border-4 border-dashed border-black/50 rounded-3xl flex flex-col items-center justify-center text-center p-4 text-gray-500 select-none bg-black/10">
              <User className="w-8 h-8 opacity-45 mb-1 text-slate-500" />
              <p className="text-xs italic font-bold">Sin cuentas registradas todavía.</p>
              <p className="text-[10px] text-gray-400 mt-1 font-semibold">Crea tu primer personaje arriba a la izquierda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[175px] overflow-y-auto pr-2 scrollbar-thin">
              {accounts.map((acc) => {
                const isActive = activeAccount?.username === acc.username;
                return (
                  <div
                    key={acc.username}
                    onClick={() => handleSelectAccount(acc)}
                    className={`p-3.5 rounded-2xl border-4 border-black transition-all cursor-pointer select-none relative flex flex-col justify-between overflow-hidden group hover:scale-[1.03] active:scale-[0.98] ${
                      isActive
                        ? "bg-[#EC4899] text-white shadow-[6px_6px_0px_rgba(0,0,0,1)] font-black"
                        : "bg-[#1d2433] text-gray-300 hover:text-white shadow-[3px_3px_0px_rgba(0,0,0,0.5)] font-bold"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <span className="truncate text-sm uppercase tracking-wider block">
                        {acc.username}
                      </span>
                      {isActive && (
                        <span className="bg-white text-[#EC4899] p-0.5 rounded-full border-2 border-black flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[4px]" />
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-3 border-t border-black/15 pt-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-mono flex items-center gap-1 ${isActive ? "text-yellow-200" : "text-amber-400"}`}>
                          <Trophy className="w-3.5 h-3.5 fill-current" /> Récord: {acc.highscore}
                        </span>
                        <span className={`text-[9px] font-mono flex items-center gap-1 ${isActive ? "text-white/90" : "text-[#0ea5e9] font-extrabold"}`}>
                          💎 {acc.etherGems || 0} GE
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteAccount(acc.username, e)}
                        className={`p-1 rounded-lg border-2 border-black text-red-500 bg-white hover:bg-red-50 shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-y-[1px] transition-all cursor-pointer opacity-90 group-hover:opacity-100`}
                        title="Eliminar cuenta"
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
