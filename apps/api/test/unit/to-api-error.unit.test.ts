import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { AppError } from '../../src/shared/http/app-error.js';
import { toApiError } from '../../src/shared/http/to-api-error.js';

describe('toApiError', () => {
  it('keeps the status and code of an AppError', () => {
    const result = toApiError(new AppError('ALIAS_NOT_FOUND', 'No such alias.', 404));

    expect(result).toEqual({
      status: 404,
      body: { code: 'ALIAS_NOT_FOUND', message: 'No such alias.', details: undefined },
    });
  });

  it('maps a ZodError to 400 VALIDATION_ERROR with the field errors', () => {
    const parsed = z.object({ pseudo: z.string().min(2) }).safeParse({ pseudo: 'a' });
    if (parsed.success) throw new Error('expected a validation failure');

    const result = toApiError(parsed.error);

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('VALIDATION_ERROR');
    expect(result.body.details).toMatchObject({ fieldErrors: { pseudo: expect.any(Array) } });
  });

  it('answers 500 without echoing the internal message', () => {
    const result = toApiError(new Error('sqlite: disk I/O error at /app/data'));

    expect(result).toEqual({
      status: 500,
      body: { code: 'INTERNAL_ERROR', message: 'Unexpected server error.' },
    });
    expect(JSON.stringify(result)).not.toContain('sqlite');
  });
});
