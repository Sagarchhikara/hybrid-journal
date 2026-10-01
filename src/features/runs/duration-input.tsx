import { useRef } from 'react';
import { TextInput, View } from 'react-native';

import { NumberField, Text } from '@/components';
import { useTheme } from '@/theme';

export interface DurationInputProps {
  hours: string;
  minutes: string;
  seconds: string;
  onChange: (part: 'hours' | 'minutes' | 'seconds', value: string) => void;
  invalid?: boolean;
}

/**
 * Three number-pad fields rather than one free-text h:mm:ss box.
 *
 * Parsing free text means guessing whether '4521' is 45:21 or 4:52.1, and getting it
 * wrong silently corrupts a log. Three fields are unambiguous; focus advances itself
 * once a field holds two digits, so a 44:21 run is "4 4 2 1" with no taps in between.
 */
export function DurationInput({
  hours,
  minutes,
  seconds,
  onChange,
  invalid = false,
}: DurationInputProps) {
  const { spacing } = useTheme();
  const minutesRef = useRef<TextInput>(null);
  const secondsRef = useRef<TextInput>(null);

  function handle(part: 'hours' | 'minutes' | 'seconds', value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 2);
    onChange(part, digits);

    if (digits.length === 2) {
      if (part === 'hours') minutesRef.current?.focus();
      if (part === 'minutes') secondsRef.current?.focus();
    }
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
      <Part label="hr" value={hours} onChangeText={(v) => handle('hours', v)} invalid={invalid} />
      <Part
        label="min"
        value={minutes}
        onChangeText={(v) => handle('minutes', v)}
        invalid={invalid}
        inputRef={minutesRef}
      />
      <Part
        label="sec"
        value={seconds}
        onChangeText={(v) => handle('seconds', v)}
        invalid={invalid}
        inputRef={secondsRef}
      />
    </View>
  );
}

function Part({
  label,
  value,
  onChangeText,
  invalid,
  inputRef,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  invalid: boolean;
  inputRef?: React.RefObject<TextInput | null>;
}) {
  const { spacing } = useTheme();

  return (
    <View style={{ flex: 1, gap: spacing.xs }}>
      <NumberField
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder="00"
        align="center"
        invalid={invalid}
        maxLength={2}
        accessibilityLabel={label}
      />
      <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  );
}
