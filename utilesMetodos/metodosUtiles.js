import Meteor from '@meteorrn/core';
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
		if (credentialState === appleAuth.State.AUTHORIZED) {
			// Preparar datos para enviar a Meteor
			const appleAuthData = {
				identityToken: appleAuthRequestResponse.identityToken,
				user: appleAuthRequestResponse.user,
				email: appleAuthRequestResponse.email,
				authorizationCode: appleAuthRequestResponse.authorizationCode,
			};

			// Agregar fullName si está disponible (solo primera vez)
			if (appleAuthRequestResponse.fullName && appleAuthRequestResponse.fullName.givenName) {
				appleAuthData.fullName = {
					givenName: appleAuthRequestResponse.fullName.givenName,
					familyName: appleAuthRequestResponse.fullName.familyName,
					middleName: appleAuthRequestResponse.fullName.middleName,
					nickname: appleAuthRequestResponse.fullName.nickname,
				};
			}

			await Meteor._startLoggingIn();

			// Llamar al método de Meteor para autenticar
			await Meteor.call('auth.appleSignIn', appleAuthData, (error, result) => {
				Meteor._endLoggingIn();
				
				if (error) {
					Alert.alert('Error en login con Apple (Meteor):', JSON.stringify(error));
					callback({ 
						error: true, 
						message: error.reason || 'Error al autenticar con Apple' 
					});
				} else {
					Alert.alert('Apple Sign-In exitoso:', JSON.stringify(result), " intentando hacer login con token ");
					// Login exitoso, establecer token en Meteor
					Meteor.loginWithToken(result.token, (loginError) => {
						if (loginError) {
							Alert.alert('Error al establecer sesión:', JSON.stringify(loginError));
							callback({ 
								error: true, 
								message: 'Error al establecer sesión' 
							});
						} else {
							Alert.alert('Login con Apple exitoso', JSON.stringify(result));
							Meteor._handleLoginCallback(null, result);
							callback({ 
								error: false, 
								user: result.user,
								message: 'Login exitoso con Apple' 
							});
						}
					});
				}
			});
		} else {
			callback({ 
				error: true, 
				message: `Credenciales de Apple no autorizadas (Estado: ${credentialState})` 
			});
		}
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