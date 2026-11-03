import {
  apiErrorSchema,
  apiSuccessSchema,
  addCartItemSchema,
  agentPipelineRequestSchema,
  attendanceCreateSchema,
  attendanceCorrectionSchema,
  attendanceListResponseSchema,
  catalogProductSchema,
  diagnosisRequestSchema,
  diagnosisResultSchema,
  lessonProgressSchema,
  loginRequestSchema,
  orderDecisionSchema,
  orderSchema,
  orderSubmitSchema,
  paginationQuerySchema,
  paymentProofSchema,
  productivitySchema,
  recommendationProductCardSchema,
  riskAssessmentSchema,
  syncBatchSchema,
  syncEventSchema,
  type AttendanceCreateInput,
} from './index';

const ID = '123e4567-e89b-12d3-a456-426614174000';
const NOW = '2026-10-31T10:00:00.000Z';

describe('shared API contracts', () => {
  it('validates API envelopes', () => {
    expect(
      apiSuccessSchema(loginRequestSchema).parse({
        success: true,
        data: { email: 'owner@sawit.test', password: 'secret' },
        meta: { page: 1, limit: 20, total: 1, traceId: 'trace-1' },
      }).success,
    ).toBe(true);

    expect(
      apiErrorSchema.parse({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', traceId: 'trace-1' },
      }).error.code,
    ).toBe('VALIDATION_ERROR');
  });

  it('accepts valid auth, attendance, and correction payloads', () => {
    expect(loginRequestSchema.parse({ email: 'owner@sawit.test', password: 'secret' }).email).toBe(
      'owner@sawit.test',
    );

    const attendance: AttendanceCreateInput = attendanceCreateSchema.parse({
      userId: ID,
      blockCode: 'B2',
      workDate: '2026-10-31',
      idempotencyKey: 'attendance-1',
      overtimeHours: 2,
    });
    expect(attendance.status).toBe('PRESENT');
    expect(attendance.source).toBe('MOBILE');

    expect(
      attendanceCorrectionSchema.parse({
        id: ID,
        status: 'HALF_DAY',
        reason: 'Geofence correction',
      }).status,
    ).toBe('HALF_DAY');
  });

  it('accepts valid attendance list and productivity payloads', () => {
    expect(
      attendanceListResponseSchema.parse({
        records: [
          {
            id: ID,
            userId: ID,
            blockCode: 'B2',
            workDate: '2026-10-31',
            status: 'PRESENT',
            verificationStatus: 'VERIFIED',
            source: 'WHATSAPP',
            hkValue: 1,
            createdAt: NOW,
          },
        ],
        summary: { present: 1, halfDay: 0, absent: 0, totalHk: 1 },
      }).summary.totalHk,
    ).toBe(1);

    const productivity = productivitySchema.parse({
      scopeType: 'BLOCK',
      scopeId: 'B2',
      harvestKg: 5000,
      treatedHa: 8,
      hkTotal: 20,
      kgPerHk: 250,
      haPerHk: 1.6,
      rotationDays: 12,
      sampleSize: 20,
      formulaVersion: 'v1',
    });
    expect(productivity.kgPerHk).toBe(250);
  });

  it('accepts agronomy diagnosis and risk contracts', () => {
    expect(
      diagnosisRequestSchema.parse({
        blockCode: 'B2',
        symptoms: 'Yellow leaf margin',
        targetSku: 'FERT-KCL-25',
        dosageKgPerHa: 150,
        disclaimer: 'Adjust with leaf analysis',
        reason: 'Potassium deficiency',
      }).blockCode,
    ).toBe('B2');

    expect(
      diagnosisResultSchema.parse({
        status: 'RECOMMENDED',
        disclaimer: 'Adjust with official product label',
        product: {
          id: 'p1',
          sku: 'FERT-KCL-25',
          nama: 'KCl',
          harga: 500000,
          satuan: 'sak',
          ukuranKemasan: 50,
          isActive: true,
        },
        estimation: { luasHa: 8, totalKg: 1200, jumlahSak: 24, ukuranKemasanKg: 50 },
      }).status,
    ).toBe('RECOMMENDED');

    expect(
      riskAssessmentSchema.parse({
        blockCode: 'B2',
        diagnosis: 'Potassium deficiency',
        riskLevel: 'SEDANG',
        confidence: 0.78,
        actionsToday: ['Scout 10 palms'],
        actionsNextDays: ['Apply KCl'],
        lessonIds: ['LRN-K-01'],
        productSkus: ['FERT-KCL-25'],
        productGap: [],
        humanReviewRequired: false,
      }).confidence,
    ).toBe(0.78);
  });

  it('accepts commerce contracts and recommendation cards', () => {
    expect(
      catalogProductSchema.parse({
        id: 'p1',
        sku: 'FERT-KCL-25',
        name: 'KCl',
        category: 'FERTILIZER',
        unit: 'sak',
        packSize: 50,
        price: 500000,
        currency: 'IDR',
        stock: 10,
        isActive: true,
      }).regulatoryStatus,
    ).toBe('VALID');

    expect(
      addCartItemSchema.parse({
        productId: ID,
        quantity: 2,
        blockCode: 'B2',
        recommendationId: 'log-1',
      }).quantity,
    ).toBe(2);

    expect(
      orderSubmitSchema.parse({
        cartId: ID,
        estimateAcknowledged: true,
        idempotencyKey: 'order-1',
      }).paymentMethod,
    ).toBe('MANUAL_TRANSFER');

    expect(
      orderDecisionSchema.parse({
        orderId: ID,
        approverId: ID,
        decision: 'APPROVED',
      }).decision,
    ).toBe('APPROVED');

    expect(
      paymentProofSchema.parse({
        orderId: ID,
        amount: 6400000,
        reference: 'TRX-1',
      }).amount,
    ).toBe(6400000);

    expect(
      orderSchema.parse({
        id: ID,
        orderNo: 'SO-1',
        status: 'SUBMITTED',
        approvalStatus: 'PENDING',
        paymentStatus: 'UNPAID',
        total: 6400000,
        currency: 'IDR',
        createdAt: NOW,
      }).approvalStatus,
    ).toBe('PENDING');

    expect(
      recommendationProductCardSchema.parse({
        recommendationId: 'log-1',
        sku: 'FERT-KCL-25',
        productName: 'KCl',
        reason: 'Potassium deficiency',
        blockCode: 'B2',
        blockAreaHa: 8,
        estimatedQty: 24,
        qtyUnit: 'sak',
        estimateBasis: 'label_rate',
        isFinalDosage: false,
        warningKey: 'agronomy.warning.estimateNotDosage',
        priceEstimate: 12000000,
        stockStatus: 'AVAILABLE',
      }).isFinalDosage,
    ).toBe(false);
  });

  it('accepts learning, agent, and mobile sync contracts', () => {
    expect(
      lessonProgressSchema.parse({
        userId: ID,
        moduleId: ID,
        isCompleted: true,
      }).isCompleted,
    ).toBe(true);

    expect(
      agentPipelineRequestSchema.parse({
        text: 'Laporan panen',
        channel: 'WHATSAPP',
        commodityPricePerKg: 2500,
      }).channel,
    ).toBe('WHATSAPP');

    expect(
      syncEventSchema.parse({
        id: ID,
        type: 'ATTENDANCE',
        payload: { blockCode: 'B2' },
        createdAt: NOW,
        status: 'PENDING',
      }).type,
    ).toBe('ATTENDANCE');

    expect(
      syncBatchSchema.parse({
        deviceId: 'device-1',
        events: [
          {
            id: ID,
            type: 'ATTENDANCE',
            payload: { blockCode: 'B2' },
            createdAt: NOW,
            status: 'PENDING',
          },
        ],
      }).events,
    ).toHaveLength(1);

    expect(paginationQuerySchema.parse({ page: '2', limit: '50' })).toEqual({ page: 2, limit: 50 });
  });

  it('rejects invalid payloads', () => {
    expect(loginRequestSchema.safeParse({ email: 'bad', password: '' }).success).toBe(false);
    expect(
      attendanceCreateSchema.safeParse({
        userId: 'not-uuid',
        blockCode: '',
        workDate: '',
        idempotencyKey: '',
      }).success,
    ).toBe(false);
    expect(
      diagnosisRequestSchema.safeParse({
        blockCode: 'B2',
        symptoms: 'x',
        targetSku: 'x',
        dosageKgPerHa: -1,
        disclaimer: 'x',
        reason: 'x',
      }).success,
    ).toBe(false);
    expect(
      orderSubmitSchema.safeParse({
        cartId: 'bad',
        estimateAcknowledged: false,
        idempotencyKey: '',
      }).success,
    ).toBe(false);
    expect(syncBatchSchema.safeParse({ deviceId: 'd', events: [] }).success).toBe(false);
  });
});
