'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Truck,
  MapPin,
  Map,
  FileText,
  Package,
  FlaskConical,
  ShieldCheck,
  Building2,
  Droplets,
  LogOut,
  TrendingUp,
  BadgePercent,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  DollarSign,
  Settings,
  Boxes,
  Archive,
  Sparkles,
} from 'lucide-react';
import { logout } from '@/app/(auth)/login/actions';
import ModalAjustesCuenta from './ModalAjustesCuenta';

interface SidebarProps {
  rol: string;
  nombre: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

type NavEntry =
  | { type: 'item'; item: NavItem }
  | { type: 'group'; group: NavGroup };

export default function Sidebar({ rol, nombre }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAjustesOpen, setIsAjustesOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const inicial = (nombre || 'U').charAt(0).toUpperCase();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const isActive = (href: string) =>
    href === '/admin'
      ? pathname === '/admin'
      : pathname === href || pathname.startsWith(`${href}/`);

  // Auto-abrir grupo si algún hijo está activo
  const isGroupActive = (items: NavItem[]) => items.some(i => isActive(i.href));

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isGroupOpen = (label: string, items: NavItem[]) =>
    openGroups[label] !== undefined ? openGroups[label] : isGroupActive(items);

  // ─── Estructura de navegación ────────────────────────────────────────────────
  const nav: NavEntry[] = [
    {
      type: 'item',
      item: { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    },
    {
      type: 'item',
      item: { name: 'Rutas y Despacho', href: '/admin/rutas', icon: MapPin },
    },
    {
      type: 'item',
      item: { name: 'Producción y CO2', href: '/admin/produccion', icon: FlaskConical },
    },

    // ── Comercial ──
    {
      type: 'group',
      group: {
        label: 'Comercial',
        icon: DollarSign,
        items: [
          { name: 'Conciliación',      href: '/admin/conciliacion',  icon: Sparkles     },
          { name: 'Comisiones',        href: '/admin/comisiones',    icon: TrendingUp   },
          { name: 'Cierre de Caja',    href: '/admin/cierre-caja',   icon: Archive      },
          { name: 'Cuadraturas',       href: '/admin/cuadratura',    icon: ClipboardList },
          { name: 'Guías de Despacho', href: '/admin/guias',         icon: FileText     },
        ],
      },
    },

    // ── Clientes & Personal ──
    {
      type: 'group',
      group: {
        label: 'Clientes y Personal',
        icon: Users,
        items: [
          { name: 'Clientes',        href: '/admin/clientes',  icon: Users     },
          { name: 'Fichas Personal', href: '/admin/personal',  icon: UserCheck },
        ],
      },
    },

    // ── Operaciones ──
    {
      type: 'group',
      group: {
        label: 'Operaciones',
        icon: Boxes,
        items: [
          { name: 'Flota',              href: '/admin/flota',       icon: Truck    },
          { name: 'Dispensadores',      href: '/admin/dispensadores', icon: Droplets },
          { name: 'Rutas Base',         href: '/admin/rutas-base',  icon: Map      },
          { name: 'Catálogo Productos', href: '/admin/productos',   icon: Package  },
        ],
      },
    },

    // ── Administración (solo ADMIN) ──
    ...(rol === 'ADMIN'
      ? [
          {
            type: 'group' as const,
            group: {
              label: 'Administración',
              icon: Settings,
              items: [
                { name: 'Roles',    href: '/admin/roles',    icon: ShieldCheck },
                { name: 'Sectores', href: '/admin/sectores', icon: Building2   },
              ],
            },
          },
        ]
      : []),
  ];

  // ─── Estilos ─────────────────────────────────────────────────────────────────
  const linkBase =
    'flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-xl transition-colors';
  const linkActive = { backgroundColor: 'white', color: '#013299' };
  const linkIdle = { backgroundColor: 'transparent', color: 'rgba(219,234,254,0.9)' };
  const linkHoverOn = { backgroundColor: 'rgba(255,255,255,0.12)', color: 'white' };

  return (
    <aside
      className={`flex flex-col flex-shrink-0 z-20 min-h-screen transition-all duration-300 relative ${
        isCollapsed ? 'w-[68px]' : 'w-64'
      }`}
      style={{ backgroundColor: '#013299' }}
    >
      {/* ── Botón colapsar ── */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
        className="absolute -right-3 top-5 bg-white text-[#013299] p-1 rounded-full border border-slate-200 shadow-md hover:scale-110 transition-transform z-30"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* ── Logo ── */}
      <div
        className="h-16 flex items-center px-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}
      >
        {!isCollapsed ? (
          <span className="text-lg font-black text-white tracking-tight">
            SIGO <span className="font-light text-blue-200 text-sm">Sodatal</span>
          </span>
        ) : (
          <span className="font-black text-white text-base tracking-tighter mx-auto">
            S<span className="text-blue-300">S</span>
          </span>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {nav.map((entry, idx) => {
          if (entry.type === 'item') {
            const { item } = entry;
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                title={isCollapsed ? item.name : undefined}
                className={`${linkBase} ${isCollapsed ? 'justify-center' : ''}`}
                style={active ? linkActive : linkIdle}
                onMouseEnter={e => {
                  if (!active) Object.assign((e.currentTarget as HTMLElement).style, linkHoverOn);
                }}
                onMouseLeave={e => {
                  if (!active) Object.assign((e.currentTarget as HTMLElement).style, linkIdle);
                }}
              >
                <Icon
                  className="h-4 w-4 shrink-0"
                  style={{ color: active ? '#013299' : 'rgba(191,219,254,0.85)' }}
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          }

          // ── Grupo ──
          const { group } = entry;
          const GroupIcon = group.icon;
          const groupActive = isGroupActive(group.items);
          const open = isGroupOpen(group.label, group.items);

          return (
            <div key={group.label} className="pt-1">
              {/* Separador visual */}
              {!isCollapsed && (
                <div
                  className="mx-1 mb-1 mt-2"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
                />
              )}

              {/* Header del grupo */}
              <button
                onClick={() => !isCollapsed && toggleGroup(group.label)}
                title={isCollapsed ? group.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left ${
                  isCollapsed ? 'justify-center' : 'justify-between'
                }`}
                style={{
                  color: groupActive ? 'white' : 'rgba(147,197,253,0.7)',
                  cursor: isCollapsed ? 'default' : 'pointer',
                }}
              >
                <div className="flex items-center gap-3">
                  <GroupIcon
                    className="h-4 w-4 shrink-0"
                    style={{ color: groupActive ? 'rgba(191,219,254,1)' : 'rgba(147,197,253,0.6)' }}
                  />
                  {!isCollapsed && (
                    <span className="text-[11px] font-black uppercase tracking-widest truncate">
                      {group.label}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                      open ? 'rotate-180' : ''
                    }`}
                    style={{ color: 'rgba(147,197,253,0.6)' }}
                  />
                )}
              </button>

              {/* Items del grupo */}
              {(open || isCollapsed) && (
                <div className={`space-y-0.5 ${!isCollapsed ? 'pl-3' : ''}`}>
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={false}
                        title={isCollapsed ? item.name : undefined}
                        className={`${linkBase} ${isCollapsed ? 'justify-center' : ''}`}
                        style={active ? linkActive : linkIdle}
                        onMouseEnter={e => {
                          if (!active) Object.assign((e.currentTarget as HTMLElement).style, linkHoverOn);
                        }}
                        onMouseLeave={e => {
                          if (!active) Object.assign((e.currentTarget as HTMLElement).style, linkIdle);
                        }}
                      >
                        <Icon
                          className="h-4 w-4 shrink-0"
                          style={{ color: active ? '#013299' : 'rgba(191,219,254,0.75)' }}
                        />
                        {!isCollapsed && <span className="truncate">{item.name}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Perfil y salir (Menú desplegable) ── */}
      <div
        ref={userMenuRef}
        className="p-2.5 flex flex-col gap-1.5 flex-shrink-0 relative"
        style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
      >
        {/* Menú desplegable flotante */}
        {isUserMenuOpen && (
          <div
            className={`absolute z-50 bg-[#001f5c] border border-white/20 shadow-2xl rounded-2xl p-2 text-white backdrop-blur-md animate-in fade-in duration-150 ${
              isCollapsed
                ? 'bottom-2 left-16 w-60'
                : 'bottom-full left-2 right-2 mb-2'
            }`}
          >
            {/* Cabecera del usuario en el menú */}
            <div className="p-2 flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white border-2 shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.35)' }}
              >
                {inicial}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">{nombre}</span>
                <span className="text-[10px] font-semibold text-blue-200 uppercase tracking-wider">{rol}</span>
              </div>
            </div>

            <div className="my-1.5 border-t border-white/10" />

            {/* Opción Ajustes de la cuenta */}
            <button
              type="button"
              onClick={() => {
                setIsUserMenuOpen(false);
                setIsAjustesOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-100 hover:text-white hover:bg-white/10 transition-colors text-left group"
            >
              <Settings className="w-4 h-4 text-blue-300 group-hover:rotate-45 transition-transform" />
              <span>Ajustes de la cuenta</span>
            </button>

            {/* Opción Cerrar sesión */}
            <form action={logout} className="w-full">
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 transition-colors text-left group"
              >
                <LogOut className="w-4 h-4 text-rose-400 group-hover:-translate-x-0.5 transition-transform" />
                <span>Cerrar sesión</span>
              </button>
            </form>
          </div>
        )}

        {/* Botón trigger del usuario */}
        <button
          type="button"
          onClick={() => setIsUserMenuOpen(prev => !prev)}
          title={isCollapsed ? `${nombre} (${rol}) - Ajustes` : undefined}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center' : 'justify-between'
          } p-1.5 rounded-xl hover:bg-white/10 transition-all text-left group ${
            isUserMenuOpen ? 'bg-white/15 ring-1 ring-white/30' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white border-2 shrink-0 group-hover:scale-105 transition-transform"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.35)' }}
            >
              {inicial}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-xs font-bold text-white truncate">{nombre}</span>
                <span className="text-[10px] font-medium text-blue-200 uppercase">{rol}</span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <ChevronUp
              className={`h-4 w-4 text-blue-200 transition-transform duration-200 shrink-0 ${
                isUserMenuOpen ? 'rotate-180 text-white' : 'opacity-70 group-hover:opacity-100'
              }`}
            />
          )}
        </button>

        {!isCollapsed && (
          <div className="text-[10px] text-center pt-0.5" style={{ color: 'rgba(147,197,253,0.7)' }}>
            SIGO v1.2.9
          </div>
        )}
      </div>

      {/* Modal de Ajustes Personales */}
      <ModalAjustesCuenta
        isOpen={isAjustesOpen}
        onClose={() => setIsAjustesOpen(false)}
        nombreActual={nombre}
        rolActual={rol}
      />
    </aside>
  );
}