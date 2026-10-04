export interface ComisionConfig {
  tipo?: string;
  
  // Reglas Oficiales de Comisión Sodatal:
  // 1. Botellón 20L: Efectivo o Tarjeta ($150) vs Transferencia o Crédito/Factura/Guía ($75)
  monto20L_efectivoTarjeta: number;       // $150
  monto20L_transferenciaCredito: number;  // $75

  // 2. Botellón 10L: siempre $75
  monto10L: number;                       // $75

  // 3. Soda / Sifón: siempre $6
  montoSoda: number;                      // $6

  // Tarifas mapeadas para Cliente Natural y Cliente Empresa
  montoUnidad20L_natural: number;
  montoUnidad10L_natural: number;
  montoSoda_natural: number;
  porcentajeVenta_natural: number;

  montoUnidad20L_empresa: number;
  montoUnidad10L_empresa: number;
  montoSoda_empresa: number;
  porcentajeVenta_empresa: number;

  // Campos legacy / retrocompatibilidad
  montoParada_natural?: number;
  montoParada_empresa?: number;
  montoUnidad20L?: number;
  montoUnidad10L?: number;
}

export function normalizarConfigComision(raw?: any): ComisionConfig {
  // Valores prioritarios solicitados:
  // 20L Efectivo/Tarjeta: $150
  // 20L Transferencia/Crédito: $75
  // 10L: $75 siempre
  // Soda: $6 siempre
  const m20Efectivo = Number(raw?.monto20L_efectivoTarjeta ?? raw?.m20e ?? raw?.montoUnidad20L_natural ?? 150);
  const m20Credito = Number(raw?.monto20L_transferenciaCredito ?? raw?.m20c ?? raw?.montoUnidad20L_empresa ?? 75);
  const m10 = Number(raw?.m10L ?? raw?.monto10L ?? raw?.montoUnidad10L_natural ?? raw?.montoUnidad10L_empresa ?? 75);
  const mSoda = Number(raw?.ms ?? raw?.montoSoda ?? raw?.montoSoda_natural ?? raw?.montoSoda_empresa ?? 6);

  return {
    tipo: raw?.tipo || 'ENTREGAS_Y_VENTAS',
    monto20L_efectivoTarjeta: m20Efectivo,
    monto20L_transferenciaCredito: m20Credito,
    monto10L: m10,
    montoSoda: mSoda,

    // Mapeo Natural (tiende a Efectivo/Tarjeta) y Empresa (tiende a Transferencia/Crédito)
    montoUnidad20L_natural: m20Efectivo,
    montoUnidad10L_natural: m10,
    montoSoda_natural: mSoda,
    porcentajeVenta_natural: Number(raw?.porcentajeVenta_natural ?? raw?.pvn ?? 0),

    montoUnidad20L_empresa: m20Credito,
    montoUnidad10L_empresa: m10,
    montoSoda_empresa: mSoda,
    porcentajeVenta_empresa: Number(raw?.porcentajeVenta_empresa ?? raw?.pve ?? 0),

    montoParada_natural: 0,
    montoParada_empresa: 0,
    montoUnidad20L: m20Efectivo,
    montoUnidad10L: m10,
  };
}

export function serializarConfigComision(config: ComisionConfig): string {
  const c = normalizarConfigComision(config);
  return JSON.stringify({
    tipo: c.tipo,
    m20e: c.monto20L_efectivoTarjeta,
    m20c: c.monto20L_transferenciaCredito,
    m10: c.monto10L,
    ms: c.montoSoda,
    pvn: c.porcentajeVenta_natural,
    pve: c.porcentajeVenta_empresa
  });
}
