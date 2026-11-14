export const SchedulableTriggerInputTypes = { DATE: 'date' };
export function setNotificationHandler() {}
export async function getPermissionsAsync() {
  return { granted: false, canAskAgain: true };
}
export async function requestPermissionsAsync() {
  return { granted: true };
}
export async function scheduleNotificationAsync() {
  return 'x';
}
export async function cancelScheduledNotificationAsync() {}
export async function getAllScheduledNotificationsAsync() {
  return [];
}
export async function setNotificationCategoryAsync() {}
export function addNotificationResponseReceivedListener() {
  return { remove() {} };
}
export async function getLastNotificationResponseAsync() {
  return null;
}
export async function clearLastNotificationResponseAsync() {}
