import { forwardRef } from 'react';
import { TextInput, type StyleProp, type TextInputProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface NumberFieldProps extends Omit<TextInputProps, 'style' | 'keyboardType'> {
  /** Whole numbers get the plain number pad; decimals get the one with a separator. */
  decimal?: boolean;
  invalid?: boolean;
  align?: 'left' | 'center';
  style?: StyleProp<TextStyle>;
}

/**
 * A numeric text input. Held as a string by the caller so partial entry like '6.' is
 * possible while typing; parsing happens at validation time, never on each keystroke.
 */
export const NumberField = forwardRef<TextInput, NumberFieldProps>(function NumberField(
  { decimal = false, invalid = false, align = 'left', style, ...rest },
  ref,
) {
  const { colors, radii, spacing, typography } = useTheme();

  return (
    <TextInput
      ref={ref}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      inputMode={decimal ? 'decimal' : 'numeric'}
      selectTextOnFocus
      placeholderTextColor={colors.muted}
      style={[
        typography.title,
        {
          color: colors.text,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: invalid ? colors.danger : colors.border,
          borderRadius: radii.md,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          minHeight: 52,
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    />
  );
});
