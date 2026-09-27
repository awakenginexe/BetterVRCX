import { afterEach, expect, test, vi } from 'vitest';
import { WebApiService } from '../webapi';

const originalWebApi = globalThis.WebApi;

afterEach(() => {
    globalThis.WebApi = originalWebApi;
});

test('Windows bridge preserves status, body, and Retry-After', async () => {
    globalThis.WebApi = {
        Execute: vi.fn().mockResolvedValue({
            Item1: 429,
            Item2: '{"error":"slow down"}',
            Item3: '120'
        })
    };
    const result = await new WebApiService().execute({
        url: 'https://example.com/invite/usr_a'
    });
    expect(result).toEqual({
        status: 429,
        data: '{"error":"slow down"}',
        retryAfter: '120'
    });
});
