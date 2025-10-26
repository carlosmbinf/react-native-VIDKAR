import Meteor from '@meteorrn/core';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Alert, Platform } from 'react-native';
import { appleAuth } from '@invertase/react-native-apple-authentication';

/**
 * Decodificar JWT sin verificar firma (solo para extraer payload)
 * @param {string} token JWT token
 * @returns {object|null} Payload decodificado o null si hay error
 */
const decodeJWT = (token) => {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) return null;
		
		// Decodificar base64url
		const payload = parts[1];
		// Agregar padding si es necesario
		const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
		const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
		return JSON.parse(decoded);
	} catch (error) {
		console.error('Error decodificando JWT:', error);
		return null;
	}
};

/**
 * Login with Google using Meteor Accounts and React Native
 * @param configuration Options for the configure method of GoogleSignin.
 * @param callback function to see if there is error
 * @returns {Promise<void> | Promise.Promise}
 */
const loginWithGoogle = async function(configuration, callback) {
	try {
		await GoogleSignin.configure(configuration);
		await GoogleSignin.hasPlayServices({
			showPlayServicesUpdateDialog: true
		});
		let userInfo;
		var isSignedIn = await GoogleSignin.isSignedIn();


		if (!isSignedIn) {
			userInfo = await GoogleSignin.signIn();
			if (!userInfo) {
				callback({ reason: 'Algo salió mal al obtener la información del usuario', details: { userInfo } });
				return;
			}
		} else {
			userInfo = await GoogleSignin.signInSilently();
			if (!userInfo) {
				callback({ reason: 'Algo salió mal al obtener la información del usuario', details: { userInfo } });
				return;
			}
		}
		const tokens = await GoogleSignin.getTokens();
		await Meteor._startLoggingIn();
		await Meteor.call(
			'login',
			{
				googleSignIn: true,
				accessToken: tokens.accessToken,
				refreshToken: undefined,
				idToken: tokens.idToken,
				serverAuthCode: userInfo.serverAuthCode,
				email: userInfo.user.email,
				imageUrl: userInfo.user.photo,
				userId: userInfo.user.id
			},
			(error, response) => {
				if (error) {
					GoogleSignin.revokeAccess();
					GoogleSignin.signOut();
				}
				Meteor._endLoggingIn();
				Meteor._handleLoginCallback(error, response);
				typeof callback == 'function' && callback(error);
			}
		);
	} catch (error) {
		console.error(error);
		callback({ reason: 'No se pudo iniciar session con google, por favor inicie session con Usuario y contraseña', details: { error } });
	}
};

const logoutFromGoogle = function() {
		Meteor.logout((error) => {
			if (!error) {
				GoogleSignin.revokeAccess();
				GoogleSignin.signOut();
			}else{
				console.error('Error during Google logout:', error);
			}
		});
};

/**
 * Login with Apple using Meteor Accounts and React Native
 * @param callback function to see if there is error
 * @returns {Promise<void> | Promise.Promise}
 */
const loginWithApple = async function(callback) {
	try {
		// Solo funciona en iOS
		if (Platform.OS !== 'ios') {
			callback({ reason: 'Apple Login solo está disponible en dispositivos iOS' });
			return;
		}

		// Realizar la autenticación con Apple
		const appleAuthRequestResponse = await appleAuth.performRequest({
			requestedOperation: appleAuth.Operation.LOGIN,
			// Importante: FULL_NAME debe ir primero según la documentación
			requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
		});

		console.log('Apple Auth Response completo:', JSON.stringify(appleAuthRequestResponse, null, 2));

		// Verificar el estado de las credenciales
		const credentialState = await appleAuth.getCredentialStateForUser(appleAuthRequestResponse.user);
		console.log('Apple credential state:', credentialState);

		if (credentialState === appleAuth.State.AUTHORIZED) {
			// IMPORTANTE: Apple solo devuelve email y fullName en el PRIMER login
			// En logins subsecuentes, estos campos son null y deben extraerse del identityToken
			let email = appleAuthRequestResponse.email;
			let fullName = appleAuthRequestResponse.fullName;
			
			console.log('Email directo de Apple:', email);
			console.log('FullName directo de Apple:', fullName ? JSON.stringify(fullName) : 'null');
			
			// Siempre intentar extraer datos del identityToken como respaldo
			if (appleAuthRequestResponse.identityToken) {
				console.log('Extrayendo datos del identityToken...');
				const payload = decodeJWT(appleAuthRequestResponse.identityToken);
				if (payload) {
					console.log('Payload completo del token:', JSON.stringify(payload, null, 2));
					
					// Usar email del token si no hay email directo
					if (!email && payload.email) {
						email = payload.email;
						console.log('✅ Email extraído del token:', email);
					}
					
					// También verificar el subject (sub) que siempre debería estar presente
					console.log('Subject del token (user ID):', payload.sub);
				}
			} else {
				console.warn('⚠️ No hay identityToken disponible');
			}

		if (credentialState === appleAuth.State.AUTHORIZED) {
			// Extraer el email del identityToken si no viene directamente
			let email = appleAuthRequestResponse.email;
			let fullName = appleAuthRequestResponse.fullName;
			
			console.log('Email directo de Apple:', email);
			console.log('FullName directo de Apple:', fullName);
			
			// Si no hay email directo, intentar extraerlo del identityToken
			if (!email && appleAuthRequestResponse.identityToken) {
				console.log('Intentando extraer email del identityToken...');
				const payload = decodeJWT(appleAuthRequestResponse.identityToken);
				if (payload) {
					email = payload.email;
					console.log('Payload del token:', payload);
					console.log('Email extraído del token:', email);
				}
			}

			// Formatear fullName si existe
			let displayName = null;
			if (fullName && fullName.givenName) {
				displayName = `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim();
			}

			// Estructura similar a Google Login
			const data = {
				appleSignIn: true,
				// Campos equivalentes a Google
				accessToken: appleAuthRequestResponse.authorizationCode, // Similar al accessToken de Google
				idToken: appleAuthRequestResponse.identityToken, // Similar al idToken de Google
				email: email, // Email del usuario
				userId: appleAuthRequestResponse.user, // ID único del usuario
				imageUrl: null, // Apple no proporciona imagen
				displayName: displayName, // Nombre completo formateado
				// Campos específicos de Apple
				user: appleAuthRequestResponse.user,
				fullName: fullName,
				identityToken: appleAuthRequestResponse.identityToken,
				authorizationCode: appleAuthRequestResponse.authorizationCode,
				realUserStatus: appleAuthRequestResponse.realUserStatus,
			};

			console.log('Datos finales a enviar al servidor:', JSON.stringify(data, null, 2));

			await Meteor._startLoggingIn();
			await Meteor.call(
				'login',
				data,
				(error, response) => {
					Meteor._endLoggingIn();
					Meteor._handleLoginCallback(error, response);
					typeof callback == 'function' && callback(error);
				}
			);
		} else {
			callback({ reason: 'Autorización de Apple denegada' });
		}
	} catch (error) {
		console.error('Apple Login error:', error);
		if (error.code === appleAuth.Error.CANCELED) {
			// Usuario canceló el proceso
			callback({ reason: 'Proceso de Apple Login cancelado por el usuario' });
		} else {
			callback({ reason: 'No se pudo iniciar sesión con Apple', details: { error } });
		}
	}
};

const logoutFromApple = function() {
	// Apple no tiene un método de logout específico como Google
	// Solo se necesita limpiar la sesión de Meteor
	Meteor.logout((error) => {
		if (error) {
			console.error('Error during Apple logout:', error);
		}
	});
};

export { loginWithGoogle, logoutFromGoogle, loginWithApple, logoutFromApple };
