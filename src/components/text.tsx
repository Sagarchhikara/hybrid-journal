import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme, type ColorToken, type TypographyVariant } from '@/theme';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorToken;
}

/** Shadows React Native's Text so screens never hardcode a font size or colour. */
export function Text({ variant = 'body', color = 'text', style, ...rest }: TextProps) {
  const { colors, typography } = useTheme();
  return <RNText style={[typography[variant], { color: colors[color] }, style]} {...rest} />;
}
