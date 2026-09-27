# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## URLs de conexión VIDKAR

La app principal toma sus endpoints públicos desde `react-native-VIDKAR/.env`. Cambia `EXPO_PUBLIC_VIDKAR_BASE_URL` para apuntar el login/DDP, las rutas HTTP del backend y MCP a otro host. El DDP se deriva como `wss://<host>/websocket` cuando la base es HTTPS y `ws://<host>/websocket` cuando es HTTP; MCP se deriva como `<base>/mcp` y solo queda disponible con HTTPS.

HLS es un servicio separado y usa `EXPO_PUBLIC_HLS_SERVER_URL`. Los overrides `EXPO_PUBLIC_METEOR_URL` y `EXPO_PUBLIC_MCP_URL` son opcionales para instalaciones con rutas o hosts no convencionales. El archivo `.env.example` documenta las variables.

Las variables `EXPO_PUBLIC_*` son públicas y se incluyen en el bundle: aquí solo deben ir URLs, nunca tokens, contraseñas ni claves privadas. Expo las sustituye al iniciar Metro/compilar; después de editar `.env`, reinicia Metro. Para builds EAS/Codemagic configura las mismas variables en el entorno de build, porque el `.env` local está ignorado por Git. El dominio de Universal Links/AASA también debe estar configurado en Apple para el host publicado.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
