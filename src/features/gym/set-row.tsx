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
  /** Appends a drop set below this one, pre-reduced from its weight. */
  onAddDrop: () => void;
  onToggleDrop: () => void;
}

/**
 * Column geometry shared by SetRowHeader and SetRow, so the labels sit over their inputs.
 *
 * Space is tight: on a 360dp phone a card leaves ~290dp for the whole row, and the -/+
 * buttons take 88 of it. Units therefore live in one header per exercise rather than
 * beside every input, and the inputs use slim padding — with the full form-field padding
 * the reps box was ~33dp wide with ~1dp left for text, so typed reps were invisible.
 */
const INDEX_WIDTH = 20;
const STEP_SIZE = 44;
const WEIGHT_FLEX = 1.4;
const REPS_FLEX = 1;

/** Slim variant of NumberField for the set grid; see the geometry note above. */
const COMPACT_INPUT = { paddingHorizontal: 4, fontSize: 18, lineHeight: 24 } as const;

export function SetRowHeader({ isBodyweight, unit }: { isBodyweight: boolean; unit: WeightUnit }) {
  const { spacing } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Text variant="caption" color="muted" style={{ width: INDEX_WIDTH }}>
        Set
      </Text>
      {/* Spans the -/+ buttons and the weight input between them. */}
      <Text
        variant="caption"
        color="muted"
        style={{
          flex: WEIGHT_FLEX,
          marginHorizontal: STEP_SIZE + spacing.sm,
          textAlign: 'center',
        }}>
        {isBodyweight ? `+${unit}` : unit}
      </Text>
      <Text variant="caption" color="muted" style={{ flex: REPS_FLEX, textAlign: 'center' }}>
        Reps
      </Text>
    </View>
  );
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
  onAddDrop,
  onToggleDrop,
}: SetRowProps) {
  const { colors, radii, spacing } = useTheme();

  function step(direction: 1 | -1): void {
    const next = stepWeight(parseDecimalInput(set.weight), direction, unit);
    onChange({ weight: String(next) });
  }

  // Spoken, not shown: the lighter colour carries this for sighted users.
  const recalledHint = set.isRecalled ? ', from last session' : '';

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {/* A drop continues the set above rather than being a set of its own, so it is
            marked instead of numbered. */}
        <Text variant="label" color="muted" style={{ width: INDEX_WIDTH }}>
          {set.isDropSet ? '↳' : index + 1}
        </Text>

        <StepButton direction={-1} onPress={() => step(-1)} />

        <View style={{ flex: WEIGHT_FLEX }}>
          <NumberField
            decimal
            value={set.weight}
            onChangeText={(weight) => onChange({ weight })}
            placeholder={isBodyweight ? 'BW' : '0'}
            align="center"
            invalid={error !== undefined}
            maxLength={6}
            style={[COMPACT_INPUT, set.isRecalled && { color: colors.muted }]}
            accessibilityLabel={`Set ${index + 1} weight in ${unit}${recalledHint}`}
          />
        </View>

        <StepButton direction={1} onPress={() => step(1)} />

        <View style={{ flex: REPS_FLEX }}>
          <NumberField
            value={set.reps}
            onChangeText={(reps) => onChange({ reps })}
            placeholder="0"
            align="center"
            invalid={error !== undefined}
            maxLength={4}
            style={[COMPACT_INPUT, set.isRecalled && { color: colors.muted }]}
            accessibilityLabel={`Set ${index + 1} reps${recalledHint}`}
          />
        </View>
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
          label="Drop"
          accessibilityLabel={
            set.isDropSet
              ? `Set ${index + 1} is a drop set, tap to make it a normal set`
              : `Add a drop set after set ${index + 1}`
          }
          // Tapping a drop row un-marks it; tapping a normal row adds a drop under it.
          onPress={set.isDropSet ? onToggleDrop : onAddDrop}
          active={set.isDropSet}
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
        width: STEP_SIZE,
        height: STEP_SIZE,
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
