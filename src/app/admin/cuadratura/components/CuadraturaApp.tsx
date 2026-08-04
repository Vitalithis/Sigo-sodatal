'use client';

import { useState, useRef, useCallback } from 'react';
import {
  registrarSalidaAction,
  registrarCierreCuadraturaAction,
  obtenerCuadraturaDetalleAction,
  reabrirCuadraturaAction,
} from '../../actions';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Repartidor {
  id: string;
  nombre: string;
  apellido: string;
  recibe_comision: boolean;
}

interface Producto {
  id: string;
  nombre: string;
  precio_venta_nueva: number;
  precio_recarga: number | null;
}

interface Props {
  repartidores: Repartidor[];
  productos: Producto[];
}

type Panel = 'salida' | 'cierre' | 'reabrir' | null;

// ─── Componente ───────────────────────────────────────────────────────────────
export default function CuadraturaApp({ repartidores, productos }: Props) {
  const [panel, setPanel] = useState<Panel>(null);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [alertas, setAlertas] = useState<string[]>([]);

  // ── Salida ────────────────────────────────────────────────────────────────
  const [salidaRep, setSalidaRep] = useState('');
  const [salidaFecha, setSalidaFecha] = useState(new Date().toISOString().slice(0, 10));
  const [salidaItems, setSalidaItems] = useState<Record<string, number>>({});

  // ── Cierre ────────────────────────────────────────────────────────────────
  const [cierreId, setCierreId] = useState('');
  const [cierreVentas, setCierreVentas] = useState<
    { producto_id: string; tipo_transaccion: string; tipo_cliente: string; cantidad: number; metodo_pago: string }[]
  >([]);
  const [cierreRetorno, setCierreRetorno] = useState<Record<string, number>>({});
  const [cierreVaciosTot, setCierreVaciosTot] = useState(0);
  const [cierreVaciosDan, setCierreVaciosDan] = useState(0);

  // ── Reapertura ───────────────────────────────────────────────────────────
  const [reabrirId, setReobrirId] = useState('');
  const [reabrirMotivo, setReobrirMotivo] = useState('');

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const mostrar = (tipo: 'ok' | 'error', texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 6000);
  };

  const setSalidaCant = (prod_id: string, val: string) =>
    setSalidaItems((prev) => ({ ...prev, [prod_id]: Number(val) || 0 }));

  const setCierreRetornoCant = (prod_id: string, val: string) =>
    setCierreRetorno((prev) => ({ ...prev, [prod_id]: Number(val) || 0 }));

  // ─── Acciones ─────────────────────────────────────────────────────────────
  const handleSalida = async () => {
    if (!salidaRep) return mostrar('error', 'Selecciona un repartidor.');
    setLoading(true);
    const items = Object.entries(salidaItems)
      .filter(([, c]) => c > 0)
      .map(([producto_id, cantidad]) => ({ producto_id, cantidad }));
    const res = await registrarSalidaAction({ usuario_id: salidaRep, fecha: salidaFecha, items });
    setLoading(false);
    if (res.success) {
      mostrar('ok', `Salida registrada. Cuadratura ID: ${res.cuadratura_id}`);
      setAlertas(res.alertas ?? []);
      setPanel(null);
      setSalidaItems({});
    } else {
      mostrar('error', res.message ?? 'Error al registrar salida.');
    }
  };

  const handleCierre = async () => {
    if (!cierreId.trim()) return mostrar('error', 'Ingresa el ID de la cuadratura.');
    setLoading(true);
    const ventasFiltradas = cierreVentas.filter((v) => v.cantidad > 0) as any[];
    const retornoItems = Object.entries(cierreRetorno)
      .filter(([, c]) => c > 0)
      .map(([producto_id, cantidad]) => ({ producto_id, cantidad }));
    const res = await registrarCierreCuadraturaAction({
      cuadratura_id: cierreId.trim(),
      ventas: ventasFiltradas,
      retorno: retornoItems,
      botellones_vacios: { cantidad_total: cierreVaciosTot, cantidad_danados: cierreVaciosDan },
    });
    setLoading(false);
    if (res.success) {
      mostrar('ok', 'Cuadratura cerrada correctamente.');
      setAlertas(res.alertas ?? []);
      setPanel(null);
    } else {
      mostrar('error', res.message ?? 'Error al cerrar cuadratura.');
    }
  };

  const handleReabrir = async () => {
    if (!reabrirId.trim()) return mostrar('error', 'Ingresa el ID de la cuadratura.');
    if (!reabrirMotivo.trim()) return mostrar('error', 'Indica el motivo de reapertura.');
    setLoading(true);
    const res = await reabrirCuadraturaAction(reabrirId.trim(), reabrirMotivo);
    setLoading(false);
    if (res.success) {
      mostrar('ok', 'Cuadratura reabierta.');
      setPanel(null);
      setReobrirId('');
      setReobrirMotivo('');
    } else {
      mostrar('error', res.message ?? 'Error al reabrir.');
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#eef3f8' }}>

      {/* ── Barra de integración con BD ─────────────────────────────────── */}
      <div style={{
        background: '#0e3f6b', color: '#fff', padding: '8px 14px',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        fontSize: 13, zIndex: 100, boxShadow: '0 2px 6px rgba(0,0,0,.25)'
      }}>
        <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '.02em' }}>
          Sistema Sodatal
        </span>
        <span style={{ opacity: .6, fontSize: 11 }}>Integración BD →</span>

        <button onClick={() => setPanel(panel === 'salida' ? null : 'salida')} style={btnStyle('#15568f', panel === 'salida')}>
          📤 Registrar Salida
        </button>
        <button onClick={() => setPanel(panel === 'cierre' ? null : 'cierre')} style={btnStyle('#5a9e1f', panel === 'cierre')}>
          ✅ Registrar Cierre
        </button>
        <button onClick={() => setPanel(panel === 'reabrir' ? null : 'reabrir')} style={btnStyle('#b97d10', panel === 'reabrir')}>
          🔓 Reabrir
        </button>

        {mensaje && (
          <span style={{
            marginLeft: 'auto', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: mensaje.tipo === 'ok' ? '#ecf6df' : '#fdecec',
            color: mensaje.tipo === 'ok' ? '#5a9e1f' : '#c93a3a',
            border: `1px solid ${mensaje.tipo === 'ok' ? '#5a9e1f' : '#c93a3a'}`
          }}>
            {mensaje.tipo === 'ok' ? '✓' : '✗'} {mensaje.texto}
          </span>
        )}
      </div>

      {/* ── Alertas de stock ────────────────────────────────────────────── */}
      {alertas.length > 0 && (
        <div style={{ background: '#fdf3dc', borderBottom: '1px solid #b97d10', padding: '8px 14px' }}>
          <strong style={{ color: '#b97d10', fontSize: 12 }}>⚠ Alertas de stock:</strong>
          {alertas.map((a, i) => (
            <div key={i} style={{ color: '#b97d10', fontSize: 12 }}>{a}</div>
          ))}
          <button onClick={() => setAlertas([])} style={{ fontSize: 11, color: '#b97d10', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>
            Cerrar alertas
          </button>
        </div>
      )}

      {/* ── Panel desplegable ───────────────────────────────────────────── */}
      {panel && (
        <div style={{
          background: '#fff', borderBottom: '2px solid #c9d6e2',
          padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start'
        }}>

          {/* PANEL SALIDA */}
          {panel === 'salida' && (
            <>
              <div>
                <Label>Repartidor</Label>
                <select value={salidaRep} onChange={e => setSalidaRep(e.target.value)} style={inputStyle}>
                  <option value="">— selecciona —</option>
                  {repartidores.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre} {r.apellido}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Fecha</Label>
                <input type="date" value={salidaFecha} onChange={e => setSalidaFecha(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {productos.map(p => (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Label>{p.nombre}</Label>
                    <input
                      type="number" min="0" placeholder="0"
                      value={salidaItems[p.id] || ''}
                      onChange={e => setSalidaCant(p.id, e.target.value)}
                      style={{ ...inputStyle, width: 72, textAlign: 'right' }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ alignSelf: 'flex-end' }}>
                <button onClick={handleSalida} disabled={loading} style={actionBtn('#15568f')}>
                  {loading ? 'Guardando…' : 'Guardar Salida'}
                </button>
              </div>
            </>
          )}

          {/* PANEL CIERRE */}
          {panel === 'cierre' && (
            <>
              <div>
                <Label>ID de cuadratura</Label>
                <input
                  placeholder="uuid de la cuadratura"
                  value={cierreId}
                  onChange={e => setCierreId(e.target.value)}
                  style={{ ...inputStyle, width: 300 }}
                />
                <small style={{ color: '#5b6b7b', fontSize: 11 }}>
                  Se obtiene al registrar la salida, o desde la lista de cuadraturas.
                </small>
              </div>

              <div>
                <Label>Retorno (productos que vuelven llenos)</Label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {productos.map(p => (
                    <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Label>{p.nombre}</Label>
                      <input
                        type="number" min="0" placeholder="0"
                        value={cierreRetorno[p.id] || ''}
                        onChange={e => setCierreRetornoCant(p.id, e.target.value)}
                        style={{ ...inputStyle, width: 72, textAlign: 'right' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Botellones vacíos — Total recibidos</Label>
                <input type="number" min="0" value={cierreVaciosTot || ''}
                  onChange={e => setCierreVaciosTot(Number(e.target.value))}
                  style={{ ...inputStyle, width: 90 }} />
              </div>
              <div>
                <Label>Botellones vacíos — Dañados</Label>
                <input type="number" min="0" value={cierreVaciosDan || ''}
                  onChange={e => setCierreVaciosDan(Number(e.target.value))}
                  style={{ ...inputStyle, width: 90 }} />
              </div>

              <div style={{ alignSelf: 'flex-end' }}>
                <button onClick={handleCierre} disabled={loading} style={actionBtn('#5a9e1f')}>
                  {loading ? 'Cerrando…' : 'Cerrar Cuadratura'}
                </button>
              </div>

              <p style={{ width: '100%', fontSize: 12, color: '#5b6b7b', margin: 0 }}>
                💡 Las ventas se registran desde la pestaña <strong>Pedidos</strong> de la app. 
                Este panel registra el retorno físico y cierra la cuadratura en el sistema.
              </p>
            </>
          )}

          {/* PANEL REABRIR */}
          {panel === 'reabrir' && (
            <>
              <div>
                <Label>ID de cuadratura</Label>
                <input
                  placeholder="uuid de la cuadratura"
                  value={reabrirId}
                  onChange={e => setReobrirId(e.target.value)}
                  style={{ ...inputStyle, width: 300 }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <Label>Motivo de reapertura</Label>
                <input
                  placeholder="Ej: Error en cantidad de retorno"
                  value={reabrirMotivo}
                  onChange={e => setReobrirMotivo(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ alignSelf: 'flex-end' }}>
                <button onClick={handleReabrir} disabled={loading} style={actionBtn('#b97d10')}>
                  {loading ? 'Reabriendo…' : 'Reabrir'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── App HTML completa en iframe ─────────────────────────────────── */}
      <iframe
        src="/cuadratura-app.html"
        style={{ flex: 1, border: 'none', width: '100%' }}
        title="Cuadratura Sodatal"
      />
    </div>
  );
}

// ─── Estilos inline ───────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  fontFamily: 'inherit', fontSize: 13, border: '1px solid #c9d6e2',
  borderRadius: 7, padding: '6px 9px', background: '#fff', color: '#1c2733', width: '100%'
};

const actionBtn = (color: string): React.CSSProperties => ({
  background: color, color: '#fff', border: 'none', borderRadius: 8,
  padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
});

const btnStyle = (color: string, active: boolean): React.CSSProperties => ({
  background: active ? '#fff' : 'transparent',
  color: active ? color : 'rgba(255,255,255,.85)',
  border: active ? `1.5px solid ${color}` : '1.5px solid rgba(255,255,255,.3)',
  borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700,
  cursor: 'pointer', whiteSpace: 'nowrap'
});

const Label = ({ children }: { children: React.ReactNode }) => (
  <label style={{ fontSize: 11, fontWeight: 700, color: '#5b6b7b', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.02em' }}>
    {children}
  </label>
);
