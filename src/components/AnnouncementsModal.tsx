import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Bell, Megaphone, Info, Sparkles, Star, Calendar } from "lucide-react";
import { ANNOUNCEMENTS_LIST, Announcement } from "../announcements";
import { playSound } from "../utils/audio";

interface AnnouncementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "Todos" | "Actualización" | "Evento" | "Comunidad";

export default function AnnouncementsModal({ isOpen, onClose }: AnnouncementsModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<TabType>("Todos");

  if (!isOpen) return null;

  const handleClose = () => {
    playSound("click");
    onClose();
  };

  const handleTabClick = (cat: TabType) => {
    playSound("click");
    setSelectedCategory(cat);
  };

  const filteredAnnouncements = ANNOUNCEMENTS_LIST.filter(ann => {
    if (selectedCategory === "Todos") return true;
    return ann.category === selectedCategory;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Outer Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          id="announcements-modal"
          className="relative w-full max-w-2xl bg-[#111827] border-4 border-black rounded-[2.5rem] shadow-[12px_12px_0px_rgba(0,0,0,1)] p-6 md:p-8 flex flex-col max-h-[85vh] overflow-hidden z-[101] text-left"
        >
          {/* Close button top corner */}
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:shadow-[0px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
            title="Cerrar avisos"
          >
            <X className="w-5 h-5 font-black" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-4 border-b-4 border-black pb-5 pt-1 pr-12 select-none">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 border-4 border-black flex items-center justify-center text-white scale-100 shadow-[3px_3px_0px_rgba(0,0,0,1)] shrink-0">
              <Megaphone className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-extrabold tracking-widest text-[#EC4899] uppercase block animate-pulse">
                🔊 TABLÓN OFICIAL DE NOVEDADES
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                Anuncios y Avisos
              </h2>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2 my-5 select-none">
            {(["Todos", "Actualización", "Evento", "Comunidad"] as TabType[]).map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => handleTabClick(cat)}
                  className={`px-3.5 py-1.5 rounded-xl font-mono text-[11px] font-extrabold uppercase tracking-wider border-2 border-black transition-all cursor-pointer hover:scale-[1.04] active:scale-[0.96] ${
                    isActive
                      ? "bg-amber-500 text-black shadow-[3px_3px_0px_rgba(0,0,0,1)]"
                      : "bg-[#1f2937] text-gray-400 hover:text-white hover:border-slate-400"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Scrollable list of announcements */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scroll select-text">
            {filteredAnnouncements.length > 0 ? (
              filteredAnnouncements.map((ann) => (
                <div
                  key={ann.id}
                  className={`p-5 rounded-[2rem] border-4 border-black relative transition-all duration-200 ${
                    ann.important
                      ? "bg-gradient-to-br from-[#1c1a3a] to-[#251f49] shadow-[6px_6px_0px_rgba(0,0,0,1)] border-amber-400"
                      : "bg-[#1f2937] shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                  }`}
                >
                  {/* Announcement Header */}
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-xl bg-black/40 border-2 border-slate-705 flex items-center justify-center text-xl shrink-0 select-none">
                      {ann.emoji}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1 select-none">
                        <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full ${ann.badgeColor}`}>
                          {ann.category}
                        </span>
                        
                        {ann.important && (
                          <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-black animate-pulse flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-black" /> IMPORTANTE
                          </span>
                        )}

                        <span className="text-[10px] text-gray-500 font-semibold font-mono flex items-center gap-1 ml-auto">
                          <Calendar className="w-3 h-3 text-gray-500" /> {ann.date}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-black text-white hover:text-amber-400 uppercase tracking-wide leading-snug">
                        {ann.title}
                      </h3>
                    </div>
                  </div>

                  {/* Announcement description */}
                  <p className="text-xs sm:text-sm text-slate-350 mt-3 font-medium leading-relaxed border-t border-black/20 pt-3">
                    {ann.content}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-black/20 rounded-[2rem] border-4 border-dashed border-black select-none">
                <span className="text-4.5xl block animate-pulse">🤐</span>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-2">
                  No hay anuncios en esta categoría
                </p>
                <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1 leading-relaxed">
                  Trasmuta más elementos en tu crisol, el sabio maestro enviará noticias pronto.
                </p>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="border-t-4 border-black mt-5 pt-4 text-[10px] font-mono text-gray-500 flex justify-between items-center select-none bg-black/20 -mx-6 -mb-6 px-6 pb-6 rounded-b-[2rem] gap-2">
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3 text-gray-500 shrink-0" />
              <span>Panel de anuncios de ElementLab</span>
            </span>
            <span className="text-[9px] font-extrabold shrink-0 text-slate-400 bg-black/40 px-2.5 py-1 rounded-xl border border-slate-800">
              ElementLab v1.2.0 • LIVE 🟢
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
