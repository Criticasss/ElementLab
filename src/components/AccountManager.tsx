import React, { useState, useEffect } from "react";
import { playSound } from "../utils/audio";
import { User, UserPlus, Users, Trophy, Trash2, Check, KeyRound, Lock, Eye, EyeOff, LogIn, Ticket, Settings } from "lucide-react";
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
  achievements?: string[];
  labMasteries?: string[];
  redeemedCodes?: string[];
  avatar?: string;
}

interface AccountManagerProps {
  onAccountChange: (account: Account | null) => void;
  activeAccount: Account | null;
}

type AuthMode = "register" | "login" | "delete_confirm";

const AVAILABLE_AVATARS = [
  "🧙‍♂️", "🧪", "🌋", "💧", "🌪️", "⚡", "🐲", "🦉", "👑", "🍀", "👾", "🔥"
];

function renderAvatar(avatar: string | undefined, sizeClass: string = "w-6 h-6 text-sm") {
  const currentAvatar = avatar || "🧙‍♂️";
  const isImage = currentAvatar.startsWith("data:image/") || currentAvatar.startsWith("http://") || currentAvatar.startsWith("https://") || currentAvatar.startsWith("/");

  if (isImage) {
    return (
      <div className={`rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-black/15 bg-slate-800 ${sizeClass}`}>
        <img
          src={currentAvatar}
          alt="Avatar"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1614855052345-c2f4c659c52e?auto=format&fit=crop&q=80&w=100";
          }}
        />
      </div>
    );
  }

  return (
    <span className={`shrink-0 flex items-center justify-center ${sizeClass}`}>
      {currentAvatar}
    </span>
  );
}

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

  // Promo Redemption States
  const [promoInput, setPromoInput] = useState("");
  const [promoStatus, setPromoStatus] = useState<{ type: "success" | "error" | "idle"; message: string }>({ type: "idle", message: "" });
  const [isSubmittingPromo, setIsSubmittingPromo] = useState(false);

  // Profile Config States
  const [profileUsername, setProfileUsername] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("🧙‍♂️");
  const [profileStatus, setProfileStatus] = useState<{ type: "success" | "error" | "idle"; message: string }>({ type: "idle", message: "" });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileShowPassword, setProfileShowPassword] = useState(false);

  // Sync profile inputs when active account changes
  useEffect(() => {
    if (activeAccount) {
      setProfileUsername(activeAccount.username);
      setProfilePassword(activeAccount.password || "");
      setProfileAvatar(activeAccount.avatar || "🧙‍♂️");
      setProfileStatus({ type: "idle", message: "" });
    }
  }, [activeAccount]);

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
        tutorialCompleted: false,
        achievements: []
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount) return;

    const oldUsername = activeAccount.username;
    const nextUsername = profileUsername.trim();
    const nextPassword = profilePassword.trim();

    if (!nextUsername) {
      playSound("fail");
      setProfileStatus({ type: "error", message: "El nombre de usuario no puede estar vacío." });
      return;
    }

    if (nextUsername.length > 15) {
      playSound("fail");
      setProfileStatus({ type: "error", message: "El apodo es demasiado largo (máx 15 caracteres)." });
      return;
    }

    if (nextPassword.length < 3) {
      playSound("fail");
      setProfileStatus({ type: "error", message: "La contraseña debe tener al menos 3 caracteres." });
      return;
    }

    setIsUpdatingProfile(true);
    setProfileStatus({ type: "idle", message: "" });

    try {
      const isRenaming = oldUsername.toLowerCase() !== nextUsername.toLowerCase();

      if (isRenaming) {
        // Double check username safety
        if (nextUsername.toLowerCase() === "default") {
          playSound("fail");
          setProfileStatus({ type: "error", message: "No puedes renombrar tu cuenta a 'default'." });
          setIsUpdatingProfile(false);
          return;
        }

        // Check if OLD username was default
        if (oldUsername.toLowerCase() === "default") {
          playSound("fail");
          setProfileStatus({ type: "error", message: "La cuenta protegida 'default' no puede cambiar su nombre." });
          setIsUpdatingProfile(false);
          return;
        }

        // Check uniqueness in database
        const nextDocRef = doc(db, "accounts", nextUsername);
        const nextDocSnap = await getDoc(nextDocRef);
        if (nextDocSnap.exists()) {
          playSound("fail");
          setProfileStatus({ type: "error", message: "Este apodo ya está registrado por otro alquimista." });
          setIsUpdatingProfile(false);
          return;
        }

        // High grade Cloud migration: Set target with new username document & delete old one
        const updatedAcc: Account = {
          ...activeAccount,
          username: nextUsername,
          password: nextPassword,
          avatar: profileAvatar
        };

        await setDoc(nextDocRef, updatedAcc);
        await deleteDoc(doc(db, "accounts", oldUsername));

        // Sync parent details & local memory
        onAccountChange(updatedAcc);
        localStorage.setItem("alquimia_viral_active_user", nextUsername);
      } else {
        // Just standard updates in-place
        const updatedAcc: Account = {
          ...activeAccount,
          password: nextPassword,
          avatar: profileAvatar
        };

        await setDoc(doc(db, "accounts", oldUsername), updatedAcc);
        onAccountChange(updatedAcc);
      }

      playSound("levelUp");
      setProfileStatus({ type: "success", message: "¡Tu perfil se ha actualizado con éxito!" });
    } catch (error) {
      console.error("Error updating profile in firestore:", error);
      playSound("fail");
      setProfileStatus({ type: "error", message: "Error al guardar la metamorfosis de tu perfil." });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount) {
      playSound("fail");
      setPromoStatus({ type: "error", message: "Debes estar conectado con un usuario activo." });
      return;
    }

    const codeToRedeem = promoInput.trim().toUpperCase();
    if (!codeToRedeem) {
      playSound("fail");
      setPromoStatus({ type: "error", message: "Por favor, introduce un código." });
      return;
    }

    setIsSubmittingPromo(true);
    setPromoStatus({ type: "idle", message: "" });

    try {
      // Fetch promo code document
      const promoDocRef = doc(db, "promo_codes", codeToRedeem);
      const promoSnapshot = await getDoc(promoDocRef);

      if (!promoSnapshot.exists()) {
        playSound("fail");
        setPromoStatus({ type: "error", message: "Código de regalo no válido o inexistente." });
        setIsSubmittingPromo(false);
        return;
      }

      const promoData = promoSnapshot.data();
      if (!promoData.isActive) {
        playSound("fail");
        setPromoStatus({ type: "error", message: "Este código ha sido desactivado." });
        setIsSubmittingPromo(false);
        return;
      }

      // Check if user has already redeemed it
      const redeemedList = activeAccount.redeemedCodes || [];
      if (redeemedList.includes(codeToRedeem)) {
        playSound("fail");
        setPromoStatus({ type: "error", message: "Tu cuenta ya ha canjeado este código anteriormente." });
        setIsSubmittingPromo(false);
        return;
      }

      // Prepare updated user account fields based on rewardType
      const updatedFields: Partial<Account> = {};
      let rewardDescription = "";

      if (promoData.rewardType === "gems") {
        const addedGems = promoData.gemsValue || 0;
        updatedFields.etherGems = (activeAccount.etherGems || 0) + addedGems;
        rewardDescription = `¡Se han añadido +${addedGems} Gemas de Éter en tu inventario!`;
      } else if (promoData.rewardType === "potions") {
        const addedCount = promoData.potionsValue || 0;
        const currentPotions = activeAccount.potions || { midas: 0, time: 0, chaos: 0 };
        updatedFields.potions = {
          midas: (currentPotions.midas || 0) + addedCount,
          time: (currentPotions.time || 0) + addedCount,
          chaos: (currentPotions.chaos || 0) + addedCount
        };
        rewardDescription = `¡Recibiste +${addedCount} pociones de cada tipo (Midas, Tiempo y Caos)!`;
      } else if (promoData.rewardType === "all_relics") {
        // Unlock all relics: "crisol", "espejo", "sello"
        updatedFields.relics = ["crisol", "espejo", "sello"];
        rewardDescription = "¡Has desbloqueado todas las Reliquias Sagradas en el altar!";
      }

      // Add the code to redeemedCodes
      updatedFields.redeemedCodes = [...redeemedList, codeToRedeem];

      // Write changes to Firestore accounts collection
      const userDocRef = doc(db, "accounts", activeAccount.username);
      await setDoc(userDocRef, { ...activeAccount, ...updatedFields });

      // Trigger the parent's update account callback
      onAccountChange({ ...activeAccount, ...updatedFields });

      playSound("levelUp");
      setPromoStatus({
        type: "success",
        message: `¡Canje exitoso! ${rewardDescription}`
      });
      setPromoInput("");
    } catch (error) {
      console.error("Error redeeming promo code:", error);
      playSound("fail");
      setPromoStatus({ type: "error", message: "Error al validar la transmutación celestial." });
    } finally {
      setIsSubmittingPromo(false);
    }
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
                {renderAvatar(activeAccount.avatar, "w-8 h-8 text-base md:text-lg")}
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
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-slate-900 border-4 border-black p-5 rounded-3xl shadow-[4px_4px_0px_rgba(0,0,0,0.4)]">
          {activeAccount ? (
            <form onSubmit={handleUpdateProfile} className="flex flex-col gap-3.5 text-left animate-fade-in">
              <h3 className="text-xs font-black font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
                <Settings className="w-4 h-4 text-cyan-400 animate-pulse" /> Configuración de Perfil
              </h3>

              {/* Avatar Swapper */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase font-bold tracking-wider text-gray-500 font-mono">// Avatar Mágico Sincronizado</label>
                
                {/* Preset Emojis */}
                <div className="grid grid-cols-6 gap-1 bg-black/60 p-2 rounded-xl border border-slate-800">
                  {AVAILABLE_AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setProfileAvatar(emoji);
                      }}
                      className={`text-base p-1 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                        profileAvatar === emoji
                          ? "bg-cyan-500/20 border border-cyan-500 scale-105"
                          : "border border-transparent opacity-65 hover:opacity-100 hover:bg-slate-850"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Custom Picture upload / URL section */}
                <div className="bg-black/60 p-2 rounded-xl border border-slate-800 flex flex-col gap-2 mt-1">
                  <span className="text-[8px] uppercase font-black text-slate-400 font-mono tracking-widest">// O sube tu propia foto de perfil</span>
                  
                  {/* File Pick */}
                  <div className="flex flex-col gap-0.5">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const img = new Image();
                            img.onload = () => {
                              const canvas = document.createElement("canvas");
                              const ctx = canvas.getContext("2d");
                              const maxDim = 120;
                              let width = img.width;
                              let height = img.height;
                              if (width > height) {
                                if (width > maxDim) {
                                  height = Math.round((height * maxDim) / width);
                                  width = maxDim;
                                }
                              } else {
                                if (height > maxDim) {
                                  width = Math.round((width * maxDim) / height);
                                  height = maxDim;
                                }
                              }
                              canvas.width = width;
                              canvas.height = height;
                              ctx?.drawImage(img, 0, 0, width, height);
                              const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
                              setProfileAvatar(compressedBase64);
                              playSound("click");
                            };
                            img.src = event.target?.result as string;
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-[9px] text-gray-400 file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border file:border-black file:bg-cyan-500 file:text-black file:font-black file:uppercase file:cursor-pointer hover:file:bg-cyan-600 font-mono cursor-pointer"
                    />
                  </div>

                  {/* URL Input */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] uppercase font-semibold text-slate-500 font-mono">Enlace directo URL</span>
                    <input
                      type="text"
                      value={profileAvatar.startsWith("data:") ? "" : profileAvatar}
                      onChange={(e) => {
                        setProfileAvatar(e.target.value || "🧙‍♂️");
                      }}
                      placeholder="https://ejemplo.com/foto.jpg"
                      className="w-full bg-black border border-slate-700/60 rounded-lg text-[9px] px-2 py-1 text-white placeholder-gray-650 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>

                  {/* Preview area */}
                  <div className="flex items-center gap-2 pt-1.5 border-t border-slate-800/40">
                    <span className="text-[8px] uppercase font-semibold text-slate-500 font-mono">Previsualización:</span>
                    {renderAvatar(profileAvatar, "w-8 h-8 border border-slate-650")}
                  </div>
                </div>

              </div>

              {/* Username Form field */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] uppercase font-bold tracking-wider text-gray-500 font-mono">// Apodo del Alquimista</label>
                  {activeAccount.username.toLowerCase() === "default" && (
                    <span className="text-[8px] text-amber-400 font-mono font-black uppercase tracking-widest px-1 bg-amber-950/40 rounded border border-amber-500/20">🔒 Bloqueado</span>
                  )}
                </div>
                <input
                  type="text"
                  value={profileUsername}
                  onChange={(e) => setProfileUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                  disabled={activeAccount.username.toLowerCase() === "default"}
                  placeholder="Introduce tu apodo..."
                  className="bg-black border border-slate-805 text-xs font-black uppercase tracking-wider rounded-xl p-2.5 text-white placeholder-gray-650 focus:outline-none focus:border-cyan-400 font-mono disabled:opacity-40 disabled:cursor-not-allowed"
                />
                {activeAccount.username.toLowerCase() === "default" && (
                  <p className="text-[8.5px] text-amber-500 italic leading-snug">
                    Por seguridad celestial, la cuenta del reino "default" no puede ser renombrada.
                  </p>
                )}
              </div>

              {/* Password field */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase font-bold tracking-wider text-gray-500 font-mono">// Contraseña de Seguridad</label>
                <div className="relative">
                  <input
                    type={profileShowPassword ? "text" : "password"}
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    placeholder="Contraseña secreta..."
                    className="w-full bg-black border border-slate-805 text-xs font-mono tracking-wider rounded-xl p-2.5 text-white placeholder-gray-650 focus:outline-none focus:border-cyan-400 pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setProfileShowPassword(!profileShowPassword)}
                    className="absolute right-2.5 top-3 text-gray-500 hover:text-white"
                  >
                    {profileShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {profileStatus.message && (
                <p className={`text-[9.5px] font-bold tracking-wide px-3 py-1.5 rounded-xl border font-mono ${
                  profileStatus.type === "success"
                    ? "text-emerald-400 bg-emerald-950/20 border-emerald-500/20"
                    : "text-red-400 bg-red-950/20 border-red-500/20"
                }`}>
                  {profileStatus.type === "success" ? "✨" : "❌"} {profileStatus.message}
                </p>
              )}

              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 border-4 border-black text-black rounded-xl font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-[3px_3px_0px_#000] hover:translate-y-0.5"
              >
                {isUpdatingProfile ? "Sincronizando..." : "Guardar Perfil 💾"}
              </button>
            </form>
          ) : (
            <>
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
                    <label className="text-[9px] uppercase font-bold tracking-wider text-gray-505 font-mono">// Contraseña de la cuenta</label>
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
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-755 text-gray-300 rounded-xl font-black uppercase text-[10px] tracking-wider border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 cursor-pointer"
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
                    <label className="text-[9px] uppercase font-bold tracking-wider text-gray-505 font-mono">// Contraseña del Propietario</label>
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
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-755 text-gray-300 rounded-xl font-black uppercase text-[10px] tracking-wider border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 cursor-pointer"
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
            </>
          )}
          </div>

          {/* Promo code redemption card */}
          {activeAccount && (
            <div className="bg-slate-900 border-4 border-black p-5 rounded-3xl shadow-[4px_4px_0px_rgba(0,0,0,0.4)] flex flex-col gap-4 text-left animate-fade-in">
              <h3 className="text-xs font-black font-mono text-amber-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
                <Ticket className="w-4 h-4 text-amber-400" /> Canjear Código Promocional
              </h3>
              <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                Introduce un cupón divino para reclamar tus gemas de éter, elixires o reliquias sagradas:
              </p>

              <form onSubmit={handleRedeemCode} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                    placeholder="Escribe el código aquí..."
                    disabled={isSubmittingPromo}
                    className="w-full bg-black border-2 border-slate-800 text-xs font-black uppercase tracking-wider rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                {promoStatus.message && (
                  <p className={`text-[9px] font-black tracking-wide px-3 py-2 rounded-xl border text-left font-mono ${
                    promoStatus.type === "success"
                      ? "text-emerald-400 bg-emerald-950/20 border-emerald-500/20"
                      : "text-red-400 bg-red-950/20 border-red-500/20"
                  }`}>
                    {promoStatus.type === "success" ? "✨" : "❌"} {promoStatus.message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingPromo}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black rounded-2xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 border-4 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 active:translate-y-1 transition-all cursor-pointer"
                >
                  {isSubmittingPromo ? "Validando..." : "Canjear Regalo 🎁"}
                </button>
              </form>
            </div>
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
                    <div className="flex justify-between items-center gap-1.5 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="shrink-0 bg-black/20 rounded-xl border border-black/10 flex items-center justify-center p-0.5">
                          {renderAvatar(acc.avatar, "w-7 h-7 text-xs")}
                        </div>
                        <span className="truncate text-sm uppercase tracking-wider block font-mono">
                          {acc.username}
                        </span>
                      </div>
                      {isActive ? (
                        <span className="bg-white text-[#EC4899] p-0.5 rounded-full border-2 border-black flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[4px]" />
                        </span>
                      ) : (
                        <span className="text-gray-500 group-hover:text-amber-400 text-[10px] shrink-0 font-mono">
                          🔑 Identificar
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
