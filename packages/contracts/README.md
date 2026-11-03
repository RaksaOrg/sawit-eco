# @sawit/contracts

Shared Zod schemas and TypeScript types for Web and Mobile API integration.

This package never imports Prisma. Prisma lives only in `apps/web/prisma` and `apps/web/lib/prisma.ts`.

## Modules

- `common` — API envelope, roles, status enums, pagination
- `auth` — login request
- `hris` — attendance create/correction, productivity, ranking
- `agronomy` — diagnosis request/result, recommendation, product link
- `commerce` — catalog, cart, order submit, approval, payment
- `learning` — lesson progress
- `agent` — agent state, anomaly, pipeline request
- `sync` — mobile offline outbox batch

## Usage

```ts
import { attendanceCreateSchema, type AttendanceCreateInput } from '@sawit/contracts';

const payload: AttendanceCreateInput = attendanceCreateSchema.parse(input);
```
