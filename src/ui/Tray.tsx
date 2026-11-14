import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme, radius, space, type } from '../theme';
import { GlyphButton } from './Kit';
import { MODAL_ANIMATION } from './motion';

/**
 * A tray rises from the bottom over a dimmed page: the log sheet, weight,
 * how I feel, a medication. It fades in; the footer (Save) stays in reach
 * of the thumb above the keyboard.
 */
export function Tray({
  theme,
  visible,
  onClose,
  title,
  sub,
  children,
  footer,
}: {
  theme: Theme;
  visible: boolean;
  onClose: () => void;
  title: string;
  sub?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType={MODAL_ANIMATION} onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <Pressable style={[styles.fill, { backgroundColor: theme.scrim }]} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        <View style={[styles.panel, { backgroundColor: theme.bg, borderColor: theme.edge, paddingBottom: Math.max(insets.bottom, space.l) }]} accessibilityViewIsModal>
          <View style={styles.top}>
            <View style={styles.titles}>
              <Text style={[type.title, { color: theme.ink }]} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
                {title}
              </Text>
              {sub ? <Text style={[type.small, { color: theme.inkSoft }]}>{sub}</Text> : null}
            </View>
            <GlyphButton theme={theme} glyph="close" label="Close" onPress={onClose} color={theme.inkSoft} />
          </View>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={[styles.footer, { borderTopColor: theme.rule }]}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  panel: { maxHeight: '92%', borderTopLeftRadius: radius.leaf, borderTopRightRadius: radius.leaf, borderWidth: 1, borderBottomWidth: 0 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.l, paddingRight: space.s, paddingTop: space.m, paddingBottom: space.s, minHeight: 60 },
  titles: { flexShrink: 1 },
  body: { paddingHorizontal: space.l, paddingBottom: space.l, gap: space.xl },
  footer: { paddingHorizontal: space.l, paddingTop: space.m, gap: space.s, borderTopWidth: StyleSheet.hairlineWidth },
});
