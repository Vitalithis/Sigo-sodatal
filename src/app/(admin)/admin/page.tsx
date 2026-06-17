import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export default async function AdminPage() {
  
  // 1. Traemos todos los productos existentes de Supabase para mostrarlos abajo
  const productos = await prisma.producto.findMany({
    orderBy: {
      nombre: 'asc'
    }
  });

  // 2. Server Action para crear el producto
  async function crearProducto(formData: FormData) {
    'use server';

    try {
      const nombre = formData.get('nombre') as string;
      const categoria = formData.get('categoria') as any; 
      const precio_venta_nueva = Number(formData.get('precio_venta_nueva')) || 0;
      const precio_recarga_raw = formData.get('precio_recarga');
      const precio_recarga = precio_recarga_raw ? Number(precio_recarga_raw) : null;
      const stock_minimo = Number(formData.get('stock_minimo')) || 0;
      const activo = formData.get('activo') === 'true' || formData.get('activo') === 'on';

      if (!nombre || !categoria) {
        throw new Error("El nombre y la categoría son obligatorios.");
      }

      await prisma.producto.create({
        data: {
          nombre,
          categoria,
          precio_venta_nueva,
          precio_recarga,
          stock_minimo,
          activo,
        },
      });

      // Refresca la página y actualiza la lista de abajo en tiempo real
      revalidatePath('/admin');

    } catch (error: any) {
      console.error("Error al guardar producto:", error);
      throw new Error(`Error en la base de datos: ${error?.message || 'Error desconocido'}`);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10 mt-6">
      
      {/* SECCIÓN DEL FORMULARIO */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Agregar Nuevo Producto</h1>
        <p className="text-xs text-gray-500 mb-4">Al presionar guardar, verás el producto reflejado en la lista inferior inmediatamente.</p>
        
        {/* Usamos una clave condicional (key) basada en la cantidad de productos para forzar al formulario a resetearse tras guardar */}
        <form key={productos.length} action={crearProducto} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre del Producto</label>
            <input 
              type="text" 
              name="nombre" 
              placeholder="Ej: Botellón 20 Litros Premium"
              required 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Categoría</label>
            <select 
              name="categoria" 
              required 
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border font-mono"
            >
              <option value="">Selecciona una categoría válida</option>
              <option value="BOTELLON10">Botellón 10 Litros (BOTELLON10)</option>
              <option value="BOTELLON20">Botellón 20 Litros (BOTELLON20)</option>
              <option value="SODA">Soda / Sifón (SODA)</option>
              <option value="OTRO">Otro / Accesorios (OTRO)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Precio Venta Nueva</label>
              <input 
                type="number" 
                name="precio_venta_nueva" 
                placeholder="9000"
                required 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Precio Recarga (Opcional)</label>
              <input 
                type="number" 
                name="precio_recarga" 
                placeholder="Ej: 4000"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Stock Mínimo</label>
            <input 
              type="number" 
              name="stock_minimo" 
              defaultValue="10"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            />
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              name="activo" 
              defaultChecked 
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label className="text-sm font-medium text-gray-700">Producto Activo</label>
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 font-bold transition shadow-sm"
          >
            Guardar Producto
          </button>
        </form>
      </div>

      {/* SECCIÓN DEL CATÁLOGO ACTUAL EN TIEMPO REAL */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📦 Productos en Supabase ({productos.length})</h2>
        
        {productos.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No hay productos registrados aún en la base de datos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-bold">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Precio Venta</th>
                  <th className="px-4 py-3">Precio Recarga</th>
                  <th className="px-4 py-3">Stock Mín.</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-600">
                {productos.map((prod) => (
                  <tr key={prod.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{prod.nombre}</td>
                    <td className="px-4 py-3 font-mono text-xs"><span className="px-2 py-0.5 bg-gray-100 rounded border">{prod.categoria}</span></td>
                    <td className="px-4 py-3">${prod.precio_venta_nueva.toLocaleString()}</td>
                    <td className="px-4 py-3">{prod.precio_recarga ? `$${prod.precio_recarga.toLocaleString()}` : '-'}</td>
                    <td className="px-4 py-3">{prod.stock_minimo}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${prod.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {prod.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}