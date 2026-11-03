import React, { useState } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AppButton,
  AppCard,
  AppHeader,
  AppScreen,
  AppStatusBadge,
  AppTextField,
} from '../components/AppComponents';
import { foundationTokens } from '../theme/foundation/tokens';
import { semanticTokens } from '../theme/semantic/tokens';
import { useMobileAppStore } from '../state/store';
import { createTranslator } from '../i18n';
import { queueThenTrySync } from '../core/offline/actions';
import { enqueueEvent } from '../core/offline/outbox';
import { MobileTask } from '../core/api/hooks';

const taskCompletionSchema = z.object({
  quantity: z.string().min(1),
  workUnits: z.string().min(1),
  notes: z.string().optional(),
});

type TaskCompletionValues = z.infer<typeof taskCompletionSchema>;

export function TaskDetailScreen({
  route,
  navigation,
}: {
  route: { params?: { task?: MobileTask } };
  navigation: { goBack: () => void };
}) {
  const task = route.params?.task;
  const language = useMobileAppStore((s) => s.language);
  const t = createTranslator(language);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskCompletionValues>({
    resolver: zodResolver(taskCompletionSchema),
    defaultValues: {
      quantity: String(task?.targetKuantitas || 100),
      workUnits: '1',
      notes: '',
    },
  });

  if (!task) {
    return (
      <AppScreen>
        <AppHeader title={t('tasks.detail')} onBack={() => navigation.goBack()} />
        <Text>{t('tasks.notFound')}</Text>
      </AppScreen>
    );
  }

  const handlePickPhoto = async () => {
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.6,
    });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
      setPhotoBase64(res.assets[0].base64 || null);
    }
  };

  const onSubmit = async (values: TaskCompletionValues) => {
    setBusy(true);
    const payload = {
      taskId: task.id,
      productionKg: task.satuanTarget.toLowerCase() === 'kg' ? Number(values.quantity) : 0,
      areaHa: task.satuanTarget.toLowerCase() === 'ha' ? Number(values.quantity) : 0,
      workUnits: Number(values.workUnits),
      notes: values.notes || 'Penyelesaian via mobile',
      proofBase64: photoBase64 || undefined,
    };

    try {
      await queueThenTrySync(async () => {
        return enqueueEvent('TASK_COMPLETE', payload);
      });
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader
        title={task.kodeTugas}
        subtitle={`${t('attendance.blockLabel')} ${task.blokKode} · ${task.aktivitas}`}
        onBack={() => navigation.goBack()}
      />

      <AppCard>
        <View style={styles.statusRow}>
          <Text style={styles.title}>{task.aktivitas}</Text>
          <AppStatusBadge
            text={task.status}
            variant={task.status === 'COMPLETED' ? 'success' : 'info'}
          />
        </View>
        <Text style={styles.label}>
          {t('tasks.target')}: {task.targetKuantitas} {task.satuanTarget}
        </Text>
        {task.deskripsi ? <Text style={styles.desc}>{task.deskripsi}</Text> : null}
      </AppCard>

      {done ? (
        <AppCard>
          <Text style={styles.successText}>{t('tasks.completed')}</Text>
          <AppButton
            label={t('common.close')}
            variant="primary"
            onPress={() => navigation.goBack()}
          />
        </AppCard>
      ) : (
        <AppCard>
          <Text style={styles.formHeader}>{t('tasks.complete')}</Text>
          <Controller
            control={control}
            name="quantity"
            render={({ field: { onChange, value } }) => (
              <AppTextField
                label={`${t('tasks.quantity')} (${task.satuanTarget})`}
                value={String(value || '')}
                onChangeText={onChange}
                keyboardType="numeric"
                error={errors.quantity ? t('common.required') : undefined}
              />
            )}
          />
          <Controller
            control={control}
            name="workUnits"
            render={({ field: { onChange, value } }) => (
              <AppTextField
                label={t('tasks.actualHk')}
                value={String(value || '')}
                onChangeText={onChange}
                keyboardType="numeric"
                error={errors.workUnits ? t('common.required') : undefined}
              />
            )}
          />
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <AppTextField
                label={t('attendance.notes')}
                value={value || ''}
                onChangeText={onChange}
              />
            )}
          />

          <View style={{ marginVertical: foundationTokens.spacing.sm }}>
            <AppButton
              label={photoUri ? t('tasks.photo_ready') : t('tasks.proof')}
              variant="secondary"
              icon="camera-outline"
              onPress={handlePickPhoto}
            />
            {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}
          </View>

          <AppButton
            label={t('tasks.complete')}
            variant="primary"
            onPress={handleSubmit(onSubmit)}
            loading={busy}
          />
        </AppCard>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: foundationTokens.spacing.xs,
  },
  title: {
    color: semanticTokens.color.textPrimary,
    fontSize: foundationTokens.typography.title.size,
    fontWeight: foundationTokens.typography.title.weight,
  },
  label: {
    color: semanticTokens.color.textPrimary,
    fontSize: foundationTokens.typography.bodyLarge.size,
    fontWeight: '600',
  },
  desc: {
    color: semanticTokens.color.textSecondary,
    fontSize: foundationTokens.typography.bodyMedium.size,
    marginTop: foundationTokens.spacing.xs,
  },
  formHeader: {
    color: semanticTokens.color.textPrimary,
    fontSize: foundationTokens.typography.title.size,
    fontWeight: foundationTokens.typography.title.weight,
    marginBottom: foundationTokens.spacing.sm,
  },
  successText: {
    color: semanticTokens.color.success,
    fontSize: foundationTokens.typography.title.size,
    fontWeight: '600',
    marginBottom: foundationTokens.spacing.md,
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: foundationTokens.radius.md,
    marginTop: foundationTokens.spacing.sm,
  },
});
