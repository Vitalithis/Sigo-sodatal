/**
 * Utilidades centralizadas para gestión de fechas y restricción a días hábiles (Lunes a Viernes).
 * La empresa Sodatal opera exclusivamente de Lunes a Viernes.
 */

export function formatearFechaLocal(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function parsearFechaLocal(fechaStr: string): Date {
  const [yyyy, mm, dd] = fechaStr.split('-').map(Number);
  return new Date(yyyy, mm - 1, dd, 12, 0, 0); // Usamos mediodía para evitar cualquier desfase horario
}

/**
 * Determina si una fecha corresponde a fin de semana (Sábado = 6 o Domingo = 0).
 */
export function esFinDeSemana(fecha: string | Date): boolean {
  if (!fecha) return false;
  const d = typeof fecha === 'string' ? parsearFechaLocal(fecha) : fecha;
  const dia = d.getDay();
  return dia === 0 || dia === 6;
}

/**
 * Retorna la fecha hábil (Lunes a Viernes) más cercana.
 * Si es Sábado o Domingo, se ajusta al Viernes anterior (por defecto) o al Lunes siguiente.
 */
export function getFechaHabilMasCercana(
  fecha: string | Date = new Date(),
  direccion: 'anterior' | 'siguiente' = 'anterior'
): string {
  const d = typeof fecha === 'string' ? parsearFechaLocal(fecha) : new Date(fecha.getTime());
  const dia = d.getDay();

  if (dia === 6) {
    // Sábado
    if (direccion === 'siguiente') {
      d.setDate(d.getDate() + 2); // Lunes
    } else {
      d.setDate(d.getDate() - 1); // Viernes
    }
  } else if (dia === 0) {
    // Domingo
    if (direccion === 'siguiente') {
      d.setDate(d.getDate() + 1); // Lunes
    } else {
      d.setDate(d.getDate() - 2); // Viernes
    }
  }

  return formatearFechaLocal(d);
}

/**
 * Retorna la fecha de hoy, pero si hoy es fin de semana (Sábado o Domingo),
 * retorna el último día hábil (Viernes).
 */
export function getHoyHabilStr(): string {
  return getFechaHabilMasCercana(new Date(), 'anterior');
}

/**
 * Valida si una fecha seleccionada es un día hábil.
 * Si es fin de semana, devuelve valido: false y la fecha ajustada al día hábil correspondiente.
 */
export function validarDiaHabil(
  fechaStr: string,
  direccion: 'anterior' | 'siguiente' = 'anterior'
): { valido: boolean; fechaAjustada: string; mensaje?: string } {
  if (!fechaStr) {
    return { valido: true, fechaAjustada: fechaStr };
  }

  if (esFinDeSemana(fechaStr)) {
    const fechaAjustada = getFechaHabilMasCercana(fechaStr, direccion);
    const d = parsearFechaLocal(fechaStr);
    const nombreDia = d.getDay() === 6 ? 'Sábado' : 'Domingo';
    return {
      valido: false,
      fechaAjustada,
      mensaje: `La empresa opera de Lunes a Viernes. El día ${nombreDia} no es laborable; se seleccionó el día hábil más cercano (${fechaAjustada}).`,
    };
  }

  return { valido: true, fechaAjustada: fechaStr };
}

/**
 * Helper para eventos onChange de inputs de tipo date.
 * Si el usuario escoge Sábado o Domingo, ejecuta callbackDeAlerta (opcional)
 * y retorna la fecha hábil ajustada.
 */
export function handleDateInputSoloHabiles(
  valor: string,
  onAlerta?: (mensaje: string) => void,
  direccion: 'anterior' | 'siguiente' = 'anterior'
): string {
  const validacion = validarDiaHabil(valor, direccion);
  if (!validacion.valido) {
    if (onAlerta && validacion.mensaje) {
      onAlerta(validacion.mensaje);
    }
    return validacion.fechaAjustada;
  }
  return valor;
}

/**
 * Retorna el rango UTC exacto que abarca las 24 horas del día en horario local (00:00:00 a 23:59:59.999).
 * Esencial para campos con timestamp en UTC como fecha_emision, created_at, hora_entrega.
 * En Chile (UTC-3), una guía emitida a las 23:21 se almacena como 02:21Z del día siguiente.
 * Este rango cubre desde 03:00:00Z hasta 02:59:59.999Z del día siguiente,
 * asegurando que ninguna venta o guía nocturna quede fuera.
 */
export function getRangoDiaTimestamp(fechaStr: string) {
  const [yyyy, mm, dd] = fechaStr.split('-').map(Number);
  const inicio = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
  const fin = new Date(yyyy, mm - 1, dd, 23, 59, 59, 999);
  return { inicio, fin };
}

/**
 * Retorna la fecha normalizada a medianoche UTC (YYYY-MM-DDT00:00:00.000Z),
 * ideal para modelos con campo `fecha` discreto (como Cuadratura o CierreCaja).
 */
export function getFechaNormalizadaUTC(fechaStr: string): Date {
  const [yyyy, mm, dd] = fechaStr.split('-').map(Number);
  return new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0, 0));
}
