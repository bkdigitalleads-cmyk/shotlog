// expo-haptics, expo-store-review, expo-print, expo-sharing, expo-file-system: quiet stand-ins.
export const ImpactFeedbackStyle = { Heavy: 'heavy', Light: 'light' };
export const NotificationFeedbackType = { Success: 'success' };
export async function impactAsync() {}
export async function notificationAsync() {}
export async function selectionAsync() {}
export async function hasAction() {
  return false;
}
export async function requestReview() {}
export async function printToFileAsync() {
  return { uri: 'x' };
}
export async function printAsync() {}
export async function isAvailableAsync() {
  return false;
}
export async function shareAsync() {}
export class Directory {
  constructor() {
    this.exists = true;
  }
  create() {}
}
export class File {
  constructor() {
    this.exists = false;
    this.uri = 'x';
  }
  create() {}
  write() {}
  delete() {}
  moveSync() {}
}
export const Paths = { cache: '/' };
