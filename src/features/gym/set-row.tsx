import { Pressable, View } from 'react-native';

import { Icon, NumberField, Text } from '@/components';
import type { WeightUnit } from '@/lib/units';
import { useTheme } from '@/theme';

import { parseDecimalInput } from '@/lib/input';

import type { DraftSet } from './draft';
import { stepWeight } from './weight-steps';

export interface SetRowProps {
  index: number;
  set: DraftSet;
  isBodyweight: boolean;
  unit: WeightUnit;
  error: string | undefined;
  onChange: (patch: Partial<Omit<DraftSet, 'localId'>>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

/**
 * One set. The weight field carries -/+ buttons that snap to plate increments, and
 * bodyweight exercises get a BW button that clears the added load.
 *
 * Deleting is an explicit button rather than a swipe: a hidden gesture is not discoverable
 * mid-set, and a mis-swipe while sweaty would silently destroy an entry.
 */
export function SetRow({
  index,
  set,
  isBodyweight,
  unit,
  error,
  onChange,
  onDuplicate,
  onRemove,
}: SetRowProps) {
  const { colors, radii, spacing } = useTheme();

  function step(direction: 1 | -1): void {
    const next = stepWeight(parseDecimalInput(set.weight), direction, unit);
    onChange({ weight: String(next) });
  }

  const weightLabel = isBodyweight ? `+${unit}` : unit;

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text variant="label" color="muted" style={{ width: 20 }}>
          {index + 1}
        </Text>

        <StepButton direction={-1} onPress={() => step(-1)} />

        <View style={{ flex: 1.4 }}>
          <NumberField
            decimal
            value={set.weight}
            onChangeText={(weight) => onChange({ weight })}
            placeholder={isBodyweight ? 'BW' : '0'}
            align="center"
            invalid={error !== undefined}
            maxLength={6}
            accessibilityLabel={`Set ${index + 1} weight in ${unit}`}
          />
        </View>

        <StepButton direction={1} onPress={() => step(1)} />

        <Text variant="caption" color="muted" style={{ width: 28 }}>
          {weightLabel}
        </Text>

        <View style={{ flex: 1 }}>
          <NumberField
            value={set.reps}
            onChangeText={(reps) => onChange({ reps })}
            placeholder="0"
            align="center"
            invalid={error !== undefined}
            maxLength={4}
            accessibilityLabel={`Set ${index + 1} reps`}
          />
        </View>

        <Text variant="caption" color="muted" style={{ width: 28 }}>
          reps
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {isBodyweight ? (
          <SmallAction
            label="BW"
            accessibilityLabel={`Set ${index + 1}: clear added load`}
            onPress={() => onChange({ weight: '' })}
            active={set.weight.trim() === ''}
          />
        ) : null}

        <SmallAction
          icon="copy"
          accessibilityLabel={`Duplicate set ${index + 1}`}
          onPress={onDuplicate}
        />
        <SmallAction
          icon="trash"
          accessibilityLabel={`Delete set ${index + 1}`}
          onPress={onRemove}
          danger
        />

        {error ? (
          <Text variant="caption" color="danger" style={{ flex: 1 }}>
            {error}
          </Text>
        ) : null}
      </View>

      <View style={{ height: 1, backgroundColor: colors.border, borderRadius: radii.sm }} />
    </View>
  );
}

function StepButton({ direction, onPress }: { direction: 1 | -1; onPress: () => void }) {
  const { colors, radii } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={direction === 1 ? 'Increase weight' : 'Decrease weight'}
      onPress={onPress}
      // 44pt minimum: this is tapped with a thumb between sets.
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.accent : colors.surfaceRaised,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radii.md,
      })}>
      <Icon name={direction === 1 ? 'plus' : 'minus'} size={18} color="text" />
    </Pressable>
  );
}

function SmallAction({
  icon,
  label,
  accessibilityLabel,
  onPress,
  danger = false,
  active = false,
}: {
  icon?: 'copy' | 'trash';
  label?: string;
  accessibilityLabel: string;
  onPress: () => void;
  danger?: boolean;
  active?: boolean;
}) {
  const { colors, radii, spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={spacing.xs}
      style={({ pressed }) => ({
        minWidth: 44,
        minHeight: 36,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? colors.accent : colors.surface,
        borderColor: danger ? colors.danger : colors.border,
        borderWidth: 1,
        borderRadius: radii.sm,
        opacity: pressed ? 0.6 : 1,
      })}>
      {icon ? (
        <Icon name={icon} size={16} color={danger ? 'danger' : 'muted'} />
      ) : (
        <Text variant="caption" color={active ? 'accentText' : 'muted'}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
