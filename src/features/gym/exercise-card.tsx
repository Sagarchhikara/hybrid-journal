import { Alert, Pressable, View } from 'react-native';

import { Icon, Text } from '@/components';
import type { LastSession } from '@/db/queries/last-session';
import type { WeightUnit } from '@/lib/units';
import { useTheme } from '@/theme';

import type { DraftAction, DraftExercise, DraftSet } from './draft';
import { hasTypedSets } from './draft';
import { formatLastSession, lastSessionToDraftSets } from './format-sets';
import { SetRow, SetRowHeader } from './set-row';

export interface ExerciseCardProps {
  exercise: DraftExercise;
  index: number;
  total: number;
  unit: WeightUnit;
  lastSession: LastSession | undefined;
  setErrors: Map<number, string>;
  dispatch: (action: DraftAction) => void;
}

/**
 * The number to show against a row: drops are not counted, so three working sets with a
 * drop after each read 1, ↳, 2, ↳, 3, ↳ rather than 1 through 6.
 *
 * Returns a zero-based index because SetRow renders `index + 1`.
 */
function workingSetNumber(sets: readonly DraftSet[], position: number): number {
  let seen = 0;
  for (let i = 0; i < position; i += 1) {
    if (!sets[i]!.isDropSet) seen += 1;
  }
  return seen;
}

export function ExerciseCard({
  exercise,
  index,
  total,
  unit,
  lastSession,
  setErrors,
  dispatch,
}: ExerciseCardProps) {
  const { colors, spacing, card, borderWidths } = useTheme();
  const exerciseLocalId = exercise.localId;

  const recall = formatLastSession(lastSession, exercise.isBodyweight, unit);

  /** The same-position set from last time, used to prefill a new row. */
  function fallbackFor(position: number): { weight: string; reps: string } | undefined {
    if (!lastSession) return undefined;
    return lastSessionToDraftSets(lastSession, unit)[position];
  }

  function confirmRemove(): void {
    if (!hasTypedSets(exercise)) {
      dispatch({ type: 'removeExercise', exerciseLocalId });
      return;
    }
    Alert.alert(`Remove ${exercise.name}?`, 'Its sets will be discarded.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => dispatch({ type: 'removeExercise', exerciseLocalId }),
      },
    ]);
  }

  return (
    <View
      style={{
        ...card,
        borderLeftColor: colors.gym,
        borderLeftWidth: borderWidths.accent,
        gap: spacing.md,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          {/* The exercise name is the card's subject, so it is set in lime: on a screen
              of five near-identical cards it is what you scroll looking for. */}
          <Text variant="heading" color="gym">
            {exercise.name}
          </Text>
          <Text variant="caption" color="muted">
            {recall ?? 'First time logging this'}
          </Text>
        </View>

        <IconAction
          icon="chevron-up"
          label={`Move ${exercise.name} up`}
          disabled={index === 0}
          onPress={() => dispatch({ type: 'moveExercise', exerciseLocalId, direction: -1 })}
        />
        <IconAction
          icon="chevron-down"
          label={`Move ${exercise.name} down`}
          disabled={index === total - 1}
          onPress={() => dispatch({ type: 'moveExercise', exerciseLocalId, direction: 1 })}
        />
        <IconAction icon="close" label={`Remove ${exercise.name}`} onPress={confirmRemove} />
      </View>

      <View style={{ gap: spacing.md }}>
        {exercise.sets.length > 0 ? (
          <SetRowHeader isBodyweight={exercise.isBodyweight} unit={unit} />
        ) : null}
        {exercise.sets.map((set, setIndex) => (
          <SetRow
            key={set.localId}
            index={workingSetNumber(exercise.sets, setIndex)}
            set={set}
            isBodyweight={exercise.isBodyweight}
            unit={unit}
            error={setErrors.get(set.localId)}
            onChange={(patch) =>
              dispatch({ type: 'updateSet', exerciseLocalId, setLocalId: set.localId, patch })
            }
            onDuplicate={() =>
              dispatch({ type: 'duplicateSet', exerciseLocalId, setLocalId: set.localId })
            }
            onRemove={() =>
              dispatch({ type: 'removeSet', exerciseLocalId, setLocalId: set.localId })
            }
            onAddDrop={() => dispatch({ type: 'addSet', exerciseLocalId, drop: true })}
            onToggleDrop={() =>
              dispatch({ type: 'toggleDropSet', exerciseLocalId, setLocalId: set.localId })
            }
          />
        ))}
      </View>

      <TextAction
        label="Add set"
        icon="plus"
        onPress={() =>
          dispatch({
            type: 'addSet',
            exerciseLocalId,
            fallback: fallbackFor(exercise.sets.length),
          })
        }
      />
    </View>
  );
}

function IconAction({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: 'chevron-up' | 'chevron-down' | 'close';
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors, radii, spacing, sizes, icons } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={spacing.xs}
      style={({ pressed }) => ({
        width: sizes.iconButton,
        height: sizes.iconButton,
        borderRadius: radii.pill,
        backgroundColor: pressed ? colors.surfaceRaised : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.25 : 1,
      })}>
      <Icon name={icon} size={icons.md} color="muted" />
    </Pressable>
  );
}

function TextAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon?: 'plus';
  onPress: () => void;
}) {
  const { colors, radii, spacing, sizes, icons, borderWidths } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        minHeight: sizes.tapTarget,
        backgroundColor: pressed ? colors.accentSurface : colors.surfaceRaised,
        borderColor: colors.border,
        borderWidth: borderWidths.hairline,
        borderRadius: radii.md,
      })}>
      {icon ? <Icon name={icon} size={icons.xs} color="accent" /> : null}
      <Text variant="labelStrong" color="accent">
        {label}
      </Text>
    </Pressable>
  );
}
