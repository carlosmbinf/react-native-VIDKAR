import ScreenFallback from '../shared/ScreenFallback';

export default function UsersHomeFallback() {
	return (
		<ScreenFallback
			title="Users"
			legacyPath="components/users/UsersHome.js"
			description="La lista de usuarios ya quedó enlazada en nativo mediante UsersHome.native.js. Este archivo sigue como fallback seguro para web."
		/>
	);
}
