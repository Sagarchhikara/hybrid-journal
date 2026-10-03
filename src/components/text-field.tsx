import { useState } from 'react';
import { TextInput, type StyleProp, type TextInputProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  style?: StyleProp<TextStyle>;
}

/**
 * Focus is drawn as a lime border rather than a glow. On a near-black screen an unfocused
 * field and a focused one are otherwise the same dark rectangle, and with the keyboard up
 * covering half the form, "which box am I typing into" is a real question.
 */
export function TextField({ style, multiline, onFocus, onBlur, ...rest }: TextFieldProps) {
  const { colors, radii, spacing, typography, sizes, borderWidths } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      multiline={multiline}
      keyboardAppearance="dark"
      placeholderTextColor={colors.muted}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        typography.body,
        {
          color: colors.text,
          backgroundColor: colors.surfaceRaised,
          borderWidth: borderWidths.hairline,
          borderColor: focused ? colors.accent : colors.border,
          borderRadius: radii.md,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          minHeight: multiline ? sizes.field * 2 : sizes.control,
          textAlignVertical: multiline ? 'top' : 'center',
        },
        style,
      ]}
      {...rest}
    />
  );
}
