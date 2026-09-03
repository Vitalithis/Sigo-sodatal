import { 
  obtenerRepartidoresCuadraturaAction, 
  obtenerProductosCuadraturaAction,
  obtenerCuadraturasAction
} from './actions';
import CuadraturaApp from './components/CuadraturaApp';

export default async function CuadraturaPage() {
  const [repartidoresRes, productosRes, cuadraturasRes] = await Promise.all([
    obtenerRepartidoresCuadraturaAction(),
    obtenerProductosCuadraturaAction(),
    obtenerCuadraturasAction() // 👈 Nueva consulta para poblar la tabla
  ]);

  return (
    <CuadraturaApp
      repartidores={repartidoresRes.repartidores ?? []}
      productos={productosRes.productos ?? []}
      historial={cuadraturasRes.cuadraturas ?? []}
    />
  );
}
