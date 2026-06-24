/**
 * googleDrive.ts — STUB LOCAL
 * Google Drive eliminado. Todas las funciones devuelven no-ops o null.
 * El componente SidebarControls importa este módulo; al hacer stub
 * no hay que tocar sus imports.
 */

export function getFirebaseApp() { return null; }
export function getAuth() { return null; }
export const initAuth = (_onSuccess?: unknown, onFailure?: () => void) => {
  if (onFailure) onFailure();
  return () => {};
};
export const googleSignIn = async () => null;
export const logoutDrive = async () => {};
export const getCachedToken = () => null;
export async function uploadVideoToGoogleDrive(): Promise<never> {
  throw new Error('Google Drive deshabilitado en modo local.');
}
