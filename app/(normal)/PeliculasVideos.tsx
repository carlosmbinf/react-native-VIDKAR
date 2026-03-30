import ScreenFallback from '../../components/shared/ScreenFallback';

export default function PeliculasVideosScreen() {
	return (
		<ScreenFallback
			title="Pelis y Series"
			legacyPath="components/downloadVideos"
			description="Ruta espejo reservada para el catálogo audiovisual del drawer legacy."
		/>
	);
}