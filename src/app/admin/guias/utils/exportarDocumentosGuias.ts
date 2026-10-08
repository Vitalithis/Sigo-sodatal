/**
 * Utilidades para generar y descargar documentos oficiales de Guías de Despacho (Individuales y Dossier por Lote)
 */

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
 * Descarga una guía de despacho individual directamente como archivo .pdf
 */
export async function descargarGuiaPDF(guia: any): Promise<void> {
  if (typeof window === 'undefined') return;

  // @ts-ignore
  const html2pdfModule = await import('html2pdf.js');
  const html2pdf = html2pdfModule.default || html2pdfModule;

  const html = generarHtmlGuiaIndividual(guia, false);

  const contenedor = document.createElement('div');
  contenedor.innerHTML = html;

  const elemento = (contenedor.querySelector('.hoja') as HTMLElement) || contenedor;

  elemento.style.width = '750px';
  elemento.style.margin = '0 auto';
  elemento.style.backgroundColor = '#ffffff';
  elemento.style.position = 'fixed';
  elemento.style.left = '-9999px';
  elemento.style.top = '0';
  document.body.appendChild(elemento);

  const nombreCliente = (guia.cliente?.nombre || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_');
  const nombreArchivo = `Guia_Despacho_${String(guia.numero_correlativo).padStart(6, '0')}_${nombreCliente}.pdf`;

  const opt = {
    margin: [8, 8, 8, 8] as [number, number, number, number],
    filename: nombreArchivo,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' as const },
  };

  try {
    await html2pdf().set(opt).from(elemento).save();
  } finally {
    if (document.body.contains(elemento)) {
      document.body.removeChild(elemento);
    }
  }
}

/**
 * Descarga el dossier consolidado de guías directamente como archivo .pdf
 */
export async function descargarDossierPDF(
  cliente: any,
  guias: any[],
  periodo: { desde?: string; hasta?: string }
): Promise<void> {
  if (typeof window === 'undefined') return;

  // @ts-ignore
  const html2pdfModule = await import('html2pdf.js');
  const html2pdf = html2pdfModule.default || html2pdfModule;

  const html = generarHtmlDossierGuias(cliente, guias, periodo);

  const contenedor = document.createElement('div');
  contenedor.innerHTML = html;

  const noPrint = contenedor.querySelector('.no-print-bar');
  if (noPrint) noPrint.remove();

  contenedor.style.width = '750px';
  contenedor.style.backgroundColor = '#ffffff';
  contenedor.style.position = 'fixed';
  contenedor.style.left = '-9999px';
  contenedor.style.top = '0';
  document.body.appendChild(contenedor);

  const nombreLimpio = (cliente?.nombre || 'Todas_Empresas').replace(/[^a-zA-Z0-9_-]/g, '_');
  const rango = periodo.desde && periodo.hasta ? `_${periodo.desde}_${periodo.hasta}` : '';
  const nombreArchivo = `Dossier_Guias_${nombreLimpio}${rango}.pdf`;

  const opt = {
    margin: [8, 8, 8, 8] as [number, number, number, number],
    filename: nombreArchivo,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 1.5, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' as const },
    pagebreak: { mode: ['css', 'legacy'] },
  };

  try {
    await html2pdf().set(opt).from(contenedor).save();
  } finally {
    if (document.body.contains(contenedor)) {
      document.body.removeChild(contenedor);
    }
  }
}

const ESTADO_LABELS: Record<string, string> = {
  ENTREGADA_EFECTIVO: 'Entregada (Efectivo)',
  ENTREGADA_TARJETA: 'Entregada (Tarjeta)',
  ENTREGADA_TRANSFERENCIA: 'Entregada (Transferencia)',
  ENTREGADA_CREDITO: 'Entregada (Crédito Empresa)',
  ANULADA: 'Anulada',
};

/**
 * Genera el HTML de una guía individual en formato oficial
 */
export function generarHtmlGuiaIndividual(guia: any, autoPrint = false): string {
  const fechaEmision = new Date(guia.fecha_emision);
  const fechaStr = fechaEmision.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaStr = fechaEmision.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const tieneFirma = !!guia.firma_digital;

  const filasItems = (guia.items || []).map((it: any, i: number) => `
    <tr>
      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b;">${i + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${it.producto?.nombre || 'Producto'}</td>
      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;"><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${it.tipo_transaccion || 'VENTA'}</span></td>
      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #0f172a;">${it.cantidad}</td>
      <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">$${Number(it.precio_unitario || 0).toLocaleString('es-CL')}</td>
      <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #0f172a;">$${Number(it.subtotal || it.cantidad * it.precio_unitario).toLocaleString('es-CL')}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Guía de Despacho #${guia.numero_correlativo} - SODATAL</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #0f172a; padding: 24px; font-size: 12px; }
    .hoja { max-width: 800px; margin: 0 auto; background: #fff; padding: 36px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header-grid { display: grid; grid-template-columns: 1fr 240px; gap: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; align-items: start; }
    .logo-brand { font-size: 26px; font-weight: 900; color: #013299; letter-spacing: -0.5px; }
    .badge-slogan { background: #eff6ff; color: #013299; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; border: 1px solid #bfdbfe; margin-left: 6px; }
    .caja-sii { border: 2px solid #dc2626; background: #fef2f2; border-radius: 8px; padding: 12px; text-align: center; }
    .caja-sii h3 { color: #b91c1c; font-size: 13px; font-weight: 900; letter-spacing: 0.5px; margin: 4px 0; }
    .caja-sii .numero { color: #dc2626; font-size: 16px; font-weight: 900; font-family: monospace; }
    .datos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
    .card-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 11px; line-height: 1.6; }
    .card-info .label { font-weight: 700; color: #475569; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 11px; }
    th { background: #f1f5f9; padding: 8px; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
    .tfoot-total { background: #f8fafc; font-weight: bold; border-top: 2px solid #cbd5e1; }
    .firma-seccion { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; align-items: end; }
    .caja-firma { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; background: #fff; }
    .caja-firma img { max-height: 100px; max-width: 100%; object-fit: contain; }
    .no-print-bar { max-width: 800px; margin: 0 auto 16px auto; display: flex; justify-content: space-between; align-items: center; }
    .btn { background: #013299; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
    .btn:hover { background: #1e3a8a; }
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
    <span style="font-weight: 700; color: #475569;">Guía de Despacho N° ${guia.numero_correlativo}</span>
    <button class="btn" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
  </div>

  <div class="hoja">
    <div class="header-grid">
      <div>
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          <span class="logo-brand">SODATAL</span>
          <span class="badge-slogan">Agua & Soda Purificada</span>
        </div>
        <p style="font-weight: 800; font-size: 11px; color: #334155;">DISTRIBUIDORA Y LOGÍSTICA SODATAL SpA</p>
        <p style="color: #64748b; font-size: 11px;">Giro: Purificación y distribución de aguas minerales y sodas</p>
        <p style="color: #64748b; font-size: 11px; margin-top: 4px;">Casa Matriz: Los Ángeles, Región del Biobío, Chile • +56 9 8765 4321</p>
      </div>

      <div class="caja-sii">
        <p style="font-size: 11px; font-weight: 900; color: #dc2626;">R.U.T.: 76.892.410-5</p>
        <h3>GUÍA DE DESPACHO</h3>
        <p class="numero">N° ${String(guia.numero_correlativo).padStart(6, '0')}</p>
        <p style="font-size: 9px; color: #ef4444; font-weight: 700; margin-top: 4px;">S.I.I. - UNIDAD LOS ÁNGELES</p>
      </div>
    </div>

    <div class="datos-grid">
      <div class="card-info">
        <p style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Datos del Receptor</p>
        <p><span class="label">Señor(es):</span> <b>${guia.cliente?.nombre || 'Consumidor Final'}</b></p>
        <p><span class="label">R.U.T. Empresa:</span> ${guia.cliente?.rut_empresa || 'S/RUT'}</p>
        <p><span class="label">Giro:</span> ${guia.cliente?.giro || 'Particular / Comercial'}</p>
        <p><span class="label">Dirección:</span> ${guia.direccion_entrega || guia.cliente?.direccion || '-'}</p>
        <p><span class="label">Teléfono:</span> ${guia.cliente?.telefono || '-'}</p>
      </div>

      <div class="card-info">
        <p style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Detalles del Despacho</p>
        <p><span class="label">Fecha y Hora:</span> ${fechaStr} - ${horaStr}</p>
        <p><span class="label">Repartidor:</span> ${guia.usuario_repartidor ? `${guia.usuario_repartidor.nombre} ${guia.usuario_repartidor.apellido || ''}` : '-'}</p>
        <p><span class="label">Condición Pago:</span> <b>${ESTADO_LABELS[guia.estado] || guia.estado}</b></p>
        <p><span class="label">Envases Prestados:</span> ${guia.botellones_prestados_entrega || 0} un.</p>
        ${guia.numero_factura ? `<p><span class="label">Factura Ref:</span> #${guia.numero_factura}</p>` : ''}
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
          <td colspan="5" style="padding: 10px; text-align: right; text-transform: uppercase; font-size: 11px;">Total a Pagar:</td>
          <td style="padding: 10px; text-align: right; font-size: 14px; font-weight: 900; color: #013299;">$${Number(guia.total || 0).toLocaleString('es-CL')}</td>
        </tr>
      </tfoot>
    </table>

    ${guia.observaciones ? `
      <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 10px; font-size: 11px; color: #92400e; margin-bottom: 16px;">
        <b>Observaciones:</b> ${guia.observaciones}
      </div>
    ` : ''}

    <div class="firma-seccion">
      <div class="card-info">
        <p style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Recepción Conforme</p>
        <p><span class="label">Nombre Receptor:</span> <b>${guia.nombre_receptor || 'No especificado'}</b></p>
        ${guia.rut_receptor ? `<p><span class="label">RUT Receptor:</span> ${guia.rut_receptor}</p>` : ''}
        <p><span class="label">Fecha Recepción:</span> ${guia.hora_entrega ? new Date(guia.hora_entrega).toLocaleString('es-CL') : `${fechaStr} ${horaStr}`}</p>
        <p style="font-size: 10px; color: #94a3b8; margin-top: 6px;">El receptor declara recibir las mercaderías a su entera conformidad.</p>
      </div>

      <div class="caja-firma">
        <p style="font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 6px;">Firma Digital del Receptor</p>
        ${tieneFirma ? `
          <img src="${guia.firma_digital}" alt="Firma del Receptor" />
          <p style="border-top: 1px dashed #cbd5e1; padding-top: 4px; font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase;">
            ${guia.nombre_receptor || 'Receptor Conforme'}
          </p>
          <p style="font-size: 8px; color: #16a34a; font-weight: bold; margin-top: 2px;">✓ FIRMA DIGITAL REGISTRADA</p>
        ` : `
          <div style="height: 80px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-style: italic; border: 1px dashed #e2e8f0; border-radius: 6px;">
            Sin firma registrada
          </div>
          <p style="border-top: 1px solid #cbd5e1; padding-top: 4px; font-size: 9px; color: #64748b;">FIRMA Y RUT RECEPTOR</p>
        `}
      </div>
    </div>

    <div style="text-align: center; margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8;">
      Documento tributario de control de despacho • Sistema Integral de Gestión Operativa (SIGO Sodatal)<br>
      Copia válida como respaldo oficial de pago.
    </div>
  </div>

  ${autoPrint ? `<script>window.onload = function() { window.print(); };</script>` : ''}
</body>
</html>`;
}

/**
 * Genera el Dossier Consolidado con Carátula de Resumen y todas las Guías Completas firmadas
 */
export function generarHtmlDossierGuias(
  cliente: any,
  guias: any[],
  periodo: { desde?: string; hasta?: string }
): string {
  const hoy = new Date().toLocaleDateString('es-CL');
  const totalMonto = guias.reduce((acc, g) => acc + (g.estado === 'ANULADA' ? 0 : (g.total || 0)), 0);
  const totalGuias = guias.length;
  const guiasFirmadasCount = guias.filter((g) => !!g.firma_digital).length;

  const rangoTexto = periodo.desde && periodo.hasta
    ? `Desde ${periodo.desde} hasta ${periodo.hasta}`
    : periodo.desde
      ? `Desde ${periodo.desde}`
      : periodo.hasta
        ? `Hasta ${periodo.hasta}`
        : 'Histórico Completo';

  // Filas de la tabla resumen de cobranza
  const filasResumen = guias.map((g, i) => {
    const fecha = new Date(g.fecha_emision).toLocaleDateString('es-CL');
    const unidades = (g.items || []).reduce((acc: number, it: any) => acc + (it.cantidad || 0), 0);
    const firmada = !!g.firma_digital;

    return `
      <tr>
        <td style="padding: 7px; text-align: center; border-bottom: 1px solid #e2e8f0; color: #64748b;">${i + 1}</td>
        <td style="padding: 7px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #013299;">#${g.numero_correlativo}</td>
        <td style="padding: 7px; border-bottom: 1px solid #e2e8f0;">${fecha}</td>
        <td style="padding: 7px; border-bottom: 1px solid #e2e8f0;">${g.nombre_receptor || '-'}</td>
        <td style="padding: 7px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${unidades} un.</td>
        <td style="padding: 7px; text-align: center; border-bottom: 1px solid #e2e8f0;">
          <span style="padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; ${firmada ? 'background: #ecfdf5; color: #047857;' : 'background: #f1f5f9; color: #64748b;'}">
            ${firmada ? '✓ Firmada' : 'Sin firma'}
          </span>
        </td>
        <td style="padding: 7px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #0f172a;">
          ${g.estado === 'ANULADA' ? '<span style="color: #dc2626; text-decoration: line-through;">ANULADA</span>' : `$${Number(g.total || 0).toLocaleString('es-CL')}`}
        </td>
      </tr>
    `;
  }).join('');

  // Generar el cuerpo de cada guía individual para el dossier
  const guiasIndividualesHtml = guias.map((guia) => {
    const fechaEmision = new Date(guia.fecha_emision);
    const fechaStr = fechaEmision.toLocaleDateString('es-CL');
    const horaStr = fechaEmision.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const tieneFirma = !!guia.firma_digital;

    const filasItems = (guia.items || []).map((it: any, i: number) => `
      <tr>
        <td style="padding: 6px; text-align: center; border-bottom: 1px solid #e2e8f0; color: #64748b;">${i + 1}</td>
        <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${it.producto?.nombre || 'Producto'}</td>
        <td style="padding: 6px; text-align: center; border-bottom: 1px solid #e2e8f0; font-size: 10px;">${it.tipo_transaccion || 'VENTA'}</td>
        <td style="padding: 6px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${it.cantidad}</td>
        <td style="padding: 6px; text-align: right; border-bottom: 1px solid #e2e8f0;">$${Number(it.precio_unitario || 0).toLocaleString('es-CL')}</td>
        <td style="padding: 6px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: bold;">$${Number(it.subtotal || it.cantidad * it.precio_unitario).toLocaleString('es-CL')}</td>
      </tr>
    `).join('');

    return `
      <div class="hoja-guia">
        <div class="header-guia">
          <div>
            <span style="font-size: 20px; font-weight: 900; color: #013299;">SODATAL</span>
            <span style="background: #eff6ff; color: #013299; font-size: 9px; font-weight: bold; padding: 2px 4px; border-radius: 4px; border: 1px solid #bfdbfe; margin-left: 4px;">Agua & Soda</span>
            <p style="font-size: 10px; font-weight: 700; color: #475569; margin-top: 2px;">DISTRIBUIDORA Y LOGÍSTICA SODATAL SpA • R.U.T.: 76.892.410-5</p>
          </div>
          <div style="border: 2px solid #dc2626; background: #fef2f2; border-radius: 6px; padding: 8px; text-align: center; width: 190px;">
            <p style="font-size: 10px; font-weight: 900; color: #dc2626;">GUÍA DE DESPACHO</p>
            <p style="font-size: 14px; font-weight: 900; color: #dc2626; font-family: monospace;">N° ${String(guia.numero_correlativo).padStart(6, '0')}</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; font-size: 10px; line-height: 1.5;">
          <div>
            <p><b>Cliente:</b> ${guia.cliente?.nombre || cliente?.nombre || '-'}</p>
            <p><b>R.U.T. Empresa:</b> ${guia.cliente?.rut_empresa || cliente?.rut_empresa || 'S/RUT'}</p>
            <p><b>Dirección:</b> ${guia.direccion_entrega || '-'}</p>
          </div>
          <div>
            <p><b>Fecha:</b> ${fechaStr} ${horaStr}</p>
            <p><b>Repartidor:</b> ${guia.usuario_repartidor ? `${guia.usuario_repartidor.nombre} ${guia.usuario_repartidor.apellido || ''}` : '-'}</p>
            <p><b>Condición:</b> ${ESTADO_LABELS[guia.estado] || guia.estado}</p>
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
              <td colspan="5" style="padding: 8px; text-align: right; text-transform: uppercase;">Total Guía:</td>
              <td style="padding: 8px; text-align: right; font-size: 12px; font-weight: 900; color: #013299;">$${Number(guia.total || 0).toLocaleString('es-CL')}</td>
            </tr>
          </tfoot>
        </table>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px;">
            <p style="font-weight: 800; color: #64748b; font-size: 9px; text-transform: uppercase;">Receptor Conforme</p>
            <p><b>Nombre:</b> ${guia.nombre_receptor || 'No especificado'}</p>
            ${guia.rut_receptor ? `<p><b>RUT:</b> ${guia.rut_receptor}</p>` : ''}
            <p><b>Hora:</b> ${guia.hora_entrega ? new Date(guia.hora_entrega).toLocaleTimeString('es-CL') : horaStr}</p>
          </div>

          <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; text-align: center; background: #fff;">
            <p style="font-size: 9px; font-weight: bold; color: #475569; text-transform: uppercase; margin-bottom: 4px;">Firma Digital Receptor</p>
            ${tieneFirma ? `
              <img src="${guia.firma_digital}" style="max-height: 70px; max-width: 100%; object-fit: contain;" alt="Firma" />
              <p style="border-top: 1px dashed #cbd5e1; padding-top: 2px; font-size: 8px; color: #16a34a; font-weight: bold;">✓ FIRMADA DIGITALMENTE</p>
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
  <title>Dossier Guías de Despacho - ${cliente?.nombre || 'Cliente'} - SODATAL</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #0f172a; padding: 24px; font-size: 11px; }
    .hoja-caratula { max-width: 820px; margin: 0 auto 30px auto; background: #fff; padding: 36px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .hoja-guia { max-width: 820px; margin: 20px auto; background: #fff; padding: 24px 32px; border-radius: 12px; border: 1px solid #e2e8f0; page-break-after: always; }
    .header-guia { display: flex; justify-content: space-between; align-items: start; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
    .no-print-bar { max-width: 820px; margin: 0 auto 16px auto; display: flex; justify-content: space-between; align-items: center; }
    .btn { background: #013299; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; text-decoration: none; }
    .btn:hover { background: #1e3a8a; }
    .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
    .metric-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
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
      <span style="font-weight: 800; font-size: 14px; color: #013299;">Dossier de Respaldo de Guías</span>
      <span style="color: #64748b; font-size: 11px; margin-left: 8px;">(${totalGuias} guías • ${cliente?.nombre || 'Cliente'})</span>
    </div>
    <button class="btn" onclick="window.print()">🖨️ Imprimir / Guardar Dossier como PDF</button>
  </div>

  <!-- CARÁTULA DE RESUMEN DE COBRANZA -->
  <div class="hoja-caratula">
    <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #013299; padding-bottom: 16px;">
      <div>
        <span style="font-size: 28px; font-weight: 900; color: #013299;">SODATAL</span>
        <span style="background: #eff6ff; color: #013299; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; border: 1px solid #bfdbfe; margin-left: 6px;">Agua Purificada & Soda</span>
        <p style="font-size: 11px; color: #475569; margin-top: 4px;">DISTRIBUIDORA Y LOGÍSTICA SODATAL SpA • R.U.T.: 76.892.410-5</p>
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
          <p><b>Razón Social:</b> ${cliente?.nombre || 'Cliente Consolidado'}</p>
          <p><b>R.U.T. Empresa:</b> ${cliente?.rut_empresa || 'S/RUT'}</p>
          <p><b>Giro:</b> ${cliente?.giro || '-'}</p>
        </div>
        <div>
          <p><b>Dirección:</b> ${cliente?.direccion || '-'}</p>
          <p><b>Período Solicitado:</b> <span style="color: #013299; font-weight: bold;">${rangoTexto}</span></p>
          <p><b>Modalidad Pago:</b> ${cliente?.modalidad_pago || 'MENSUAL'}</p>
        </div>
      </div>
    </div>

    <div class="metric-grid">
      <div class="metric-box">
        <span style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block;">Total Guías</span>
        <span style="font-size: 22px; font-weight: 900; color: #0f172a;">${totalGuias}</span>
      </div>
      <div class="metric-box">
        <span style="font-size: 10px; font-weight: bold; color: #16a34a; text-transform: uppercase; display: block;">Firmadas Digitalmente</span>
        <span style="font-size: 22px; font-weight: 900; color: #16a34a;">${guiasFirmadasCount} de ${totalGuias}</span>
      </div>
      <div class="metric-box" style="background: #eff6ff; border-color: #bfdbfe;">
        <span style="font-size: 10px; font-weight: bold; color: #013299; text-transform: uppercase; display: block;">Monto Total Facturable</span>
        <span style="font-size: 22px; font-weight: 900; color: #013299;">$${totalMonto.toLocaleString('es-CL')}</span>
      </div>
    </div>

    <h2 style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 16px 0 8px 0;">Detalle Consolidado de Guías de Despacho</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
      <thead>
        <tr style="background: #f1f5f9; text-transform: uppercase; font-size: 9px; color: #475569;">
          <th style="padding: 7px; text-align: center; width: 24px;">#</th>
          <th style="padding: 7px; text-align: left;">N° Guía</th>
          <th style="padding: 7px; text-align: left;">Fecha</th>
          <th style="padding: 7px; text-align: left;">Receptor</th>
          <th style="padding: 7px; text-align: center;">Unidades</th>
          <th style="padding: 7px; text-align: center;">Firma</th>
          <th style="padding: 7px; text-align: right;">Total ($)</th>
        </tr>
      </thead>
      <tbody>
        ${filasResumen}
      </tbody>
      <tfoot>
        <tr style="background: #f8fafc; font-weight: 900; border-top: 2px solid #cbd5e1;">
          <td colspan="6" style="padding: 10px; text-align: right; text-transform: uppercase; font-size: 11px;">Monto Total Consolidado:</td>
          <td style="padding: 10px; text-align: right; font-size: 13px; color: #013299;">$${totalMonto.toLocaleString('es-CL')}</td>
        </tr>
      </tfoot>
    </table>

    <div style="margin-top: 30px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 10px; color: #64748b;">
      <b>Nota de Respaldo:</b> A continuación en las siguientes páginas se adjuntan las copias oficiales individuales de cada guía de despacho con su respectivo detalle de productos entregados y firma digital del receptor.
    </div>
  </div>

  <!-- GUÍAS INDIVIDUALES ADJUNTAS -->
  ${guiasIndividualesHtml}
</body>
</html>`;
}

/**
 * Genera y descarga un archivo CSV con BOM UTF-8 para Excel
 */
export function descargarGuiasCsv(guias: any[], nombreArchivo = 'guias_despacho.csv') {
  const encabezados = [
    'N° Guia',
    'Fecha Emision',
    'Cliente',
    'RUT Empresa',
    'Direccion Entrega',
    'Repartidor',
    'Estado',
    'Metodo Pago',
    'Total ($)',
    'Receptor',
    'RUT Receptor',
    'Firmada Digitalmente',
    'Envases Prestados',
    'Detalle Items'
  ];

  const filas = guias.map((g) => {
    const fecha = new Date(g.fecha_emision).toLocaleDateString('es-CL');
    const itemsResumen = (g.items || [])
      .map((it: any) => `${it.cantidad}x ${it.producto?.nombre || 'Prod'} (${it.tipo_transaccion})`)
      .join(' | ');

    return [
      g.numero_correlativo,
      `"${fecha}"`,
      `"${(g.cliente?.nombre || '').replace(/"/g, '""')}"`,
      `"${g.cliente?.rut_empresa || ''}"`,
      `"${(g.direccion_entrega || '').replace(/"/g, '""')}"`,
      `"${g.usuario_repartidor ? `${g.usuario_repartidor.nombre} ${g.usuario_repartidor.apellido || ''}` : ''}"`,
      `"${ESTADO_LABELS[g.estado] || g.estado}"`,
      `"${g.metodo_pago || ''}"`,
      g.total || 0,
      `"${(g.nombre_receptor || '').replace(/"/g, '""')}"`,
      `"${g.rut_receptor || ''}"`,
      g.firma_digital ? 'SI' : 'NO',
      g.botellones_prestados_entrega || 0,
      `"${itemsResumen.replace(/"/g, '""')}"`
    ].join(';');
  });

  // BOM \uFEFF para que Excel abra UTF-8 con tildes y caracteres en español correctamente
  const csvCompleto = '\uFEFF' + [encabezados.join(';'), ...filas].join('\r\n');
  descargarBlob(csvCompleto, nombreArchivo, 'text/csv;charset=utf-8;');
}
