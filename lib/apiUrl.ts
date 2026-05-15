import Constants from 'expo-constants';

function getApiUrl(): string {
  // Production build → always use Railway
  if (!__DEV__) return 'https://northstar-production-5cbe.up.railway.app';

  // In Expo Go on a physical device, `localhost` means the phone itself.
  // Derive the host IP from the Expo dev server URI (e.g. "192.168.1.5:8081")
  // so the app talks to the Mac running the API server.
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];   // strip the port, keep the IP
    return `http://${ip}:3001`;
  }

  // Simulator fallback
  return 'http://localhost:3001';
}

export const API = getApiUrl();
