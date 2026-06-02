export interface Announcement {
  id: string;
  title: string;
  date: string;
  category: "Actualización" | "Evento" | "Mantenimiento" | "Comunidad";
  badgeColor: string; // Tailwind bg color class
  emoji: string;
  content: string;
  important: boolean;
}

export const ANNOUNCEMENTS_LIST: Announcement[] = [
  {
    id: "v1.2.0-rangos",
    title: "¡Gran Actualización: Sistema de Rangos y Logros Alquímicos!",
    date: "2026-05-27",
    category: "Actualización",
    badgeColor: "bg-pink-500 text-white",
    emoji: "🏆",
    content: "¡Hemos lanzado el nuevo sistema de Logros y Rangos! Ahora puedes ver tu rango de Alquimista en tiempo real. Cumple desafíos como 'Pirómano Alquímico' o 'Descubridor del Vacío' para ascender desde Aprendiz hasta Gran Maestro del Vacío y desbloquear medallas exclusivas. ¡Compite por el grimorio definitivo!",
    important: true
  },
  {
    id: "eclipse-alquimico",
    title: "¡Evento Cósmico: El Eclipse Alquímico se Aproxima!",
    date: "2026-05-26",
    category: "Evento",
    badgeColor: "bg-purple-600 text-white",
    emoji: "🔮",
    content: "Los astros se alinean en la Rejilla Alquímica. Durante el evento del Eclipse, la rareza legendaria tiene mayores sinergias estelares y el multiplicador de oro fluye con mayor pureza. ¡Mantente atento a la atmósfera de la mesa!",
    important: false
  },
  {
    id: "bienvenida",
    title: "¡Bienvenidos al Laboratorio Oficial de ElementLab!",
    date: "2026-05-25",
    category: "Comunidad",
    badgeColor: "bg-emerald-600 text-white",
    emoji: "🧪",
    content: "¡Iniciamos las operaciones del crisol cuántico! Diseña elementos usando tu creatividad y la inteligencia artificial para inyectar transmutaciones libres directamente en tu rejilla. Comparte tus descubrimientos con otros aprendices de la orden.",
    important: false
  },
  {
    id: "duelos",
    title: "DUELOS OUT!!!",
    date: "2026-06-02",
    category: "Evento",
    badgeColor: "bg-pink-500 text-white",
    emoji: "💪",
    content: "Venimos calentitos con nuevas actualizaciones!!, Hemos sacado el nuevo evento de duelos, consiste en que 2 jugadores se enfrentan para ver quien consigue llegar mas lejos, el ganador sera recompensado con 100 GEMAS ETER! para celebrar el estreno de el evento de duelos venimos tambien con un codigito que os va a dar 150 GEMAS ETER! el codigo es: 'DUELSOUT', disfrutad de vuestras gemas!",
    important: true
  }
];
