import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import MeteorBase from "@meteorrn/core";
import * as AppleAuthentication from "expo-apple-authentication";
import { BlurView } from "expo-blur";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Animated,
    Easing,
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
import { registerPushTokenForActiveSession } from "../../services/notifications/PushMessaging.native";
import { WATCH_ROOT_USER_FIELDS } from "../../services/watch/watchDashboard";
import { ConfigCollection } from "../collections/collections";
import { resolveSessionRoute } from "../navigator/sessionRoute";
import { getLoginPalette, loginScreenStyles as styles } from "./Loguin.styles";

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
const IOS_LOGIN_KEYBOARD_OFFSET = 120;
const ANDROID_LOGIN_KEYBOARD_OFFSET = 96;
const PRIVACY_POLICY_URL = "https://www.vidkar.com/politica-privacidad";

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

const LoginBlurCard = ({ children, palette }) => {
  const glowPrimaryProgress = React.useRef(new Animated.Value(0)).current;
  const glowSecondaryProgress = React.useRef(new Animated.Value(0)).current;
  const sheenProgress = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const primaryLoop = Animated.loop(
      Animated.timing(glowPrimaryProgress, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const secondaryLoop = Animated.loop(
      Animated.timing(glowSecondaryProgress, {
        toValue: 1,
        duration: 22000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const sheenLoop = Animated.loop(
      Animated.timing(sheenProgress, {
        toValue: 1,
        duration: 26000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    glowPrimaryProgress.setValue(0);
    glowSecondaryProgress.setValue(0);
    sheenProgress.setValue(0);
    primaryLoop.start();
    secondaryLoop.start();
    sheenLoop.start();

    return () => {
      primaryLoop.stop();
      secondaryLoop.stop();
      sheenLoop.stop();
      glowPrimaryProgress.stopAnimation();
      glowSecondaryProgress.stopAnimation();
      sheenProgress.stopAnimation();
    };
  }, [glowPrimaryProgress, glowSecondaryProgress, sheenProgress]);

  const glowPrimaryTranslateX = glowPrimaryProgress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -16, -30, -12, 0],
  });
  const glowPrimaryTranslateY = glowPrimaryProgress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 24, 52, 18, 0],
  });
  const glowSecondaryTranslateX = glowSecondaryProgress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 28, 12, -10, 0],
  });
  const glowSecondaryTranslateY = glowSecondaryProgress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -18, -42, -14, 0],
  });
  const sheenTranslateX = sheenProgress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 26, 54, 18, 0],
  });
  const sheenTranslateY = sheenProgress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 12, -8, -24, 0],
  });

  return (
    <BlurView
      intensity={24}
      tint="dark"
      renderToHardwareTextureAndroid={false}
      blurReductionFactor={2}
      experimentalBlurMethod={
        Platform.OS === "android" ? "dimezisBlurView" : undefined
      }
      style={[
        styles.blurCard,
        {
          backgroundColor: "transparent",
          borderColor: palette.blurCardBorder,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: palette.blurCardOverlay },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.blurGlowOrb,
          {
            backgroundColor: palette.blurCardGlow,
            transform: [
              { translateX: glowPrimaryTranslateX },
              { translateY: glowPrimaryTranslateY },
            ],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.blurGlowOrbSecondary,
          {
            backgroundColor: palette.blurCardAccent,
            transform: [
              { translateX: glowSecondaryTranslateX },
              { translateY: glowSecondaryTranslateY },
            ],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.blurSheen,
          {
            backgroundColor: palette.blurCardSheen,
            transform: [
              { translateX: sheenTranslateX },
              { translateY: sheenTranslateY },
              { rotate: "-8deg" },
            ],
          },
        ]}
      />
      {children}
    </BlurView>
  );
};

const Loguin = () => {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const [ipserver, setIpserver] = useState(() => {
    const meteorUrl = getMeteorUrl() || "ws://www.vidkar.com:3000/websocket";
    return meteorUrl
      .replace("ws://", "")
      .replace(":3000/websocket", "")
      .replace("/websocket", "");
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const isLandscape = screenWidth > screenHeight;
  const [showServerInput, setShowServerInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [connectingToServer, setConnectingToServer] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const scrollViewRef = React.useRef(null);
  const scrollContentRef = React.useRef(null);
  const passwordInputRef = React.useRef(null);
  const loginButtonAnchorRef = React.useRef(null);
  const openPrivacyPolicy = () => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL);

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

  const { loginRouteReady, user, userId } = Meteor.useTracker(() => {
    const currentUserId = Meteor.userId();

    if (!currentUserId) {
      return {
        loginRouteReady: false,
        user: null,
        userId: null,
      };
    }

    const subscription = Meteor.subscribe(
      "user",
      { _id: currentUserId },
      { fields: WATCH_ROOT_USER_FIELDS },
    );

    return {
      loginRouteReady: subscription.ready(),
      user: Meteor.user(),
      userId: currentUserId,
    };
  });
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
    if (!userId || !loginRouteReady) return;
    router.replace(resolveSessionRoute(userId, user));
  }, [loginRouteReady, user, userId]);

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

  const scrollTargetIntoView = React.useCallback((targetRef, keyboardOffset) => {
    requestAnimationFrame(() => {
      const scrollView = scrollViewRef.current;
      const scrollContent = scrollContentRef.current;
      const targetNode = targetRef?.current;

      if (
        !scrollView ||
        !scrollContent ||
        !targetNode ||
        typeof targetNode.measureLayout !== "function"
      ) {
        return;
      }

      targetNode.measureLayout(
        scrollContent,
        (_xPosition, yPosition) => {
          scrollView.scrollTo({
            animated: true,
            y: Math.max(yPosition - keyboardOffset, 0),
          });
        },
        () => null,
      );
    });
  }, []);

  const handleFieldFocus = () => {
    scrollTargetIntoView(
      loginButtonAnchorRef,
      Platform.OS === "ios"
        ? IOS_LOGIN_KEYBOARD_OFFSET
        : ANDROID_LOGIN_KEYBOARD_OFFSET,
    );
  };

  const handleUsernameSubmit = () => {
    passwordInputRef.current?.focus();
  };

  const handlePasswordSubmit = () => {
    Keyboard.dismiss();
    handleLogin();
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
  };

  const isLargeScreen = screenWidth >= 980;
  const shouldUseSplitLayout = isLandscape || isLargeScreen;

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

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <KeyboardAvoidingView
          style={styles.safeArea}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[
              styles.scrollContent,
              shouldUseSplitLayout
                ? styles.scrollContentCentered
                : styles.scrollContentStacked,
            ]}
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.screen}
          >
            <View
              ref={scrollContentRef}
              style={[
                backgroundStyle,
                styles.layoutShell,
                shouldUseSplitLayout
                  ? styles.layoutShellWide
                  : styles.layoutShellStacked,
              ]}
            >
            <View
              style={[
                styles.brandPanel,
                shouldUseSplitLayout
                  ? styles.brandPanelWide
                  : styles.brandPanelStacked,
              ]}
            >
              <View style={styles.brandBadge}>
                <FontAwesome5
                  name="house-user"
                  size={shouldUseSplitLayout ? 42 : 34}
                  color="#ffffff"
                />
              </View>
              <Text
                style={[styles.brandEyebrow, { color: palette.brandEyebrow }]}
              >
                Plataforma operativa
              </Text>
              <Text style={[styles.brandTitle, { color: palette.brandTitle }]}>
                VIDKAR
              </Text>
              <Text
                style={[
                  styles.brandDescription,
                  { color: palette.brandDescription },
                ]}
              >
                Recargas, remesas, servicios digitales y gestión comercial en
                una sola plataforma diseñada para operar con claridad y rapidez.
              </Text>

              <View style={styles.brandHighlights}>
                <View
                  style={[
                    styles.brandHighlightCard,
                    {
                      backgroundColor: palette.brandHighlightSurface,
                      borderColor: palette.brandHighlightBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.brandHighlightLabel,
                      { color: palette.brandHighlightLabel },
                    ]}
                  >
                    Recargas
                  </Text>
                  <Text
                    style={[
                      styles.brandHighlightValue,
                      { color: palette.brandHighlightValue },
                    ]}
                  >
                    Cubacel y promos
                  </Text>
                </View>
                <View
                  style={[
                    styles.brandHighlightCard,
                    {
                      backgroundColor: palette.brandHighlightSurface,
                      borderColor: palette.brandHighlightBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.brandHighlightLabel,
                      { color: palette.brandHighlightLabel },
                    ]}
                  >
                    Servicios
                  </Text>
                  <Text
                    style={[
                      styles.brandHighlightValue,
                      { color: palette.brandHighlightValue },
                    ]}
                  >
                    Proxy, VPN y más
                  </Text>
                </View>
                <View
                  style={[
                    styles.brandHighlightCard,
                    {
                      backgroundColor: palette.brandHighlightSurface,
                      borderColor: palette.brandHighlightBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.brandHighlightLabel,
                      { color: palette.brandHighlightLabel },
                    ]}
                  >
                    Comercio
                  </Text>
                  <Text
                    style={[
                      styles.brandHighlightValue,
                      { color: palette.brandHighlightValue },
                    ]}
                  >
                    Pedidos y remesas
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.formPanel}>
              <LoginBlurCard palette={palette}>
                <View style={styles.blurCardContent}>
                  <View style={styles.formHeader}>
                    <Text
                      style={[
                        styles.formEyebrow,
                        { color: palette.formEyebrow },
                      ]}
                    >
                      Inicio de sesión
                    </Text>
                    <Text style={[styles.title, { color: palette.formTitle }]}>
                      Entra a tu cuenta
                    </Text>
                    <Text
                      style={[
                        styles.formDescription,
                        { color: palette.formDescription },
                      ]}
                    >
                      Accede a tus herramientas, promociones y operaciones
                      diarias desde una experiencia más clara y cómoda.
                    </Text>

                    <View style={styles.formMetaRow}>
                      <View
                        style={[
                          styles.formMetaPill,
                          { backgroundColor: palette.formMetaSurface },
                        ]}
                      >
                        <Text
                          style={[
                            styles.formMetaPillText,
                            { color: palette.formMetaText },
                          ]}
                        >
                          Acceso seguro
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.formMetaPill,
                          { backgroundColor: palette.formMetaSurface },
                        ]}
                      >
                        <Text
                          style={[
                            styles.formMetaPillText,
                            { color: palette.formMetaText },
                          ]}
                        >
                          Operación centralizada
                        </Text>
                      </View>
                    </View>
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
                        <TextInput
                          mode="flat"
                          value={ipserver}
                          onChangeText={setIpserver}
                          onFocus={handleFieldFocus}
                          label="IP del Servidor"
                          returnKeyType="done"
                          dense
                          style={[
                            styles.serverInput,
                            { backgroundColor: palette.inputBackground },
                          ]}
                          textColor={palette.inputText}
                          cursorColor={palette.inputTint}
                          selectionColor={palette.inputTint}
                          theme={inputTheme}
                        />
                        <Button
                          mode="contained"
                          onPress={reconnectToServer}
                          disabled={connectingToServer}
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

                  <View style={styles.fieldsBlock}>
                    <TextInput
                      mode="flat"
                      value={username}
                      onChangeText={handleUsernameChange}
                      onFocus={handleFieldFocus}
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
                    <TextInput
                      ref={passwordInputRef}
                      mode="flat"
                      value={password}
                      onChangeText={setPassword}
                      onFocus={handleFieldFocus}
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
                  </View>

                  {/* Android needs this view as a stable measurement anchor for scroll positioning. */}
                  <View
                    ref={loginButtonAnchorRef}
                    collapsable={false}
                  >
                    <Button
                      mode="contained"
                      onPress={handleLogin}
                      loading={submitting}
                      disabled={submitting}
                      style={styles.primaryButton}
                      contentStyle={styles.primaryButtonContent}
                      labelStyle={styles.primaryButtonLabel}
                      buttonColor={theme.colors.primary}
                      textColor={palette.inputText}
                    >
                      Iniciar sesión
                    </Button>
                  </View>

                  {permitirLoginWithGoogle?.valor === "true" ||
                  (permitirLoginWithApple?.valor === "true" &&
                    Platform.OS === "ios" &&
                    appleAuthAvailable) ? (
                    <View style={styles.socialSection}>
                      <View style={styles.dividerRow}>
                        <View
                          style={[
                            styles.dividerLine,
                            { backgroundColor: palette.divider },
                          ]}
                        />
                        <Text
                          style={[styles.altText, { color: palette.altText }]}
                        >
                          o continúa con
                        </Text>
                        <View
                          style={[
                            styles.dividerLine,
                            { backgroundColor: palette.divider },
                          ]}
                        />
                      </View>

                      <View style={styles.socialButtons}>
                        {permitirLoginWithGoogle?.valor === "true" ? (
                          <Button
                            mode="outlined"
                            icon="google"
                            onPress={onGoogleLogin}
                            disabled={loadingGoogle || submitting}
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
                            disabled={loadingApple || submitting}
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
                    <Text
                      style={[styles.footerText, { color: palette.footerText }]}
                    >
                      Gestiona lo que vendes y atiendes cada día desde un solo
                      lugar.
                    </Text>

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
              </LoginBlurCard>
            </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default Loguin;
