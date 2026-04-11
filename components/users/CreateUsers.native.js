import Meteor from "@meteorrn/core";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import {
	Button,
	HelperText,
	Surface,
	Text,
	TextInput,
	useTheme,
} from "react-native-paper";

import AppHeader from "../Header/AppHeader";

const initialForm = {
  nombre: "",
  apellidos: "",
  email: "",
  username: "",
  contrasena: "",
};

const getServerErrorMessage = (resultOrError) => {
  if (!resultOrError) {
    return null;
  }

  if (typeof resultOrError === "string") {
    return resultOrError;
  }

  if (typeof resultOrError?.reason === "string") {
    return resultOrError.reason;
  }

  if (typeof resultOrError?.message === "string") {
    return resultOrError.message;
  }

  return null;
};

const CreateUsers = () => {
  const theme = useTheme();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const apellidosRef = useRef(null);
  const emailRef = useRef(null);
  const usernameRef = useRef(null);
  const contrasenaRef = useRef(null);

  const isDark = theme.dark;
  const palette = {
    screen: isDark ? "#020617" : "#f1f5f9",
    card: isDark ? "rgba(15, 23, 42, 0.96)" : "#ffffff",
    cardBorder: isDark
      ? "rgba(99, 102, 241, 0.18)"
      : "rgba(99, 102, 241, 0.12)",
    sectionLabel: isDark ? "#94a3b8" : "#64748b",
    divider: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    accentPrimary: "#6366f1",
  };

  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(normal)/Users");
  };

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const touchField = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const errors = {
    nombre:
      touched.nombre && form.nombre.trim().length === 0
        ? "El nombre es requerido"
        : null,
    apellidos:
      touched.apellidos && form.apellidos.trim().length === 0
        ? "Los apellidos son requeridos"
        : null,
    email:
      touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
        ? "Ingresa un email válido"
        : null,
    username:
      touched.username && form.username.trim().length === 0
        ? "El usuario es requerido"
        : null,
    contrasena:
      touched.contrasena && form.contrasena.length < 6
        ? "La contraseña debe tener al menos 6 caracteres"
        : null,
  };

  const isValid = useMemo(() => {
    return (
      form.nombre.trim().length > 0 &&
      form.apellidos.trim().length > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) &&
      form.username.trim().length > 0 &&
      form.contrasena.length >= 6
    );
  }, [form]);

  const handleCreate = () => {
    setTouched({
      nombre: true,
      apellidos: true,
      email: true,
      username: true,
      contrasena: true,
    });

    if (!isValid) {
      Alert.alert(
        "Campos incompletos",
        "Revisa los campos marcados e inténtalo de nuevo.",
      );
      return;
    }

    setLoading(true);
    const user = {
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.contrasena,
      firstName: form.nombre.trim(),
      lastName: form.apellidos.trim(),
      role: "user",
      edad: 30,
      creadoPor: Meteor.userId(),
    };

    Meteor.call("addUser", user, (error, result) => {
      setLoading(false);

      const serverError =
        error || (result && typeof result !== "string" ? result : null);

      if (serverError) {
        Alert.alert(
          "Error al crear usuario",
          getServerErrorMessage(serverError) || "No se pudo crear el usuario.",
        );
        return;
      }

      Alert.alert(
        "¡Usuario creado!",
        result || "El usuario fue creado correctamente.",
        [
          {
            text: "Ver lista",
            onPress: () => {
              setForm(initialForm);
              setTouched({});
              router.replace("/(normal)/Users");
            },
          },
          {
            text: "Crear otro",
            onPress: () => {
              setForm(initialForm);
              setTouched({});
            },
          },
        ],
      );
    });
  };

  const inputTheme = {
    colors: {
      primary: palette.accentPrimary,
      onSurfaceVariant: isDark ? "#94a3b8" : "#64748b",
    },
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.screen }]}>
      <AppHeader
        title="Agregar Usuario"
        subtitle="Nuevo miembro del sistema"
        showBackButton
        backHref="/(normal)/Users"
        onBack={handleCancel}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroRow}>
            <View
              style={[
                styles.heroBadge,
                {
                  backgroundColor: palette.accentPrimary + "22",
                  borderColor: palette.accentPrimary + "44",
                },
              ]}
            >
              <Text style={styles.heroIcon}>👤</Text>
            </View>
            <View style={styles.heroText}>
              <Text
                variant="titleMedium"
                style={[
                  styles.heroTitle,
                  { color: isDark ? "#f8fafc" : "#0f172a" },
                ]}
              >
                Nuevo usuario
              </Text>
              <Text variant="bodySmall" style={{ color: palette.sectionLabel }}>
                Completa los datos para registrar la cuenta
              </Text>
            </View>
          </View>

          <Surface
            style={[
              styles.card,
              {
                backgroundColor: palette.card,
                borderColor: palette.cardBorder,
              },
            ]}
            elevation={isDark ? 4 : 2}
          >
            <Text
              style={[styles.sectionLabel, { color: palette.sectionLabel }]}
            >
              DATOS PERSONALES
            </Text>

            <TextInput
              mode="outlined"
              label="Nombre *"
              left={
                <TextInput.Icon icon="account" color={palette.sectionLabel} />
              }
              disabled={loading}
              value={form.nombre}
              autoFocus
              onChangeText={(value) => updateField("nombre", value)}
              onBlur={() => touchField("nombre")}
              returnKeyType="next"
              onSubmitEditing={() => apellidosRef.current?.focus()}
              error={!!errors.nombre}
              theme={inputTheme}
              style={styles.input}
            />
            <HelperText
              type="error"
              visible={!!errors.nombre}
              style={styles.helper}
            >
              {errors.nombre}
            </HelperText>

            <TextInput
              ref={apellidosRef}
              mode="outlined"
              label="Apellidos *"
              left={
                <TextInput.Icon
                  icon="account-outline"
                  color={palette.sectionLabel}
                />
              }
              disabled={loading}
              value={form.apellidos}
              onChangeText={(value) => updateField("apellidos", value)}
              onBlur={() => touchField("apellidos")}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              error={!!errors.apellidos}
              theme={inputTheme}
              style={styles.input}
            />
            <HelperText
              type="error"
              visible={!!errors.apellidos}
              style={styles.helper}
            >
              {errors.apellidos}
            </HelperText>

            <View
              style={[styles.divider, { backgroundColor: palette.divider }]}
            />

            <Text
              style={[styles.sectionLabel, { color: palette.sectionLabel }]}
            >
              CREDENCIALES DE ACCESO
            </Text>

            <TextInput
              ref={emailRef}
              mode="outlined"
              label="Email *"
              left={
                <TextInput.Icon
                  icon="email-outline"
                  color={palette.sectionLabel}
                />
              }
              disabled={loading}
              value={form.email}
              onChangeText={(value) => updateField("email", value)}
              onBlur={() => touchField("email")}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => usernameRef.current?.focus()}
              error={!!errors.email}
              theme={inputTheme}
              style={styles.input}
            />
            <HelperText
              type="error"
              visible={!!errors.email}
              style={styles.helper}
            >
              {errors.email}
            </HelperText>

            <TextInput
              ref={usernameRef}
              mode="outlined"
              label="Nombre de usuario *"
              left={<TextInput.Icon icon="at" color={palette.sectionLabel} />}
              disabled={loading}
              value={form.username}
              onChangeText={(value) => updateField("username", value)}
              onBlur={() => touchField("username")}
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => contrasenaRef.current?.focus()}
              error={!!errors.username}
              theme={inputTheme}
              style={styles.input}
            />
            <HelperText
              type={errors.username ? "error" : "info"}
              visible={touched.username || form.username.length > 0}
              style={styles.helper}
            >
              {errors.username ??
                "Debe coincidir con el usuario que deseas registrar"}
            </HelperText>

            <TextInput
              ref={contrasenaRef}
              mode="outlined"
              label="Contraseña *"
              left={
                <TextInput.Icon
                  icon="lock-outline"
                  color={palette.sectionLabel}
                />
              }
              right={
                <TextInput.Icon
                  icon={showPassword ? "eye-off" : "eye"}
                  onPress={() => setShowPassword((current) => !current)}
                  color={palette.sectionLabel}
                />
              }
              disabled={loading}
              value={form.contrasena}
              onChangeText={(value) => updateField("contrasena", value)}
              onBlur={() => touchField("contrasena")}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
              error={!!errors.contrasena}
              theme={inputTheme}
              style={styles.input}
            />
            <HelperText
              type={errors.contrasena ? "error" : "info"}
              visible={touched.contrasena || form.contrasena.length > 0}
              style={styles.helper}
            >
              {errors.contrasena ?? "Mínimo 6 caracteres"}
            </HelperText>
          </Surface>

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={handleCancel}
              disabled={loading}
              style={styles.cancelButton}
              contentStyle={styles.buttonContent}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleCreate}
              loading={loading}
              disabled={loading}
              buttonColor={palette.accentPrimary}
              style={styles.createButton}
              contentStyle={styles.buttonContent}
              icon="account-plus"
            >
              {loading ? "Creando..." : "Crear usuario"}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  heroBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroIcon: {
    fontSize: 26,
  },
  heroText: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    fontWeight: "700",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 12,
    marginTop: 4,
  },
  input: {
    backgroundColor: "transparent",
  },
  helper: {
    marginTop: -4,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    marginVertical: 16,
    borderRadius: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
  },
  createButton: {
    flex: 2,
    borderRadius: 12,
  },
  buttonContent: {
    height: 48,
  },
});

export default CreateUsers;
