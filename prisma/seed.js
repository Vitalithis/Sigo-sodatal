"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var generated_1 = require("../lib/prisma/generated");
var prisma = new generated_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var configs, _i, configs_1, cfg, comunaSanPedro, comunaConce, sectorAndalue, sectorCentro, prodBotellon20, prodBotellon10, prodSoda, camion1, camion2, authUserAdmin, usuarioAdmin, authUserRepartidor, repartidor, cliente1, cliente2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🌱 Iniciando la población completa de la base de datos (Seed)...');
                    configs = [
                        { clave: 'co2_alerta_porcentaje', valor: '20' },
                        { clave: 'co2_rendimiento_45kg', valor: '3000' },
                        { clave: 'co2_rendimiento_35kg', valor: '2300' },
                    ];
                    _i = 0, configs_1 = configs;
                    _a.label = 1;
                case 1:
                    if (!(_i < configs_1.length)) return [3 /*break*/, 4];
                    cfg = configs_1[_i];
                    return [4 /*yield*/, prisma.configuracion.upsert({
                            where: { clave: cfg.clave },
                            update: {},
                            create: cfg,
                        })];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    console.log('✅ Configuración inicial creada.');
                    return [4 /*yield*/, prisma.comuna.upsert({
                            where: { nombre: 'San Pedro de la Paz' },
                            update: {},
                            create: {
                                nombre: 'San Pedro de la Paz',
                                activa: true,
                                sectores: {
                                    create: [
                                        { nombre: 'Andalué' },
                                        { nombre: 'Huertos Familiares' },
                                        { nombre: 'San Pedro del Valle' },
                                        { nombre: 'Michaihue' },
                                    ],
                                },
                            },
                        })];
                case 5:
                    comunaSanPedro = _a.sent();
                    return [4 /*yield*/, prisma.comuna.upsert({
                            where: { nombre: 'Concepción' },
                            update: {},
                            create: {
                                nombre: 'Concepción',
                                activa: true,
                                sectores: {
                                    create: [
                                        { nombre: 'Centro' },
                                        { nombre: 'Barrio Universitario' },
                                        { nombre: 'Lomas de San Andrés' },
                                    ],
                                },
                            },
                        })];
                case 6:
                    comunaConce = _a.sent();
                    return [4 /*yield*/, prisma.sector.findFirst({ where: { nombre: 'Andalué' } })];
                case 7:
                    sectorAndalue = _a.sent();
                    return [4 /*yield*/, prisma.sector.findFirst({ where: { nombre: 'Centro' } })];
                case 8:
                    sectorCentro = _a.sent();
                    console.log('✅ Comunas y Sectores creados.');
                    return [4 /*yield*/, prisma.producto.upsert({
                            where: { id: 'prod-botellon-20l' },
                            update: {},
                            create: {
                                id: 'prod-botellon-20l',
                                nombre: 'Botellón 20 Litros',
                                categoria: generated_1.CategoriaProducto.BOTELLON20,
                                precio_venta_nueva: 6000,
                                precio_recarga: 3000,
                                stock_minimo: 50,
                                activo: true,
                                stock_fabrica: {
                                    create: { cantidad: 200 }
                                }
                            },
                        })];
                case 9:
                    prodBotellon20 = _a.sent();
                    return [4 /*yield*/, prisma.producto.upsert({
                            where: { id: 'prod-botellon-10l' },
                            update: {},
                            create: {
                                id: 'prod-botellon-10l',
                                nombre: 'Botellón 10 Litros',
                                categoria: generated_1.CategoriaProducto.BOTELLON10,
                                precio_venta_nueva: 4500,
                                precio_recarga: 2000,
                                stock_minimo: 30,
                                activo: true,
                                stock_fabrica: {
                                    create: { cantidad: 150 }
                                }
                            },
                        })];
                case 10:
                    prodBotellon10 = _a.sent();
                    return [4 /*yield*/, prisma.producto.upsert({
                            where: { id: 'prod-soda' },
                            update: {},
                            create: {
                                id: 'prod-soda',
                                nombre: 'Sifón Soda 1.5L',
                                categoria: generated_1.CategoriaProducto.SODA,
                                precio_venta_nueva: 1500,
                                precio_recarga: 1500,
                                stock_minimo: 100,
                                activo: true,
                                stock_fabrica: {
                                    create: { cantidad: 300 }
                                }
                            },
                        })];
                case 11:
                    prodSoda = _a.sent();
                    console.log('✅ Productos y Stock de Fábrica creados.');
                    return [4 /*yield*/, prisma.vehiculo.upsert({
                            where: { patente: 'AB-CD-12' },
                            update: {},
                            create: {
                                patente: 'AB-CD-12',
                                marca: 'Kia',
                                modelo: 'Frontier',
                                anio: 2020,
                                kilometraje_actual: 85000,
                                estado: generated_1.EstadoVehiculo.ACTIVO,
                            },
                        })];
                case 12:
                    camion1 = _a.sent();
                    return [4 /*yield*/, prisma.vehiculo.upsert({
                            where: { patente: 'XY-ZW-34' },
                            update: {},
                            create: {
                                patente: 'XY-ZW-34',
                                marca: 'Hyundai',
                                modelo: 'Porter',
                                anio: 2022,
                                kilometraje_actual: 32000,
                                estado: generated_1.EstadoVehiculo.ACTIVO,
                            },
                        })];
                case 13:
                    camion2 = _a.sent();
                    console.log('✅ Vehículos de la flota creados.');
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'docampo@ing.ucsc.cl' },
                            update: {},
                            create: {
                                id: 'user-admin-id-01',
                                name: 'Dan Ocampo',
                                email: 'docampo@ing.ucsc.cl',
                                emailVerified: true,
                                rut: '19906083-k',
                            },
                        })];
                case 14:
                    authUserAdmin = _a.sent();
                    return [4 /*yield*/, prisma.usuario.upsert({
                            where: { email: 'docampo@ing.ucsc.cl' },
                            update: {},
                            create: {
                                id: 'usuario-admin-id-01',
                                user_id: authUserAdmin.id,
                                rut: '19906083-k',
                                nombre: 'Dan',
                                apellido: 'Ocampo',
                                telefono: '+56999999999',
                                email: 'docampo@ing.ucsc.cl',
                                rol: generated_1.Rol.ADMIN,
                                fecha_ingreso: new Date('2023-01-01'),
                                activo: true,
                            },
                        })];
                case 15:
                    usuarioAdmin = _a.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'repartidor@sodatal.cl' },
                            update: {},
                            create: {
                                id: 'user-repartidor-id-02',
                                name: 'Carlos Soto',
                                email: 'repartidor@sodatal.cl',
                                emailVerified: true,
                                rut: '15111222-3',
                            },
                        })];
                case 16:
                    authUserRepartidor = _a.sent();
                    return [4 /*yield*/, prisma.usuario.upsert({
                            where: { email: 'repartidor@sodatal.cl' },
                            update: {},
                            create: {
                                id: 'usuario-repartidor-id-02',
                                user_id: authUserRepartidor.id,
                                rut: '15111222-3',
                                nombre: 'Carlos',
                                apellido: 'Soto',
                                telefono: '+56911112222',
                                email: 'repartidor@sodatal.cl',
                                rol: generated_1.Rol.REPARTIDOR,
                                vehiculo_id: camion1.id,
                                fecha_ingreso: new Date('2024-01-15'),
                                activo: true,
                                licencia_tipo: 'B',
                                recibe_comision: true,
                            },
                        })];
                case 17:
                    repartidor = _a.sent();
                    console.log('✅ Usuarios del staff y credenciales Auth sincronizados.');
                    return [4 /*yield*/, prisma.cliente.upsert({
                            where: { id: 'cliente-domicilio-1' },
                            update: {},
                            create: {
                                id: 'cliente-domicilio-1',
                                nombre: 'María Teresa Ruiz',
                                tipo: generated_1.TipoCliente.DOMICILIO,
                                direccion: 'Av. El Venado 1234, Condominio Los Robles',
                                telefono: '+56988887777',
                                email: 'mruiz@ejemplo.cl',
                                preferencia_factura: generated_1.PreferenciaFacturacion.BOLETA,
                                modalidad_pago: generated_1.ModalidadPago.INMEDIATO,
                                tipo_ruta: generated_1.TipoRuta.FIJO,
                                botellones_prestados: 2,
                                sector_id: sectorAndalue === null || sectorAndalue === void 0 ? void 0 : sectorAndalue.id,
                                notas: 'Llamar a conserjería al llegar',
                                activo: true,
                            },
                        })];
                case 18:
                    cliente1 = _a.sent();
                    return [4 /*yield*/, prisma.cliente.upsert({
                            where: { id: 'cliente-empresa-1' },
                            update: {},
                            create: {
                                id: 'cliente-empresa-1',
                                nombre: 'Constructora BioBío SpA',
                                tipo: generated_1.TipoCliente.EMPRESA,
                                rut_empresa: '76.555.444-3',
                                giro: 'Construcción',
                                direccion: 'Caupolicán 550, Oficina 402',
                                telefono: '+56412223333',
                                email: 'compras@constructorabiobio.cl',
                                preferencia_factura: generated_1.PreferenciaFacturacion.FACTURA,
                                modalidad_pago: generated_1.ModalidadPago.MENSUAL,
                                tipo_ruta: generated_1.TipoRuta.LLAMADO,
                                botellones_prestados: 5,
                                sector_id: sectorCentro === null || sectorCentro === void 0 ? void 0 : sectorCentro.id,
                                activo: true,
                            },
                        })];
                case 19:
                    cliente2 = _a.sent();
                    console.log('✅ Clientes creados.');
                    // =========================================================
                    // 7. CREAR DISPENSADORES Y EQUIPOS DE REEMPLAZO
                    // =========================================================
                    return [4 /*yield*/, prisma.dispensador.upsert({
                            where: { numero_serie: 'SN-AQUALINE-001' },
                            update: {},
                            create: {
                                cliente_id: cliente2.id,
                                marca: 'AquaLine',
                                modelo: 'Frío/Caliente Piso',
                                numero_serie: 'SN-AQUALINE-001',
                                estado: generated_1.EstadoDispensador.EN_CLIENTE,
                                precio_arriendo: 15000,
                            },
                        })];
                case 20:
                    // =========================================================
                    // 7. CREAR DISPENSADORES Y EQUIPOS DE REEMPLAZO
                    // =========================================================
                    _a.sent();
                    return [4 /*yield*/, prisma.maquinaReemplazo.create({
                            data: {
                                marca: 'Midea',
                                modelo: 'Sobremesa Standard',
                                estado: 'DISPONIBLE',
                            },
                        })];
                case 21:
                    _a.sent();
                    console.log('✅ Dispensadores y máquinas de reemplazo configurados.');
                    if (!sectorAndalue) return [3 /*break*/, 23];
                    return [4 /*yield*/, prisma.rutaBase.create({
                            data: {
                                nombre: 'Ruta Troncal Lunes - Andalué',
                                dia_semana: generated_1.DiaSemana.LUNES,
                                usuario_id: repartidor.id,
                                vehiculo_id: camion1.id,
                                frecuencia: 'SEMANAL',
                                clientes: {
                                    create: [
                                        {
                                            cliente_id: cliente1.id,
                                            orden: 1,
                                            bot20_default: 2,
                                            bot10_default: 1,
                                            soda_default: 0,
                                        }
                                    ]
                                },
                                sectores: {
                                    create: [
                                        { sector_id: sectorAndalue.id }
                                    ]
                                }
                            },
                        })];
                case 22:
                    _a.sent();
                    _a.label = 23;
                case 23:
                    console.log('✅ Rutas Base configuradas.');
                    // =========================================================
                    // 9. INVENTARIO ADICIONAL Y FABRICA (Tubo de CO2 activo)
                    // =========================================================
                    return [4 /*yield*/, prisma.stockCamion.upsert({
                            where: {
                                usuario_id_producto_id: {
                                    usuario_id: repartidor.id,
                                    producto_id: prodBotellon20.id,
                                }
                            },
                            update: {},
                            create: {
                                usuario_id: repartidor.id,
                                producto_id: prodBotellon20.id,
                                cantidad: 30,
                            },
                        })];
                case 24:
                    // =========================================================
                    // 9. INVENTARIO ADICIONAL Y FABRICA (Tubo de CO2 activo)
                    // =========================================================
                    _a.sent();
                    return [4 /*yield*/, prisma.tuboCO2.create({
                            data: {
                                fecha_llegada: new Date(),
                                peso_kg: 45,
                                rendimiento_estimado: 3000,
                                activo: true,
                            },
                        })];
                case 25:
                    _a.sent();
                    console.log('✅ Stock en camión y Tubo de CO₂ inicial agregados.');
                    console.log('🌳 ¡Seed completado y sincronizado exitosamente con el esquema!');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error('❌ Error ejecutando el seed:', e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
