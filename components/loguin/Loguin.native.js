import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import MeteorBase from "@meteorrn/core";
import * as AppleAuthentication from "expo-apple-authentication";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { useIsFocused } from "expo-router/react-navigation";
import React, { useEffect, useState } from "react";
import {
    Alert,
    AppState,
    ImageBackground,
    Keyboard,
    KeyboardAvoidingView,
    NativeModules,
    Platform,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    connectToMeteor,
    ensureMeteorConnection,
    getMeteorUrl,
} from "../../services/meteor/client";
import { buildManualMeteorUrl, getMeteorHost, getPrivacyPolicyUrl } from "../../services/appUrls";
import { registerPushTokenForActiveSession } from "../../services/notifications/PushMessaging.native";
import { ConfigCollection } from "../collections/collections";
import useSystemReducedMotion from "../../hooks/useSystemReducedMotion";
import LoginAtmosphere from "./LoginAtmosphere.native";
import { getLoginPalette, loginScreenStyles as styles } from "./Loguin.styles";
import useLoginMotion, { Animated } from "./useLoginMotion.native";

const Meteor =
  /** @type {typeof MeteorBase & { useTracker: typeof import("@meteorrn/core").useTracker, _startLoggingIn?: () => Promise<void> | void, _endLoggingIn?: () => Promise<void> | void, _handleLoginCallback?: (error: any, response: any) => void }} */ (
    MeteorBase
  );

const GOOGLE_IOS_CLIENT_ID =
  "1043110071233-p7e56eu0sb203j32pf66b1blaql14f26.apps.googleusercontent.com";
const GOOGLE_WEB_CLIENT_ID =
  "1043110071233-5mf355rcrf02hq4ja99uaq9kspokur1t.apps.googleusercontent.com";
const LOGIN_CONFIG_FIELDS = {
  active: 1,
  clave: 1,
  type: 1,
  valor: 1,
};
let cachedGoogleSignInModulePromise = null;

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
const isValidMeteorEndpoint = (endpoint) => {
  try {
    const url = new URL(endpoint);
    return ["ws:", "wss:"].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password;
  } catch (_error) {
    return false;
  }
};

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

const Loguin = ({
  appActive,
  confirmed = false,
  onAuthenticationStart,
  onAuthenticationSettled,
  reducedMotion = false,
} = {}) => {
  const isFocused = useIsFocused();
  const systemReducedMotion = useSystemReducedMotion();
  const shouldReduceMotion = reducedMotion || systemReducedMotion;
  const [standaloneActive, setStandaloneActive] = useState(
    () => !AppState.currentState || AppState.currentState === "active",
  );
  const motionActive = (appActive ?? standaloneActive) && isFocused;
  useEffect(() => {
    if (appActive !== undefined) return;
    const subscription = AppState.addEventListener("change", (state) => setStandaloneActive(state === "active"));
    return () => subscription.remove();
  }, [appActive]);
  const { width } = useWindowDimensions();
  const compact = width < 360 || (Platform.OS === "android" && Number(Platform.Version) <= 28);
  const [ipserver, setIpserver] = useState(() => getMeteorHost() || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showServerInput, setShowServerInput] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [connectingToServer, setConnectingToServer] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const [credentialsError, setCredentialsError] = useState(false);
  const authenticationLock = React.useRef(false);
  const mounted = React.useRef(false);
  const passwordInputRef = React.useRef(null);
  const scrollRef = React.useRef(null);
  const credentialsRef = React.useRef(null);
  const usernameFieldRef = React.useRef(null);
  const passwordFieldRef = React.useRef(null);
  const serverFieldRef = React.useRef(null);
  const focusedFieldRef = React.useRef(null);
  const scrollOffsetRef = React.useRef(0);
  const authenticating = submitting || loadingGoogle || loadingApple;
  const controlsLocked = authenticating || confirmed;
  const motion = useLoginMotion({
    enabled: motionActive && !shouldReduceMotion,
    submitting,
    confirmed,
  });

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const beginAuthentication = () => {
    if (authenticationLock.current || Meteor.userId()) return false;
    authenticationLock.current = true;
    setCredentialsError(false);
    onAuthenticationStart?.();
    return true;
  };

  const confirmAuthentication = () => {
    if (mounted.current) onAuthenticationSettled?.(Meteor.userId());
  };

  const endAuthentication = () => {
    authenticationLock.current = false;
    if (mounted.current) onAuthenticationSettled?.(null);
  };
  const revealCredentials = React.useCallback(() => {
    scrollRef.current?.measureInWindow((_x, viewportTop, _width, viewportHeight) => {
      credentialsRef.current?.measureInWindow((_x, _top, _width, height) => {
        const target = focusedFieldRef.current === serverFieldRef.current || height > viewportHeight
          ? focusedFieldRef.current
          : credentialsRef.current;
        target?.measureInWindow((_x, targetTop, _width, targetHeight) => {
          const viewportBottom = viewportTop + viewportHeight;
          const offset = targetTop < viewportTop + 8
            ? targetTop - viewportTop - 8
            : Math.max(0, targetTop + targetHeight - viewportBottom + 8);
          if (offset !== 0) {
            scrollRef.current?.scrollTo({ y: Math.max(0, scrollOffsetRef.current + offset), animated: true });
          }
        });
      });
    });
  }, []);
  const openPrivacyPolicy = () => WebBrowser.openBrowserAsync(getPrivacyPolicyUrl());

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      revealCredentials();
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [revealCredentials]);

  useEffect(() => {
    if (keyboardVisible) revealCredentials();
  }, [keyboardVisible, revealCredentials]);

  const theme = useTheme();
  const isDarkMode = theme.dark;
  const palette = React.useMemo(
    () => getLoginPalette(isDarkMode),
    [isDarkMode],
  );
  const inputTheme = React.useMemo(
    () => ({
      ...theme,
      colors: {
        ...theme.colors,
        onSurface: palette.inputText,
        onSurfaceVariant: palette.inputLabel,
        outline: palette.secondaryButtonBorder,
        primary: palette.inputTint,
        surfaceVariant: palette.inputBackground,
      },
    }),
    [
      palette.inputBackground,
      palette.inputLabel,
      palette.inputText,
      palette.inputTint,
      palette.secondaryButtonBorder,
      theme,
    ],
  );

  const permitirLoginWithGoogle = Meteor.useTracker(() => {
    if (!Meteor.status()?.connected) return null;
    Meteor.subscribe("propertys", {
      active: true,
      type: "CONFIG",
      clave: "LOGIN_WITH_GOOGLE",
    }, {
      fields: LOGIN_CONFIG_FIELDS,
    });
    return ConfigCollection.findOne({
      active: true,
      type: "CONFIG",
      clave: "LOGIN_WITH_GOOGLE",
    }, {
      fields: LOGIN_CONFIG_FIELDS,
    });
  });
  const permitirLoginWithApple = Meteor.useTracker(() => {
    if (!Meteor.status()?.connected) return null;
    Meteor.subscribe("propertys", {
      active: true,
      type: "CONFIG",
      clave: "LOGIN_WITH_APPLE",
    }, {
      fields: LOGIN_CONFIG_FIELDS,
    });
    return ConfigCollection.findOne({
      active: true,
      type: "CONFIG",
      clave: "LOGIN_WITH_APPLE",
    }, {
      fields: LOGIN_CONFIG_FIELDS,
    });
  });

  useEffect(() => {
    (async () => {
      const configuredServer =
        getMeteorUrl();

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

  const handleUsernameChange = (text) => {
    setUsername(text);
    setCredentialsError(false);
    if (text.toLowerCase() === "change server") {
      setShowServerInput(true);
    }
  };

  const reconnectToServer = async () => {
    try {
      const manualEndpoint = buildManualMeteorUrl(ipserver);
      if (!manualEndpoint || !isValidMeteorEndpoint(manualEndpoint)) {
        throw new Error("Escribe un host o una URL Meteor válida.");
      }
      setConnectingToServer(true);
      await Meteor.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await connectToMeteor(manualEndpoint);
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
    if (!beginAuthentication()) return;
    motion.pulse();
    Keyboard.dismiss();
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

      confirmAuthentication();
      await registerPushTokenForActiveSession().catch((error) => {
        console.warn(
          "[Loguin] Error registrando token push tras login:",
          error,
        );
      });
    } catch {
      if (mounted.current) {
        setCredentialsError(true);
        motion.reject();
      }
    } finally {
      endAuthentication();
      if (mounted.current) setSubmitting(false);
    }
  };

  const handleUsernameSubmit = () => {
    passwordInputRef.current?.focus();
  };

  const handlePasswordSubmit = () => {
    handleLogin();
  };

  const onGoogleLogin = async () => {
    if (!beginAuthentication()) return;

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

      confirmAuthentication();
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
      endAuthentication();
      if (mounted.current) setLoadingGoogle(false);
    }
  };

  const onAppleLogin = async () => {
    if (!beginAuthentication()) return;

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

      confirmAuthentication();
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
      endAuthentication();
      if (mounted.current) setLoadingApple(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ImageBackground
        source={require("../files/space-bg-shadowcodex.jpg")}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
        resizeMode="cover"
      />
      <View
        pointerEvents="none"
        style={[styles.backgroundOverlay, { backgroundColor: palette.backgroundOverlay }]}
      />
      <LoginAtmosphere
        enabled={motionActive}
        reducedMotion={shouldReduceMotion}
        compact={compact}
        authenticating={authenticating}
        confirmed={confirmed}
      />

      <SafeAreaView style={styles.safeArea} edges={["top", "right", "bottom", "left"]}>
        <KeyboardAvoidingView
          style={styles.safeArea}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.safeArea}
            contentContainerStyle={styles.loginScrollContent}
            keyboardShouldPersistTaps="handled"
            onLayout={() => {
              if (keyboardVisible) revealCredentials();
            }}
            onScroll={(event) => {
              scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            scrollEnabled={!confirmed}
          >
          <View style={styles.loginShell}>
            <View style={styles.formPanel}>
              <Animated.View style={motion.cardStyle}>
                <View style={[styles.blurCard, { borderColor: palette.blurCardBorder }]}>
                  <LinearGradient
                    pointerEvents="none"
                    colors={["#1c3155eb", "#101c36f5", "#080e20fa"]}
                    locations={[0, 0.55, 1]}
                    start={{ x: 0.12, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Animated.View pointerEvents="none" style={[motionStyles.errorGlow, motion.errorStyle]} />
                  <View style={styles.blurCardContent}>
                    <View style={styles.formHeader}>
                        <View style={styles.loginBrandMark}>
                          <FontAwesome5 color={palette.brandEyebrow} name="house-user" size={22} />
                          <Text style={[styles.loginBrandName, { color: palette.brandTitle }]}>VIDKAR</Text>
                        </View>
                      <Text style={[styles.formEyebrow, { color: palette.formEyebrow }]}>Inicio de sesión</Text>
                      <Text style={[styles.title, { color: palette.formTitle }]}>Entra a tu cuenta</Text>
                    </View>

                  {showServerInput ? (
                      <View
                      style={[
                        styles.serverCard,
                        {
                          backgroundColor: palette.serverCardSurface,
                          borderColor: palette.serverCardBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.serverLabel,
                          { color: palette.serverLabel },
                        ]}
                      >
                        Servidor personalizado
                      </Text>
                      <View style={styles.serverRow}>
                        <View ref={serverFieldRef} collapsable={false} style={styles.serverInput}>
                        <TextInput
                          mode="flat"
                          value={ipserver}
                          onChangeText={setIpserver}
                          onFocus={() => {
                            focusedFieldRef.current = serverFieldRef.current;
                            if (keyboardVisible) revealCredentials();
                          }}
                          label="Host, IP o URL del servidor"
                          returnKeyType="done"
                          dense
                          style={[
                            styles.input,
                            { backgroundColor: palette.inputBackground },
                          ]}
                          textColor={palette.inputText}
                          cursorColor={palette.inputTint}
                          selectionColor={palette.inputTint}
                          theme={inputTheme}
                        />
                        </View>
                        <Button
                          mode="contained"
                          onPress={reconnectToServer}
                          disabled={connectingToServer || controlsLocked}
                          loading={connectingToServer}
                          style={styles.reconnectButton}
                          contentStyle={styles.reconnectButtonContent}
                          buttonColor={theme.colors.primary}
                          textColor="#ffffff"
                          compact
                        >
                          <FontAwesome5 name="sync-alt" size={14} />
                        </Button>
                      </View>
                    </View>
                  ) : null}

                  <View ref={credentialsRef} collapsable={false}>
                  <View style={styles.fieldsBlock}>
                    <View ref={usernameFieldRef} collapsable={false}>
                    <TextInput
                      mode="flat"
                      value={username}
                      editable={!controlsLocked}
                      onChangeText={handleUsernameChange}
                      onFocus={() => {
                        focusedFieldRef.current = usernameFieldRef.current;
                        if (keyboardVisible) revealCredentials();
                      }}
                      onSubmitEditing={handleUsernameSubmit}
                      blurOnSubmit={false}
                      label="Usuario"
                      returnKeyType="next"
                      dense
                      style={[
                        styles.input,
                        {
                          backgroundColor: palette.inputBackground,
                          borderColor: palette.inputBorder,
                          borderRadius: 18,
                          borderWidth: 1,
                        },
                      ]}
                      textColor={palette.inputText}
                      cursorColor={palette.inputTint}
                      selectionColor={palette.inputTint}
                      underlineColor="transparent"
                      activeUnderlineColor="transparent"
                      theme={inputTheme}
                    />
                    </View>
                    <Animated.View ref={passwordFieldRef} collapsable={false} style={motion.passwordStyle}>
                    <TextInput
                      ref={passwordInputRef}
                      mode="flat"
                      value={password}
                      editable={!controlsLocked}
                      onChangeText={(text) => {
                        setPassword(text);
                        setCredentialsError(false);
                      }}
                      error={credentialsError}
                      onFocus={() => {
                        focusedFieldRef.current = passwordFieldRef.current;
                        if (keyboardVisible) revealCredentials();
                      }}
                      onSubmitEditing={handlePasswordSubmit}
                      label="Contraseña"
                      returnKeyType="done"
                      secureTextEntry
                      dense
                      style={[
                        styles.input,
                        {
                          backgroundColor: palette.inputBackground,
                          borderColor: palette.inputBorder,
                          borderRadius: 18,
                          borderWidth: 1,
                        },
                      ]}
                      textColor={palette.inputText}
                      cursorColor={palette.inputTint}
                      selectionColor={palette.inputTint}
                      underlineColor="transparent"
                      activeUnderlineColor="transparent"
                      theme={inputTheme}
                    />
                    </Animated.View>
                  </View>

                    {credentialsError ? (
                      <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={motionStyles.errorText}>
                        Credenciales incorrectas
                      </Text>
                    ) : null}

                    <Animated.View style={[motionStyles.button, motion.buttonStyle]}>
                    <Button
                      mode="contained"
                      onPress={handleLogin}
                      accessibilityLabel="Iniciar sesión"
                      onPressIn={motion.pressIn}
                      onPressOut={motion.pressOut}
                      loading={submitting && !confirmed}
                      disabled={controlsLocked}
                      accessibilityState={{ busy: submitting && !confirmed }}
                      style={styles.primaryButton}
                      contentStyle={styles.primaryButtonContent}
                      labelStyle={styles.primaryButtonLabel}
                      buttonColor={theme.colors.primary}
                      textColor={palette.inputText}
                      theme={{ colors: { surfaceDisabled: "#303f83", onSurfaceDisabled: "#edf6ff" } }}
                    >
                      {confirmed ? "Sesión confirmada" : submitting ? "Verificando acceso…" : "Iniciar sesión"}
                    </Button>
                    <Animated.View pointerEvents="none" style={[motionStyles.buttonWave, motion.waveStyle]}>
                      <LinearGradient
                        colors={["#b7eaff00", "#c7f3ff", "#b7eaff00"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                      />
                    </Animated.View>
                    </Animated.View>
                  </View>

                  {keyboardVisible ? (
                    <Button compact icon="keyboard-off" onPress={Keyboard.dismiss} style={styles.keyboardDismissAction}>
                      Ocultar teclado
                    </Button>
                  ) : null}

                  {(permitirLoginWithGoogle?.valor === "true" ||
                  (permitirLoginWithApple?.valor === "true" &&
                    Platform.OS === "ios" &&
                    appleAuthAvailable)) ? (
                    <View style={styles.socialSection}>
                        <View style={styles.dividerRow}>
                          <View style={[styles.dividerLine, { backgroundColor: palette.divider }]} />
                          <Text style={[styles.altText, { color: palette.altText }]}>o continúa con</Text>
                          <View style={[styles.dividerLine, { backgroundColor: palette.divider }]} />
                        </View>

                      <View style={styles.socialButtons}>
                        {permitirLoginWithGoogle?.valor === "true" ? (
                          <Button
                            mode="outlined"
                            icon="google"
                            onPress={onGoogleLogin}
                            disabled={controlsLocked}
                            loading={loadingGoogle}
                            style={[
                              styles.secondaryButton,
                              { borderColor: palette.secondaryButtonBorder },
                            ]}
                            contentStyle={styles.secondaryButtonContent}
                            textColor={palette.secondaryButtonText}
                          >
                            Entrar con Google
                          </Button>
                        ) : null}

                        {permitirLoginWithApple?.valor === "true" &&
                        Platform.OS === "ios" &&
                        appleAuthAvailable ? (
                          <Button
                            mode="outlined"
                            icon="apple"
                            onPress={onAppleLogin}
                            disabled={controlsLocked}
                            loading={loadingApple}
                            style={[
                              styles.secondaryButton,
                              { borderColor: palette.secondaryButtonBorder },
                            ]}
                            contentStyle={styles.secondaryButtonContent}
                            textColor={palette.secondaryButtonText}
                          >
                            Entrar con Apple
                          </Button>
                        ) : null}
                      </View>
                    </View>
                  ) : null}

                    <View style={styles.footerPanel}>
                      <Button
                        mode="text"
                        compact
                        onPress={openPrivacyPolicy}
                        textColor={palette.secondaryButtonText}
                        accessibilityLabel="Abrir política de privacidad"
                      >
                        Política de privacidad
                      </Button>

                      {connectingToServer ? (
                        <Text
                          style={[
                            styles.statusText,
                            { color: palette.statusText },
                          ]}
                        >
                          Preparando acceso...
                        </Text>
                      ) : null}
                    </View>
                </View>
                </View>
              </Animated.View>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const motionStyles = StyleSheet.create({
  button: { borderRadius: 16, overflow: "hidden" },
  buttonWave: { position: "absolute", top: 0, bottom: 0, left: "37%", width: "26%" },
  errorGlow: {
    ...StyleSheet.absoluteFillObject,
    borderColor: "#fd879a", borderWidth: 1.5, borderRadius: 34, backgroundColor: "#fd50651f",
  },
  errorText: { color: "#ffc4cc", marginBottom: 8 },
});

export default Loguin;
