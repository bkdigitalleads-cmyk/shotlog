import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useTheme, FONT_FILES, lightTheme, space, type } from './src/theme';
import { AppProvider, useApp } from './src/state';
import TabRail, { Tab } from './src/ui/TabRail';
import { PageTitle, Toast } from './src/ui/Kit';

function Shell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, notice } = useApp();
  const [tab, setTab] = useState<Tab>('today');
  if (!ready) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>
        <PageTitle theme={theme} title="Shot Log" />
      </View>
      <TabRail theme={theme} tab={tab} onTab={setTab} />
      <Toast theme={theme} text={notice} bottom={64 + insets.bottom} />
    </View>
  );
}

/** A failure while a screen renders: shown instead of a frozen page. Nothing logged is lost; it is all on disk. */
class Guard extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const t = lightTheme;
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, padding: space.l, paddingTop: 80 }}>
        <Text style={[type.title, { color: t.ink }]}>Something went wrong on this screen.</Text>
        <Text style={[type.body, { color: t.ink, marginTop: space.s }]}>Close the app and open it again. Your shots and entries are saved on this iPhone.</Text>
        <Text style={[type.small, { color: t.inkFaint, marginTop: space.l }]}>{error.message}</Text>
      </View>
    );
  }
}

export default function App() {
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  // If the fonts are still not in after a few seconds, open anyway with the system font.
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGaveUp(true), 6000);
    return () => clearTimeout(t);
  }, []);
  // The page's colour while fonts load, so launch never flashes.
  if (!fontsLoaded && !fontError && !gaveUp) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  return (
    <Guard>
      <SafeAreaProvider>
        <AppProvider>
          <Shell />
        </AppProvider>
      </SafeAreaProvider>
    </Guard>
  );
}
