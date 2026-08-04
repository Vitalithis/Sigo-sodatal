import { obtenerRepartidoresCuadraturaAction, obtenerProductosCuadraturaAction } from './actions';
import CuadraturaApp from './components/CuadraturaApp';

export default async function CuadraturaPage() {
  const [repartidoresRes, productosRes] = await Promise.all([
    obtenerRepartidoresCuadraturaAction(),
    obtenerProductosCuadraturaAction(),
  ]);

  return (
    <CuadraturaApp
      repartidores={repartidoresRes.repartidores ?? []}
      productos={productosRes.productos ?? []}
    />
  );
}