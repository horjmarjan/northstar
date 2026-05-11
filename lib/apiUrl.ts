import { Platform } from 'react-native';

// Web uses localhost; iOS (physical device) needs the Mac's LAN IP.
export const API = Platform.OS === 'web'
  ? 'http://localhost:3001'
  : 'http://192.168.1.27:3001';
