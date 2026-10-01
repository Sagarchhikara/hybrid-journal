import { TextInput, type StyleProp, type TextInputProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  style?: StyleProp<TextStyle>;
}

export function TextField({ style, multiline, ...rest }: TextFieldProps) {
  const { colors, radii, spacing, typography } = useTheme();

  return (
    <TextInput
      multiline={multiline}
      placeholderTextColor={colors.muted}
      style={[
        typography.body,
        {
          color: colors.text,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.md,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          minHeight: multiline ? 88 : 48,
          textAlignVertical: multiline ? 'top' : 'center',
        },
        style,
      ]}
      {...rest}
    />
  );
}
