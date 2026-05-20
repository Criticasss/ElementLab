export type Rarity = "común" | "raro" | "legendario";

// Symbols/Cards inside Alchemist's Grid game
export interface ElementSymbol {
  id: string; // unique ID in a specific run instances
  name: string;
  symbol: string; // Emoji representing the symbol
  rarity: Rarity;
  description: string;
  baseValue: number; // Gold generated per turn
  synergyDescription?: string;
  interactions?: Array<{
    target: string;
    multiplier: string; // e.g. "+3", "x2"
  }>;
  tempTurnsLeft?: number; // for temporary cards (Cenizas, Clay decaying etc.)
}

export interface GameState {
  score: number;
  gold: number;
  quota: number;
  round: number;
  turnsLeft: number;
  grid: (ElementSymbol | null)[]; // 3x3 grid = 9 elements
  deck: ElementSymbol[];
  discard: ElementSymbol[];
  hand: ElementSymbol[];
  isGameOver: boolean;
  isVictory: boolean;
  quotaPaidThisRound: boolean;
  roundLog: string[];
  activeConceptTab: string;
}

// Struct for Gemini Chat
export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  suggestedCards?: ElementSymbol[]; // Add custom cards suggested during chat
}

// Blueprint/Structure for the 3 Great Viral Game Ideas
export interface DesignBlueprint {
  id: string;
  title: string;
  genre: string;
  difficultyToDev: "Fácil" | "Medio" | "Complejo";
  viralFactor: string; // e.g. "9/10"
  hook: string;
  coreMechanic: string;
  depthSecret: string;
  retentionFlywheel: string[];
  monetizationGrowth: string;
  uxPolishSecret: string;
}

export const GAME_CONCEPTS_LIST: DesignBlueprint[] = [
  {
    id: "alcosgrid",
    title: "Alquimia de Rejilla (Rogue-Lite de Sinergia)",
    genre: "Puzle de Construcción de Mazos / Sinergia de Rejilla",
    difficultyToDev: "Fácil",
    viralFactor: "9.5/10",
    hook: "Coloca símbolos sencillos en una cuadrícula de 3x3. Mira cómo reaccionan entre sí para ganar oro. Paga cuotas de oro crecientes para sobrevivir cada ronda. ¡No hay controles complejos, solo pura dopamina matemática!",
    coreMechanic: "Sinergia de proximidad espacial y mazo incremental. Entre rondas, el jugador draftea (elige) nuevos elementos locos para añadir a su mazo, como abejas que potencian flores, o volcanes que funden piedras en diamantes.",
    depthSecret: "Surgimiento y efecto arrastre de sinergias. Al principio ganas +1 de oro. En la ronda 5, una planta rodeada de agua y sol genera +50 de oro en un solo turno, multiplicándose exponencialmente gracias a combos bien pensados.",
    retentionFlywheel: [
      "Retos diarios con variantes de cartas bloqueadas (semillas fijas compartidas).",
      "Colección de más de 120 alquimias descubiertas en un 'Grimorio' o Almanaques de coleccionista.",
      "Modificadores infinitos o 'Reliquias' que alteran por completo las reglas de fusión."
    ],
    monetizationGrowth: "Ideal para formato Premium Móvil barato ($2.99) o Free-to-Play basado en pases de batalla cosméticos ('Tableros y Aspectos de Elementos'), o anuncios no intrusivos al final de una partida. Excelente para creadores de contenido ( streamers de Twitch analizando combinaciones).",
    uxPolishSecret: "¡Efectos de sonido jugosos (juicy sound design)! Sonidos de burbujas al fusionarse, destellos de luz cuando se activa un multiplicador x2, y números de daño/oro flotantes de colores neón."
  },
  {
    id: "gravsling",
    title: "Eco-Orbital (Space Gravity Sling)",
    genre: "Física Orbitaria / Habilidad Minimalista",
    difficultyToDev: "Medio",
    viralFactor: "8.5/10",
    hook: "Con solo dar un 'swipe' (arrastrar y soltar), lanza pequeñas sondas espaciales. Utiliza la gravedad de planetas flotantes en tiempo real para esquivar asteroides y recolectar helio-3. ¡Simple de arrastrar, hipnótico de contemplar!",
    coreMechanic: "Física gravitatoria real 2D acelerando o frenando tu nave. Tienes combustible y potencia limitados. Planetas con diferentes densidades generan campos magnéticos que doblan tu trayectoria elegantemente.",
    depthSecret: "Asistencias de gravedad sucesivas (slingshots) para ganar velocidad infinita sin gastar combustible, o colapsos colaterales para destruir agujeros negros utilizando radiación estacional.",
    retentionFlywheel: [
      "Pistas de carreras cortas de 30 segundos perfectamente repetibles.",
      "Fantasmas de otros jugadores (Ghost Play) integrados asíncronamente en el mapa.",
      "Desbloqueo de propulsores de estelas de luz personalizados para presumir de trayectoria."
    ],
    monetizationGrowth: "Skins de sondas espaciales con estelas de humo psicodélicas. Altamente exportable a TikTok gracias a trayectorias 'satisfactorias' o soluciones milimétricas de puzzles.",
    uxPolishSecret: "Velas gravitatorias que doblan el espacio visualmente alrededor de planetas densos, música ambiental lo-fi generativa basada en la velocidad de la sonda."
  },
  {
    id: "chronoecho",
    title: "Chrono Echo (Dungeon de Pasado Cooperativo)",
    genre: "Acción de Mazmorras / Puzles Temporales",
    difficultyToDev: "Complejo",
    viralFactor: "9.0/10",
    hook: "Un juego de exploración de mazmorras donde juegas completamente solo, pero cada 10 segundos, tu mímica pasada aparece como un fantasma para repetir tus movimientos exactos. ¡Coopera con tu 'yo' del pasado para activar placas de presión, disparar trampas y derribar bosses gigantes!",
    coreMechanic: "Grabación de inputs temporales y coordinación asíncrona de un solo jugador. Un botón 'retroceder tiempo' te permite coordinar hasta 4 fantasmas tuyos simultáneos.",
    depthSecret: "Gestión de paradojas y fuego amigo. Si tu fantasma del pasado dispara una flecha donde estás parado ahora mismo, ¡te golpeará a ti! Tienes que planear dónde estarás parado en los próximos bucles.",
    retentionFlywheel: [
      "Editor de niveles interno extremadamente fácil de usar, donde se pueden subir mazmorras creadas a la nube comunitaria.",
      "Tablas de clasificación de menor tiempo / menor número de bucles temporales.",
      "Retos cooperativos de temporada donde los puzles cambian semanalmente."
    ],
    monetizationGrowth: "La creación comunitaria genera retención infinita. Las microtransacciones se centran en decoraciones para el editor de niveles, marcos de avatar históricos y skins de fantasmas temáticos.",
    uxPolishSecret: "Filtros de video retro VHS retroalimentados cromáticamente cuando estás en bucle temporal, transiciones de sonido reversas (rewind audio)."
  }
];
