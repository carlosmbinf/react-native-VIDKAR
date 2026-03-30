import ScreenFallback from '../../components/shared/ScreenFallback';

export default function MisTiendasScreen() {
	return (
		<ScreenFallback
			title="MisTiendas"
			legacyPath="components/empresa/screens/MisTiendasScreen.jsx"
			description="Ruta para el listado de tiendas del comercio, alineada al navigator de empresa del legacy."
		/>
	);
}
