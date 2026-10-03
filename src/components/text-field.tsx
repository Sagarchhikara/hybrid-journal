import { TextInput, type StyleProp, type TextInputProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  style?: StyleProp<TextStyle>;
}

export function TextField({ style, multiline, ...rest }: TextFieldProps) {
  const { colors, radii, spacing, typography, sizes, borderWidths } = useTheme();

  return (
    <TextInput
      multiline={multiline}
      keyboardAppearance="dark"
      placeholderTextColor={colors.muted}
      style={[
        typography.body,
        {
          color: colors.text,
          backgroundColor: colors.surface,
          borderWidth: borderWidths.hairline,
          borderColor: colors.border,
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
