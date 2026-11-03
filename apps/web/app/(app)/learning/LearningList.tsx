'use client';

import React from 'react';
import { fioriIcons } from '@/components/fiori/FioriIcon';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  AnalyticalTable,
  Button,
  Card,
  Dialog,
  FilterBar,
  FilterGroupItem,
  Input,
  Label,
  MessageStrip,
  ObjectStatus,
  Option,
  ProgressIndicator,
  Select,
  TextArea,
  Title,
  Text,
} from '@ui5/webcomponents-react';
import FioriPage from '@/components/fiori/FioriPage';
import { FioriEmptyState } from '@/components/fiori/FioriStates';
import type { FioriState } from '@/lib/fiori-status';

export interface ModuleItem {
  id: string;
  judul: string;
  kategori: string;
  deskripsi: string;
  durasiMenit: number;
  konten?: string;
  videoUrl?: string | null;
  selesai: number;
  totalMandor: number;
  completionPct: number | null;
  progressList?: { userId: string; isCompleted: boolean }[];
}

export interface UserOption {
  id: string;
  nama: string;
  role: string;
}

type CellProps = { cell: { row: { original: Record<string, unknown> } } };
const asModule = (p: CellProps) => p.cell.row.original as unknown as ModuleItem;

type CompletionLabelKey =
  | 'learning:list.status_no_data'
  | 'learning:list.status_good'
  | 'learning:list.status_in_progress'
  | 'learning:list.status_low';

function completionInfo(pct: number | null): { state: FioriState; labelKey: CompletionLabelKey } {
  if (pct === null) return { state: 'None', labelKey: 'learning:list.status_no_data' };
  if (pct >= 80) return { state: 'Positive', labelKey: 'learning:list.status_good' };
  if (pct >= 40) return { state: 'Critical', labelKey: 'learning:list.status_in_progress' };
  return { state: 'Negative', labelKey: 'learning:list.status_low' };
}

export default function LearningList({
  modules,
  users = [],
  tenantNama,
}: {
  modules: ModuleItem[];
  users?: UserOption[];
  tenantNama: string;
}) {
  const { t } = useTranslation(['learning', 'common']);
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [kategori, setKategori] = React.useState('ALL');
  const [toastMessage, setToastMessage] = React.useState<{
    text: string;
    design: 'Positive' | 'Negative';
  } | null>(null);

  // Read Module Dialog State
  const [selectedModule, setSelectedModule] = React.useState<ModuleItem | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState(users[0]?.id || '');
  const [completingBusy, setCompletingBusy] = React.useState(false);

  // Create Module Dialog State
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newJudul, setNewJudul] = React.useState('');
  const [newKategori, setNewKategori] = React.useState('Agronomi');
  const [newDeskripsi, setNewDeskripsi] = React.useState('');
  const [newDurasi, setNewDurasi] = React.useState('15');
  const [newKonten, setNewKonten] = React.useState('');
  const [newVideoUrl, setNewVideoUrl] = React.useState('');
  const [createBusy, setCreateBusy] = React.useState(false);

  const kategoriOptions = Array.from(new Set(modules.map((m) => m.kategori)));

  const handleMarkComplete = async () => {
    if (!selectedModule || !selectedUserId) return;
    setCompletingBusy(true);
    try {
      const res = await fetch('/api/learning/progress', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          moduleId: selectedModule.id,
          isCompleted: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Gagal menyimpan progres');
      }
      setToastMessage({
        text: String(t('learning:module.mark_success')),
        design: 'Positive' as const,
      });
      setSelectedModule(null);
      router.refresh();
    } catch (e) {
      setToastMessage({
        text: e instanceof Error ? e.message : 'Error',
        design: 'Negative',
      });
    } finally {
      setCompletingBusy(false);
    }
  };

  const handleCreateModule = async () => {
    if (!newJudul.trim() || !newDeskripsi.trim() || !newKonten.trim()) {
      setToastMessage({ text: t('common:message.required_fields'), design: 'Negative' });
      return;
    }
    setCreateBusy(true);
    try {
      const res = await fetch('/api/learning/modules', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          judul: newJudul.trim(),
          kategori: newKategori.trim(),
          deskripsi: newDeskripsi.trim(),
          durasiMenit: Number(newDurasi) || 15,
          konten: newKonten.trim(),
          videoUrl: newVideoUrl.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Gagal membuat modul');
      }
      setToastMessage({
        text: String(t('learning:module.create_success')),
        design: 'Positive' as const,
      });
      setCreateOpen(false);
      setNewJudul('');
      setNewDeskripsi('');
      setNewKonten('');
      setNewVideoUrl('');
      router.refresh();
    } catch (e) {
      setToastMessage({
        text: e instanceof Error ? e.message : 'Error',
        design: 'Negative',
      });
    } finally {
      setCreateBusy(false);
    }
  };

  const filtered = modules.filter((m) => {
    const matchesQuery =
      !query ||
      [m.judul, m.kategori, m.deskripsi].join(' ').toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (kategori === 'ALL' || m.kategori === kategori);
  });

  const columns = [
    { Header: t('learning:list.column_material'), accessor: 'judul' },
    { Header: t('common:column.category'), accessor: 'kategori' },
    {
      Header: t('learning:list.column_duration'),
      accessor: 'durasiMenit',
      Cell: (p: CellProps) => (
        <span>{t('learning:list.duration_value', { minutes: asModule(p).durasiMenit })}</span>
      ),
    },
    {
      Header: t('learning:list.column_completed_mandor'),
      accessor: 'selesai',
      Cell: (p: CellProps) => {
        const m = asModule(p);
        return <span>{`${m.selesai} / ${m.totalMandor}`}</span>;
      },
    },
    {
      Header: t('learning:list.column_completion'),
      accessor: 'completionPct',
      Cell: (p: CellProps) => {
        const m = asModule(p);
        if (m.completionPct === null) return <span>{t('common:state.no_value')}</span>;
        return (
          <ProgressIndicator
            value={m.completionPct}
            valueState={completionInfo(m.completionPct).state}
            displayValue={`${m.completionPct}%`}
          />
        );
      },
    },
    {
      Header: t('common:column.status'),
      accessor: 'id',
      Cell: (p: CellProps) => {
        const info = completionInfo(asModule(p).completionPct);
        return (
          <ObjectStatus state={info.state} showDefaultIcon>
            {t(info.labelKey)}
          </ObjectStatus>
        );
      },
    },
    {
      Header: t('common:column.action'),
      accessor: 'action',
      Cell: (p: CellProps) => {
        const m = asModule(p);
        return (
          <Button
            design="Transparent"
            icon={fioriIcons['education']}
            onClick={() => setSelectedModule(m)}
          >
            {t('learning:module.read_module')}
          </Button>
        );
      },
    },
  ];

  return (
    <FioriPage
      title={t('learning:list.page_title')}
      subtitle={t('learning:list.subtitle', { tenant: tenantNama, total: modules.length })}
      breadcrumb={t('learning:list.breadcrumb')}
      actions={
        <Button design="Emphasized" icon={fioriIcons['add']} onClick={() => setCreateOpen(true)}>
          {t('learning:module.create_module')}
        </Button>
      }
      headerContent={
        <FilterBar
          header={<Title level="H5">{t('learning:list.filter_title')}</Title>}
          hideFilterConfiguration
          hideToggleFiltersButton
          showClearOnFB
          onClear={() => {
            setQuery('');
            setKategori('ALL');
          }}
          search={
            <Input
              placeholder={t('learning:list.search_placeholder')}
              showClearIcon
              value={query}
              onInput={(e) => setQuery(e.target.value)}
            />
          }
        >
          <FilterGroupItem filterKey="kategori" label={t('learning:list.filter_category_label')}>
            <Select
              value={kategori}
              onChange={(e) => setKategori(e.detail.selectedOption.value ?? 'ALL')}
            >
              <Option value="ALL">{t('common:filter.all_category')}</Option>
              {kategoriOptions.map((k) => (
                <Option key={k} value={k}>
                  {k}
                </Option>
              ))}
            </Select>
          </FilterGroupItem>
        </FilterBar>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {toastMessage && (
          <MessageStrip design={toastMessage.design} onClose={() => setToastMessage(null)}>
            {toastMessage.text}
          </MessageStrip>
        )}

        <Card>
          <div style={{ padding: '1rem' }}>
            {modules.length === 0 ? (
              <FioriEmptyState
                titleText={String(t('learning:list.empty_title'))}
                subtitleText={String(t('learning:list.empty_subtitle'))}
                actionText={String(t('learning:module.create_module'))}
                onAction={() => setCreateOpen(true)}
              />
            ) : (
              <AnalyticalTable
                columns={columns}
                data={filtered}
                filterable
                sortable
                visibleRows={10}
                noDataText={t('learning:list.no_data')}
                accessibleName={t('learning:list.table_accessible_name')}
              />
            )}
          </div>
        </Card>
      </div>

      {/* Dialog Pelajari Materi (Module Viewer) */}
      <Dialog
        open={Boolean(selectedModule)}
        headerText={selectedModule?.judul || t('learning:module.read_module')}
        footer={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              padding: '0.5rem',
            }}
          >
            <Button design="Transparent" onClick={() => setSelectedModule(null)}>
              {t('common:action.close')}
            </Button>
            {users.length > 0 && (
              <Button
                design="Emphasized"
                icon={fioriIcons['complete']}
                loading={completingBusy}
                disabled={completingBusy}
                onClick={handleMarkComplete}
              >
                {t('learning:module.mark_complete')}
              </Button>
            )}
          </div>
        }
      >
        {selectedModule && (
          <div
            style={{
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              minWidth: '450px',
              maxWidth: '650px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--sapList_BorderColor)',
                paddingBottom: '0.5rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--sapContent_LabelColor)' }}>
                  {selectedModule.kategori}
                </span>
                <Title level="H4">{selectedModule.judul}</Title>
              </div>
              <ObjectStatus state="Information" showDefaultIcon>
                {`${selectedModule.durasiMenit} Menit`}
              </ObjectStatus>
            </div>

            <div>
              <Text style={{ fontStyle: 'italic', color: 'var(--sapContent_LabelColor)' }}>
                {selectedModule.deskripsi}
              </Text>
            </div>

            {selectedModule.videoUrl && (
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--sapList_Background)',
                  borderRadius: '4px',
                  border: '1px solid var(--sapList_BorderColor)',
                }}
              >
                <Label>{t('learning:module.video_guide_label')}:</Label>
                <div>
                  <a
                    href={selectedModule.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--sapBrandColor)', textDecoration: 'underline' }}
                  >
                    {selectedModule.videoUrl}
                  </a>
                </div>
              </div>
            )}

            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--sapList_Background)',
                borderRadius: '6px',
                border: '1px solid var(--sapList_BorderColor)',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              {selectedModule.konten || selectedModule.deskripsi}
            </div>

            {users.length > 0 && (
              <div
                style={{ borderTop: '1px solid var(--sapList_BorderColor)', paddingTop: '0.75rem' }}
              >
                <Label required>{t('learning:module.select_employee')}</Label>
                <Select
                  style={{ width: '100%', marginTop: '0.25rem' }}
                  onChange={(e) => setSelectedUserId(e.detail.selectedOption.value || '')}
                >
                  {users.map((u) => (
                    <Option key={u.id} value={u.id} selected={selectedUserId === u.id}>
                      {`${u.nama} (${u.role})`}
                    </Option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Dialog Buat Modul Belajar Baru */}
      <Dialog
        open={createOpen}
        headerText={t('learning:module.create_module')}
        footer={
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.5rem',
              width: '100%',
              padding: '0.5rem',
            }}
          >
            <Button design="Transparent" onClick={() => setCreateOpen(false)}>
              {t('common:action.cancel')}
            </Button>
            <Button
              design="Emphasized"
              loading={createBusy}
              disabled={createBusy}
              onClick={handleCreateModule}
            >
              {t('common:action.save')}
            </Button>
          </div>
        }
      >
        <div
          style={{
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            minWidth: '450px',
            maxWidth: '600px',
          }}
        >
          <div>
            <Label required>{t('learning:module.title_label')}</Label>
            <Input
              value={newJudul}
              style={{ width: '100%' }}
              placeholder="Contoh: Teknik Pruning Pelepah Sawit Sesuai SOP"
              onInput={(e) => setNewJudul(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <Label required>{t('learning:module.category_label')}</Label>
              <Select
                style={{ width: '100%' }}
                onChange={(e) => setNewKategori(e.detail.selectedOption.value || 'Agronomi')}
              >
                <Option value="Agronomi" selected={newKategori === 'Agronomi'}>
                  {t('learning:module.cat_agronomy')}
                </Option>
                <Option value="Panen" selected={newKategori === 'Panen'}>
                  {t('learning:module.cat_harvest')}
                </Option>
                <Option value="Pemupukan" selected={newKategori === 'Pemupukan'}>
                  {t('learning:module.cat_fertilizing')}
                </Option>
                <Option value="K3" selected={newKategori === 'K3'}>
                  {t('learning:module.cat_k3')}
                </Option>
                <Option value="Perawatan" selected={newKategori === 'Perawatan'}>
                  {t('learning:module.cat_maintenance')}
                </Option>
              </Select>
            </div>
            <div style={{ width: '140px' }}>
              <Label required>{t('learning:module.duration_label')}</Label>
              <Input
                type="Number"
                value={newDurasi}
                style={{ width: '100%' }}
                onInput={(e) => setNewDurasi(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label required>{t('learning:module.desc_label')}</Label>
            <Input
              value={newDeskripsi}
              style={{ width: '100%' }}
              placeholder="Deskripsi singkat modul..."
              onInput={(e) => setNewDeskripsi(e.target.value)}
            />
          </div>

          <div>
            <Label>{t('learning:module.video_label')}</Label>
            <Input
              value={newVideoUrl}
              style={{ width: '100%' }}
              placeholder="https://..."
              onInput={(e) => setNewVideoUrl(e.target.value)}
            />
          </div>

          <div>
            <Label required>{t('learning:module.content_label')}</Label>
            <TextArea
              rows={5}
              value={newKonten}
              style={{ width: '100%' }}
              placeholder="Tuliskan langkah-langkah, SOP, dan hal-hal yang harus diperhatikan..."
              onInput={(e) => setNewKonten(e.target.value)}
            />
          </div>
        </div>
      </Dialog>
    </FioriPage>
  );
}
