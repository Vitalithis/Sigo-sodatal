import { 
  obtenerRepartidoresCuadraturaAction, 
  obtenerProductosCuadraturaAction,
  obtenerCuadraturasAction
} from './actions';
import CuadraturaApp from './components/CuadraturaApp';

export const metadata = {
  title: 'Cuadraturas de Caja - SIGO Sodatal',
  description: 'Control de carga de camiones, kilometraje, retorno y cierre diario de caja.',
};

export default async function CuadraturaPage() {
  const [repartidoresRes, productosRes, cuadraturasRes] = await Promise.all([
    obtenerRepartidoresCuadraturaAction(),
    obtenerProductosCuadraturaAction(),
    obtenerCuadraturasAction()
  ]);

  return (
    <div className="space-y-6 pb-12">
      <CuadraturaApp
        repartidores={repartidoresRes.repartidores ?? []}
        productos={productosRes.productos ?? []}
        historial={cuadraturasRes.cuadraturas ?? []}
      />
    </div>
  );
}
