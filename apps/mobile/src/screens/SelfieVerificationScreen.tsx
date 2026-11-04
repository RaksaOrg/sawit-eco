import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppComponents';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { createFaceDetectorOutput, type Face } from 'react-native-vision-camera-face-detector';
import { Ionicons } from '@expo/vector-icons';
import { createTranslator, type TranslationKey } from '../i18n';
import { useMobileAppStore } from '../state/store';

const STEP_COUNTS: TranslationKey[] = [
  'selfie.step_count1',
  'selfie.step_count2',
  'selfie.step_count3',
];
const STEPS: [TranslationKey, TranslationKey][] = [
  ['selfie.step1_title', 'selfie.step1_description'],
  ['selfie.step2_title', 'selfie.step2_description'],
  ['selfie.step3_title', 'selfie.step3_description'],
];

const COLORS = {
  navy: '#102957',
  primary: '#605BFF',
  green: '#0FA65A',
  muted: '#5A6B8E',
  white: '#FFFFFF',
};
type Props = {
  navigation?: { goBack: () => void; navigate?: (screen: string, params?: unknown) => void };
  route?: { params?: { source?: string } };
};

export function SelfieVerificationScreen({ navigation, route }: Props) {
  const language = useMobileAppStore((state) => state.language);
  const t = createTranslator(language);
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [step, setStep] = useState(0);
  const [started, setStarted] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [previewReady, setPreviewReady] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [faceCentered, setFaceCentered] = useState(false);
  const [eyesVisible, setEyesVisible] = useState(false);
  const [mouthVisible, setMouthVisible] = useState(false);
  const cameraActive = hasPermission && !!device;
  const faceHandler = useRef<(faces: Face[]) => void>(() => undefined);

  useEffect(() => {
    if (hasPermission || permissionRequested) return;
    setPermissionRequested(true);
    requestPermission()
      .then((granted) => {
        if (!granted) setCameraError(t('selfie.permission_denied'));
      })
      .catch(() => setCameraError(t('selfie.permission_error')));
  }, [hasPermission, permissionRequested, requestPermission]);
  const faceDetectorOutput = useMemo(
    () =>
      createFaceDetectorOutput({
        performanceMode: 'fast',
        runClassifications: true,
        runLandmarks: true,
        mirrorMode: 'on',
        onFacesDetected: (faces) => faceHandler.current(faces),
        onError: () => setCameraError(t('selfie.detector_error')),
      }),
    [],
  );

  const start = () => {
    if (!cameraActive) {
      Alert.alert(t('selfie.not_ready_title'), cameraError || t('selfie.not_ready_message'));
      return;
    }
    setStarted(true);
    setStep(0);
  };

  const handleFacesDetected = (faces: Face[]) => {
    const face = faces[0];
    const centered = !!face && face.frameWidth > 0 && face.frameHeight > 0 &&
      Math.abs((face.bounds.x + face.bounds.width / 2) / face.frameWidth - 0.5) < 0.2 &&
      Math.abs((face.bounds.y + face.bounds.height / 2) / face.frameHeight - 0.5) < 0.25 &&
      face.bounds.width / face.frameWidth > 0.18 && face.bounds.width / face.frameWidth < 0.75;
    const eyesDetected = !!face?.landmarks?.LEFT_EYE && !!face.landmarks.RIGHT_EYE &&
      face.leftEyeOpenProbability !== undefined && face.rightEyeOpenProbability !== undefined;
    const mouthDetected = !!face?.landmarks?.MOUTH_BOTTOM;
    setFaceCentered((current) => current === centered ? current : centered);
    setEyesVisible((current) => current === eyesDetected ? current : eyesDetected);
    setMouthVisible((current) => current === mouthDetected ? current : mouthDetected);
    if (!started || !face) return;
    const valid = step === 0
      ? centered && face.yawAngle > 15
      : step === 1
        ? centered && face.yawAngle < -15
        : face.leftEyeOpenProbability !== undefined && face.rightEyeOpenProbability !== undefined &&
          face.leftEyeOpenProbability < 0.35 && face.rightEyeOpenProbability < 0.35;
    if (valid) next();
  };

  faceHandler.current = handleFacesDetected;

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    setStarted(false);
    navigation?.navigate?.('AccountManagement', {
      verification: 'success',
      source: route?.params?.source || 'AccountManagement',
    });
  };

  return (
    <AppScreen scroll showTopHeader style={styles.safeArea}>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View style={styles.shield}>
            <Ionicons name="shield-checkmark" size={30} color="#0C9F68" />
          </View>
          <View style={styles.sectionText}>
            <Text style={styles.sectionTitle}>{t('selfie.section_title')}</Text>
            <Text style={styles.sectionDescription}>{t('selfie.section_description')}</Text>
          </View>
        </View>
        <View style={styles.cameraContainer}>
          {cameraActive ? (
            <Camera
              style={styles.cameraPreview}
              device={device!}
              isActive={cameraActive}
              implementationMode="compatible"
              outputs={[faceDetectorOutput]}
              onPreviewStarted={() => {
                setPreviewReady(true);
                setCameraError('');
              }}
              onPreviewStopped={() => setPreviewReady(false)}
              onError={() => setCameraError(t('selfie.camera_error'))}
              pointerEvents="auto"
              onLayout={() => undefined}
              nativeID="selfie-camera"
            />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="camera-outline" size={44} color="#8996B1" />
              <Text style={styles.placeholderText}>
                {device ? t('selfie.allow_camera') : t('selfie.no_camera')}
              </Text>
            </View>
          )}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          <View style={styles.faceOval} />
          <View style={styles.cameraStatus}>
            <View style={styles.activeDot} />
            <Text style={styles.statusText}>
              {cameraError
                ? t('selfie.status_problem')
                : !cameraActive
                  ? device
                    ? t('selfie.status_permission')
                    : t('selfie.status_unavailable')
                  : previewReady
                    ? t('selfie.status_active')
                    : t('selfie.status_connecting')}
            </Text>
          </View>
        </View>
        {cameraError ? <Text style={styles.cameraError}>{cameraError}</Text> : null}
        <View style={styles.instructions}>
          <Instruction icon="camera-outline" text={t('selfie.position_face')} detected={faceCentered} status={faceCentered ? t('selfie.detected') : t('selfie.not_detected')} />
          {faceCentered ? <Instruction icon="sunny-outline" text={t('selfie.lighting')} detected={eyesVisible} status={eyesVisible ? t('selfie.detected') : t('selfie.not_detected')} /> : null}
          {eyesVisible ? <Instruction icon="glasses-outline" text={t('selfie.remove_accessories')} detected={mouthVisible} status={mouthVisible ? t('selfie.detected') : t('selfie.not_detected')} /> : null}
        </View>
        <View style={styles.stepCard}>
          <View style={styles.stepIllustration}>
            <Image
              source={step === 0 ? require('../../assets/illustrations/liveness_1.png') : require('../../assets/illustrations/liveness_2.png')}
              resizeMode="contain"
              style={[styles.stepImage, step === 1 && styles.stepImageFlipped]}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t(STEPS[step][0])}</Text>
            <Text style={styles.stepDescription}>{t(STEPS[step][1])}</Text>
          </View>
        </View>
        <Pressable onPress={start} disabled={started} style={styles.primaryButton}>
          <Ionicons name="scan-outline" size={25} color={COLORS.white} />
          <Text style={styles.primaryText}>
            {started ? t('selfie.continue') : t('selfie.start')}
          </Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation?.goBack()}
        >
          <Text style={styles.secondaryText}>{t('selfie.later')}</Text>
        </Pressable>
        <View style={styles.security}>
          <Ionicons name="lock-closed-outline" size={19} color="#6B7B9D" />
          <Text style={styles.securityText}>{t('selfie.security')}</Text>
        </View>
      </View>
    </AppScreen>
  );
}

function Instruction({ icon, text, detected, status }: { icon: keyof typeof Ionicons.glyphMap; text: string; detected: boolean; status: string }) {
  return (
    <View style={styles.instruction}>
      <View style={styles.instructionIcon}>
        <Ionicons name={icon} size={25} color={COLORS.navy} />
      </View>
      <View style={styles.instructionCopy}>
        <Text style={styles.instructionText}>{text}</Text>
        <Text style={[styles.instructionStatus, detected && styles.instructionStatusDetected]}>{status}</Text>
      </View>
      <Ionicons name={detected ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={detected ? COLORS.green : COLORS.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4FAFF' },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 30,
    padding: 16,
    paddingTop: 20,
    shadowColor: '#1A3B77',
    shadowOpacity: 0.11,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  shield: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionText: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.navy },
  sectionDescription: { fontSize: 13, lineHeight: 19, color: COLORS.navy, marginTop: 3 },
  cameraPreview: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 },
  cameraContainer: {
    height: 265,
    backgroundColor: '#D8DCE3',
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 35 },
  placeholderText: { marginTop: 12, textAlign: 'center', color: '#64748B', fontSize: 13 },
  faceOval: {
    position: 'absolute',
    width: 205,
    height: 220,
    borderWidth: 3,
    borderColor: '#FFF',
    borderRadius: 120,
  },
  cameraStatus: {
    position: 'absolute',
    top: 8,
    backgroundColor: '#12C96D',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeDot: { width: 9, height: 9, backgroundColor: '#FFF', borderRadius: 5 },
  statusText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  corner: { position: 'absolute', width: 23, height: 23, borderColor: '#FFF', borderWidth: 3 },
  topLeft: { top: 17, left: 17, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 9 },
  topRight: {
    top: 17,
    right: 17,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 9,
  },
  bottomLeft: {
    bottom: 17,
    left: 17,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 9,
  },
  bottomRight: {
    bottom: 17,
    right: 17,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 9,
  },
  cameraError: { color: '#B42318', fontSize: 12, marginTop: 8, textAlign: 'center' },
  instructions: { marginTop: 18, marginBottom: 18, gap: 9, paddingHorizontal: 8 },
  instruction: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  instructionCopy: { flex: 1 },
  instructionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EDF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: { color: COLORS.navy, fontSize: 15, fontWeight: '500' },
  instructionStatus: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  instructionStatusDetected: { color: COLORS.green, fontWeight: '700' },
  stepCard: {
    minHeight: 115,
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    backgroundColor: '#E2F8EE',
  },
  stepIllustration: { width: 68, height: 75, alignItems: 'center', justifyContent: 'center' },
  stepImage: { width: 68, height: 75 },
  stepImageFlipped: { transform: [{ scaleX: -1 }] },
  divider: { width: 1, height: 66, backgroundColor: COLORS.navy, opacity: 0.7 },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '800', color: COLORS.navy, marginBottom: 5 },
  stepDescription: { fontSize: 12, color: COLORS.navy, lineHeight: 17 },
  progress: { alignItems: 'center', alignSelf: 'flex-start', gap: 12 },
  counter: { fontSize: 10, color: COLORS.navy },
  dots: { flexDirection: 'row', gap: 7 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#DCE1F2' },
  dotActive: { backgroundColor: COLORS.primary },
  primaryButton: {
    height: 54,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: COLORS.primary,
  },
  primaryText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  secondaryButton: {
    height: 50,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 9,
  },
  secondaryText: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
  security: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    marginTop: 22,
    paddingHorizontal: 8,
  },
  securityText: {
    flexShrink: 1,
    color: COLORS.muted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
