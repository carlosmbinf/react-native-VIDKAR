import ScreenFallback from '../shared/ScreenFallback';

export default function UserDetailsFallback() {
	return (
		<ScreenFallback
			title="UserDetails"
			legacyPath="components/users/UserDetails.js"
			description="La implementación nativa del detalle de usuario ya fue migrada en Expo. Este fallback se mantiene para web y previews donde Meteor nativo no debe cargarse."
		/>
	);
}
