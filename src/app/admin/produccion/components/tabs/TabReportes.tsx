import { useState, useMemo, useEffect } from 'react';
import { Download, TrendingUp, TrendingDown, Target, Lightbulb, CalendarDays, Info, FlaskConical } from 'lucide-react';
import { ProduccionRow, TuboRow } from '../hooks/useProduccionCO2';

interface Props {
  produccion: ProduccionRow[];
  tubos: TuboRow[];
}

function getMonthYear(fecha: string | Date) {
  const d = new Date(fecha);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatMesLocal(yyyyMm: string) {
  const [y, m] = yyyyMm.split('-');
  const date = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, 1));
  const text = date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function TabReportes({ produccion, tubos }: Props) {
  const mesesDisponibles = useMemo(() => {
    const meses = new Set<string>();
    
    const hoy = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1));
      meses.add(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    }

    produccion.forEach(p => meses.add(getMonthYear(p.fecha)));
    tubos.forEach(t => meses.add(getMonthYear(t.fecha_llegada)));

    return Array.from(meses).sort().reverse();
  }, [produccion, tubos]);

  const [mesSeleccionado, setMesSeleccionado] = useState(mesesDisponibles[0]);
  const [estrategia, setEstrategia] = useState('');

  const tieneRegistros = useMemo(() => {
    return produccion.some(p => getMonthYear(p.fecha) === mesSeleccionado);
  }, [produccion, mesSeleccionado]);

  // Filtrar tubos que estuvieron activos o llegaron durante este mes
  const tubosDelMes = useMemo(() => {
    return tubos.filter(t => {
      const llegada = getMonthYear(t.fecha_llegada);
      const cierre = t.fecha_cierre ? getMonthYear(t.fecha_cierre) : '9999-99';
      return llegada <= mesSeleccionado && (t.activo || cierre >= mesSeleccionado);
    });
  }, [tubos, mesSeleccionado]);

  useEffect(() => {
    const guardada = localStorage.getItem(`estrategia_sodatal_${mesSeleccionado}`);
    setEstrategia(guardada || '');
  }, [mesSeleccionado]);

  const guardarEstrategia = (val: string) => {
    setEstrategia(val);
    localStorage.setItem(`estrategia_sodatal_${mesSeleccionado}`, val);
  };

  const calcularStats = (mesData: ProduccionRow[]) => {
    let b10 = 0, b20 = 0, sodas = 0, phSum = 0, ppmSum = 0;
    mesData.forEach(p => { 
      b10 += p.botellon10_cantidad; 
      b20 += p.botellon20_cantidad; 
      sodas += p.sodas_cantidad; 
      phSum += p.ph;
      ppmSum += p.ppm;
    });
    const count = mesData.length || 1;
    return { 
      b10, 
      b20, 
      sodas, 
      avgPh: (phSum / count).toFixed(2), 
      avgPpm: (ppmSum / count).toFixed(2) 
    };
  };

  const comparativa = useMemo(() => {
    const prodActual = produccion.filter(p => getMonthYear(p.fecha) === mesSeleccionado);
    const statsActual = calcularStats(prodActual);

    const indexActual = mesesDisponibles.indexOf(mesSeleccionado);
    const mesAnterior = mesesDisponibles[indexActual + 1];
    const prodAnterior = mesAnterior ? produccion.filter(p => getMonthYear(p.fecha) === mesAnterior) : [];
    const statsAnterior = calcularStats(prodAnterior);

    const calcCrecimiento = (act: number, ant: number) => {
      if (ant === 0) return act > 0 ? 100 : 0;
      return ((act - ant) / ant) * 100;
    };

    return {
      actual: statsActual,
      crecimiento: {
        b10: calcCrecimiento(statsActual.b10, statsAnterior.b10),
        b20: calcCrecimiento(statsActual.b20, statsAnterior.b20),
        sodas: calcCrecimiento(statsActual.sodas, statsAnterior.sodas),
      }
    };
  }, [produccion, mesSeleccionado, mesesDisponibles]);

  const descargarReporteHTML = () => {
    const prodMes = produccion.filter(p => getMonthYear(p.fecha) === mesSeleccionado);
    const stats = calcularStats(prodMes);
    const mesFormateado = formatMesLocal(mesSeleccionado);

    const filasProduccion = prodMes.map(p => {
      const usuario = p.usuario ? `${p.usuario.nombre} ${p.usuario.apellido || ''}`.trim() : '—';
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${new Date(p.fecha).toLocaleDateString('es-CL')}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${p.botellon10_cantidad}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${p.botellon20_cantidad}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${p.sodas_cantidad}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${p.ph}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${p.ppm}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${usuario}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${p.observaciones || '—'}</td>
        </tr>
      `;
    }).join('');

    const filasTubos = tubosDelMes.map(t => {
      const cierre = t.fecha_cierre ? new Date(t.fecha_cierre).toLocaleDateString('es-CL') : '—';
      const estado = t.activo ? '<span style="color: #059669; font-weight: bold;">Activo</span>' : '<span style="color: #64748b;">Cerrado</span>';
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${new Date(t.fecha_llegada).toLocaleDateString('es-CL')}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${cierre}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${t.peso_kg} kg</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${t.kg_consumidos.toFixed(1)} kg</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${t.sodas_producidas_total}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${estado}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Reporte Producción - ${mesFormateado}</title>
        <style>
          body { font-family: 'Segoe UI', system-ui, sans-serif; color: #334155; margin: 40px; background-color: #f8fafc; }
          .container { max-width: 1000px; margin: 0 auto; background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
          .header { border-bottom: 2px solid #283289; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #283289; margin: 0 0 5px 0; font-size: 28px; font-weight: 900; }
          .header p { color: #64748b; margin: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
          .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 15px; margin-bottom: 30px; }
          .card { background: #f1f5f9; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; }
          .card-title { font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 8px; }
          .card-value { font-size: 32px; font-weight: 900; color: #283289; margin: 0; }
          h2 { color: #283289; margin-top: 40px; font-size: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
          th { background-color: #283289; color: white; padding: 14px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
          th.center { text-align: center; }
          tr:hover { background-color: #f8fafc; }
          .estrategia-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 24px; border-radius: 12px; margin-top: 30px; }
          .estrategia-box h3 { color: #166534; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
          .estrategia-box p { color: #15803d; margin: 0; line-height: 1.6; white-space: pre-wrap; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reporte de Producción</h1>
            <p>SIGO Sodatal - ${mesFormateado}</p>
          </div>

          <div class="summary-cards">
            <div class="card">
              <div class="card-title">Botellones 20L</div>
              <p class="card-value">${stats.b20}</p>
            </div>
            <div class="card">
              <div class="card-title">Botellones 10L</div>
              <p class="card-value">${stats.b10}</p>
            </div>
            <div class="card">
              <div class="card-title">Sodas Producidas</div>
              <p class="card-value">${stats.sodas}</p>
            </div>
            <div class="card">
              <div class="card-title">Promedio pH</div>
              <p class="card-value">${prodMes.length > 0 ? stats.avgPh : '0.00'}</p>
            </div>
            <div class="card">
              <div class="card-title">Promedio PPM</div>
              <p class="card-value">${prodMes.length > 0 ? stats.avgPpm : '0.00'}</p>
            </div>
          </div>

          <h2>Detalle de Producción Diaria del Mes</h2>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th class="center">Bot. 10L</th>
                <th class="center">Bot. 20L</th>
                <th class="center">Sodas</th>
                <th class="center">pH</th>
                <th class="center">PPM</th>
                <th>Operador</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              ${filasProduccion || '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #64748b;">Sin registros en este mes</td></tr>'}
            </tbody>
          </table>

          <h2>Tubos de CO₂ Operativos en el Mes</h2>
          <table>
            <thead>
              <tr>
                <th>Llegada</th>
                <th>Cierre</th>
                <th class="center">Peso Inicial</th>
                <th class="center">Consumo Acum.</th>
                <th class="center">Sodas Producidas</th>
                <th class="center">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${filasTubos || '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b;">Sin tubos operativos registrados en este mes</td></tr>'}
            </tbody>
          </table>

          ${estrategia.trim() ? `
          <div class="estrategia-box">
            <h3>Apuntes Estratégicos y Observaciones</h3>
            <p>${estrategia}</p>
          </div>
          ` : ''}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Reporte_Produccion_${mesSeleccionado}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const KPIBadge = ({ titulo, valor, crecimiento }: { titulo: string, valor: number, crecimiento: number }) => {
    const esPositivo = crecimiento >= 0;
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm relative overflow-hidden">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{titulo}</p>
        <div className="flex items-end justify-between">
          <h3 className="text-3xl font-black text-[#283289]">{valor.toLocaleString('es-CL')}</h3>
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${esPositivo ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {esPositivo ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(crecimiento).toFixed(1)}%
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-[#283289]" />
          <select 
            value={mesSeleccionado} 
            onChange={(e) => setMesSeleccionado(e.target.value)}
            className="text-sm font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#283289]/20"
          >
            {mesesDisponibles.map(m => (
              <option key={m} value={m}>{formatMesLocal(m)}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={descargarReporteHTML} 
          disabled={!tieneRegistros}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#283289] hover:bg-[#1e2670] disabled:opacity-50 disabled:hover:bg-[#283289] text-white text-xs font-bold rounded-xl transition-colors"
        >
          <Download className="w-4 h-4" />
          Descargar Reporte
        </button>
      </div>

      {!tieneRegistros && (
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-center gap-2 text-slate-500 text-xs font-bold">
          <Info className="h-4 w-4" />
          Este mes no contiene registros de producción.
        </div>
      )}

      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-opacity ${!tieneRegistros ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
        <KPIBadge titulo="Total Botellones 20L" valor={comparativa.actual.b20} crecimiento={comparativa.crecimiento.b20} />
        <KPIBadge titulo="Total Botellones 10L" valor={comparativa.actual.b10} crecimiento={comparativa.crecimiento.b10} />
        <KPIBadge titulo="Total Sodas Producidas" valor={comparativa.actual.sodas} crecimiento={comparativa.crecimiento.sodas} />
      </div>

      {/* Nueva Tabla de Tubos Operativos en la vista Web */}
      {tubosDelMes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 bg-slate-50/50">
            <FlaskConical className="h-4 w-4 text-[#283289]" />
            <h2 className="text-sm font-bold text-gray-800">Tubos de CO₂ Operativos este Mes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-400 uppercase text-[10px] tracking-wider bg-gray-50/70">
                  <th className="px-5 py-3 font-bold">Fecha Llegada</th>
                  <th className="px-3 py-3 font-bold">Fecha Cierre</th>
                  <th className="px-3 py-3 font-bold">Peso</th>
                  <th className="px-3 py-3 font-bold">Kg Consumidos</th>
                  <th className="px-3 py-3 font-bold">Sodas Producidas</th>
                  <th className="px-3 py-3 font-bold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tubosDelMes.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-gray-800">{new Date(t.fecha_llegada).toLocaleDateString('es-CL')}</td>
                    <td className="px-3 py-3 text-gray-600">{t.fecha_cierre ? new Date(t.fecha_cierre).toLocaleDateString('es-CL') : '—'}</td>
                    <td className="px-3 py-3 text-gray-600">{t.peso_kg} kg</td>
                    <td className="px-3 py-3 text-gray-600">{t.kg_consumidos.toFixed(1)} kg</td>
                    <td className="px-3 py-3 text-gray-600 font-bold">{t.sodas_producidas_total}</td>
                    <td className="px-3 py-3">
                      {t.activo
                        ? <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-[10px] font-black">ACTIVO</span>
                        : <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-full text-[10px] font-black">CERRADO</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 bg-slate-50/50">
          <Target className="h-4 w-4 text-[#283289]" />
          <h2 className="text-sm font-bold text-gray-800">Observaciones del Mes</h2>
        </div>
        <div className="p-5 flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-3">
            <label className="block text-xs font-bold text-gray-600 uppercase">({formatMesLocal(mesSeleccionado)})</label>
            <textarea 
              value={estrategia}
              onChange={(e) => guardarEstrategia(e.target.value)}
              placeholder="Ej: Fuga de Co2 detectada..."
              className="w-full h-32 border border-gray-200 rounded-xl p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#283289]/20 focus:border-[#283289] transition-colors resize-none"
            />
            <p className="text-[10px] text-gray-400">Estos apuntes se reflejarán en la parte inferior del reporte exportado.</p>
          </div>  
        </div>
      </div>
    </div>
  );
}