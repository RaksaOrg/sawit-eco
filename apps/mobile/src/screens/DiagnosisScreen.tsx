import React, { useState } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import {
  AppButton,
  AppCard,
  AppHeader,
  AppScannerFrame,
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

export function DiagnosisScreen() {
  const language = useMobileAppStore((s) => s.language);
  const t = createTranslator(language);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [blockCode, setBlockCode] = useState('B2');
  const [symptoms, setSymptoms] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const takePhoto = async () => {
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

  const pickGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.6,
    });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
      setPhotoBase64(res.assets[0].base64 || null);
    }
  };

  const startRecording = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) return;
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
    } catch {
      // Audio permission rejected or failed
    }
  };

  const stopRecording = async () => {
    try {
      await audioRecorder.stop();
      setRecordingUri(audioRecorder.uri);
    } finally {
      setIsRecording(false);
    }
  };

  const submitDiagnosis = async () => {
    setBusy(true);
    setResultMsg(null);
    try {
      let voiceBase64: string | undefined;
      if (recordingUri) {
        voiceBase64 = await FileSystem.readAsStringAsync(recordingUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      const payload = {
        blockCode,
        symptoms: symptoms || 'Pengamatan visual daun sawit dari mobile',
        photoBase64: photoBase64 || undefined,
        mimeType: 'image/jpeg',
        voiceBase64,
        voiceMimeType: 'audio/m4a',
      };

      const { syncedOk } = await queueThenTrySync(async () =>
        enqueueEvent('DIAGNOSIS_MEDIA', payload),
      );

      setResultMsg(
        syncedOk ? t('diagnosis.success') : t('diagnosis.queued'),
      );
      setSymptoms('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader title={t('diagnosis.title')} />
      <AppCard>
        <AppScannerFrame>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>{t('diagnosis.placeholder')}</Text>
            </View>
          )}
        </AppScannerFrame>

        <View style={styles.row}>
          <AppButton
            label={t('diagnosis.capture')}
            variant="secondary"
            icon="camera-outline"
            onPress={takePhoto}
            style={{ flex: 1 }}
          />
          <AppButton
            label={t('diagnosis.gallery')}
            variant="secondary"
            icon="image-outline"
            onPress={pickGallery}
            style={{ flex: 1 }}
          />
        </View>
      </AppCard>

      <AppCard style={{ marginTop: foundationTokens.spacing.md }}>
        <AppTextField label={t('diagnosis.block')} value={blockCode} onChangeText={setBlockCode} />
        <AppTextField
          label={t('diagnosis.symptoms')}
          value={symptoms}
          onChangeText={setSymptoms}
          multiline
        />

        <View style={{ marginVertical: foundationTokens.spacing.xs }}>
          <AppButton
            label={
              isRecording
                ? t('diagnosis.stop')
                : recordingUri
                  ? t('diagnosis.voice_ready')
                  : t('diagnosis.voice')
            }
            variant={isRecording ? 'danger' : 'secondary'}
            icon="mic-outline"
            onPress={isRecording ? stopRecording : startRecording}
          />
        </View>

        <AppButton
          label={t('diagnosis.submit')}
          variant="primary"
          onPress={submitDiagnosis}
          loading={busy}
        />

        {resultMsg ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>{resultMsg}</Text>
            <AppStatusBadge text={t('diagnosis.result')} variant="info" />
          </View>
        ) : null}
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: foundationTokens.spacing.md,
  },
  placeholderText: {
    color: semanticTokens.color.surface,
    fontSize: foundationTokens.typography.caption.size,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: foundationTokens.spacing.sm,
    marginTop: foundationTokens.spacing.sm,
  },
  resultCard: {
    marginTop: foundationTokens.spacing.md,
    padding: foundationTokens.spacing.sm,
    borderRadius: foundationTokens.radius.sm,
    backgroundColor: semanticTokens.color.surfaceSubtle,
    gap: foundationTokens.spacing.xs,
  },
  resultText: {
    color: semanticTokens.color.textPrimary,
    fontSize: foundationTokens.typography.bodyMedium.size,
    fontWeight: '600',
  },
});
