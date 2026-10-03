import { forwardRef, useState } from 'react';
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
 *
 * Invalid beats focused on the border: a field you are typing into because it is wrong
 * should keep saying so. See TextField for why focus is drawn at all.
 */
export const NumberField = forwardRef<TextInput, NumberFieldProps>(function NumberField(
  { decimal = false, invalid = false, align = 'left', style, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors, radii, spacing, typography, sizes, borderWidths } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      ref={ref}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      inputMode={decimal ? 'decimal' : 'numeric'}
      selectTextOnFocus
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
        typography.title,
        {
          color: colors.text,
          backgroundColor: colors.surfaceRaised,
          borderWidth: borderWidths.hairline,
          borderColor: invalid ? colors.danger : focused ? colors.accent : colors.border,
          borderRadius: radii.md,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          minHeight: sizes.field,
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    />
  );
});
