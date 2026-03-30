import ScreenFallback from '../../components/shared/ScreenFallback';

export default function AllMensajesUserScreen() {
	return (
		<ScreenFallback
			title="Mensajes de usuarios"
			legacyPath="components/mensajes"
			description="Ruta administrativa reservada para la bandeja global de mensajes de usuarios."
		/>
	);
}