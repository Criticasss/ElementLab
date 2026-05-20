import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined in the environment. AI capabilities will be unavailable.");
      throw new Error("GEMINI_API_KEY is missing. Please configure it in your Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// AI Co-Designer Endpoint
app.post("/api/co-designer", async (req, res) => {
  try {
    const { message, history, contextGame } = req.body;
    const ai = getAiClient();

    // Prepare system instructions and formatted conversation
    const systemInstruction = `Eres un genial y experimentado Alquimista y Mentor de Diseño de "Alquimia de Rejilla". 
Tu misión es ayudar al usuario a idear y perfeccionar sinergias y combinaciones altamente adictivas que sigan la filosofía de "fácil de jugar, díficil de dominar".
Proporciona análisis de diseño profundos, desglosando:
1. Sinergias y combinaciones espaciales en la rejilla 3x3.
2. Cómo lograr el máximo rendimiento de oro de elementos comunes, raros y legendarios.
3. Sugerencias de hermosas recetas ingeniosas para lograr mayor puntuación.

Además, el usuario tiene acceso a un juego prototipo jugable en la aplicación llamada "Alquimia de Rejilla" (un rogue-lite de emparejamiento de símbolos en una cuadrícula 3x3 para llegar a una cuota de oro). Puedes proponer cartas/símbolos totalmente nuevos y locos para "Alquimia de Rejilla". 
Si el usuario te sugiere un nuevo elemento o símbolo para el juego de Alquimia, devuélvele su diseño en un formato estructurado y amigable.

Mantén un tono sabio, misterioso, profesional, claro y humano. ¡Usa Markdown para dar un formato hermoso y legible!`;

    // Construct contents
    // We combine the history into a chat format
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      }
    }

    // Append current message
    contents.push({
      role: "user",
      parts: [{ text: `Mensaje del usuario: "${message}"\n\nInfo de contexto actual: En el prototipo jugable, el jugador tiene puntuación: ${contextGame?.score ?? 0}, ronda actual: ${contextGame?.round ?? 1}, cuota: ${contextGame?.quota ?? 0}.` }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.8,
      },
    });

    const responseText = response.text || "Lo siento, no pude generar una respuesta.";
    res.json({ text: responseText });
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ error: error.message || "Error al procesar la solicitud con la IA." });
  }
});

// Endpoint to generate a brand new custom synergistic card for the Playable Proto!
app.post("/api/co-designer/generate-card", async (req, res) => {
  try {
    const { cardIdea } = req.body;
    const ai = getAiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Diseña un nuevo símbolo/carta para un juego de cuadrícula de sinergia de alquimia matching en 3x3.
El usuario sugirió el concepto de: "${cardIdea}".
Genera un objeto JSON estructurado con la especificación de esta carta.
La carta debe tener mecánicas de sinergia con otros elementos estándar: "Fuego", "Agua", "Sol", "Semilla", "Piedra", "Oro", "Planta", "Abeja", "Lluvia".
Devuelve ÚNICAMENTE un objeto JSON con las siguientes propiedades:
{
  "name": "Nombre corto y sonoro en español",
  "symbol": "Un solo carácter emoji representativo de la carta",
  "rarity": "común" | "raro" | "legendario",
  "description": "Explicación clara de qué sinergia hace en la cuadrícula. Ej: 'Da +3 de oro por cada Fuego adyacente y se transforma en Ceniza después de 2 turnos.'",
  "baseValue": un número entero de oro que da por sí sola (ej: 1, 2, 3),
  "synergyDescription": "Explicación simple de la profundidad estratégica que aporta este elemento",
  "interactions": [
    { "target": "elemento_con_el_que_interactua", "multiplier": un número flotante de beneficio o sumador (p. ej. +4 o x2) }
  ]
}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            symbol: { type: Type.STRING },
            rarity: { type: Type.STRING },
            description: { type: Type.STRING },
            baseValue: { type: Type.INTEGER },
            synergyDescription: { type: Type.STRING },
            interactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  target: { type: Type.STRING },
                  multiplier: { type: Type.STRING },
                },
                required: ["target", "multiplier"],
              },
            },
          },
          required: ["name", "symbol", "rarity", "description", "baseValue", "synergyDescription"],
        },
      },
    });

    const cardJson = JSON.parse(response.text || "{}");
    res.json(cardJson);
  } catch (error: any) {
    console.error("Error generating custom card:", error);
    res.status(500).json({ error: error.message || "No se pudo generar el símbolo personalizado." });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", configLoaded: !!apiKey });
});

// Vite Middleware & Static Asset Serving Setup
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

start();
