/**
 * PortfolioInquiryModal — Expo native lead-capture modal triggered from a
 * portfolio case CTA.
 *
 * Three intents:
 *   - order_similar  → "Order a similar project"
 *   - consultation   → "Free consultation"
 *   - calculate      → "Calculate cost for this scope"
 *
 * Posts to POST /api/portfolio/inquiry (no auth required — this is the
 * public lead surface). Theme-aware.
 */
import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import api from './api';
import T from './theme';

export type InquiryIntent = 'order_similar' | 'consultation' | 'calculate';

const INTENT_META: Record<InquiryIntent, { title: string; sub: string; cta: string }> = {
  order_similar: {
    title: 'Order a similar project',
    sub: 'Tell us about your scope — we’ll come back with a structured proposal in <24h.',
    cta: 'Send request',
  },
  consultation: {
    title: 'Book a free consultation',
    sub: '30-minute call with our engineering lead. Scope, architecture, realistic timeline.',
    cta: 'Request consultation',
  },
  calculate: {
    title: 'Calculate this project',
    sub: 'Send us your variation of this case — we calculate scope, hours and price.',
    cta: 'Get the estimate',
  },
};

const BUDGET_OPTIONS = [
  { value: '', label: 'Not sure yet' },
  { value: '<5k', label: '< $5,000' },
  { value: '5-15k', label: '$5,000 – $15,000' },
  { value: '15-50k', label: '$15,000 – $50,000' },
  { value: '50k+', label: '$50,000+' },
];

const TIMELINE_OPTIONS = [
  { value: '', label: 'Flexible' },
  { value: 'asap', label: 'ASAP' },
  { value: '1-3m', label: '1–3 months' },
  { value: '3-6m', label: '3–6 months' },
  { value: '6m+', label: '6+ months' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  caseId?: string | null;
  caseTitle?: string | null;
  intent: InquiryIntent;
}

export default function PortfolioInquiryModal({
  open,
  onClose,
  caseId,
  caseTitle,
  intent,
}: Props) {
  const meta = INTENT_META[intent];

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setError('');
      setSuccess(false);
      setMessage(
        intent === 'consultation'
          ? `I'd like to discuss a project${caseTitle ? ` similar to "${caseTitle}"` : ''}.`
          : intent === 'calculate'
            ? `I want to estimate a project${caseTitle ? ` like "${caseTitle}"` : ''}. Here's my scope:`
            : `I'd like to order a project${caseTitle ? ` similar to "${caseTitle}"` : ''}.`,
      );
    }
  }, [open, intent, caseTitle]);

  const submit = async () => {
    setError('');
    if (!fullName.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in name, email and message.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/portfolio/inquiry', {
        case_id: caseId || null,
        intent,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        company: company.trim() || null,
        message: message.trim(),
        budget_range: budget || null,
        timeline: timeline || null,
        source_url: null,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || err?.response?.data?.detail || 'Could not send request');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      testID="inquiry-modal"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.backdrop}
      >
        <Pressable style={s.backdropPress} onPress={onClose} />
        <View style={s.sheet} testID="inquiry-sheet">
          <View style={s.handleBar} />

          {success ? (
            <View style={s.successBlock} testID="inquiry-success">
              <View style={s.successIcon}>
                <Text style={s.successIconText}>✓</Text>
              </View>
              <Text style={s.successTitle}>Request sent</Text>
              <Text style={s.successSub}>
                Thanks{fullName ? `, ${fullName.split(' ')[0]}` : ''}. We received your inquiry and will get back to you at{' '}
                <Text style={s.successEmail}>{email}</Text> within 24 hours.
              </Text>
              <Pressable
                onPress={onClose}
                style={s.primaryBtn}
                testID="inquiry-success-done"
              >
                <Text style={s.primaryBtnText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
              <Text style={s.modalTitle}>{meta.title}</Text>
              <Text style={s.modalSub}>{meta.sub}</Text>
              {caseTitle && (
                <Text style={s.refLabel}>REF · {caseTitle}</Text>
              )}

              {error ? (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>{error}</Text>
                </View>
              ) : null}

              <Field label="Full name *">
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Jane Doe"
                  placeholderTextColor={T.textMuted}
                  style={s.input}
                  testID="inquiry-name"
                />
              </Field>
              <Field label="Work email *">
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="jane@company.com"
                  placeholderTextColor={T.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={s.input}
                  testID="inquiry-email"
                />
              </Field>
              <Field label="Phone (optional)">
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+1 555 ..."
                  placeholderTextColor={T.textMuted}
                  keyboardType="phone-pad"
                  style={s.input}
                  testID="inquiry-phone"
                />
              </Field>
              <Field label="Company (optional)">
                <TextInput
                  value={company}
                  onChangeText={setCompany}
                  placeholder="Acme Inc."
                  placeholderTextColor={T.textMuted}
                  style={s.input}
                  testID="inquiry-company"
                />
              </Field>
              <Field label="Message *">
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Describe your scope, goals, constraints..."
                  placeholderTextColor={T.textMuted}
                  multiline
                  numberOfLines={5}
                  style={[s.input, s.inputMultiline]}
                  testID="inquiry-message"
                />
              </Field>

              {intent !== 'consultation' && (
                <>
                  <Field label="Budget range">
                    <ChipGroup
                      value={budget}
                      onChange={setBudget}
                      options={BUDGET_OPTIONS}
                      testIdPrefix="inquiry-budget"
                    />
                  </Field>
                  <Field label="Timeline">
                    <ChipGroup
                      value={timeline}
                      onChange={setTimeline}
                      options={TIMELINE_OPTIONS}
                      testIdPrefix="inquiry-timeline"
                    />
                  </Field>
                </>
              )}

              <Text style={s.fineprint}>
                By submitting, you agree to be contacted about your project. We never share your details.
              </Text>

              <View style={s.actions}>
                <Pressable
                  onPress={onClose}
                  style={s.secondaryBtn}
                  testID="inquiry-cancel"
                >
                  <Text style={s.secondaryBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={submit}
                  disabled={busy}
                  style={[s.primaryBtn, busy && { opacity: 0.5 }]}
                  testID="inquiry-submit"
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={T.primaryInk} />
                  ) : (
                    <Text style={s.primaryBtnText}>{meta.cta}</Text>
                  )}
                </Pressable>
              </View>
              <View style={{ height: 24 }} />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ChipGroup({
  value,
  onChange,
  options,
  testIdPrefix,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  testIdPrefix: string;
}) {
  return (
    <View style={s.chipRow}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value || 'none'}
            onPress={() => onChange(o.value)}
            style={[s.chip, active && s.chipActive]}
            testID={`${testIdPrefix}-${o.value || 'none'}`}
          >
            <Text style={[s.chipText, active && s.chipTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  backdropPress: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    backgroundColor: T.surface1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingTop: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 8 },
  modalTitle: {
    color: T.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalSub: { color: T.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 8 },
  refLabel: {
    color: T.textMuted,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.30)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { color: '#fca5a5', fontSize: 13 },
  field: { marginBottom: 14 },
  fieldLabel: {
    color: T.textMuted,
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: T.surface,
    borderColor: T.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: T.text,
    fontSize: 14,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  chipActive: {
    backgroundColor: T.primary,
    borderColor: T.primary,
  },
  chipText: { color: T.textMuted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: T.primaryInk },
  fineprint: { color: T.textMuted, fontSize: 11, marginTop: 8, marginBottom: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  primaryBtn: {
    backgroundColor: T.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  primaryBtnText: { color: T.primaryInk, fontSize: 14, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: T.surface,
    borderColor: T.border,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  secondaryBtnText: { color: T.text, fontSize: 14, fontWeight: '600' },
  successBlock: { padding: 32, alignItems: 'center' },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(16,185,129,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successIconText: { color: '#10b981', fontSize: 26, fontWeight: '700' },
  successTitle: { color: T.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  successSub: {
    color: T.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  successEmail: { color: T.text, fontWeight: '600' },
});
