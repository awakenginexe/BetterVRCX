import { describe, expect, it, vi } from 'vitest';
const { request } = vi.hoisted(() => ({
    request: vi.fn().mockResolvedValue({ ok: true })
}));
vi.mock('../../services/request', () => ({ request }));
vi.mock('../../coordinators/userCoordinator', () => ({
    handleConfig: vi.fn()
}));
import authRequest from '../auth';

describe('device and password reset auth contracts', () => {
    it.each([
        ['getDeviceCode', 'auth/device/code', 'POST', undefined],
        [
            'getDeviceStatus',
            'auth/device/status',
            'POST',
            { deviceCode: 'one-time-device-code' }
        ],
        [
            'resetPassword',
            'auth/password',
            'PUT',
            { email: 'account@example.test' }
        ]
    ])(
        '%s uses the upstream endpoint and payload',
        async (method, endpoint, verb, params) => {
            await authRequest[method](params);
            expect(request).toHaveBeenLastCalledWith(endpoint, {
                method: verb,
                ...(params ? { params } : {})
            });
        }
    );
});
