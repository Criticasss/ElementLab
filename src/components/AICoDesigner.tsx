import { useState } from "react";
import { ChatMessage, ElementSymbol } from "../types";
import { playSound } from "../utils/audio";
import { Send, Sparkles, Loader2, HelpCircle, AlertCircle, Sparkle, PlusCircle, Check } from "lucide-react";

interface AICoDesignerProps {
  onUnlockCustomCard: (card: ElementSymbol) => void;
  gameContext: {
    score: number;
    round: number;
    quota: number;
  };
}

const PRESET_PROMPTS = [
  "¿Cuál es la mejor combinación para multiplicar oro?",
  "Dime cómo crear Obsidiana paso a paso",
  "¿Cómo puedo aprovechar al máximo el Sol ☀️?",
  "Dame ideas para crear una nueva planta legendaria"
];

export default function AICoDesigner({ onUnlockCustomCard, gameContext }: AICoDesignerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      text: "👋 ¡Hola! Soy tu **Socio y Sabio Copiloto Alquímico**.\n\nEstoy aquí para guiarte en el descubrimiento de valiosas recetas, sinergias y fórmulas óptimas dentro de la Rejilla de Alquimia.\n\nConsúltame sobre cómo encadenar efectos espaciales, duplicar oro o balancear cartas.\n\n👉 También puedes usar el **Forjador Alquímico de IA** a tu derecha para idear elementos fantásticos y forjarlos en tiempo real dentro del juego.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Custom card generation states
  const [cardIdeaInput, setCardIdeaInput] = useState("");
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [recentlyGeneratedCard, setRecentlyGeneratedCard] = useState<ElementSymbol | null>(null);
  const [cardError, setCardError] = useState("");

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return;

    playSound("click");
    // Add user message to state
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText("");
    setIsSending(true);

    try {
      const response = await fetch("/api/co-designer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: textToSend,
          history: updatedMessages.slice(-8), // Send history for memory
          contextGame: gameContext,
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo conectar con el servidor de la IA.");
      }

      const data = await response.json();

      const modelMsg: ChatMessage = {
        id: Math.random().toString(),
        role: "model",
        text: data.text,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, modelMsg]);
      playSound("merge");
    } catch (error: any) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: Math.random().toString(),
        role: "model",
        text: `⚠️ **Error de conexión con la IA:**\n\nNo pude procesar tu solicitud. Asegúrate de configurar la clave de API \`GEMINI_API_KEY\` en el panel **Settings > Secrets** de AI Studio.\n\n*Detalles: ${error.message}*`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      playSound("fail");
    } finally {
      setIsSending(false);
    }
  };

  const handlePresetClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  // Generate a custom synergistic card for the Grid game
  const handleGenerateCard = async () => {
    if (!cardIdeaInput.trim() || isGeneratingCard) return;

    playSound("click");
    setIsGeneratingCard(true);
    setCardError("");
    setRecentlyGeneratedCard(null);

    try {
      const response = await fetch("/api/co-designer/generate-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cardIdea: cardIdeaInput }),
      });

      if (!response.ok) {
        throw new Error("Error llamando al servicio creador de cartas.");
      }

      const card = await response.json();
      
      // Assign an instance id
      const generatedCard: ElementSymbol = {
        ...card,
        id: `custom-${Date.now()}`,
      };

      setRecentlyGeneratedCard(generatedCard);
      playSound("victory");
    } catch (err: any) {
      console.error(err);
      setCardError("No se pudo generar el elemento. Verifica tu conexión e inténtalo de nuevo.");
      playSound("fail");
    } finally {
      setIsGeneratingCard(false);
    }
  };

  const handleInjectCard = () => {
    if (!recentlyGeneratedCard) return;
    playSound("levelUp");
    onUnlockCustomCard(recentlyGeneratedCard);
    
    // Add custom message about card injection to chat log
    const injectNotice: ChatMessage = {
      id: Math.random().toString(),
      role: "model",
      text: `🎉 **¡CONGREGADO POR LLAMADO DEL AI!**\n\nHe inyectado exitosamente el símbolo **${recentlyGeneratedCard.symbol} ${recentlyGeneratedCard.name}** (${recentlyGeneratedCard.rarity.toUpperCase()}) en tu grupo de cartas de selección del mazo del juego. \n\n*Habilidad*: ${recentlyGeneratedCard.description}\n\n*Uso estratégico*: ${recentlyGeneratedCard.synergyDescription || "Maximiza sus adyacencias en la cuadrícula para ver su potencial."}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, injectNotice]);
    setRecentlyGeneratedCard(null);
    setCardIdeaInput("");
  };

  return (
    <div id="ai-co-designer" className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[600px] lg:h-[650px]">
      {/* Left Chat Window */}
      <div className="lg:col-span-8 flex flex-col justify-between bg-[#111827] border-4 border-black rounded-[2.5rem] overflow-hidden h-full shadow-[8px_8px_0px_rgba(0,0,0,0.5)]">
        {/* Chat upper label bar */}
        <div className="bg-[#1f2937] px-5 py-4 border-b-4 border-black flex justify-between items-center select-none">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border border-black"></div>
            <h3 className="text-xs font-black font-mono text-white uppercase tracking-wider">
              🎮 AI Game Mentor & Designer
            </h3>
          </div>
          <span className="text-[10px] text-black font-black uppercase tracking-wider bg-white border-2 border-black px-2.5 py-1 rounded-full shadow-[2px_2px_0px_#000]">
            Gemini-3.5-Flash
          </span>
        </div>

        {/* Message feed list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {messages.map((msg) => {
            const isModel = msg.role === "model";
            return (
              <div key={msg.id} className={`flex ${isModel ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed border-4 border-black ${
                    isModel
                      ? "bg-[#1f2937] text-gray-100 shadow-[3px_3px_0px_#000]"
                      : "bg-[#EC4899] text-white shadow-[3px_3px_0px_#000] font-bold"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1.5 text-[9px] font-mono">
                    <span className={`font-black uppercase tracking-wider ${isModel ? "text-yellow-400" : "text-white opacity-95"}`}>
                      {isModel ? "👾 Copiloto" : "👤 Diseñador"}
                    </span>
                    <span className={isModel ? "text-gray-400" : "text-white/80"}>{msg.timestamp}</span>
                  </div>
                  {/* Text render supports manual markdown list spacing simply */}
                  <div className="whitespace-pre-wrap font-sans space-y-1.5 text-gray-200">
                    {msg.text.split("\n\n").map((para, pIdx) => (
                      <p key={pIdx}>
                        {para.startsWith("1.") || para.startsWith("*") || para.startsWith("-") ? (
                          <span className="block border-l-2 border-slate-700 pl-2.5 py-0.5 my-1 font-sans italic opacity-90">
                            {para}
                          </span>
                        ) : (
                          para
                        )}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          {isSending && (
            <div className="flex justify-start">
              <div className="bg-slate-900 border-4 border-black rounded-2xl p-4 text-xs font-mono text-gray-300 flex items-center gap-2 shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
                <Loader2 className="w-4 h-4 text-pink-500 animate-spin" />
                <span>Analizando mecánicas de retención emergentes...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestions presets bar */}
        {messages.length === 1 && (
          <div className="px-5 py-3 overflow-x-auto flex gap-2 border-t-4 border-black bg-white/5 select-none scrollbar-none">
            {PRESET_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handlePresetClick(prompt)}
                className="whitespace-nowrap bg-black hover:bg-slate-900 border-2 border-black text-[10px] font-bold uppercase tracking-wider text-white px-3.5 py-1.5 rounded-xl transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[1px] cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Send message textbar footer */}
        <div className="p-4 border-t-4 border-black bg-[#1f2937] flex gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputText)}
            placeholder="Introduce tu idea para desglosar sus mecánicas o bucles..."
            disabled={isSending}
            className="flex-1 bg-black border-4 border-black rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none"
          />
          <button
            onClick={() => handleSendMessage(inputText)}
            disabled={!inputText.trim() || isSending}
            className="px-5 py-2.5 bg-[#EC4899] hover:bg-pink-600 border-4 border-black text-white hover:text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[1px]"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right AI Card Forge panel */}
      <div className="lg:col-span-4 bg-[#1f2937] border-4 border-black rounded-[2.5rem] p-5 flex flex-col justify-between h-full shadow-[8px_8px_0px_rgba(0,0,0,0.5)]">
        <div className="space-y-4">
          <div className="border-b-4 border-black pb-4 select-none">
            <h4 className="text-xs font-mono font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-yellow-300 fill-current animate-pulse" /> // Forjador Alquímico de IA
            </h4>
            <p className="text-[10px] font-semibold text-gray-400 mt-1.5 leading-normal">
              Sueña un elemento descabellado. El Co-Diseñador redactará sus mecánicas de sinergia y las integrará al juego.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black font-mono text-gray-400 uppercase tracking-widest">// Idea de elemento</label>
            <input
              type="text"
              value={cardIdeaInput}
              onChange={(e) => setCardIdeaInput(e.target.value)}
              placeholder="Ej: 'Fresa Vampiro', 'Nube Eléctrica'..."
              className="bg-black border-4 border-black text-xs rounded-xl p-3.5 text-white placeholder-gray-650 focus:outline-none font-semibold shadow-[2px_2px_0px_rgba(0,0,0,0.2)]"
            />
          </div>

          {cardError && (
            <div className="p-3 bg-red-950/20 border-2 border-black rounded-xl text-[10px] text-red-400 flex items-start gap-1.5 animate-fade-in font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{cardError}</span>
            </div>
          )}

          {/* Prompt card render block */}
          {recentlyGeneratedCard ? (
            <div className="p-5 bg-white text-black border-4 border-black rounded-3xl relative overflow-hidden animate-fade-in flex flex-col items-center text-center gap-2 shadow-[4px_4px_0px_rgba(0,0,0,0.3)]">
              <div className="absolute top-1 right-2 text-[8px] font-black font-mono uppercase text-gray-500 tracking-widest select-none">
                FORJADO
              </div>
              <span className="text-5xl filter drop-shadow-[2px_2px_0px_rgba(0,0,0,0.3)] animate-bounce select-none">{recentlyGeneratedCard.symbol}</span>
              <div>
                <h5 className="font-black text-base uppercase text-black tracking-tight mt-1">
                  {recentlyGeneratedCard.name}
                </h5>
                <span className="text-[9px] inline-block font-black uppercase bg-[#EC4899] text-white px-2.5 py-0.5 rounded-full border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] mt-2">
                  {recentlyGeneratedCard.rarity}
                </span>
              </div>
              <p className="text-[11px] leading-snug text-gray-800 font-bold my-1">{recentlyGeneratedCard.description}</p>
              <div className="w-full bg-[#111827] text-white p-3 rounded-xl border-2 border-black text-left text-[11px] font-mono leading-normal shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                <strong className="text-yellow-400 uppercase text-[9px] font-black">Sinergias:</strong>
                <p className="text-gray-300 mt-1">{recentlyGeneratedCard.synergyDescription}</p>
              </div>
            </div>
          ) : (
            <div className="h-44 border-4 border-dashed border-black/50 rounded-2xl flex flex-col items-center justify-center text-center p-4 text-gray-400 select-none">
              <HelpCircle className="w-8 h-8 opacity-45 mb-2 text-slate-500" />
              <p className="text-[10px] italic max-w-xs">
                Introduce una idea arriba y haz clic en "Forjar Carta con IA". Verás el resultado aquí.
              </p>
            </div>
          )}
        </div>

        {/* Action button */}
        {recentlyGeneratedCard ? (
          <button
            onClick={handleInjectCard}
            className="w-full py-3 bg-[#EC4899] hover:bg-pink-600 text-white rounded-2xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-1 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4.5 h-4.5 text-yellow-300 fill-current" /> Inyectar Símbolo al Juego 🕹️
          </button>
        ) : (
          <button
            onClick={handleGenerateCard}
            disabled={!cardIdeaInput.trim() || isGeneratingCard}
            className="w-full py-3 bg-white hover:bg-gray-100 text-black rounded-2xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:scale-[1.02] active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isGeneratingCard ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analizando sinergias...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#EC4899] fill-current animate-pulse" />
                <span>Forjar Carta con IA</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
