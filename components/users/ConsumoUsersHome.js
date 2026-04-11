import ScreenFallback from '../shared/ScreenFallback';

export default function ConsumoUsersHomeFallback() {
	return (
		<ScreenFallback
			title="ConsumoUsersHome"
			legacyPath="components/users/ConsumoUsersHome.js"
			description="La pantalla nativa de consumo de usuarios ya fue migrada. Este fallback evita cargar Meteor nativo en web."
		/>
	);
}
