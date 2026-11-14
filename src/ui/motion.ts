import * as Haptics from 'expo-haptics';

/**
 * Quiet motion: trays and modals fade (no slides, nothing bounces), and
 * feedback comes by touch instead.
 */
export const MODAL_ANIMATION = 'fade' as const;

/** A shot saved: one soft confirmation. */
export const savedHaptic = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
/** Picking a tag, a choice, a site or a counter step. */
export const tick = () => Haptics.selectionAsync().catch(() => {});
