'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  Button,
  Card,
  CheckBox,
  DatePicker,
  Form,
  FormItem,
  Input,
  Label,
  MessageStrip,
  Option,
  Select,
  TextArea,
} from '@ui5/webcomponents-react';
import FioriPage from '@/components/fiori/FioriPage';

interface BlockData {
  id: string;
  kode: string;
  luasHa: number;
  tahunTanam: number;
}
interface MandorData {
  id: string;
  nama: string;
  waNumber: string;
}
interface PrefillData {
  agronomyLogId?: string;
  blokKode?: string;
  aktivitas?: string;
  deskripsi?: string;
}

type FieldErrors = Partial<
  Record<'blokKode' | 'aktivitas' | 'targetKuantitas' | 'tanggalTarget', string>
>;

export default function TaskFormClient({
  blocks,
  mandors,
  prefill,
  tenantNama,
}: {
  blocks: BlockData[];
  mandors: MandorData[];
  prefill: PrefillData;
  tenantNama: string;
}) {
  const { t } = useTranslation(['tasks', 'common']);
  const router = useRouter();
  const [blokKode, setBlokKode] = React.useState(prefill.blokKode || blocks[0]?.kode || '');
  const [aktivitas, setAktivitas] = React.useState(prefill.aktivitas || 'Panen');
  const [deskripsi, setDeskripsi] = React.useState(prefill.deskripsi || '');
  const [targetKuantitas, setTargetKuantitas] = React.useState('');
  const [satuanTarget, setSatuanTarget] = React.useState('Kg');
  const [tanggalTarget, setTanggalTarget] = React.useState(new Date().toISOString().slice(0, 10));
  const [prioritas, setPrioritas] = React.useState('MEDIUM');
  const [mandorId, setMandorId] = React.useState(mandors[0]?.id || '');
  const [kirimNotifWa, setKirimNotifWa] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<FieldErrors>({});

  type ActivityLabelKey =
    | 'tasks:form.activity_panen'
    | 'tasks:form.activity_pemupukan'
    | 'tasks:form.activity_pruning'
    | 'tasks:form.activity_penyemprotan'
    | 'tasks:form.activity_perawatan';

  const activityLabel = (aktivitasValue: string) => {
    const keys: Record<string, ActivityLabelKey> = {
      Panen: 'tasks:form.activity_panen',
      Pemupukan: 'tasks:form.activity_pemupukan',
      Pruning: 'tasks:form.activity_pruning',
      'Penyemprotan Hama': 'tasks:form.activity_penyemprotan',
      Perawatan: 'tasks:form.activity_perawatan',
    };
    return keys[aktivitasValue] ? t(keys[aktivitasValue]) : aktivitasValue;
  };

  const selectValue = (event: { detail: { selectedOption: { value?: string } } }) =>
    event.detail.selectedOption.value ?? '';

  const handleSubmit = async () => {
    const next: FieldErrors = {};
    if (!blokKode) next.blokKode = t('tasks:form.error_block_required');
    if (!aktivitas) next.aktivitas = t('tasks:form.error_activity_required');
    if (!targetKuantitas || Number(targetKuantitas) <= 0) {
      next.targetKuantitas = t('tasks:form.error_target_required');
    }
    if (!tanggalTarget) next.tanggalTarget = t('tasks:form.error_due_date_required');
    setErrors(next);
    if (Object.keys(next).length) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockCode: blokKode,
          activity: aktivitas,
          description: deskripsi,
          agronomyLogId: prefill.agronomyLogId || null,
          targetQuantity: Number(targetKuantitas),
          targetUnit: satuanTarget,
          targetDate: tanggalTarget,
          priority: prioritas,
          supervisorId: mandorId || null,
          sendWhatsappNotification: kirimNotifWa,
        }),
      });
      if (!res.ok) throw new Error(t('tasks:form.error_create_failed'));
      router.push('/tasks');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('tasks:form.error_create_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FioriPage
      title={t('tasks:form.page_title')}
      subtitle={t('tasks:form.subtitle', { tenant: tenantNama })}
      breadcrumb={t('tasks:form.breadcrumb')}
    >
      <Card>
        <div style={{ padding: '1rem', maxWidth: '52rem' }}>
          {prefill.agronomyLogId ? (
            <MessageStrip design="Information" hideCloseButton style={{ marginBottom: '1rem' }}>
              {t('tasks:form.info_from_agronomy')}
            </MessageStrip>
          ) : null}
          {error ? (
            <MessageStrip design="Negative" hideCloseButton style={{ marginBottom: '1rem' }}>
              {error}
            </MessageStrip>
          ) : null}

          <Form layout="S1 M2 L2 XL2" labelSpan="S12 M12 L12 XL12">
            <FormItem labelContent={<Label required>{t('tasks:form.label_block')}</Label>}>
              <Select
                value={blokKode}
                valueState={errors.blokKode ? 'Negative' : 'None'}
                valueStateMessage={errors.blokKode ? <span>{errors.blokKode}</span> : undefined}
                onChange={(e) => setBlokKode(selectValue(e))}
              >
                {blocks.map((b) => (
                  <Option key={b.id} value={b.kode}>
                    {t('tasks:form.option_block', {
                      kode: b.kode,
                      luas: b.luasHa,
                      tahun: b.tahunTanam,
                    })}
                  </Option>
                ))}
              </Select>
            </FormItem>

            <FormItem labelContent={<Label required>{t('tasks:form.label_activity')}</Label>}>
              <Select
                value={aktivitas}
                valueState={errors.aktivitas ? 'Negative' : 'None'}
                valueStateMessage={errors.aktivitas ? <span>{errors.aktivitas}</span> : undefined}
                onChange={(e) => setAktivitas(selectValue(e))}
              >
                {['Panen', 'Pemupukan', 'Pruning', 'Penyemprotan Hama', 'Perawatan'].map((a) => (
                  <Option key={a} value={a}>
                    {activityLabel(a)}
                  </Option>
                ))}
              </Select>
            </FormItem>

            <FormItem labelContent={<Label required>{t('tasks:form.label_target')}</Label>}>
              <Input
                type="Number"
                placeholder={t('tasks:form.placeholder_target')}
                value={targetKuantitas}
                valueState={errors.targetKuantitas ? 'Negative' : 'None'}
                valueStateMessage={
                  errors.targetKuantitas ? <span>{errors.targetKuantitas}</span> : undefined
                }
                onInput={(e) => setTargetKuantitas(e.target.value)}
              />
            </FormItem>

            <FormItem labelContent={<Label>{t('tasks:form.label_unit')}</Label>}>
              <Select value={satuanTarget} onChange={(e) => setSatuanTarget(selectValue(e))}>
                {['Kg', 'Ha', 'Pokok'].map((s) => (
                  <Option key={s} value={s}>
                    {s}
                  </Option>
                ))}
              </Select>
            </FormItem>

            <FormItem labelContent={<Label required>{t('tasks:form.label_due_date')}</Label>}>
              <DatePicker
                value={tanggalTarget}
                formatPattern="yyyy-MM-dd"
                valueState={errors.tanggalTarget ? 'Negative' : 'None'}
                valueStateMessage={
                  errors.tanggalTarget ? <span>{errors.tanggalTarget}</span> : undefined
                }
                onChange={(e) => setTanggalTarget(e.target.value)}
              />
            </FormItem>

            <FormItem labelContent={<Label>{t('tasks:form.label_priority')}</Label>}>
              <Select value={prioritas} onChange={(e) => setPrioritas(selectValue(e))}>
                <Option value="LOW">{t('tasks:form.priority_low')}</Option>
                <Option value="MEDIUM">{t('tasks:form.priority_medium')}</Option>
                <Option value="HIGH">{t('tasks:form.priority_high')}</Option>
                <Option value="URGENT">{t('tasks:form.priority_urgent')}</Option>
              </Select>
            </FormItem>

            <FormItem labelContent={<Label>{t('tasks:form.label_mandor')}</Label>}>
              <Select value={mandorId} onChange={(e) => setMandorId(selectValue(e))}>
                <Option value="">{t('tasks:form.option_unassigned')}</Option>
                {mandors.map((m) => (
                  <Option key={m.id} value={m.id}>
                    {t('tasks:form.option_mandor', { nama: m.nama, wa: m.waNumber })}
                  </Option>
                ))}
              </Select>
            </FormItem>

            <FormItem labelContent={<Label>{t('tasks:form.label_instruction')}</Label>}>
              <TextArea
                rows={3}
                placeholder={t('tasks:form.placeholder_instruction')}
                value={deskripsi}
                onInput={(e) => setDeskripsi(e.target.value)}
              />
            </FormItem>

            <FormItem labelContent={<Label>{t('tasks:form.label_notification')}</Label>}>
              <CheckBox
                text={t('tasks:form.checkbox_wa')}
                checked={kirimNotifWa}
                onChange={(e) => setKirimNotifWa(e.target.checked)}
              />
            </FormItem>
          </Form>
        </div>

        <Bar
          endContent={
            <>
              <Button
                design="Transparent"
                disabled={isSubmitting}
                onClick={() => router.push('/tasks')}
              >
                {t('common:button.cancel')}
              </Button>
              <Button
                design="Emphasized"
                loading={isSubmitting}
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                {t('tasks:form.submit_button')}
              </Button>
            </>
          }
        />
      </Card>
    </FioriPage>
  );
}
