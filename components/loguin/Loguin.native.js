import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import MeteorBase from "@meteorrn/core";
import * as AppleAuthentication from "expo-apple-authentication";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Appearance,
    Dimensions,
    ImageBackground,
    NativeModules,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    connectToMeteor,
    ensureMeteorConnection,
    getMeteorUrl,
} from "../../services/meteor/client";
import { registerPushTokenForActiveSession } from "../../services/notifications/PushMessaging.native";
import { ConfigCollection } from "../collections/collections";
import { resolveSessionRoute } from "../navigator/sessionRoute";
import { loginScreenStyles as styles } from "./Loguin.styles";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker, _startLoggingIn?: () => Promise<void> | void, _endLoggingIn?: () => Promise<void> | void, _handleLoginCallback?: (error: any, response: any) => void }} */ (
    MeteorBase
  );

const GOOGLE_IOS_CLIENT_ID =
  "1043110071233-p7e56eu0sb203j32pf66b1blaql14f26.apps.googleusercontent.com";
const GOOGLE_WEB_CLIENT_ID =
  "1043110071233-5mf355rcrf02hq4ja99uaq9kspokur1t.apps.googleusercontent.com";

let cachedGoogleSignInModulePromise = null;

const { width: screenWidth } = Dimensions.get("window");
const { height: screenHeight } = Dimensions.get("window");

const loadGoogleSignInModule = async () => {
  if (cachedGoogleSignInModulePromise) {
    return cachedGoogleSignInModulePromise;
  }

  if (!NativeModules?.RNGoogleSignin) {
    return null;
  }

  cachedGoogleSignInModulePromise =
    import("@react-native-google-signin/google-signin")
      .then((module) => module)
      .catch((error) => {
        console.warn("[Loguin] Error cargando RN Google Sign-In:", error);
        return null;
      });

  return cachedGoogleSignInModulePromise;
};

const isGoogleCancelledResponse = (response) => response?.type === "cancelled";

const isGoogleSuccessResponse = (response) => response?.type === "success";

const buildAppleFullName = (fullName) => {
  if (!fullName) {
    return undefined;
  }

  const normalized = {
    givenName: fullName.givenName || undefined,
    familyName: fullName.familyName || undefined,
    middleName: fullName.middleName || undefined,
    nickname: fullName.nickname || undefined,
    namePrefix: fullName.namePrefix || undefined,
    nameSuffix: fullName.nameSuffix || undefined,
  };

  return Object.values(normalized).some(Boolean) ? normalized : undefined;
};

const Loguin = () => {
  const [ipserver, setIpserver] = useState(() => {
    const meteorUrl = getMeteorUrl() || "ws://www.vidkar.com:3000/websocket";
    return meteorUrl
      .replace("ws://", "")
      .replace(":3000/websocket", "")
      .replace("/websocket", "");
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(
    Appearance.getColorScheme() === "dark",
  );
  const [isLandscape, setIsLandscape] = useState(screenWidth > screenHeight);
  const [showServerInput, setShowServerInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [connectingToServer, setConnectingToServer] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  const userId = Meteor.useTracker(() => Meteor.userId());
  const user = Meteor.useTracker(() => Meteor.user());
  const permitirLoginWithGoogle = Meteor.useTracker(() => {
    if (!Meteor.status()?.connected) return null;
    Meteor.subscribe("propertys", {
      active: true,
      type: "CONFIG",
      clave: "LOGIN_WITH_GOOGLE",
    });
    return ConfigCollection.findOne({
      active: true,
      type: "CONFIG",
      clave: "LOGIN_WITH_GOOGLE",
    });
  });
  const permitirLoginWithApple = Meteor.useTracker(() => {
    if (!Meteor.status()?.connected) return null;
    Meteor.subscribe("propertys", {
      active: true,
      type: "CONFIG",
      clave: "LOGIN_WITH_APPLE",
    });
    return ConfigCollection.findOne({
      active: true,
      type: "CONFIG",
      clave: "LOGIN_WITH_APPLE",
    });
  });

  useEffect(() => {
    (async () => {
      const configuredServer =
        getMeteorUrl() || "ws://www.vidkar.com:3000/websocket";

      try {
        const status = Meteor.status?.();
        if (!status || !status.connected) {
          setConnectingToServer(true);
          await ensureMeteorConnection();
        }
      } catch (error) {
        console.warn("[Loguin] Error conectando a Meteor:", error);
        Alert.alert(
          "Error de Conexión",
          `No se pudo conectar al servidor: ${configuredServer}`,
        );
      } finally {
        setConnectingToServer(false);
      }
    })();

    const dimSub = Dimensions.addEventListener("change", ({ window }) => {
      const { width, height } = window || {};
      setIsLandscape(width > height);
    });

    const themeSub = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDarkMode(colorScheme === "dark");
    });

    return () => {
      dimSub?.remove?.();
      themeSub?.remove?.();
    };
  }, []);

  useEffect(() => {
    loadGoogleSignInModule().then((googleModule) => {
      if (!googleModule?.GoogleSignin) {
        return;
      }

      googleModule.GoogleSignin.configure({
        forceCodeForRefreshToken: false,
        iosClientId: GOOGLE_IOS_CLIENT_ID,
        offlineAccess: true,
        scopes: ["profile", "email"],
        webClientId: GOOGLE_WEB_CLIENT_ID,
      });
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    let revokeSubscription = null;

    const setupAppleAuthentication = async () => {
      if (Platform.OS !== "ios") {
        return;
      }

      try {
        const available = await AppleAuthentication.isAvailableAsync();

        if (!mounted) {
          return;
        }

        setAppleAuthAvailable(available);

        if (!available) {
          return;
        }

        revokeSubscription = AppleAuthentication.addRevokeListener(() => {
          console.warn(
            "[Loguin] Apple revocó las credenciales del usuario autenticado.",
          );
        });
      } catch (error) {
        if (mounted) {
          setAppleAuthAvailable(false);
        }

        console.warn("[Loguin] No se pudo inicializar Apple Sign-In:", error);
      }
    };

    setupAppleAuthentication();

    return () => {
      mounted = false;
      revokeSubscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    router.replace(resolveSessionRoute(userId, user));
  }, [userId, user]);

  const handleUsernameChange = (text) => {
    setUsername(text);
    if (text.toLowerCase() === "change server") {
      setShowServerInput(true);
    }
  };

  const reconnectToServer = async () => {
    try {
      setConnectingToServer(true);
      await Meteor.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await connectToMeteor(`ws://${ipserver}:3000/websocket`);
      Alert.alert("Conexión Exitosa", `Conectado exitosamente a: ${ipserver}`);
    } catch (error) {
      Alert.alert(
        "Error de Conexión",
        `No se pudo conectar al servidor: ${ipserver}\n\nError: ${error.message}`,
      );
    } finally {
      setConnectingToServer(false);
    }
  };

  const handleLogin = async () => {
    try {
      setSubmitting(true);
      await new Promise((resolve, reject) => {
        Meteor.loginWithPassword(username, password, (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      await registerPushTokenForActiveSession().catch((error) => {
        console.warn(
          "[Loguin] Error registrando token push tras login:",
          error,
        );
      });
    } catch (_error) {
      Alert.alert("Credenciales incorrectas");
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogleLogin = async () => {
    if (loadingGoogle || submitting) {
      return;
    }

    let googleStatusCodes = null;

    try {
      setLoadingGoogle(true);

      const googleModule = await loadGoogleSignInModule();
      const GoogleSignin = googleModule?.GoogleSignin;
      googleStatusCodes = googleModule?.statusCodes;

      if (!GoogleSignin || !googleStatusCodes) {
        throw new Error(
          "El binario actual no incluye Google Sign-In nativo. Abre la app desde el dev build de VIDKAR o recompila con expo run:android.",
        );
      }

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      let googleUser = null;
      if (GoogleSignin.hasPreviousSignIn()) {
        try {
          const silentResponse = await GoogleSignin.signInSilently();

          if (isGoogleSuccessResponse(silentResponse)) {
            googleUser = silentResponse.data;
          }
        } catch (silentError) {
          console.warn(
            "[Loguin] signInSilently falló; se intentará signIn interactivo.",
            {
              code: silentError?.code,
              message: silentError?.message,
              platform: Platform.OS,
              isPad: Platform.isPad,
            },
          );

          await GoogleSignin.signOut().catch(() => null);
        }
      }

      if (!googleUser) {
        const signInResponse = await GoogleSignin.signIn({
          loginHint: username?.includes("@") ? username.trim() : undefined,
        });

        if (isGoogleCancelledResponse(signInResponse)) {
          return;
        }

        if (!isGoogleSuccessResponse(signInResponse)) {
          throw new Error("No se pudo completar el flujo de Google Sign-In.");
        }

        if (!signInResponse.data) {
          return;
        }

        googleUser = signInResponse.data;
      }

      if (!googleUser) {
        throw new Error(
          "Algo salio mal al obtener la informacion del usuario.",
        );
      }

      const tokens = await GoogleSignin.getTokens();

      await Meteor._startLoggingIn?.();

      await new Promise((resolve, reject) => {
        Meteor.call(
          "login",
          {
            googleSignIn: true,
            accessToken: tokens?.accessToken,
            refreshToken: undefined,
            idToken: tokens?.idToken || googleUser?.idToken || undefined,
            serverAuthCode: googleUser?.serverAuthCode || undefined,
            email: googleUser?.user?.email,
            imageUrl: googleUser?.user?.photo,
            userId: googleUser?.user?.id,
          },
          (error, response) => {
            if (error) {
              GoogleSignin.revokeAccess().catch(() => null);
              GoogleSignin.signOut().catch(() => null);
              Meteor._endLoggingIn?.();
              Meteor._handleLoginCallback?.(error, response);
              reject(error);
              return;
            }

            Meteor._endLoggingIn?.();
            Meteor._handleLoginCallback?.(error, response);
            resolve(response);
          },
        );
      });

      await registerPushTokenForActiveSession().catch((error) => {
        console.warn(
          "[Loguin] Error registrando token push tras login Google:",
          error,
        );
      });
    } catch (error) {
      const signInCancelledCode = googleStatusCodes?.SIGN_IN_CANCELLED;
      const signInProgressCode = googleStatusCodes?.IN_PROGRESS;

      if (
        (signInCancelledCode && error?.code === signInCancelledCode) ||
        (signInProgressCode && error?.code === signInProgressCode)
      ) {
        return;
      }

      Alert.alert(
        "Google",
        error?.reason ||
          error?.message ||
          (error?.code
            ? `Error iniciando sesión con Google (${error.code}).`
            : "Error iniciando sesión con Google."),
      );
    } finally {
      setLoadingGoogle(false);
    }
  };

  const onAppleLogin = async () => {
    if (loadingApple || submitting) {
      return;
    }

    try {
      setLoadingApple(true);

      if (Platform.OS !== "ios") {
        throw new Error(
          "Apple Login solo está disponible en dispositivos iOS.",
        );
      }

      if (!appleAuthAvailable) {
        throw new Error(
          "El binario actual no tiene disponible Sign in with Apple. Recompila la app iOS con la capability habilitada.",
        );
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const credentialState = await AppleAuthentication.getCredentialStateAsync(
        credential.user,
      );

      if (!credential.authorizationCode || !credential.identityToken) {
        throw new Error(
          "Apple no devolvió los tokens requeridos para iniciar sesión.",
        );
      }

      if (
        credentialState !==
        AppleAuthentication.AppleAuthenticationCredentialState.AUTHORIZED
      ) {
        throw new Error(
          `Credenciales de Apple no autorizadas (estado: ${credentialState}).`,
        );
      }

      const fullName = buildAppleFullName(credential.fullName);
      const appleAuthData = {
        authorizationCode: credential.authorizationCode || undefined,
        email: credential.email || undefined,
        fullName,
        identityToken: credential.identityToken || undefined,
        realUserStatus: credential.realUserStatus,
        user: credential.user,
      };

      const standardLoginPayload = {
        appleSignIn: true,
        accessToken: credential.authorizationCode || undefined,
        authorizationCode: credential.authorizationCode || undefined,
        email: credential.email || undefined,
        fullName,
        idToken: credential.identityToken || undefined,
        identityToken: credential.identityToken || undefined,
        realUserStatus: credential.realUserStatus,
        user: credential.user,
        userId: credential.user,
      };

      await Meteor._startLoggingIn?.();

      let standardLoginError = null;
      let standardLoginResponse = null;

      try {
        standardLoginResponse = await new Promise((resolve, reject) => {
          Meteor.call("login", standardLoginPayload, (error, response) => {
            if (error) {
              reject(error);
              return;
            }

            resolve(response);
          });
        });

        Meteor._endLoggingIn?.();
        Meteor._handleLoginCallback?.(null, standardLoginResponse);
      } catch (error) {
        standardLoginError = error;
        Meteor._endLoggingIn?.();
      }

      if (standardLoginError) {
        console.warn(
          "[Loguin] Falló login estándar con Apple; se intentará auth.appleSignIn.",
          {
            code: standardLoginError?.error,
            message: standardLoginError?.reason || standardLoginError?.message,
          },
        );

        await Meteor._startLoggingIn?.();

        const fallbackResponse = await new Promise((resolve, reject) => {
          Meteor.call("auth.appleSignIn", appleAuthData, (error, response) => {
            if (error) {
              reject(error);
              return;
            }

            resolve(response);
          });
        }).finally(() => {
          Meteor._endLoggingIn?.();
        });

        if (fallbackResponse?.token) {
          Meteor._handleLoginCallback?.(null, {
            id: fallbackResponse.id || fallbackResponse.userId,
            token: fallbackResponse.token,
            tokenExpires: fallbackResponse.tokenExpires,
          });
        }

        if (fallbackResponse?.token && !Meteor.userId()) {
          await new Promise((resolve, reject) => {
            Meteor.loginWithToken(fallbackResponse.token, (error) => {
              if (error) {
                reject(error);
                return;
              }

              resolve();
            });
          });
        }
      }

      await registerPushTokenForActiveSession().catch((error) => {
        console.warn(
          "[Loguin] Error registrando token push tras login Apple:",
          error,
        );
      });
    } catch (error) {
      if (error?.code === "ERR_REQUEST_CANCELED") {
        return;
      }

      Alert.alert(
        "Apple",
        error?.reason || error?.message || "Error iniciando sesión con Apple.",
      );
    } finally {
      setLoadingApple(false);
    }
  };

  const backgroundStyle = {
    minHeight: "100%",
    minWidth: "100%",
    marginTop: isLandscape ? 0 : "5%",
  };

  return (
    <View style={styles.screen}>
      <ImageBackground
        source={require("../files/space-bg-shadowcodex.jpg")}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          left: 0,
          top: 0,
          zIndex: 0,
        }}
        resizeMode="cover"
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={
            isLandscape ? styles.scrollLandscapeContent : undefined
          }
        >
          <View
            style={[
              backgroundStyle,
              isLandscape ? styles.mainLandscape : styles.mainPortrait,
            ]}
          >
            <View
              style={[styles.container, isLandscape && styles.brandLandscape]}
            >
              <Text style={{ fontSize: 30, color: "white" }}>
                <FontAwesome5 name="house-user" size={100} />
              </Text>
              <Text style={{ fontSize: 30, color: "white" }}>🅥🅘🅓🅚🅐🅡</Text>
            </View>

            <View
              style={[styles.container, isLandscape && styles.formLandscape]}
            >
              <View style={styles.blurCard}>
                <View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: isDarkMode
                        ? "rgba(10, 18, 32, 0.72)"
                        : "rgba(255, 255, 255, 0.68)",
                    },
                  ]}
                />
                <View style={styles.blurCardContent}>
                  <Text style={styles.title}>Inicio de Session</Text>

                  {showServerInput ? (
                    <View style={styles.serverRow}>
                      <TextInput
                        mode="flat"
                        value={ipserver}
                        onChangeText={setIpserver}
                        label="IP del Servidor"
                        returnKeyType="done"
                        dense
                        style={styles.serverInput}
                      />
                      <Button
                        mode="contained"
                        onPress={reconnectToServer}
                        disabled={connectingToServer}
                        loading={connectingToServer}
                        style={styles.reconnectButton}
                        contentStyle={styles.reconnectButtonContent}
                        compact
                      >
                        <FontAwesome5 name="sync-alt" size={14} />
                      </Button>
                    </View>
                  ) : null}

                  <TextInput
                    mode="flat"
                    value={username}
                    onChangeText={handleUsernameChange}
                    label="Usuario"
                    returnKeyType="next"
                    dense
                    style={styles.input}
                  />
                  <TextInput
                    mode="flat"
                    value={password}
                    onChangeText={setPassword}
                    label="Contraseña"
                    returnKeyType="done"
                    secureTextEntry
                    dense
                    style={styles.input}
                  />
                  <Button
                    mode="contained"
                    onPress={handleLogin}
                    loading={submitting}
                    disabled={submitting}
                  >
                    Iniciar Sessión
                  </Button>

                  <View style={{ height: 12 }} />
                  {permitirLoginWithGoogle?.valor === "true" ? (
                    <>
                      <Text style={styles.altText}>O</Text>
                      <View style={{ height: 10 }} />
                      <Button
                        mode="outlined"
                        icon="google"
                        onPress={onGoogleLogin}
                        disabled={loadingGoogle || submitting}
                        loading={loadingGoogle}
                      >
                        Entrar con Google
                      </Button>
                    </>
                  ) : null}

                  {permitirLoginWithApple?.valor === "true" &&
                  Platform.OS === "ios" &&
                  appleAuthAvailable ? (
                    <>
                      <View style={{ height: 10 }} />
                      <Button
                        mode="outlined"
                        icon="apple"
                        onPress={onAppleLogin}
                        disabled={loadingApple || submitting}
                        loading={loadingApple}
                      >
                        Entrar con Apple
                      </Button>
                    </>
                  ) : null}

                  {connectingToServer ? (
                    <Text style={styles.statusText}>
                      Conectando con el servidor...
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default Loguin;
