import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, space, type } from '../theme';
import { useApp } from '../state';
import { buildReport, REPORT_RANGES, ReportRange } from '../report';
import { gate, reportAccess } from '../gates';
import { printReport, shareCsv, shareReport } from '../exporting';
import { maybeRequestReview } from '../reviews';
import { Button, Choice, Eyebrow, Field, Leaf, MainAction, PageTitle, ProMark, Row, Rows } from '../ui/Kit';
import ReportPreview from './ReportPreview';

/**
 * The report for a prescriber: pick the range and an optional name, look
 * at the preview (everyone), then share the PDF or print it (Pro). The
 * CSV of every entry is here too (Pro).
 */
export default function Report() {
  const theme = useTheme();
  const { meds, shots, weights, feelings, settings, updateSettings, isPro, showPaywall, say } = useApp();
  const [range, setRange] = useState<ReportRange>(90);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const access = reportAccess(isPro);

  const model = useMemo(
    () => buildReport({ meds, shots, weights, feelings, unit: settings.weightUnit, rangeDays: range, now: Date.now(), patient: settings.patientName }),
    [meds, shots, weights, feelings, settings.weightUnit, settings.patientName, range]
  );

  const run = async (what: 'share' | 'print') => {
    const locked = gate('report', isPro);
    if (locked) return showPaywall(locked);
    setBusy(true);
    try {
      if (what === 'share') await shareReport(model);
      else await printReport(model);
    } catch {
      Alert.alert('The report did not open', 'Try once more.');
    } finally {
      setBusy(false);
    }
  };

  const csv = async () => {
    const locked = gate('csv', isPro);
    if (locked) return showPaywall(locked);
    try {
      await shareCsv({ shots, weights, feelings });
    } catch {
      say('The CSV did not open. Try once more.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <PageTitle theme={theme} title="Report" />
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={[type.body, { color: theme.inkSoft }]}>
          A clean record for your prescriber: your medication and dose history with dates, every shot with its site, your weight with the shots marked, and side-effect counts.
        </Text>

        <Leaf theme={theme} style={styles.form}>
          <View>
            <Eyebrow theme={theme}>Dates</Eyebrow>
            <Choice theme={theme} label="Range" value={range} onChange={setRange} options={REPORT_RANGES.map((r) => ({ id: r, label: `${r} days` }))} />
          </View>
          <Field theme={theme} label="Your name on it (optional)" value={settings.patientName} onChangeText={(patientName) => updateSettings({ patientName })} placeholder="Left blank, it prints a line" maxLength={80} autoCapitalize="words" />
          <Text style={[type.small, { color: theme.inkSoft }]}>
            {model.shots.length} {model.shots.length === 1 ? 'shot' : 'shots'}, {model.weights.length} {model.weights.length === 1 ? 'day' : 'days'} of weights and {model.feelingTotal} side-effect {model.feelingTotal === 1 ? 'entry' : 'entries'} in these dates.
          </Text>
        </Leaf>

        <MainAction
          theme={theme}
          glyph="report"
          label="Preview the report"
          onPress={() => {
            setPreview(true);
            maybeRequestReview('firstReport');
          }}
        />

        <View>
          <Eyebrow theme={theme} right={access.share ? null : <ProMark theme={theme} />}>
            Send it
          </Eyebrow>
          <Rows theme={theme}>
            <Row theme={theme} glyph="share" label="Share PDF" sub="Mail, Messages, Files, AirDrop" onPress={() => run('share')} />
            <Row theme={theme} glyph="print" label="Print" onPress={() => run('print')} />
            <Row theme={theme} glyph="table" label="Export CSV" sub="Every shot, weight and side effect, for a spreadsheet" onPress={csv} />
          </Rows>
        </View>
        {busy ? <Text style={[type.small, { color: theme.inkSoft }]}>Making the PDF.</Text> : null}
        <Text style={[type.small, { color: theme.inkFaint }]}>Made on this iPhone. It goes only where you send it.</Text>
      </ScrollView>

      <ReportPreview
        visible={preview}
        model={model}
        sample={access.sample}
        onClose={() => setPreview(false)}
        onShare={() => run('share')}
        onPrint={() => run('print')}
        onLocked={() => {
          setPreview(false);
          setTimeout(() => showPaywall('report'), 350);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.l, gap: space.xl, paddingBottom: space.xxl },
  form: { gap: space.l },
});
