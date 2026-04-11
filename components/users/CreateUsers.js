import ScreenFallback from '../shared/ScreenFallback';

export default function CreateUsersFallback() {
	return (
		<ScreenFallback
			title="CreateUsers"
			legacyPath="components/users/CreateUsers.js"
			description="La creación de usuarios ya está migrada para nativo. Este archivo queda como fallback seguro para web."
		/>
	);
}
