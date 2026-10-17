import pino from 'pino';

// Configuración de Pino para ultra-bajo consumo de CPU y memoria:
// 1. Escribe exclusivamente en formato JSON hacia process.stdout (sin formateo visual costoso).
// 2. Desactiva campos innecesarios como hostname y pid para minimizar el payload de bytes.
// 3. Genera timestamps en formato ISO 8601 UTC.
export const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: undefined, // Remueve pid y hostname para ahorrar bytes y ciclos de CPU
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export interface LogEvent {
  timestamp?: string;
  trace_id: string;
  method?: string;
  url?: string;
  status?: number;
  duration_ms?: number;
  userId?: string | null;
  operation?: string;
  message?: string;
  error?: any;
  [key: string]: any;
}

/**
 * Registra un evento operacional estructurado hacia stdout.
 * Diseñado para ser no bloqueante y de latencia cero en el hilo principal.
 */
export function logOperation(event: LogEvent) {
  const payload: LogEvent = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
    trace_id: event.trace_id,
    duration_ms: event.duration_ms !== undefined ? Number(event.duration_ms.toFixed(2)) : undefined,
    userId: event.userId ?? null,
  };

  // En entornos Node.js utilizamos el stream optimizado de Pino
  if (typeof process !== 'undefined' && process.stdout && !process.env.NEXT_RUNTIME?.includes('edge')) {
    pinoLogger.info(payload, payload.message || 'operacion_completada');
  } else {
    // En Edge Runtime (Middleware de Next.js), console.log escribe directamente a stdout en formato JSON
    console.log(JSON.stringify({
      level: 'info',
      ...payload,
      msg: payload.message || 'operacion_completada'
    }));
  }
}

export default pinoLogger;
