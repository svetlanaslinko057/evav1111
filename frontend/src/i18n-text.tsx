/**
 * Drop-in wrappers around React Native's `Text` and `TextInput` that
 * auto-translate visible English strings via the i18n `tByEn` reverse-index.
 *
 * Why wrappers (and not source-level `tByEn` wrapping):
 * - The Expo surface has ~100 .tsx files with ~600 hardcoded EN literals.
 *   Wrapping each call site is expensive and risky. A wrapper component
 *   makes localisation a single import swap per file.
 *
 * Drop-in semantics:
 * - `Text` accepts the same props as `react-native`'s Text; if `children` is
 *   a plain string, it is passed through `tByEn`. Mixed children (e.g. arrays
 *   containing strings and JSX) translate each string segment separately.
 * - `TextInput` proxies to `react-native`'s TextInput. Its `placeholder`
 *   prop is translated; everything else is forwarded.
 * - `translateAlert(title, msg, ...)` is a thin replacement for
 *   `Alert.alert` that translates the first two string args before
 *   delegating.
 *
 * All wrappers subscribe to the `I18nContext` so re-renders happen on
 * language change.
 */
import React from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  TextProps,
  TextInputProps,
  Alert,
  AlertButton,
  AlertOptions,
} from 'react-native';
import { useT } from './i18n';

function translateChild(child: React.ReactNode, tByEn: (s: string) => string): React.ReactNode {
  if (typeof child === 'string') return tByEn(child);
  if (typeof child === 'number' || child == null || typeof child === 'boolean') return child;
  return child;
}

export const Text = React.forwardRef<RNText, TextProps>(function Text(props, ref) {
  const { tByEn } = useT();
  const { children, ...rest } = props;
  let translated: React.ReactNode = children;
  if (typeof children === 'string') {
    translated = tByEn(children);
  } else if (Array.isArray(children)) {
    // First, try to translate the whole array if it's all strings (with optional
    // \n separators). Many JSX text nodes look like "foo{'\n'}bar" → ["foo","\n","bar"]
    const allStringy = children.every((c) => typeof c === 'string' || typeof c === 'number');
    if (allStringy) {
      const joined = children.map(String).join('');
      const t = tByEn(joined);
      if (t !== joined) {
        translated = t;
      } else {
        translated = children;
      }
    } else {
      translated = children.map((c, i) => {
        const tc = translateChild(c, tByEn);
        return typeof tc === 'string' ? tc : React.isValidElement(tc) ? React.cloneElement(tc, { key: tc.key ?? i }) : tc;
      });
    }
  }
  return <RNText ref={ref} {...rest}>{translated}</RNText>;
});

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(function TextInput(props, ref) {
  const { tByEn } = useT();
  const { placeholder, ...rest } = props;
  const translated = typeof placeholder === 'string' ? tByEn(placeholder) : placeholder;
  return <RNTextInput ref={ref} placeholder={translated} {...rest} />;
});

/**
 * Imperative replacement for `Alert.alert(...)`. Translates `title` and
 * `message` via the module-level `translateByEn` (works outside React).
 * Button labels are also translated when they are plain strings.
 */
import { translateByEn } from './i18n';

export function translateAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions,
) {
  const t = translateByEn;
  const tButtons = buttons?.map((b) => ({
    ...b,
    text: typeof b.text === 'string' ? t(b.text) : b.text,
  }));
  return Alert.alert(t(title), message ? t(message) : undefined, tButtons, options);
}
