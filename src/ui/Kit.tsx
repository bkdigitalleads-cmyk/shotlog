/**
 * Shot Log's component kit. Everything tappable goes through Tap, so it
 * shows it was pressed; every target is at least 44 points; every control
 * has a VoiceOver label. Built only on the theme's tokens: one type scale
 * (display, title, body, small), one spacing scale and two corners (leaf
 * for cards, trays and the main action; tab for tags, choices, inputs and
 * plain buttons).
 *
 * Names: Tap, MainAction, Button, GlyphButton, LinkText, TopBar, PageTitle,
 * Eyebrow, Leaf, Rows, Row, Tag, Tags, Choice, Figure, ProMark, Toast,
 * Field, SwitchRow, Radio.
 */
import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { MAIN_ACTION, Theme, eyebrow, radius, space, tabular, type } from '../theme';
import Glyph, { GlyphName } from './Glyph';
import { tick } from './motion';

export function Tap({
  style,
  pressedStyle,
  children,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & { style?: StyleProp<ViewStyle>; pressedStyle?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return (
    <Pressable {...rest} style={({ pressed }) => [style, pressed && (pressedStyle ?? { opacity: 0.6 })]}>
      {children}
    </Pressable>
  );
}

/** The one large action on a screen (Log shot). Fills the width. */
export function MainAction({
  theme,
  label,
  sub,
  glyph,
  onPress,
  hint,
  disabled = false,
}: {
  theme: Theme;
  label: string;
  sub?: string;
  glyph?: GlyphName;
  onPress: () => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      style={[styles.main, { backgroundColor: theme.live, opacity: disabled ? 0.45 : 1 }]}
      pressedStyle={{ opacity: 0.85, transform: [{ scale: 0.99 }] }}
    >
      <View style={styles.mainRow}>
        {glyph && <Glyph name={glyph} size={26} color={theme.onLive} weight={1.8} />}
        <Text style={[type.title, { color: theme.onLive }]} maxFontSizeMultiplier={1.4} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {sub ? (
        <Text style={[type.small, styles.center, { color: theme.onLive, opacity: 0.85 }]} maxFontSizeMultiplier={1.4} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </Tap>
  );
}

/** A plain button: the page's well with an edge. `live` lays it in the accent (Save, Continue). */
export function Button({
  theme,
  label,
  onPress,
  glyph,
  live = false,
  danger = false,
  disabled = false,
  hint,
  compact = false,
}: {
  theme: Theme;
  label: string;
  onPress: () => void;
  glyph?: GlyphName;
  live?: boolean;
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
  compact?: boolean;
}) {
  const fg = live ? theme.onLive : danger ? theme.danger : theme.ink;
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      style={[
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: live ? theme.live : theme.surface, borderColor: live ? theme.live : theme.edge, opacity: disabled ? 0.45 : 1 },
      ]}
      pressedStyle={{ opacity: 0.75 }}
    >
      {glyph && <Glyph name={glyph} size={20} color={fg} />}
      <Text style={[type.body, styles.semibold, styles.center, { color: fg }]} maxFontSizeMultiplier={1.5} numberOfLines={2}>
        {label}
      </Text>
    </Tap>
  );
}

/** A round glyph button. At least 44 points. */
export function GlyphButton({
  theme,
  glyph,
  label,
  onPress,
  size = 44,
  color,
  disabled = false,
}: {
  theme: Theme;
  glyph: GlyphName;
  label: string;
  onPress: () => void;
  size?: number;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{ width: size, height: size, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }}
      pressedStyle={{ backgroundColor: theme.well }}
    >
      <Glyph name={glyph} size={size * 0.54} color={color ?? theme.ink} />
    </Tap>
  );
}

/** Words you can tap, underlined. At least 44 points tall. */
export function LinkText({ theme, label, onPress, color, hint, small = false }: { theme: Theme; label: string; onPress: () => void; color?: string; hint?: string; small?: boolean }) {
  return (
    <Tap onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} style={styles.link}>
      <Text style={[small ? type.small : type.body, styles.underline, { color: color ?? theme.ink }]}>{label}</Text>
    </Tap>
  );
}

/** The strip at the top of a pushed screen: back on the left, a title, an action on the right. */
export function TopBar({ theme, title, back, right }: { theme: Theme; title?: string; back?: { label: string; onPress: () => void }; right?: React.ReactNode }) {
  return (
    <View style={[styles.topBar, { borderBottomColor: theme.rule }]}>
      <View style={styles.topSide}>
        {back && (
          <Tap onPress={back.onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={back.label} style={styles.back}>
            <Glyph name="back" size={22} color={theme.ink} />
            <Text style={[type.body, { color: theme.ink }]} maxFontSizeMultiplier={1.3} numberOfLines={1}>
              {back.label}
            </Text>
          </Tap>
        )}
      </View>
      {title ? (
        <Text style={[type.title, styles.topTitle, { color: theme.ink }]} numberOfLines={1} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={[styles.topSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

/** A tab's own title, large, with an optional action on the right. */
export function PageTitle({ theme, title, sub, right }: { theme: Theme; title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.pageTitle}>
      <View style={styles.shrink}>
        <Text style={[type.display, { color: theme.ink }]} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
          {title}
        </Text>
        {sub ? <Text style={[type.small, { color: theme.inkSoft }]}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** Small spaced capitals above a group, like a printed form. */
export function Eyebrow({ theme, children, style, right }: { theme: Theme; children: React.ReactNode; style?: StyleProp<TextStyle>; right?: React.ReactNode }) {
  const label = (
    <Text style={[eyebrow, { color: theme.inkSoft }, style]} accessibilityRole="header" maxFontSizeMultiplier={1.6}>
      {children}
    </Text>
  );
  if (!right) return <View style={styles.eyebrowRow}>{label}</View>;
  return (
    <View style={[styles.eyebrowRow, styles.spread]}>
      {label}
      {right}
    </View>
  );
}

/** A leaf: the surface tone with a 1 px edge and the leaf corner. */
export function Leaf({ theme, children, style, margin = false }: { theme: Theme; children: React.ReactNode; style?: StyleProp<ViewStyle>; margin?: boolean }) {
  return (
    <View style={[styles.leaf, { backgroundColor: theme.surface, borderColor: theme.edge }, style]}>
      {margin && <View style={[styles.marginRule, { backgroundColor: theme.margin }]} />}
      {children}
    </View>
  );
}

/** A leaf of rows with ruled hairlines between them. */
export function Rows({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.rows, { backgroundColor: theme.surface, borderColor: theme.edge }, style]}>
      {items.map((c, i) => (
        <View key={i} style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule } : undefined}>
          {c}
        </View>
      ))}
    </View>
  );
}

/** One row: a label, an optional line under it, a value or chevron on the right. */
export function Row({
  theme,
  label,
  sub,
  value,
  glyph,
  onPress,
  chevron = onPress != null,
  right,
  hint,
  danger = false,
}: {
  theme: Theme;
  label: string;
  sub?: string;
  value?: string;
  glyph?: GlyphName;
  onPress?: () => void;
  chevron?: boolean;
  right?: React.ReactNode;
  hint?: string;
  danger?: boolean;
}) {
  const inner = (
    <>
      {glyph && <Glyph name={glyph} size={22} color={danger ? theme.danger : theme.inkSoft} />}
      <View style={styles.rowText}>
        <Text style={[type.body, { color: danger ? theme.danger : theme.ink }]} maxFontSizeMultiplier={1.6}>
          {label}
        </Text>
        {sub ? (
          <Text style={[type.small, { color: theme.inkSoft }, tabular]} maxFontSizeMultiplier={1.6}>
            {sub}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={[type.body, { color: theme.inkSoft }, tabular]} maxFontSizeMultiplier={1.4} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {right}
      {chevron && <Glyph name="chevron" size={18} color={theme.inkFaint} />}
    </>
  );
  if (!onPress) return <View style={styles.row} accessible accessibilityLabel={[label, sub, value].filter(Boolean).join(', ')}>{inner}</View>;
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[label, sub, value].filter(Boolean).join(', ')}
      accessibilityHint={hint}
      style={styles.row}
      pressedStyle={{ backgroundColor: theme.well }}
    >
      {inner}
    </Tap>
  );
}

/** A tag you tap on and off. Picked: ink outline on a well, never the accent. */
export function Tag({ theme, label, on, onPress, hint, sub }: { theme: Theme; label: string; on: boolean; onPress: () => void; hint?: string; sub?: string }) {
  return (
    <Tap
      onPress={() => {
        tick();
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      accessibilityHint={hint}
      style={[styles.tag, { backgroundColor: on ? theme.picked : theme.surface, borderColor: on ? theme.pickedEdge : theme.edge }]}
      pressedStyle={{ opacity: 0.7 }}
    >
      {on && <Glyph name="check" size={16} color={theme.ink} weight={2} />}
      <Text style={[type.body, { color: on ? theme.ink : theme.inkSoft }]} maxFontSizeMultiplier={1.6}>
        {label}
      </Text>
      {sub ? (
        <Text style={[type.small, { color: theme.inkSoft }]} maxFontSizeMultiplier={1.6}>
          {sub}
        </Text>
      ) : null}
    </Tap>
  );
}

export function Tags({ children }: { children: React.ReactNode }) {
  return <View style={styles.tags}>{children}</View>;
}

/** One of a few, side by side (mg, mcg, mL, units; 30, 90, 180 days). */
export function Choice<T extends string | number>({
  theme,
  options,
  value,
  onChange,
  label,
}: {
  theme: Theme;
  options: { id: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <View style={[styles.choice, { backgroundColor: theme.well }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <Tap
            key={String(o.id)}
            onPress={() => {
              tick();
              onChange(o.id);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            style={[styles.choiceItem, on && { backgroundColor: theme.surface, borderColor: theme.pickedEdge }]}
            pressedStyle={{ opacity: 0.7 }}
          >
            <Text style={[type.body, styles.center, on && styles.semibold, { color: on ? theme.ink : theme.inkSoft }, tabular]} maxFontSizeMultiplier={1.4} numberOfLines={1}>
              {o.label}
            </Text>
          </Tap>
        );
      })}
    </View>
  );
}

/** A number with its unit and what it counts, in tabular serif figures. */
export function Figure({ theme, value, unit, label, size = 'display' }: { theme: Theme; value: string; unit?: string; label?: string; size?: 'display' | 'title' }) {
  return (
    <View accessible accessibilityLabel={`${label ? `${label}: ` : ''}${value}${unit ? ` ${unit}` : ''}`}>
      <View style={styles.figureRow}>
        <Text style={[type[size], { color: theme.ink }, tabular]} maxFontSizeMultiplier={1.3} numberOfLines={1}>
          {value}
        </Text>
        {unit ? <Text style={[type.small, { color: theme.inkSoft }]}>{unit}</Text> : null}
      </View>
      {label ? (
        <Text style={[type.small, { color: theme.inkSoft }]} maxFontSizeMultiplier={1.5}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

/** "Pro", small, next to something that needs it. */
export function ProMark({ theme }: { theme: Theme }) {
  return (
    <View style={[styles.pro, { borderColor: theme.inkFaint }]} accessibilityLabel="Pro">
      <Text style={[type.small, styles.semibold, { color: theme.inkSoft }]} maxFontSizeMultiplier={1.3}>
        Pro
      </Text>
    </View>
  );
}

/** A one-line note near the bottom for a few seconds. */
export function Toast({ theme, text, bottom = 0 }: { theme: Theme; text: string | null; bottom?: number }) {
  if (!text) return null;
  return (
    <View pointerEvents="none" style={[styles.toastWrap, { bottom: bottom + space.m }]}>
      <View style={[styles.toast, { backgroundColor: theme.ink }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <Text style={[type.body, styles.center, { color: theme.bg }]}>{text}</Text>
      </View>
    </View>
  );
}

/** A labelled text input on the well. */
export function Field({ theme, label, suffix, style, ...rest }: TextInputProps & { theme: Theme; label: string; suffix?: string }) {
  return (
    <View style={style as StyleProp<ViewStyle>}>
      <Text style={[type.small, { color: theme.inkSoft, marginBottom: space.xs }]} maxFontSizeMultiplier={1.6}>
        {label}
      </Text>
      <View style={[styles.field, { backgroundColor: theme.well, borderColor: theme.edge }]}>
        <TextInput
          placeholderTextColor={theme.inkFaint}
          accessibilityLabel={label}
          {...rest}
          style={[type.body, styles.fieldInput, { color: theme.ink }, tabular]}
          maxFontSizeMultiplier={1.6}
        />
        {suffix ? <Text style={[type.body, { color: theme.inkSoft }]}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

/** A row with a switch. */
export function SwitchRow({ theme, label, sub, value, onChange }: { theme: Theme; label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={[type.body, { color: theme.ink }]} maxFontSizeMultiplier={1.6}>
          {label}
        </Text>
        {sub ? <Text style={[type.small, { color: theme.inkSoft }]}>{sub}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.ink, false: theme.well }} thumbColor={theme.surface} accessibilityLabel={label} />
    </View>
  );
}

export function Radio({ theme, on }: { theme: Theme; on: boolean }) {
  return (
    <View style={[styles.radio, { borderColor: on ? theme.ink : theme.inkFaint }]}>
      {on && <View style={[styles.radioDot, { backgroundColor: theme.ink }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  semibold: { fontWeight: '600' },
  shrink: { flexShrink: 1 },
  spread: { justifyContent: 'space-between' },
  underline: { textDecorationLine: 'underline' },
  main: { minHeight: MAIN_ACTION, borderRadius: radius.leaf, paddingHorizontal: space.xl, paddingVertical: space.m, alignItems: 'center', justifyContent: 'center', gap: space.xs },
  mainRow: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  button: { minHeight: 50, borderRadius: radius.tab, borderWidth: 1, paddingHorizontal: space.l, paddingVertical: space.m, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s },
  buttonCompact: { minHeight: 44, paddingVertical: space.s, paddingHorizontal: space.m },
  link: { minHeight: 44, justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.s, minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
  topSide: { flex: 1, minHeight: 44, justifyContent: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 44, paddingRight: space.s },
  topTitle: { textAlign: 'center', flex: 2 },
  pageTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.l, paddingRight: space.s, paddingTop: space.m, paddingBottom: space.s, minHeight: 60 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', minHeight: 24, marginBottom: space.s },
  leaf: { borderRadius: radius.leaf, borderWidth: 1, padding: space.l, overflow: 'hidden' },
  marginRule: { position: 'absolute', left: space.l + 4, top: 0, bottom: 0, width: 1 },
  rows: { borderRadius: radius.leaf, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 52, paddingHorizontal: space.l, paddingVertical: space.m },
  rowText: { flex: 1, gap: 2 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 44, paddingHorizontal: space.m, borderRadius: radius.tab, borderWidth: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  choice: { flexDirection: 'row', borderRadius: radius.tab, padding: space.xs, gap: space.xs },
  choiceItem: { flex: 1, minHeight: 40, borderRadius: radius.tab - 2, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xs },
  figureRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  pro: { borderWidth: 1, borderRadius: radius.tab / 2, paddingHorizontal: space.xs },
  toastWrap: { position: 'absolute', left: space.l, right: space.l, alignItems: 'center' },
  toast: { borderRadius: radius.leaf, paddingHorizontal: space.l, paddingVertical: space.m, maxWidth: 520 },
  field: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.tab, borderWidth: 1, paddingHorizontal: space.m, minHeight: 48, gap: space.s },
  fieldInput: { flex: 1, paddingVertical: space.s },
  radio: { width: 22, height: 22, borderRadius: radius.round, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: radius.round },
});
