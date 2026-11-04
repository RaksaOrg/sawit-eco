import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { createFaceDetectorOutput, type Face } from 'react-native-vision-camera-face-detector';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  navy: '#102957',
  primary: '#605BFF',
  green: '#0FA65A',
  muted: '#5A6B8E',
  white: '#FFFFFF',
};
const STEPS = [
  ['Gerakkan kepala ke kanan', 'Ikuti instruksi untuk melanjutkan verifikasi.'],
  ['Gerakkan kepala ke kiri', 'Putar kepala perlahan ke arah kiri.'],
  ['Kedipkan mata', 'Kedipkan mata untuk menyelesaikan verifikasi.'],
] as const;

type Props = {
  navigation?: { goBack: () => void; navigate?: (screen: string, params?: unknown) => void };
  route?: { params?: { source?: string } };
};

export function SelfieVerificationScreen({ navigation, route }: Props) {
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [step, setStep] = useState(0);
  const [started, setStarted] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [previewReady, setPreviewReady] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const cameraActive = hasPermission && !!device;
  const faceHandler = useRef<(faces: Face[]) => void>(() => undefined);

  useEffect(() => {
    if (hasPermission || permissionRequested) return;
    setPermissionRequested(true);
    requestPermission()
      .then((granted) => {
        if (!granted)
          setCameraError('Izin kamera ditolak. Aktifkan izin kamera di pengaturan perangkat.');
      })
      .catch(() =>
        setCameraError('Izin kamera tidak dapat diminta. Periksa pengaturan perangkat.'),
      );
  }, [hasPermission, permissionRequested, requestPermission]);
  const faceDetectorOutput = useMemo(() => createFaceDetectorOutput({
    performanceMode: 'fast',
    runClassifications: true,
    runLandmarks: true,
    mirrorMode: 'on',
    onFacesDetected: (faces) => faceHandler.current(faces),
    onError: () => setCameraError('Face detection gagal menerima frame dari kamera.'),
  }), []);

  const start = () => {
    if (!cameraActive) {
      Alert.alert(
        'Kamera belum siap',
        cameraError || 'Tunggu izin kamera dan preview siap sebelum melanjutkan.',
      );
      return;
    }
    setStarted(true);
    setStep(0);
  };

  const handleFacesDetected = (
    faces: Array<{
      yawAngle: number;
      leftEyeOpenProbability?: number;
      rightEyeOpenProbability?: number;
    }>,
  ) => {
    const face = faces[0];
    if (!started || !face) return;
    const valid =
      step === 0
        ? face.yawAngle > 15
        : step === 1
          ? face.yawAngle < -15
          : (face.leftEyeOpenProbability ?? 1) < 0.35 && (face.rightEyeOpenProbability ?? 1) < 0.35;
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.topHeader}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="leaf" size={31} color="#0BA65B" />
            </View>
            <Text style={styles.brandText}>Sawit{`\n`}Ecosystem</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.notification}>
              <Ionicons name="notifications-outline" size={25} color={COLORS.navy} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
            </View>
            <View style={styles.avatar}>
              <Ionicons name="person" size={25} color={COLORS.primary} />
            </View>
          </View>
        </View>
        <View style={styles.pageTitle}>
          <Pressable onPress={() => navigation?.goBack()} hitSlop={10}>
            <Ionicons name="arrow-back" size={27} color={COLORS.navy} />
          </Pressable>
          <Text style={styles.title}>Verifikasi Identitas</Text>
        </View>
        <Text style={styles.subtitle}>
          Lakukan verifikasi selfie untuk menyimpan perubahan akun Anda.
        </Text>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.shield}>
              <Ionicons name="shield-checkmark" size={30} color="#0C9F68" />
            </View>
            <View style={styles.sectionText}>
              <Text style={styles.sectionTitle}>Verifikasi Selfie (Liveness)</Text>
              <Text style={styles.sectionDescription}>
                Pastikan wajah Anda terlihat jelas dan ikuti instruksi di layar.
              </Text>
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
                onError={(error) => setCameraError(error.message || 'Kamera gagal dimulai.')}
                pointerEvents="auto"
                onLayout={() => undefined}
                nativeID="selfie-camera"
              />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="camera-outline" size={44} color="#8996B1" />
                <Text style={styles.placeholderText}>
                  {device
                    ? 'Izinkan akses kamera untuk menampilkan wajah'
                    : 'Kamera depan tidak terdeteksi pada perangkat ini'}
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
                  ? 'Kamera bermasalah'
                  : !cameraActive
                    ? device
                      ? 'Izin kamera belum diberikan'
                      : 'Kamera depan tidak tersedia'
                    : previewReady
                      ? 'Kamera aktif'
                      : 'Menghubungkan kamera...'}
              </Text>
            </View>
          </View>
          {cameraError ? <Text style={styles.cameraError}>{cameraError}</Text> : null}
          <View style={styles.instructions}>
            <Instruction icon="camera-outline" text="Posisikan wajah di dalam lingkaran" />
            <Instruction icon="sunny-outline" text="Pastikan pencahayaan cukup" />
            <Instruction icon="glasses-outline" text="Lepaskan masker dan kacamata hitam" />
          </View>
          <View style={styles.stepCard}>
            <View style={styles.stepIllustration}>
              <Ionicons name="person-outline" size={50} color={COLORS.navy} />
              <Ionicons
                name="refresh-outline"
                size={24}
                color={COLORS.primary}
                style={styles.rotate}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{STEPS[step][0]}</Text>
              <Text style={styles.stepDescription}>{STEPS[step][1]}</Text>
            </View>
            <View style={styles.progress}>
              <Text style={styles.counter}>Langkah {step + 1} dari 3</Text>
              <View style={styles.dots}>
                {STEPS.map((_, index) => (
                  <View key={index} style={[styles.dot, index === step && styles.dotActive]} />
                ))}
              </View>
            </View>
          </View>
          <Pressable onPress={started ? next : start} style={styles.primaryButton}>
            <Ionicons name="scan-outline" size={25} color={COLORS.white} />
            <Text style={styles.primaryText}>
              {started ? 'Lanjutkan Verifikasi' : 'Mulai Verifikasi'}
            </Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() =>
              Alert.alert('Verifikasi Nanti', 'Anda dapat melakukan verifikasi di lain waktu.')
            }
          >
            <Text style={styles.secondaryText}>Verifikasi Nanti</Text>
          </Pressable>
          <View style={styles.security}>
            <Ionicons name="lock-closed-outline" size={19} color="#6B7B9D" />
            <Text style={styles.securityText}>
              Data selfie dienkripsi dan digunakan hanya untuk verifikasi identitas.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Instruction({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.instruction}>
      <View style={styles.instructionIcon}>
        <Ionicons name={icon} size={25} color={COLORS.navy} />
      </View>
      <Text style={styles.instructionText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4FAFF' },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 6,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 42, height: 46, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 17, fontWeight: '800', color: '#0A9F4C', lineHeight: 22 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  notification: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E4F8F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: 2,
    top: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF4F58',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F1FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 17,
    marginHorizontal: 14,
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.navy },
  subtitle: {
    fontSize: 14,
    color: COLORS.navy,
    lineHeight: 21,
    marginHorizontal: 14,
    marginBottom: 20,
  },
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
  instructionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EDF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: { flex: 1, color: COLORS.navy, fontSize: 15, fontWeight: '500' },
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
  rotate: { position: 'absolute', right: 0, top: 5 },
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
