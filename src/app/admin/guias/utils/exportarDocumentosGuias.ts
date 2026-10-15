/**
 * Utilidades para generar y descargar documentos oficiales de Comprobantes de Entrega / Guías de Despacho
 * Documentos internos sin validez tributaria.
 */

// ────────────────────────────────────────────────────────────────
// Funciones de Seguridad y Sanitización
// ────────────────────────────────────────────────────────────────

/**
 * Escapa caracteres HTML para prevenir Cross-Site Scripting (XSS).
 */
export function esc(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Valida que una cadena sea un Data URL base64 de imagen seguro.
 */
export function esFirmaDataUrlValida(firma?: string | null): boolean {
  if (!firma || typeof firma !== 'string') return false;
  return (
    firma.startsWith('data:image/png;base64,') ||
    firma.startsWith('data:image/jpeg;base64,') ||
    firma.startsWith('data:image/jpg;base64,')
  );
}

/**
 * Protege contra inyección de fórmulas CSV (Excel/Calc) anteponiendo comilla simple si inicia con =, +, -, @
 */
export function sanitizarCsv(v: any): string {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (/^[=+\-@]/.test(s)) {
    s = `'` + s;
  }
  return s.replace(/"/g, '""');
}

// ────────────────────────────────────────────────────────────────
// Helpers de Dominio: Folio, Estado y Forma de Pago
// ────────────────────────────────────────────────────────────────

export function formatearFolio(num?: number | string | null): string {
  if (!num) return '000000';
  return String(num).padStart(6, '0');
}

export function obtenerEstadoDocumento(guia: any): 'VIGENTE' | 'ANULADA' {
  if (!guia) return 'VIGENTE';
  if (guia.estado_documento === 'ANULADA' || guia.estado === 'ANULADA') {
    return 'ANULADA';
  }
  return 'VIGENTE';
}

export function obtenerFormaPagoLabel(guia: any): string {
  if (!guia) return 'No especificada';
  const fp = (guia.forma_pago || '').toUpperCase();
  if (fp === 'EFECTIVO') return 'Efectivo';
  if (fp === 'TARJETA') return 'Tarjeta';
  if (fp === 'TRANSFERENCIA') return 'Transferencia';
  if (fp === 'CREDITO' || fp === 'GUIA_MENSUAL') return 'Crédito Empresa';

  // Fallback derivado de enum estado anterior
  if (guia.estado === 'ENTREGADA_EFECTIVO') return 'Efectivo';
  if (guia.estado === 'ENTREGADA_TARJETA') return 'Tarjeta';
  if (guia.estado === 'ENTREGADA_TRANSFERENCIA') return 'Transferencia';
  if (guia.estado === 'ENTREGADA_CREDITO') return 'Crédito Empresa';
  return 'No especificada';
}

export const ESTADO_LABELS: Record<string, string> = {
  ENTREGADA_EFECTIVO: 'Entregada (Efectivo)',
  ENTREGADA_TARJETA: 'Entregada (Tarjeta)',
  ENTREGADA_TRANSFERENCIA: 'Entregada (Transferencia)',
  ENTREGADA_CREDITO: 'Entregada (Crédito Empresa)',
  ANULADA: 'Anulada',
};

// ────────────────────────────────────────────────────────────────
// Utilidades de Descarga e Impresión
// ────────────────────────────────────────────────────────────────

export function descargarBlob(contenido: string, nombreArchivo: string, tipoMime: string) {
  const blob = new Blob([contenido], { type: tipoMime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function abrirHtmlParaImprimir(html: string) {
  const ventana = window.open('', '_blank');
  if (ventana) {
    ventana.document.write(html);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => {
      ventana.print();
    }, 500);
  }
}

/**
 * Descarga un comprobante de entrega individual directamente como archivo .pdf
 */
export async function descargarGuiaPDF(guia: any): Promise<void> {
  if (typeof window === 'undefined') return;

  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  const html = generarHtmlGuiaIndividual(guia, false);

  const wrapper = document.createElement('div');
  wrapper.id = 'temp-pdf-render-guia';
  wrapper.style.position = 'fixed';
  wrapper.style.top = '0';
  wrapper.style.left = '0';
  wrapper.style.width = '800px';
  wrapper.style.zIndex = '-99999';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.backgroundColor = '#ffffff';
  wrapper.style.opacity = '1';
  wrapper.innerHTML = html;

  const noPrint = wrapper.querySelector('.no-print-bar');
  if (noPrint) noPrint.remove();

  document.body.appendChild(wrapper);
  const targetElement = (wrapper.querySelector('.hoja') as HTMLElement) || wrapper;

  try {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const canvas = await html2canvas(targetElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 800,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * usableWidth) / canvas.width;

    pdf.addImage(imgData, 'JPEG', margin, margin, usableWidth, Math.min(imgHeight, pageHeight - margin * 2));
    pdf.save(`Comprobante_Entrega_${formatearFolio(guia.numero_correlativo)}.pdf`);
  } finally {
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper);
    }
  }
}

/**
 * Descarga el dossier consolidado de comprobantes directamente como archivo .pdf
 */
export async function descargarDossierPDF(
  cliente: any,
  guias: any[],
  periodo: { desde?: string; hasta?: string },
  incluirAnuladas = false
): Promise<void> {
  if (typeof window === 'undefined') return;

  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  const html = generarHtmlDossierGuias(cliente, guias, periodo, incluirAnuladas);

  const wrapper = document.createElement('div');
  wrapper.id = 'temp-pdf-render-dossier';
  wrapper.style.position = 'fixed';
  wrapper.style.top = '0';
  wrapper.style.left = '0';
  wrapper.style.width = '820px';
  wrapper.style.zIndex = '-99999';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.backgroundColor = '#ffffff';
  wrapper.style.opacity = '1';
  wrapper.innerHTML = html;

  const noPrint = wrapper.querySelector('.no-print-bar');
  if (noPrint) noPrint.remove();

  document.body.appendChild(wrapper);

  try {
    await new Promise((resolve) => setTimeout(resolve, 120));

    const paginas = wrapper.querySelectorAll<HTMLElement>('.hoja-caratula, .hoja-guia');
    const elementos = paginas.length > 0 ? Array.from(paginas) : [wrapper];

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;

    for (let i = 0; i < elementos.length; i++) {
      if (i > 0) pdf.addPage();

      const el = elementos[i];
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 820,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgHeight = (canvas.height * usableWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', margin, margin, usableWidth, Math.min(imgHeight, usableHeight));
    }

    const nombreLimpio = (cliente?.nombre || 'Todas_Empresas').replace(/[^a-zA-Z0-9_-]/g, '_');
    const rango = periodo.desde && periodo.hasta ? `_${periodo.desde}_${periodo.hasta}` : '';
    const nombreArchivo = `Dossier_Comprobantes_${nombreLimpio}${rango}.pdf`;
    pdf.save(nombreArchivo);
  } finally {
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper);
    }
  }
}

// ────────────────────────────────────────────────────────────────
// Generación HTML de Comprobante Individual
// ────────────────────────────────────────────────────────────────

export function generarHtmlGuiaIndividual(guia: any, autoPrint = false): string {
  const esAnulada = obtenerEstadoDocumento(guia) === 'ANULADA';
  const formaPagoStr = obtenerFormaPagoLabel(guia);
  const estadoStr = esAnulada ? 'ANULADA' : 'VIGENTE';

  const fechaEmision = new Date(guia.fecha_emision);
  const fechaStr = fechaEmision.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaStr = fechaEmision.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  // Fecha y hora de recepción con fallback a fecha de emisión indicada
  const fechaRecepcionStr = guia.hora_entrega
    ? new Date(guia.hora_entrega).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : `${fechaStr} ${horaStr} (fecha de emisión)`;

  const tieneFirma = esFirmaDataUrlValida(guia.firma_digital);

  const filasItems = (guia.items || []).map((it: any, i: number) => `
    <tr>
      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b;">${i + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${esc(it.producto?.nombre || 'Producto')}</td>
      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;"><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${esc(it.tipo_transaccion || 'VENTA')}</span></td>
      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #0f172a;">${it.cantidad}</td>
      <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">$${Number(it.precio_unitario || 0).toLocaleString('es-CL')}</td>
      <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #0f172a;">$${Number(it.subtotal || it.cantidad * it.precio_unitario).toLocaleString('es-CL')}</td>
    </tr>
  `).join('');

  // Identificador de reemplazo
  const correlativoReemplazo = guia.reemplazada_por?.numero_correlativo || guia.reemplazada_por_correlativo;
  const correlativoOrigen = guia.reemplaza_a?.numero_correlativo || guia.reemplaza_a_correlativo;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante de Entrega #${formatearFolio(guia.numero_correlativo)} - SODATAL</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #0f172a; padding: 24px; font-size: 12px; }
    .hoja { max-width: 800px; margin: 0 auto; background: #fff; padding: 36px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); position: relative; overflow: hidden; }
    .header-grid { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; }
    .header-grid-left { flex: 1; }
    .header-grid-right { width: 250px; flex-shrink: 0; }
    .logo-brand { font-size: 26px; font-weight: 900; color: #013299; letter-spacing: -0.5px; }
    .badge-slogan { background: #eff6ff; color: #013299; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; border: 1px solid #bfdbfe; margin-left: 6px; }
    
    /* Caja de folio neutra (azul/gris), roja únicamente si es ANULADA */
    .caja-folio { border: 2px solid #0284c7; background: #f0f9ff; border-radius: 8px; padding: 12px; text-align: center; }
    .caja-folio h3 { color: #0369a1; font-size: 12px; font-weight: 900; letter-spacing: 0.5px; margin: 4px 0; }
    .caja-folio .numero { color: #0284c7; font-size: 16px; font-weight: 900; font-family: monospace; }
    .caja-folio.anulada { border-color: #dc2626; background: #fef2f2; }
    .caja-folio.anulada h3 { color: #b91c1c; }
    .caja-folio.anulada .numero { color: #dc2626; }

    .datos-grid { display: flex; gap: 16px; margin: 16px 0; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
    .datos-grid > .card-info { flex: 1; }
    .card-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 11px; line-height: 1.6; }
    .card-info .label { font-weight: 700; color: #475569; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 11px; }
    th { background: #f1f5f9; padding: 8px; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
    .tfoot-total { background: #f8fafc; font-weight: bold; border-top: 2px solid #cbd5e1; }
    .firma-seccion { display: flex; gap: 20px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; align-items: flex-end; }
    .firma-seccion > div { flex: 1; }
    .caja-firma { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; background: #fff; }
    .caja-firma img { max-height: 100px; max-width: 100%; object-fit: contain; }
    .no-print-bar { max-width: 800px; margin: 0 auto 16px auto; display: flex; justify-content: space-between; align-items: center; }
    .btn { background: #013299; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
    .btn:hover { background: #1e3a8a; }

    /* Sello diagonal de anulación sobre la hoja */
    .sello-anulada {
      position: absolute;
      top: 42%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 80px;
      font-weight: 900;
      color: rgba(220, 38, 38, 0.18);
      border: 8px solid rgba(220, 38, 38, 0.22);
      padding: 10px 40px;
      border-radius: 16px;
      letter-spacing: 12px;
      pointer-events: none;
      user-select: none;
      z-index: 10;
      text-transform: uppercase;
      white-space: nowrap;
    }

    @media print {
      body { background: #fff; padding: 0; }
      .hoja { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .no-print-bar { display: none; }
      @page { size: portrait; margin: 1.2cm; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <span style="font-weight: 700; color: #475569;">Comprobante de Entrega N° ${formatearFolio(guia.numero_correlativo)}</span>
    <button class="btn" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
  </div>

  <div class="hoja">
    ${esAnulada ? '<div class="sello-anulada">ANULADA</div>' : ''}

    <div class="header-grid">
      <div class="header-grid-left">
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          <span class="logo-brand">SODATAL</span>
          <span class="badge-slogan">Control de Entrega</span>
        </div>
        <p style="font-size: 11px; font-weight: 800; color: #334155; margin-top: 3px;">R.U.T.: 76.892.410-5</p>
        <p style="color: #64748b; font-size: 11px; margin-top: 2px;">Giro: Elaboración de bebidas no alcohólicas</p>
        <p style="color: #64748b; font-size: 11px; margin-top: 2px;">Joaquín Prieto 289, Concepción, Chile</p>
        <p style="color: #64748b; font-size: 11px; margin-top: 2px;">Teléfono: +56 9 5174 9928</p>   
      </div>

      <div class="header-grid-right caja-folio ${esAnulada ? 'anulada' : ''}">
        <h3>COMPROBANTE DE ENTREGA</h3>
        <p class="numero">N° ${formatearFolio(guia.numero_correlativo)}</p>
        <p style="font-size: 9px; color: ${esAnulada ? '#b91c1c' : '#0369a1'}; font-weight: 700; margin-top: 4px;">
          ${esAnulada ? 'DOCUMENTO ANULADO' : 'DOCUMENTO INTERNO'}
        </p>
      </div>
    </div>

    ${esAnulada ? `
      <div style="background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 8px; padding: 12px 14px; margin-top: 14px; color: #991b1b; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-weight: 900; font-size: 12px; text-transform: uppercase; color: #b91c1c;">⚠️ Documento Anulado</span>
          ${guia.anulada_at ? `<span style="font-size: 10px; color: #7f1d1d; font-weight: 600;">Fecha Anulación: ${new Date(guia.anulada_at).toLocaleString('es-CL')}</span>` : ''}
        </div>
        <p><b>Motivo de Anulación:</b> ${esc(guia.anulada_motivo || guia.motivo_anulacion || 'Sin motivo registrado')}</p>
        ${correlativoReemplazo ? `
          <p style="margin-top: 5px; font-weight: 800; color: #1d4ed8;">
            ➜ Reemplazada por N° ${formatearFolio(correlativoReemplazo)}
          </p>
        ` : ''}
      </div>
    ` : ''}

    <div class="datos-grid">
      <div class="card-info">
        <p style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Datos del Receptor</p>
        <p><span class="label">Señor(es):</span> <b>${esc(guia.cliente?.nombre || 'Consumidor Final')}</b></p>
        <p><span class="label">R.U.T. Empresa:</span> ${esc(guia.cliente?.rut_empresa || 'S/RUT')}</p>
        <p><span class="label">Giro:</span> ${esc(guia.cliente?.giro || 'Particular / Comercial')}</p>
        <p><span class="label">Dirección:</span> ${esc(guia.direccion_entrega || guia.cliente?.direccion || '-')}</p>
        <p><span class="label">Teléfono:</span> ${esc(guia.cliente?.telefono || '-')}</p>
      </div>

      <div class="card-info">
        <p style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Detalles de la Entrega</p>
        <p><span class="label">Fecha Emisión:</span> ${fechaStr} - ${horaStr}</p>
        <p><span class="label">Repartidor:</span> ${guia.usuario_repartidor ? `${esc(guia.usuario_repartidor.nombre)} ${esc(guia.usuario_repartidor.apellido || '')}` : '-'}</p>
        <p><span class="label">Estado:</span> <b style="color: ${esAnulada ? '#dc2626' : '#16a34a'};">${estadoStr}</b></p>
        <p><span class="label">Forma de pago:</span> <b>${esc(formaPagoStr)}</b></p>
        <p><span class="label">Envases Prestados:</span> ${guia.botellones_prestados_entrega || 0} un.</p>
        ${guia.numero_factura ? `<p><span class="label">Se facturará en:</span> Factura/Boleta N° ${esc(guia.numero_factura)}</p>` : ''}
        ${correlativoOrigen ? `<p><span class="label">Vínculo:</span> <b style="color: #0284c7;">Reemplaza a N° ${formatearFolio(correlativoOrigen)}</b></p>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 30px; text-align: center;">#</th>
          <th style="text-align: left;">Descripción / Producto</th>
          <th style="text-align: center;">Tipo</th>
          <th style="text-align: center;">Cantidad</th>
          <th style="text-align: right;">P. Unitario</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${filasItems}
      </tbody>
      <tfoot>
        <tr class="tfoot-total">
          <td colspan="5" style="padding: 10px; text-align: right; text-transform: uppercase; font-size: 11px;">Total de Entrega:</td>
          <td style="padding: 10px; text-align: right; font-size: 14px; font-weight: 900; color: ${esAnulada ? '#dc2626' : '#013299'};">
            ${esAnulada 
              ? `<span style="text-decoration: line-through;">$${Number(guia.total || 0).toLocaleString('es-CL')}</span> <span style="font-size: 10px; margin-left: 4px;">(Sin efecto)</span>`
              : `$${Number(guia.total || 0).toLocaleString('es-CL')}`
            }
          </td>
        </tr>
      </tfoot>
    </table>

    ${guia.observaciones ? `
      <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 10px; font-size: 11px; color: #92400e; margin-bottom: 16px;">
        <b>Observaciones:</b> ${esc(guia.observaciones)}
      </div>
    ` : ''}

    <div class="firma-seccion">
      <div class="card-info">
        <p style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Recepción Conforme</p>
        <p><span class="label">Nombre Receptor:</span> <b>${esc(guia.nombre_receptor || 'No especificado')}</b></p>
        ${guia.rut_receptor ? `<p><span class="label">RUT Receptor:</span> ${esc(guia.rut_receptor)}</p>` : ''}
        <p><span class="label">Fecha Recepción:</span> ${fechaRecepcionStr}</p>
        <p style="font-size: 10px; color: #94a3b8; margin-top: 6px;">El receptor declara recibir las mercaderías a su entera conformidad.</p>
      </div>

      <div class="caja-firma">
        <p style="font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 6px;">Firma Digital del Receptor</p>
        ${tieneFirma ? `
          <img src="${guia.firma_digital}" alt="Firma del Receptor" />
          <p style="border-top: 1px dashed #cbd5e1; padding-top: 4px; font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase;">
            ${esc(guia.nombre_receptor || 'Receptor Conforme')}
          </p>
          <p style="font-size: 8px; color: ${esAnulada ? '#b91c1c' : '#16a34a'}; font-weight: bold; margin-top: 2px;">
            ${esAnulada ? 'Firma de la entrega original. Documento anulado.' : '✓ FIRMA DIGITAL REGISTRADA'}
          </p>
        ` : `
          <div style="height: 80px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-style: italic; border: 1px dashed #e2e8f0; border-radius: 6px;">
            Sin firma registrada
          </div>
          <p style="border-top: 1px solid #cbd5e1; padding-top: 4px; font-size: 9px; color: #64748b;">FIRMA Y RUT RECEPTOR</p>
        `}
      </div>
    </div>

    <div style="text-align: center; margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8;">
      Documento interno de control de entrega. No constituye documento tributario. • Sistema Integral de Gestión Operativa (SIGO SODATAL)
    </div>
  </div>

  ${autoPrint ? `<script>window.onload = function() { window.print(); };</script>` : ''}
</body>
</html>`;
}

// ────────────────────────────────────────────────────────────────
// Generación HTML de Dossier Consolidado
// ────────────────────────────────────────────────────────────────

export function generarHtmlDossierGuias(
  cliente: any,
  guias: any[],
  periodo: { desde?: string; hasta?: string },
  incluirAnuladas = false
): string {
  const hoy = new Date().toLocaleDateString('es-CL');

  // Filtrado de guías para el dossier:
  // Por defecto se EXCLUYEN las anuladas del conteo, sumas y páginas
  const guiasParaDossier = incluirAnuladas
    ? guias
    : guias.filter((g) => obtenerEstadoDocumento(g) !== 'ANULADA');

  const totalGuias = guiasParaDossier.filter((g) => obtenerEstadoDocumento(g) !== 'ANULADA').length;
  const guiasFirmadasCount = guiasParaDossier.filter((g) => obtenerEstadoDocumento(g) !== 'ANULADA' && esFirmaDataUrlValida(g.firma_digital)).length;
  
  // Total facturable excluye estrictamente las anuladas
  const totalMonto = guiasParaDossier.reduce((acc, g) => {
    if (obtenerEstadoDocumento(g) === 'ANULADA') return acc;
    return acc + Number(g.total || 0);
  }, 0);

  const rangoTexto = periodo.desde && periodo.hasta
    ? `Desde ${periodo.desde} hasta ${periodo.hasta}`
    : periodo.desde
      ? `Desde ${periodo.desde}`
      : periodo.hasta
        ? `Hasta ${periodo.hasta}`
        : 'Histórico Completo';

  // Filas de la tabla resumen de cobranza
  const filasResumen = guiasParaDossier.map((g, i) => {
    const esAnulada = obtenerEstadoDocumento(g) === 'ANULADA';
    const fecha = new Date(g.fecha_emision).toLocaleDateString('es-CL');
    const unidades = (g.items || []).reduce((acc: number, it: any) => acc + (it.cantidad || 0), 0);
    const firmada = esFirmaDataUrlValida(g.firma_digital);
    const formaPagoStr = obtenerFormaPagoLabel(g);
    const facturaRef = g.numero_factura ? `Fact. #${esc(g.numero_factura)}` : '-';

    return `
      <tr>
        <td style="padding: 7px; text-align: center; border-bottom: 1px solid #e2e8f0; color: #64748b;">${i + 1}</td>
        <td style="padding: 7px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #013299;">#${formatearFolio(g.numero_correlativo)}</td>
        <td style="padding: 7px; border-bottom: 1px solid #e2e8f0;">${fecha}</td>
        <td style="padding: 7px; border-bottom: 1px solid #e2e8f0;">${esc(g.nombre_receptor || '-')}</td>
        <td style="padding: 7px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${unidades} un.</td>
        <td style="padding: 7px; text-align: center; border-bottom: 1px solid #e2e8f0; font-size: 10px;">${esc(formaPagoStr)}</td>
        <td style="padding: 7px; text-align: center; border-bottom: 1px solid #e2e8f0;">
          <span style="padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; ${esAnulada ? 'background: #fee2e2; color: #b91c1c;' : 'background: #ecfdf5; color: #047857;'}">
            ${esAnulada ? 'ANULADA' : 'VIGENTE'}
          </span>
        </td>
        <td style="padding: 7px; text-align: center; border-bottom: 1px solid #e2e8f0; font-size: 9px; color: #475569;">
          ${facturaRef}
        </td>
        <td style="padding: 7px; text-align: center; border-bottom: 1px solid #e2e8f0;">
          <span style="padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; ${firmada ? 'background: #ecfdf5; color: #047857;' : 'background: #f1f5f9; color: #64748b;'}">
            ${firmada ? '✓ Firmada' : 'Sin firma'}
          </span>
        </td>
        <td style="padding: 7px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #0f172a;">
          ${esAnulada
            ? `<span style="color: #dc2626; text-decoration: line-through;">$${Number(g.total || 0).toLocaleString('es-CL')}</span>`
            : `$${Number(g.total || 0).toLocaleString('es-CL')}`
          }
        </td>
      </tr>
    `;
  }).join('');

  // Generar el cuerpo de cada comprobante individual para el dossier
  const guiasIndividualesHtml = guiasParaDossier.map((guia) => {
    const esAnulada = obtenerEstadoDocumento(guia) === 'ANULADA';
    const fechaEmision = new Date(guia.fecha_emision);
    const fechaStr = fechaEmision.toLocaleDateString('es-CL');
    const horaStr = fechaEmision.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const tieneFirma = esFirmaDataUrlValida(guia.firma_digital);
    const formaPagoStr = obtenerFormaPagoLabel(guia);

    const fechaRecepcionStr = guia.hora_entrega
      ? new Date(guia.hora_entrega).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
      : `${horaStr} (fecha de emisión)`;

    const filasItems = (guia.items || []).map((it: any, i: number) => `
      <tr>
        <td style="padding: 6px; text-align: center; border-bottom: 1px solid #e2e8f0; color: #64748b;">${i + 1}</td>
        <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${esc(it.producto?.nombre || 'Producto')}</td>
        <td style="padding: 6px; text-align: center; border-bottom: 1px solid #e2e8f0; font-size: 10px;">${esc(it.tipo_transaccion || 'VENTA')}</td>
        <td style="padding: 6px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${it.cantidad}</td>
        <td style="padding: 6px; text-align: right; border-bottom: 1px solid #e2e8f0;">$${Number(it.precio_unitario || 0).toLocaleString('es-CL')}</td>
        <td style="padding: 6px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: bold;">$${Number(it.subtotal || it.cantidad * it.precio_unitario).toLocaleString('es-CL')}</td>
      </tr>
    `).join('');

    return `
      <div class="hoja-guia" style="position: relative; overflow: hidden;">
        ${esAnulada ? `
          <div style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 65px; font-weight: 900; color: rgba(220, 38, 38, 0.16); border: 6px solid rgba(220, 38, 38, 0.2); padding: 8px 30px; border-radius: 12px; letter-spacing: 10px; pointer-events: none; user-select: none; z-index: 10;">
            ANULADA
          </div>
        ` : ''}

        <div class="header-guia">
          <div>
            <span style="font-size: 20px; font-weight: 900; color: #013299;">SODATAL</span>
            <span style="background: #eff6ff; color: #013299; font-size: 9px; font-weight: bold; padding: 2px 4px; border-radius: 4px; border: 1px solid #bfdbfe; margin-left: 4px;">Control de Entrega</span>
            <p style="font-size: 10px; font-weight: 700; color: #334155; margin-top: 2px;">R.U.T.: 76.892.410-5 • Joaquín Prieto 289, Concepción • +56 9 5174 9928</p>
          </div>
          <div class="caja-folio ${esAnulada ? 'anulada' : ''}" style="width: 200px; padding: 8px;">
            <p style="font-size: 10px; font-weight: 900; color: ${esAnulada ? '#b91c1c' : '#0369a1'};">COMPROBANTE DE ENTREGA</p>
            <p style="font-size: 14px; font-weight: 900; color: ${esAnulada ? '#dc2626' : '#0284c7'}; font-family: monospace;">N° ${formatearFolio(guia.numero_correlativo)}</p>
          </div>
        </div>

        ${esAnulada ? `
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 8px 10px; margin: 8px 0; font-size: 10px; color: #991b1b;">
            <b>Motivo de anulación:</b> ${esc(guia.anulada_motivo || guia.motivo_anulacion || 'Sin motivo')}
            ${guia.anulada_at ? ` • Fecha: ${new Date(guia.anulada_at).toLocaleDateString('es-CL')}` : ''}
          </div>
        ` : ''}

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 10px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; font-size: 10px; line-height: 1.5;">
          <div>
            <p><b>Cliente:</b> ${esc(guia.cliente?.nombre || cliente?.nombre || '-')}</p>
            <p><b>R.U.T. Empresa:</b> ${esc(guia.cliente?.rut_empresa || cliente?.rut_empresa || 'S/RUT')}</p>
            <p><b>Dirección:</b> ${esc(guia.direccion_entrega || '-')}</p>
          </div>
          <div>
            <p><b>Fecha:</b> ${fechaStr} ${horaStr}</p>
            <p><b>Repartidor:</b> ${guia.usuario_repartidor ? `${esc(guia.usuario_repartidor.nombre)} ${esc(guia.usuario_repartidor.apellido || '')}` : '-'}</p>
            <p><b>Estado:</b> <span style="font-weight: bold; color: ${esAnulada ? '#dc2626' : '#16a34a'};">${esAnulada ? 'ANULADA' : 'VIGENTE'}</span></p>
            <p><b>Forma de pago:</b> <b>${esc(formaPagoStr)}</b></p>
            ${guia.numero_factura ? `<p><b>Factura/Boleta Ref:</b> #${esc(guia.numero_factura)}</p>` : ''}
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin: 8px 0;">
          <thead>
            <tr style="background: #f1f5f9; text-align: left; font-size: 9px; text-transform: uppercase;">
              <th style="padding: 6px; width: 24px; text-align: center;">#</th>
              <th style="padding: 6px;">Producto</th>
              <th style="padding: 6px; text-align: center;">Tipo</th>
              <th style="padding: 6px; text-align: center;">Cant.</th>
              <th style="padding: 6px; text-align: right;">Unitario</th>
              <th style="padding: 6px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${filasItems}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: bold; border-top: 1px solid #cbd5e1;">
              <td colspan="5" style="padding: 8px; text-align: right; text-transform: uppercase;">Total Comprobante:</td>
              <td style="padding: 8px; text-align: right; font-size: 12px; font-weight: 900; color: ${esAnulada ? '#dc2626' : '#013299'};">
                ${esAnulada
                  ? `<span style="text-decoration: line-through;">$${Number(guia.total || 0).toLocaleString('es-CL')}</span> (Sin efecto)`
                  : `$${Number(guia.total || 0).toLocaleString('es-CL')}`
                }
              </td>
            </tr>
          </tfoot>
        </table>

        <div style="display: flex; gap: 12px; margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px;">
          <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px;">
            <p style="font-weight: 800; color: #64748b; font-size: 9px; text-transform: uppercase;">Receptor Conforme</p>
            <p><b>Nombre:</b> ${esc(guia.nombre_receptor || 'No especificado')}</p>
            ${guia.rut_receptor ? `<p><b>RUT:</b> ${esc(guia.rut_receptor)}</p>` : ''}
            <p><b>Hora:</b> ${fechaRecepcionStr}</p>
          </div>

          <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; text-align: center; background: #fff;">
            <p style="font-size: 9px; font-weight: bold; color: #475569; text-transform: uppercase; margin-bottom: 4px;">Firma Digital Receptor</p>
            ${tieneFirma ? `
              <img src="${guia.firma_digital}" style="max-height: 70px; max-width: 100%; object-fit: contain;" alt="Firma" />
              <p style="border-top: 1px dashed #cbd5e1; padding-top: 2px; font-size: 8px; color: ${esAnulada ? '#b91c1c' : '#16a34a'}; font-weight: bold;">
                ${esAnulada ? 'Firma de la entrega original. Documento anulado.' : '✓ FIRMADA DIGITALMENTE'}
              </p>
            ` : `
              <div style="height: 50px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-style: italic; font-size: 9px;">
                Sin firma registrada
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Dossier Comprobantes de Entrega - ${esc(cliente?.nombre || 'Cliente')} - SODATAL</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #0f172a; padding: 24px; font-size: 11px; }
    .hoja-caratula { max-width: 820px; margin: 0 auto 30px auto; background: #fff; padding: 36px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .hoja-guia { max-width: 820px; margin: 20px auto; background: #fff; padding: 24px 32px; border-radius: 12px; border: 1px solid #e2e8f0; page-break-after: always; }
    .header-guia { display: flex; justify-content: space-between; align-items: start; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
    .no-print-bar { max-width: 820px; margin: 0 auto 16px auto; display: flex; justify-content: space-between; align-items: center; }
    .btn { background: #013299; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; text-decoration: none; }
    .btn:hover { background: #1e3a8a; }
    .metric-grid { display: flex; gap: 12px; margin: 16px 0; }
    .metric-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }

    .caja-folio { border: 2px solid #0284c7; background: #f0f9ff; border-radius: 8px; text-align: center; }
    .caja-folio.anulada { border-color: #dc2626; background: #fef2f2; }

    @media print {
      body { background: #fff; padding: 0; }
      .hoja-caratula, .hoja-guia { border: none; box-shadow: none; padding: 0; max-width: 100%; border-radius: 0; }
      .hoja-caratula { page-break-after: always; }
      .no-print-bar { display: none; }
      @page { size: portrait; margin: 1.2cm; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div>
      <span style="font-weight: 800; font-size: 14px; color: #013299;">Dossier de Respaldo de Comprobantes de Entrega</span>
      <span style="color: #64748b; font-size: 11px; margin-left: 8px;">(${totalGuias} comprobantes vigentes • ${esc(cliente?.nombre || 'Cliente')})</span>
    </div>
    <button class="btn" onclick="window.print()">🖨️ Imprimir / Guardar Dossier como PDF</button>
  </div>

  <!-- CARÁTULA DE RESUMEN DE COBRANZA -->
  <div class="hoja-caratula">
    <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #013299; padding-bottom: 16px;">
      <div>
        <span style="font-size: 28px; font-weight: 900; color: #013299;">SODATAL</span>
        <span style="background: #eff6ff; color: #013299; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; border: 1px solid #bfdbfe; margin-left: 6px;">Agua Purificada & Soda</span>
        <p style="font-size: 11px; font-weight: 700; color: #334155; margin-top: 4px;">R.U.T.: 76.892.410-5 • Giro: Elaboración de bebidas no alcohólicas</p>
        <p style="font-size: 10px; color: #64748b; margin-top: 1px;">Joaquín Prieto 289, Concepción, Chile • Teléfono: +56 9 5174 9928</p>
      </div>
      <div style="text-align: right;">
        <h1 style="font-size: 16px; font-weight: 900; color: #0f172a; text-transform: uppercase;">Estado de Despachos</h1>
        <p style="font-size: 10px; color: #64748b; margin-top: 2px;">Emisión del dossier: ${hoy}</p>
      </div>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 16px 0;">
      <p style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">Información del Cliente y Período</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 11px;">
        <div>
          <p><b>Razón Social:</b> ${esc(cliente?.nombre || 'Cliente Consolidado')}</p>
          <p><b>R.U.T. Empresa:</b> ${esc(cliente?.rut_empresa || 'S/RUT')}</p>
          <p><b>Giro:</b> ${esc(cliente?.giro || '-')}</p>
        </div>
        <div>
          <p><b>Dirección:</b> ${esc(cliente?.direccion || '-')}</p>
          <p><b>Período Solicitado:</b> <span style="color: #013299; font-weight: bold;">${rangoTexto}</span></p>
          <p><b>Modalidad Pago:</b> ${esc(cliente?.modalidad_pago || 'MENSUAL')}</p>
        </div>
      </div>
    </div>

    <div class="metric-grid">
      <div class="metric-box">
        <span style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block;">Total Comprobantes</span>
        <span style="font-size: 22px; font-weight: 900; color: #0f172a;">${totalGuias}</span>
      </div>
      <div class="metric-box">
        <span style="font-size: 10px; font-weight: bold; color: #16a34a; text-transform: uppercase; display: block;">Firmadas Digitalmente</span>
        <span style="font-size: 22px; font-weight: 900; color: #16a34a;">${guiasFirmadasCount} de ${totalGuias}</span>
      </div>
      <div class="metric-box" style="background: #eff6ff; border-color: #bfdbfe;">
        <span style="font-size: 10px; font-weight: bold; color: #013299; text-transform: uppercase; display: block;">Monto Total a Facturar (sin anuladas)</span>
        <span style="font-size: 22px; font-weight: 900; color: #013299;">$${totalMonto.toLocaleString('es-CL')}</span>
      </div>
    </div>

    <h2 style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 16px 0 8px 0;">Detalle Consolidado de Comprobantes de Entrega</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
      <thead>
        <tr style="background: #f1f5f9; text-transform: uppercase; font-size: 9px; color: #475569;">
          <th style="padding: 7px; text-align: center; width: 24px;">#</th>
          <th style="padding: 7px; text-align: left;">N° Folio</th>
          <th style="padding: 7px; text-align: left;">Fecha</th>
          <th style="padding: 7px; text-align: left;">Receptor</th>
          <th style="padding: 7px; text-align: center;">Unidades</th>
          <th style="padding: 7px; text-align: center;">Forma Pago</th>
          <th style="padding: 7px; text-align: center;">Estado</th>
          <th style="padding: 7px; text-align: center;">Factura</th>
          <th style="padding: 7px; text-align: center;">Firma</th>
          <th style="padding: 7px; text-align: right;">Total ($)</th>
        </tr>
      </thead>
      <tbody>
        ${filasResumen}
      </tbody>
      <tfoot>
        <tr style="background: #f8fafc; font-weight: 900; border-top: 2px solid #cbd5e1;">
          <td colspan="9" style="padding: 10px; text-align: right; text-transform: uppercase; font-size: 11px;">Monto Total a Facturar:</td>
          <td style="padding: 10px; text-align: right; font-size: 13px; color: #013299;">$${totalMonto.toLocaleString('es-CL')}</td>
        </tr>
      </tfoot>
    </table>

    <div style="margin-top: 30px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 10px; color: #64748b;">
      <b>Nota de Respaldo:</b> A continuación en las siguientes páginas se adjuntan las copias individuales de cada comprobante de entrega con su respectivo detalle de productos entregados y firma digital del receptor.
    </div>
  </div>

  <!-- COMPROBANTES INDIVIDUALES ADJUNTOS -->
  ${guiasIndividualesHtml}
</body>
</html>`;
}

// ────────────────────────────────────────────────────────────────
// Exportación CSV Seguro con Columnas Separadas
// ────────────────────────────────────────────────────────────────

export function descargarGuiasCsv(guias: any[], nombreArchivo = 'comprobantes_entrega.csv') {
  const encabezados = [
    'N° Comprobante',
    'Fecha Emision',
    'Cliente',
    'RUT Empresa',
    'Direccion Entrega',
    'Repartidor',
    'Estado',
    'Forma de Pago',
    'Total ($)',
    'Factura Asociada',
    'Receptor',
    'RUT Receptor',
    'Fecha Recepcion',
    'Firmada Digitalmente',
    'Envases Prestados',
    'Motivo Anulacion',
    'Reemplaza A',
    'Reemplazada Por',
    'Detalle Items'
  ];

  const filas = guias.map((g) => {
    const esAnulada = obtenerEstadoDocumento(g) === 'ANULADA';
    const fecha = new Date(g.fecha_emision).toLocaleDateString('es-CL');
    const itemsResumen = (g.items || [])
      .map((it: any) => `${it.cantidad}x ${it.producto?.nombre || 'Prod'} (${it.tipo_transaccion})`)
      .join(' | ');

    const fechaRecepcion = g.hora_entrega
      ? new Date(g.hora_entrega).toLocaleString('es-CL')
      : `${fecha} (fecha de emision)`;

    const reemplazaFolio = g.reemplaza_a?.numero_correlativo || g.reemplaza_a_correlativo || '';
    const reemplazadaFolio = g.reemplazada_por?.numero_correlativo || g.reemplazada_por_correlativo || '';

    return [
      g.numero_correlativo,
      `"${sanitizarCsv(fecha)}"`,
      `"${sanitizarCsv(g.cliente?.nombre || '')}"`,
      `"${sanitizarCsv(g.cliente?.rut_empresa || '')}"`,
      `"${sanitizarCsv(g.direccion_entrega || '')}"`,
      `"${sanitizarCsv(g.usuario_repartidor ? `${g.usuario_repartidor.nombre} ${g.usuario_repartidor.apellido || ''}` : '')}"`,
      `"${sanitizarCsv(esAnulada ? 'ANULADA' : 'VIGENTE')}"`,
      `"${sanitizarCsv(obtenerFormaPagoLabel(g))}"`,
      g.total || 0,
      `"${sanitizarCsv(g.numero_factura || '')}"`,
      `"${sanitizarCsv(g.nombre_receptor || '')}"`,
      `"${sanitizarCsv(g.rut_receptor || '')}"`,
      `"${sanitizarCsv(fechaRecepcion)}"`,
      esFirmaDataUrlValida(g.firma_digital) ? 'SI' : 'NO',
      g.botellones_prestados_entrega || 0,
      `"${sanitizarCsv(g.anulada_motivo || g.motivo_anulacion || '')}"`,
      `"${sanitizarCsv(reemplazaFolio ? `#${formatearFolio(reemplazaFolio)}` : '')}"`,
      `"${sanitizarCsv(reemplazadaFolio ? `#${formatearFolio(reemplazadaFolio)}` : '')}"`,
      `"${sanitizarCsv(itemsResumen)}"`
    ].join(';');
  });

  // BOM \uFEFF para que Excel abra UTF-8 con caracteres y tildes correctamente
  const csvCompleto = '\uFEFF' + [encabezados.join(';'), ...filas].join('\r\n');
  descargarBlob(csvCompleto, nombreArchivo, 'text/csv;charset=utf-8;');
}

/**
 * Exporta un listado de guías en formato SQL listo para software de facturación
 */
export function descargarGuiasSql(guias: any[], nombreArchivo: string = 'guias_facturacion.sql') {
  const escapeSql = (v: any): string => {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'boolean') return v ? '1' : '0';
    if (typeof v === 'number') return String(v);
    if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
    return `'${String(v).replace(/'/g, "''")}'`;
  };

  const lines: string[] = [
    `-- ====================================================================`,
    `-- SODATAL - EXPORTACIÓN SQL PARA SOFTWARE DE FACTURACIÓN`,
    `-- Generado el: ${new Date().toISOString()}`,
    `-- Total comprobantes: ${guias.length}`,
    `-- ====================================================================`,
    ``,
    `START TRANSACTION;`,
    ``,
  ];

  for (const g of guias) {
    const folioStr = String(g.numero_correlativo || '').padStart(6, '0');
    const repartidorNombre = g.usuario_repartidor
      ? `${g.usuario_repartidor.nombre} ${g.usuario_repartidor.apellido || ''}`.trim()
      : null;

    lines.push(`-- Guía N° #${folioStr} — Cliente: ${g.cliente?.nombre || 'S/N'} — Total: $${Number(g.total || 0).toLocaleString('es-CL')}`);
    lines.push(
      `INSERT INTO guias_despacho (id, numero_correlativo, fecha_emision, cliente_id, cliente_nombre, direccion_entrega, repartidor, estado, nombre_receptor, rut_receptor, hora_entrega, metodo_pago, botellones_prestados_entrega, total) VALUES (` +
      `  ${escapeSql(g.id)}, ${escapeSql(g.numero_correlativo)}, ${escapeSql(g.fecha_emision)}, ${escapeSql(g.cliente_id)}, ${escapeSql(g.cliente?.nombre || null)}, ` +
      `  ${escapeSql(g.direccion_entrega || g.cliente?.direccion || null)}, ${escapeSql(repartidorNombre)}, ${escapeSql(g.estado)}, ${escapeSql(g.nombre_receptor)}, ` +
      `  ${escapeSql(g.rut_receptor)}, ${escapeSql(g.hora_entrega)}, ${escapeSql(g.forma_pago || 'CREDITO')}, ${escapeSql(g.botellones_prestados_entrega || 0)}, ${escapeSql(g.total)}` +
      `);`
    );

    if (g.items && g.items.length > 0) {
      for (const it of g.items) {
        lines.push(
          `INSERT INTO items_guia (id, guia_id, producto_id, producto_nombre, tipo_transaccion, cantidad, precio_unitario, subtotal) VALUES (` +
          `  ${escapeSql(it.id)}, ${escapeSql(it.guia_id)}, ${escapeSql(it.producto_id)}, ${escapeSql(it.producto?.nombre || 'Producto')}, ` +
          `  ${escapeSql(it.tipo_transaccion)}, ${escapeSql(it.cantidad)}, ${escapeSql(it.precio_unitario)}, ${escapeSql(it.subtotal)}` +
          `);`
        );
      }
    }
    lines.push(``);
  }

  lines.push(`COMMIT;`);
  descargarBlob(lines.join('\n'), nombreArchivo, 'application/sql');
}

