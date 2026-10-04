import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
process.env.ADMIN_TEST_USER_EMAIL = 'docampo@ing.ucsc.cl';

import { PrismaClient, EstadoParada } from '../lib/prisma/generated';
import { getHoyHabilStr, validarDiaHabil, esFinDeSemana } from '../src/lib/fechas';

// 1. Cierre de Caja Actions
import { 
  obtenerOCrearCierreDiaAction, 
  agregarVentaAction, 
  agregarGastoAction,
  obtenerHistorialCierresAction,
  obtenerDetalleCierreAction
} from '../src/app/admin/cierre-caja/actions';

// 2. Cuadratura Actions
import {
  obtenerCuadraturasAction,
  obtenerDatosSalidaRepartidorAction,
  obtenerGuiasRepartidorDiaAction,
  registrarCierreCuadraturaAction,
  reabrirCuadraturaAction,
  obtenerCuadraturaDetalleAction
} from '../src/app/admin/cuadratura/actions';

// 3. Rutas Actions
import {
  obtenerRutasPorFechaAction,
  obtenerCalendarioVisitasMesAction,
  actualizarEstadoParadaAction
} from '../src/app/admin/rutas/actions';

// 4. Flota Actions
import {
  obtenerVehiculosAction,
  obtenerChoferesAction,
  registrarCargaCombustibleAction
} from '../src/app/admin/flota/actions';

// 5. Producción Actions
import {
  obtenerProduccionAction,
  obtenerTubosCO2Action,
  obtenerConfiguracionCO2Action
} from '../src/app/admin/produccion/actions';

// 6. Clientes y Dispensadores Actions
import {
  obtenerComunasConSectoresAction,
  obtenerHistorialClienteAction
} from '../src/app/admin/clientes/actions';
import {
  obtenerDispensadoresAction
} from '../src/app/admin/dispensadores/actions';

// 7. Ventas Actions
import {
  obtenerVentasPorAnioAction
} from '../src/app/admin/ventas/actions';

const prisma = new PrismaClient();

interface TestResult {
  modulo: string;
  flujo: string;
  exito: boolean;
  detalles?: string;
}

const resultados: TestResult[] = [];

function registrarResultado(modulo: string, flujo: string, exito: boolean, detalles?: string) {
  resultados.push({ modulo, flujo, exito, detalles });
  const icon = exito ? '✅' : '❌';
  console.log(`${icon} [${modulo}] ${flujo} ${detalles ? `-> ${detalles}` : ''}`);
}

async function runTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 INICIANDO PRUEBAS AUTOMATIZADAS DE FLUJOS DE TRABAJO');
  console.log('🧪 ========================================================\n');

  const fechaHoyHabil = getHoyHabilStr();
  console.log(`📅 Fecha de prueba operativa hábil: ${fechaHoyHabil}\n`);

  // =========================================================================
  // FLUJO 0: Restricción de Días Hábiles (Lunes a Viernes)
  // =========================================================================
  console.log('--- [0] VALIDACIÓN DE POLÍTICA DE DÍAS HÁBILES ---');
  try {
    const sabado = '2026-10-03';
    const domingo = '2026-10-04';
    const lunes = '2026-10-05';

    const esSabFin = esFinDeSemana(sabado);
    const esDomFin = esFinDeSemana(domingo);
    const esLunFin = esFinDeSemana(lunes);

    const valSab = validarDiaHabil(sabado);
    const valLun = validarDiaHabil(lunes);

    const testPolitica = esSabFin && esDomFin && !esLunFin && !valSab.valido && valLun.valido;
    registrarResultado(
      'Política Días Hábiles', 
      'Bloqueo de sábados y domingos / Permisión de lunes a viernes', 
      testPolitica,
      `Sábado bloqueado: ${!valSab.valido}, Lunes permitido: ${valLun.valido}`
    );
  } catch (err: any) {
    registrarResultado('Política Días Hábiles', 'Bloqueo de fines de semana', false, err.message);
  }

  // =========================================================================
  // FLUJO 1: CIERRE DE CAJA (Fábrica / Mostrador)
  // =========================================================================
  console.log('\n--- [1] FLUJO DE CIERRE DE CAJA ---');
  let cierreId: string | null = null;
  try {
    // 1.1 Obtener o crear cierre
    const resCierre = await obtenerOCrearCierreDiaAction();
    if (!resCierre.success || !resCierre.cierre) {
      throw new Error(resCierre.message || 'No se pudo obtener el cierre de caja');
    }
    cierreId = resCierre.cierre.id;
    registrarResultado(
      'Cierre de Caja', 
      'Obtener Cierre de Caja del Día', 
      true, 
      `ID: ${cierreId}, Ventas registradas: ${resCierre.cierre.ventas?.length || 0}, Total: $${resCierre.cierre.total_general}`
    );

    // 1.2 Agregar Venta Mostrador
    const resVenta = await agregarVentaAction({
      cierreId,
      descripcion: 'Venta de Prueba Automatizada - 2 Recargas 20L',
      productoId: 'prod-botellon-20l',
      cantidad: 2,
      precioUnitario: 3000,
      metodoPago: 'EFECTIVO',
      esOtro: false,
    });
    registrarResultado(
      'Cierre de Caja', 
      'Registrar Venta de Mostrador', 
      resVenta.success, 
      resVenta.success ? 'Venta agregada con éxito' : resVenta.message
    );

    // 1.3 Agregar Gasto de Caja Chica
    const resGasto = await agregarGastoAction({
      cierreId,
      descripcion: 'Gasto Menor Automatizado - Café',
      monto: 2500,
      tipo: 'OFICINA',
    });
    registrarResultado(
      'Cierre de Caja', 
      'Registrar Gasto de Caja Chica', 
      resGasto.success, 
      resGasto.success ? 'Gasto agregado con éxito' : resGasto.message
    );

    // 1.4 Obtener Detalle e Historial
    const resHistorial = await obtenerHistorialCierresAction();
    const resDetalle = await obtenerDetalleCierreAction(cierreId);
    registrarResultado(
      'Cierre de Caja', 
      'Consulta de Historial y Detalle de Cierre', 
      resHistorial.success && resDetalle.success, 
      `Historial: ${resHistorial.cierres?.length || 0} registros`
    );

  } catch (err: any) {
    registrarResultado('Cierre de Caja', 'Flujo completo de Cierre de Caja', false, err.message);
  }

  // =========================================================================
  // FLUJO 2: CUADRATURA Y DESPACHO (Repartidores & Camiones)
  // =========================================================================
  console.log('\n--- [2] FLUJO DE CUADRATURA Y DESPACHO ---');
  let cuadraturaId: string | null = null;
  let repartidorId: string | null = null;
  try {
    // 2.1 Obtener Cuadraturas del Día
    const resCuad = await obtenerCuadraturasAction(fechaHoyHabil);
    if (!resCuad.success || !resCuad.cuadraturas || resCuad.cuadraturas.length === 0) {
      throw new Error(resCuad.message || 'No se encontraron cuadraturas para el día');
    }
    const cuad = resCuad.cuadraturas[0];
    cuadraturaId = cuad.id;
    repartidorId = cuad.usuario_id;
    registrarResultado(
      'Cuadratura', 
      'Obtener Cuadraturas del Día', 
      true, 
      `Cuadratura ID: ${cuadraturaId}, Repartidor: ${cuad.usuario.nombre} ${cuad.usuario.apellido}, Estado inicial: ${cuad.estado}`
    );

    // 2.2 Obtener Datos de Salida del Repartidor
    const resSalida = await obtenerDatosSalidaRepartidorAction(repartidorId, fechaHoyHabil);
    registrarResultado(
      'Cuadratura', 
      'Obtener Carga de Salida y Camión', 
      resSalida.success, 
      `Camión: ${resSalida.vehiculo?.patente || 'N/A'}, Items Salida: ${resSalida.cuadratura_existente?.salida?.length || 0}`
    );

    // 2.3 Obtener Guías de Despacho del Repartidor en el Día
    const resGuias = await obtenerGuiasRepartidorDiaAction(repartidorId, fechaHoyHabil);
    registrarResultado(
      'Cuadratura', 
      'Obtener Guías de Despacho Emitidas en Ruta', 
      resGuias.success, 
      `Total guías: ${resGuias.guias?.length || 0}`
    );

    // 2.4 Detalle de Cuadratura
    const resDetalleCuad = await obtenerCuadraturaDetalleAction(cuadraturaId);
    registrarResultado(
      'Cuadratura', 
      'Obtener Detalle Completo de Cuadratura', 
      resDetalleCuad.success, 
      `Efectivo: $${resDetalleCuad.cuadratura?.total_efectivo}, Tarjeta: $${resDetalleCuad.cuadratura?.total_tarjeta}, Vacíos: ${resDetalleCuad.cuadratura?.botellones_vacios?.[0]?.cantidad_total || 0}`
    );

    // 2.5 Reabrir Cuadratura para edición
    if (cuad.estado === 'CERRADA') {
      const resReaperturaInicial = await reabrirCuadraturaAction(cuadraturaId, 'Reapertura para prueba de edición');
      registrarResultado(
        'Cuadratura', 
        'Reapertura Justificada de Cuadratura', 
        resReaperturaInicial.success, 
        resReaperturaInicial.success ? 'Cuadratura reabierta para edición' : resReaperturaInicial.message
      );
    } else {
      registrarResultado('Cuadratura', 'Estado Cuadratura', true, 'Cuadratura ya se encuentra abierta');
    }

    // 2.6 Cierre de Cuadratura
    const resCierreCuad = await registrarCierreCuadraturaAction({
      cuadratura_id: cuadraturaId,
      retorno: [
        { producto_id: 'prod-botellon-20l', cantidad: 40 },
        { producto_id: 'prod-botellon-10l', cantidad: 20 },
        { producto_id: 'prod-soda', cantidad: 20 }
      ],
      gastos: [{ tipo: 'PEAJE', monto: 1200, descripcion: 'Peaje retorno' }],
      botellones_vacios: { cantidad_total: 27, cantidad_danados: 1 },
      km_final: 86520,
      permitir_ajuste: true,
    });
    registrarResultado(
      'Cuadratura', 
      'Cierre de Cuadratura con Retorno y Vacíos', 
      resCierreCuad.success, 
      resCierreCuad.success ? 'Cuadratura cerrada correctamente con validación de totales' : (resCierreCuad.message || (resCierreCuad as any).error)
    );

  } catch (err: any) {
    registrarResultado('Cuadratura', 'Flujo completo de Cuadratura', false, err.message);
  }

  // =========================================================================
  // FLUJO 3: RUTAS Y LOGÍSTICA DE DESPACHO
  // =========================================================================
  console.log('\n--- [3] FLUJO DE RUTAS Y LOGÍSTICA ---');
  try {
    // 3.1 Obtener Rutas del Día
    const resRutas = await obtenerRutasPorFechaAction(fechaHoyHabil);
    if (!resRutas.success || !resRutas.rutas || resRutas.rutas.length === 0) {
      throw new Error(resRutas.message || 'No se encontraron rutas para la fecha');
    }
    const ruta = resRutas.rutas[0];
    registrarResultado(
      'Rutas', 
      'Obtener Rutas del Día con Paradas', 
      true, 
      `Ruta: ${ruta.ruta_base.nombre}, Paradas: ${ruta.paradas.length}`
    );

    // 3.2 Actualizar Estado de una Parada
    const primeraParada = ruta.paradas[0];
    if (primeraParada) {
      const resUpdateParada = await actualizarEstadoParadaAction(
        primeraParada.id,
        EstadoParada.ENTREGADO
      );
      registrarResultado(
        'Rutas', 
        'Actualizar Estado de Parada en Ruta', 
        resUpdateParada.success, 
        resUpdateParada.success ? 'Parada actualizada a ENTREGADO' : resUpdateParada.message
      );
    }

    // 3.3 Calendario de Visitas del Mes
    const hoyDate = new Date();
    const resCalendario = await obtenerCalendarioVisitasMesAction(hoyDate.getFullYear(), hoyDate.getMonth() + 1);
    registrarResultado(
      'Rutas', 
      'Calendario Mensual de Visitas', 
      resCalendario.success, 
      `Mes consultado: ${hoyDate.getMonth() + 1}/${hoyDate.getFullYear()}`
    );

  } catch (err: any) {
    registrarResultado('Rutas', 'Flujo de Rutas y Paradas', false, err.message);
  }

  // =========================================================================
  // FLUJO 4: FLOTA, MANTENCIONES Y COMBUSTIBLE
  // =========================================================================
  console.log('\n--- [4] FLUJO DE FLOTA Y VEHÍCULOS ---');
  try {
    // 4.1 Obtener Flota
    const resFlota = await obtenerVehiculosAction();
    if (!resFlota.success || !resFlota.vehiculos || resFlota.vehiculos.length === 0) {
      throw new Error(resFlota.message || 'No se encontraron vehículos');
    }
    const vehiculo = resFlota.vehiculos[0];
    registrarResultado(
      'Flota', 
      'Obtener Flota de Vehículos', 
      true, 
      `Total vehículos: ${resFlota.vehiculos.length}, Ejemplo: ${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.patente})`
    );

    // 4.2 Obtener Choferes
    const resChoferes = await obtenerChoferesAction();
    registrarResultado(
      'Flota', 
      'Obtener Choferes Asignados', 
      resChoferes.success, 
      `Total choferes: ${resChoferes.choferes?.length || 0}`
    );

    // 4.3 Registrar Carga de Combustible
    const resCombustible = await registrarCargaCombustibleAction({
      vehiculo_id: vehiculo.id,
      litros: 42.0,
      monto: 45000,
      kilometraje: vehiculo.kilometraje_actual + 150,
      taller_o_bencinera: 'Shell San Pedro',
      numero_factura: 998877,
      fecha: fechaHoyHabil,
    });
    registrarResultado(
      'Flota', 
      'Registrar Carga de Combustible', 
      resCombustible.success, 
      resCombustible.success ? 'Carga registrada con éxito' : resCombustible.message
    );

  } catch (err: any) {
    registrarResultado('Flota', 'Flujo de Flota y Vehículos', false, err.message);
  }

  // =========================================================================
  // FLUJO 5: PRODUCCIÓN Y MONITOREO DE CO2
  // =========================================================================
  console.log('\n--- [5] FLUJO DE PRODUCCIÓN Y CO2 ---');
  try {
    // 5.1 Obtener Producción del Día
    const resProd = await obtenerProduccionAction(fechaHoyHabil, fechaHoyHabil);
    const prodItem = resProd.produccion?.[0];
    registrarResultado(
      'Producción', 
      'Obtener Registro de Producción del Día', 
      resProd.success && !!prodItem, 
      prodItem ? `20L: ${prodItem.botellon20_cantidad}, 10L: ${prodItem.botellon10_cantidad}, Soda: ${prodItem.sodas_cantidad}, pH: ${prodItem.ph}, PPM: ${prodItem.ppm}` : resProd.message
    );

    // 5.2 Obtener Tubos de CO2
    const resTubos = await obtenerTubosCO2Action();
    registrarResultado(
      'Producción', 
      'Monitoreo de Tubos de CO2 Activos', 
      resTubos.success, 
      `Tubos registrados: ${resTubos.tubos?.length || 0}, Tubo activo: ${resTubos.tubos?.find(t => t.activo)?.peso_kg || 0} kg`
    );

    // 5.3 Obtener Configuración de CO2
    const resConfigCO2 = await obtenerConfiguracionCO2Action();
    const configMap = Object.fromEntries((resConfigCO2.config || []).map((c: any) => [c.clave, c.valor]));
    registrarResultado(
      'Producción', 
      'Parámetros y Rendimientos de CO2', 
      resConfigCO2.success, 
      `Alerta: ${configMap['co2_alerta_porcentaje']}%, Rendimiento 45kg: ${configMap['co2_rendimiento_45kg']} sodas`
    );

  } catch (err: any) {
    registrarResultado('Producción', 'Flujo de Producción y CO2', false, err.message);
  }

  // =========================================================================
  // FLUJO 6: CLIENTES Y DISPENSADORES
  // =========================================================================
  console.log('\n--- [6] FLUJO DE CLIENTES Y DISPENSADORES ---');
  try {
    // 6.1 Comunas y Sectores
    const resComunas = await obtenerComunasConSectoresAction();
    registrarResultado(
      'Clientes', 
      'Catálogo de Comunas y Sectores', 
      resComunas.success, 
      `Comunas: ${resComunas.comunas?.length || 0}`
    );

    // 6.2 Obtener Historial de Cliente
    const primerCliente = await prisma.cliente.findFirst();
    if (primerCliente) {
      const resHistorialCliente = await obtenerHistorialClienteAction(primerCliente.id);
      registrarResultado(
        'Clientes', 
        'Consulta de Historial Financiero y Pedidos de Cliente', 
        resHistorialCliente.success, 
        `Cliente: ${primerCliente.nombre}, Pedidos: ${resHistorialCliente.cliente?.pedidos?.length || 0}`
      );
    }

    // 6.3 Obtener Dispensadores
    const resDispensadores = await obtenerDispensadoresAction();
    registrarResultado(
      'Dispensadores', 
      'Inventario de Dispensadores y Taller', 
      resDispensadores.success, 
      `Total dispensadores: ${resDispensadores.dispensadores?.length || 0}`
    );

  } catch (err: any) {
    registrarResultado('Clientes & Dispensadores', 'Flujo de Clientes y Dispensadores', false, err.message);
  }

  // =========================================================================
  // FLUJO 7: VENTAS Y REPORTES ANUALES
  // =========================================================================
  console.log('\n--- [7] FLUJO DE VENTAS Y REPORTES ---');
  try {
    const anioActual = new Date().getFullYear();
    const resVentasAnio = await obtenerVentasPorAnioAction(anioActual);
    registrarResultado(
      'Ventas', 
      `Reporte Agregado de Ventas Año ${anioActual}`, 
      resVentasAnio.success, 
      resVentasAnio.success ? `Meses con actividad reportados: ${resVentasAnio.mesesData?.length || 0}` : resVentasAnio.message
    );
  } catch (err: any) {
    registrarResultado('Ventas', 'Flujo de Ventas y Reportes', false, err.message);
  }

  // =========================================================================
  // RESUMEN FINAL
  // =========================================================================
  console.log('\n========================================================');
  console.log('📊 RESUMEN DE PRUEBAS AUTOMATIZADAS');
  console.log('========================================================');
  const exitosas = resultados.filter(r => r.exito).length;
  const fallidas = resultados.filter(r => !r.exito).length;
  console.log(`Total Pruebas: ${resultados.length}`);
  console.log(`✅ Exitosas: ${exitosas}`);
  console.log(`❌ Fallidas: ${fallidas}`);

  if (fallidas === 0) {
    console.log('\n🎉 ¡TODOS LOS FLUJOS DE TRABAJO FUERON PROBADOS CON ÉXITO AL 100%!');
  } else {
    console.error('\n⚠️ Hubo pruebas fallidas. Revisar detalles en el reporte anterior.');
    process.exit(1);
  }
}

runTests()
  .catch(err => {
    console.error('Error fatal durante la ejecución de las pruebas:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
