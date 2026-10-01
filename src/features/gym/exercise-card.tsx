import { Alert, Pressable, View } from 'react-native';

import { Icon, Text } from '@/components';
import type { LastSession } from '@/db/queries/last-session';
import type { WeightUnit } from '@/lib/units';
import { useTheme } from '@/theme';

import type { DraftAction, DraftExercise } from './draft';
import { hasTypedSets } from './draft';
import { formatLastSession, lastSessionToDraftSets } from './format-sets';
import { SetRow } from './set-row';

export interface ExerciseCardProps {
  exercise: DraftExercise;
  index: number;
  total: number;
  unit: WeightUnit;
  lastSession: LastSession | undefined;
  setErrors: Map<number, string>;
  dispatch: (action: DraftAction) => void;
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
  const { colors, radii, spacing } = useTheme();
  const exerciseLocalId = exercise.localId;

  const recall = formatLastSession(lastSession, exercise.isBodyweight, unit);

  /** The same-position set from last time, used to prefill a new row. */
  function fallbackFor(position: number): { weight: string; reps: string } | undefined {
    if (!lastSession) return undefined;
    return lastSessionToDraftSets(lastSession, unit)[position];
  }

  function fillFromLast(): void {
    if (!lastSession) return;
    const sets = lastSessionToDraftSets(lastSession, unit);

    if (!hasTypedSets(exercise)) {
      dispatch({ type: 'fillFromLast', exerciseLocalId, sets });
      return;
    }

    // Never silently overwrite work already entered.
    Alert.alert(
      'Replace what you have entered?',
      'This exercise already has sets. Filling from last session will replace them.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: () => dispatch({ type: 'fillFromLast', exerciseLocalId, sets }),
        },
      ],
    );
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
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderLeftColor: colors.gym,
        borderLeftWidth: 3,
        borderRadius: radii.lg,
        padding: spacing.lg,
        gap: spacing.md,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="heading">{exercise.name}</Text>
          {recall ? (
            <Text variant="caption" color="muted">
              {recall}
            </Text>
          ) : (
            <Text variant="caption" color="muted">
              First time logging this
            </Text>
          )}
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
        {exercise.sets.map((set, setIndex) => (
          <SetRow
            key={set.localId}
            index={setIndex}
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
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
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
        {lastSession ? <TextAction label="Fill from last" onPress={fillFromLast} /> : null}
      </View>
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
  const { spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={spacing.xs}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.25 : pressed ? 0.5 : 1,
      })}>
      <Icon name={icon} size={20} color="muted" />
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
  const { colors, radii, spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        minHeight: 44,
        backgroundColor: pressed ? colors.surfaceRaised : 'transparent',
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radii.pill,
      })}>
      {icon ? <Icon name={icon} size={16} color="accent" /> : null}
      <Text variant="label" color="accent">
        {label}
      </Text>
    </Pressable>
  );
}
