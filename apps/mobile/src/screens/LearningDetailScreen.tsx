import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {
  AppButton,
  AppCard,
  AppHeader,
  AppProgress,
  AppScreen,
  AppStatusBadge,
} from '../components/AppComponents';
import { foundationTokens } from '../theme/foundation/tokens';
import { semanticTokens } from '../theme/semantic/tokens';
import { useMobileAppStore } from '../state/store';
import { createTranslator } from '../i18n';
import { LearningModule } from '../core/api/hooks';
import { queueThenTrySync } from '../core/offline/actions';
import { enqueueEvent } from '../core/offline/outbox';

const QUIZ_ANSWERS = [1, 1, 0];

export function LearningDetailScreen({
  route,
  navigation,
}: {
  route: { params?: { module?: LearningModule; localUri?: string } };
  navigation: { goBack: () => void };
}) {
  const module = route.params?.module;
  const session = useMobileAppStore((s) => s.session);
  const language = useMobileAppStore((s) => s.language);
  const t = createTranslator(language);
  const quiz = [
    { question: t('learning.quiz_q1'), options: [t('learning.quiz_q1_o1'), t('learning.quiz_q1_o2'), t('learning.quiz_q1_o3')] },
    { question: t('learning.quiz_q2'), options: [t('learning.quiz_q2_o1'), t('learning.quiz_q2_o2'), t('learning.quiz_q2_o3')] },
    { question: t('learning.quiz_q3'), options: [t('learning.quiz_q3_o1'), t('learning.quiz_q3_o2'), t('learning.quiz_q3_o3')] },
  ];
  const [content, setContent] = useState(module?.konten || '');
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<'passed' | 'failed' | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const uri = route.params?.localUri;
    if (!uri) return;
    FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 })
      .then(setContent)
      .catch(() => undefined);
  }, [route.params?.localUri]);

  if (!module) {
    return (
      <AppScreen>
        <AppHeader title={t('learning.title')} onBack={() => navigation.goBack()} />
        <Text>{t('common.empty')}</Text>
      </AppScreen>
    );
  }

  const submitQuiz = async () => {
    const correct = answers.filter((answer, index) => answer === QUIZ_ANSWERS[index]).length;
    const passed = correct >= 2;
    setQuizResult(passed ? 'passed' : 'failed');
    if (!session?.userId || !passed) return;

    await queueThenTrySync(async () =>
      enqueueEvent('LEARNING_PROGRESS', {
        userId: session.userId,
        moduleId: module.id,
        isCompleted: true,
      }),
    );
    setSaved(true);
  };

  return (
    <AppScreen>
      <AppHeader
        title={module.judul}
        subtitle={module.kategori}
        onBack={() => navigation.goBack()}
      />
      <AppCard>
        <View style={styles.row}>
          <Text style={styles.title}>{module.judul}</Text>
          <AppStatusBadge text={`${module.durasiMenit} ${t('common.unit_minute')}`} variant="info" />
        </View>
        <Text style={styles.body}>{content || module.deskripsi}</Text>
        <AppProgress progress={saved ? 1 : 0.5} label={`${module.durasiMenit} ${t('common.unit_minute')}`} />
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>{t('learning.quiz')}</Text>
        {quiz.map((item, index) => (
          <View key={item.question} style={styles.question}>
            <Text style={styles.questionText}>{item.question}</Text>
            {item.options.map((option, optionIndex) => (
              <AppButton
                key={option}
                label={option}
                variant={answers[index] === optionIndex ? 'primary' : 'secondary'}
                onPress={() => {
                  const next = [...answers];
                  next[index] = optionIndex;
                  setAnswers(next);
                }}
              />
            ))}
          </View>
        ))}
        <AppButton
          label={t('learning.quizSubmit')}
          variant="primary"
          onPress={submitQuiz}
          disabled={answers.filter((answer) => answer !== undefined).length < quiz.length}
        />
        {quizResult ? (
          <Text
            style={[
              styles.result,
              {
                color:
                  quizResult === 'passed'
                    ? semanticTokens.color.success
                    : semanticTokens.color.error,
              },
            ]}
          >
            {quizResult === 'passed' ? t('learning.quizPassed') : t('learning.quizFailed')}
            {saved ? ` · ${t('learning.progressSaved')}` : ''}
          </Text>
        ) : null}
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: semanticTokens.color.textPrimary,
    fontSize: foundationTokens.typography.title.size,
    fontWeight: foundationTokens.typography.title.weight,
    flex: 1,
  },
  body: {
    color: semanticTokens.color.textPrimary,
    fontSize: foundationTokens.typography.bodyMedium.size,
    marginVertical: foundationTokens.spacing.sm,
  },
  sectionTitle: {
    color: semanticTokens.color.textPrimary,
    fontSize: foundationTokens.typography.title.size,
    fontWeight: foundationTokens.typography.title.weight,
    marginBottom: foundationTokens.spacing.sm,
  },
  question: {
    marginBottom: foundationTokens.spacing.md,
  },
  questionText: {
    color: semanticTokens.color.textPrimary,
    fontSize: foundationTokens.typography.bodyLarge.size,
    fontWeight: '600',
    marginBottom: foundationTokens.spacing.xs,
  },
  result: {
    fontSize: foundationTokens.typography.labelLarge.size,
    fontWeight: '600',
    marginTop: foundationTokens.spacing.sm,
  },
});
