import { Capacitor, registerPlugin } from '@capacitor/core';

export const GhostLocation = registerPlugin('GhostLocation');

export function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function configureNativeLocation({ deviceId, token, baseUrl }) {
  if (!isNativeAndroid()) return { available: false };
  return GhostLocation.configure({ deviceId, token, baseUrl });
}

export async function chooseNativeClientCertificate() {
  if (!isNativeAndroid()) return { available: false };
  return GhostLocation.chooseClientCertificate();
}

export async function startNativeLocationService() {
  if (!isNativeAndroid()) return { available: false };
  return GhostLocation.start();
}

export async function stopNativeLocationService() {
  if (!isNativeAndroid()) return { available: false };
  return GhostLocation.stop();
}

export async function getNativeLocationStatus() {
  if (!isNativeAndroid()) return { available: false, running: false };
  return GhostLocation.status();
}
