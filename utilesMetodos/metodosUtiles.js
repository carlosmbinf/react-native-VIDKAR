import Meteor,{Accounts} from '@meteorrn/core';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Alert, Platform } from 'react-native';
import { appleAuth } from '@invertase/react-native-apple-authentication';

/**
 * Login with Google using Meteor Accounts and React Native
 * @param {Object} configuration - Options for the configure method of GoogleSignin
 * @param {Function} callback - Callback function to handle errors
 * @returns {Promise<void>}
 */
export const loginWithGoogle = async function(configuration, callback) {
	try {
		await GoogleSignin.configure(configuration);
		await GoogleSignin.hasPlayServices({
			showPlayServicesUpdateDialog: true
		});
		
		let userInfo;
		const isSignedIn = await GoogleSignin.isSignedIn();

		if (!isSignedIn) {
			userInfo = await GoogleSignin.signIn();
			if (!userInfo) {
				callback({ 
					reason: 'Algo salió mal al obtener la información del usuario', 
					details: { userInfo } 
				});
				return;
			}
		} else {
			userInfo = await GoogleSignin.signInSilently();
			if (!userInfo) {
				callback({ 
					reason: 'Algo salió mal al obtener la información del usuario', 
					details: { userInfo } 
				});
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
				typeof callback === 'function' && callback(error);
			}
		);
	} catch (error) {
		console.error('Error en Google Login:', error);
		callback({ 
			reason: 'No se pudo iniciar sesión con Google, por favor inicie sesión con Usuario y contraseña', 
			details: { error } 
		});
	}
};

/**
 * Logout from Google and Meteor session
 */
export const logoutFromGoogle = function() {
	Meteor.logout((error) => {
		if (!error) {
			GoogleSignin.revokeAccess();
			GoogleSignin.signOut();
		} else {
			console.error('Error during Google logout:', error);
		}
	});
};

/**
 * Login with Apple using Meteor Accounts and React Native
 * @param {Function} callback - Callback function to handle errors and success
 * @returns {Promise<void>}
 */
export const loginWithApple = async function(callback) {
	try {
		// Solo funciona en iOS
		if (Platform.OS !== 'ios') {
			callback({ 
				error: true,
				reason: 'Apple Login solo está disponible en dispositivos iOS' 
			});
			return;
		}

		// Realizar la autenticación con Apple
		const appleAuthRequestResponse = await appleAuth.performRequest({
			requestedOperation: appleAuth.Operation.LOGIN,
			requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
		});

		console.log('Apple Auth Response - User ID:', appleAuthRequestResponse.user);
		console.log('Apple Auth Response:', appleAuthRequestResponse);

		// Verificar el estado de las credenciales
		const credentialState = await appleAuth.getCredentialStateForUser(
			appleAuthRequestResponse.user
		);
		console.log('Apple Credential State:', credentialState);

		// Helper para fallback con método custom del backend
		const fallbackToCustomAppleSignIn = () => {
			const appleAuthData = {
				identityToken: appleAuthRequestResponse.identityToken,
				user: appleAuthRequestResponse.user,
				email: appleAuthRequestResponse.email,
				authorizationCode: appleAuthRequestResponse.authorizationCode,
			};
			if (appleAuthRequestResponse.fullName && appleAuthRequestResponse.fullName.givenName) {
				appleAuthData.fullName = {
					givenName: appleAuthRequestResponse.fullName.givenName,
					familyName: appleAuthRequestResponse.fullName.familyName,
					middleName: appleAuthRequestResponse.fullName.middleName,
					nickname: appleAuthRequestResponse.fullName.nickname,
				};
			}

			Meteor._startLoggingIn();
			Meteor.call('auth.appleSignIn', appleAuthData, (err2, result) => {
				Meteor._endLoggingIn();

				if (err2) {
					Alert.alert('Error en método auth.appleSignIn:', JSON.stringify(err2));
					console.error('auth.appleSignIn error:', err2);
					callback && callback({ error: true, message: err2.reason || 'Error auth.appleSignIn' });
					return;
				}

				console.log('Apple Sign-In (fallback) result:', result);

				// 1) Intento estándar: aplicar _handleLoginCallback con forma { id, token, tokenExpires }
				if (result?.token) {
					Meteor._handleLoginCallback(null, {
						id: result.id || result.userId,
						token: result.token,
						tokenExpires: result.tokenExpires
					});
				}

				// 2) Si aún no hay sesión local, persistir con loginWithToken
				if (result?.token && !Meteor.userId()) {
					Meteor.loginWithToken(result.token, (loginError) => {
						if (loginError) {
							Alert.alert('Error al establecer sesión con token:', JSON.stringify(loginError));
							console.error('LoginWithToken error:', loginError);
							callback && callback({ error: true, message: 'Error al establecer sesión con token' });
						} else {
							Alert.alert('Login con Apple exitoso (fallback)', 'Sesión establecida correctamente');
							callback && callback({
								error: false,
								user: result.user || { _id: result.id || result.userId },
								message: 'Login exitoso con Apple'
							});
						}
					});
				} else {
					// Ya autenticado o sin token, maneja como login directo
					Meteor._handleLoginCallback(null, { token: result?.token, id: result?.id || result?.userId });
					callback && callback({
						error: false,
						user: result?.user || result,
						message: 'Login exitoso con Apple (fallback directo)'
					});
				}
			});
		};

		if (credentialState != appleAuth.State.AUTHORIZED) {
			await Meteor._startLoggingIn();

			// En RN nativo no hay state/redirectUri de OAuth. Si faltan, saltar handler nativo y usar fallback.
			const canUseNativeAppleHandler =
				!!appleAuthRequestResponse?.state || !!appleAuthRequestResponse?.redirectUri;

			if (!canUseNativeAppleHandler) {
				console.warn('native-apple no aplicable sin state/redirectUri en RN. Usando fallback auth.appleSignIn.');
				Meteor._endLoggingIn();
				fallbackToCustomAppleSignIn();
				return;
			}

			// Intento principal: handler oficial (solo si hay state/redirectUri)
			Meteor.call(
				'login',
				{
					...appleAuthRequestResponse,
					code: appleAuthRequestResponse.authorizationCode,
					id_token: appleAuthRequestResponse.identityToken,
					methodName: 'native-apple'
				},
				(error, response) => {
					console.log('Login call response:', { error, response });
					Meteor._endLoggingIn();
					Meteor._handleLoginCallback(error, response);

					if (error) {
							// Fallback con método custom
						console.warn('Fallo login native-apple, usando fallback auth.appleSignIn');
						fallbackToCustomAppleSignIn();
						return;
					}

					// Éxito con handler oficial
					Alert.alert('Login con Apple exitoso', 'Sesión establecida correctamente');
					callback && callback({
						error: false,
						user: response?.user || response,
						message: 'Login exitoso con Apple (native-apple)'
					});
				}
			);
			return;
		}

		callback({ 
			error: true, 
			message: `Credenciales de Apple no autorizadas (Estado: ${credentialState})` 
		});
	} catch (error) {
		if (error.code === appleAuth.Error.CANCELED) {
			console.log('Usuario canceló el login con Apple');
			callback({ 
				error: true, 
				cancelled: true,
				message: 'Login cancelado por el usuario' 
			});
		} else {
			console.error('Error en Apple Auth:', error);
			callback({ 
				error: true, 
				message: error.message || 'Error desconocido en Apple Auth' 
			});
		}
	}
};

/**
 * Función auxiliar para intentar login estándar de Meteor
 */
const tryStandardLogin = async (appleAuthData, callback) => {
	try {
		await Meteor._startLoggingIn();
		
		// Preparar datos en formato estándar como Google
		const loginData = {
			appleSignIn: true,
			accessToken: appleAuthData.authorizationCode,
			idToken: appleAuthData.identityToken,
			email: appleAuthData.email,
			userId: appleAuthData.user,
			user: appleAuthData.user,
			fullName: appleAuthData.fullName,
			authorizationCode: appleAuthData.authorizationCode,
			identityToken: appleAuthData.identityToken
		};
		
		Alert.alert('Intentando login estándar:', JSON.stringify(loginData));
		
		await Meteor.call('login', loginData, (error, response) => {
			Meteor._endLoggingIn();
			
			if (error) {
				Alert.alert('Error en login estándar:', JSON.stringify(error));
				callback({ 
					error: true, 
					message: error.reason || 'Error en login estándar' 
				});
			} else {
				Alert.alert('Login estándar exitoso:', JSON.stringify(response));
				Meteor._handleLoginCallback(error, response);
				callback({ 
					error: false, 
					user: response.user || response,
					message: 'Login exitoso con Apple (estándar)' 
				});
			}
		});
	} catch (loginError) {
		Alert.alert('Error total en login:', JSON.stringify(loginError));
		callback({ 
			error: true, 
			message: 'Error completo en proceso de login' 
		});
	}};/**
 * Logout from Apple (closes Meteor session)
 * Note: Apple doesn't require specific client-side logout like Google
 */
export const logoutFromApple = function() {
	Meteor.logout((error) => {
		if (error) {
			console.error('Error al cerrar sesión:', error);
		} else {
			console.log('Sesión cerrada correctamente');
		}
	});
};