import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, defineStore, setActivePinia } from 'pinia';
import { ref } from 'vue';

const mocks = vi.hoisted(() => ({
    config: vi.fn(),
    code: vi.fn(),
    status: vi.fn(),
    current: vi.fn(),
    queue: vi.fn(),
    error: vi.fn(),
    clear: vi.fn()
}));
const useFakeAuth = defineStore('QrAuthTest', () => ({
    loginForm: ref({ loading: false, saveCredentials: true }),
    queueSaveCredentials: mocks.queue,
    credentialsToSave: ref(null),
    clearPendingCredentials: vi.fn()
}));
vi.mock('../../../../stores/auth', () => ({
    useAuthStore: () => useFakeAuth()
}));
vi.mock('../../../../api', () => ({
    authRequest: {
        getConfig: mocks.config,
        getDeviceCode: mocks.code,
        getDeviceStatus: mocks.status
    }
}));
vi.mock('../../../../coordinators/userCoordinator', () => ({
    getCurrentUser: mocks.current
}));
vi.mock('../../../../services/webapi', () => ({
    default: { clearCookies: mocks.clear }
}));
vi.mock('../../../../services/appConfig', () => ({
    AppDebug: {
        endpointDomainVrchat: 'https://api.test',
        websocketDomainVrchat: 'wss://test'
    }
}));
vi.mock('vue-sonner', () => ({ toast: { error: mocks.error } }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('qrcode', () => ({
    default: {
        toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,test')
    }
}));
vi.mock('worker-timers', () => ({
    setTimeout: (...args) => setTimeout(...args),
    clearTimeout: (...args) => clearTimeout(...args)
}));

import QrLogin from '../QrLogin.vue';

describe('device login polling', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        setActivePinia(createPinia());
        mocks.clear.mockResolvedValue();
        mocks.config.mockResolvedValue();
        mocks.current.mockResolvedValue();
        mocks.code.mockResolvedValue({
            json: {
                deviceCode: 'code',
                verificationUrlComplete: 'https://vrchat.com/device?code=code',
                interval: 5,
                expiresIn: 60
            }
        });
        mocks.status.mockResolvedValue({ json: { user: { id: 'usr_a' } } });
    });
    afterEach(() => vi.useRealTimers());

    it('saves the device session before completing current-user login', async () => {
        const wrapper = mount(QrLogin);
        await wrapper.get('button').trigger('click');
        await flushPromises();
        expect(wrapper.find('img').exists()).toBe(true);
        expect(useFakeAuth().loginForm.loading).toBe(true);
        await vi.advanceTimersByTimeAsync(5000);
        await flushPromises();
        expect(mocks.status).toHaveBeenCalledWith({ deviceCode: 'code' });
        expect(mocks.queue).toHaveBeenCalledTimes(1);
        expect(mocks.current).toHaveBeenCalledTimes(1);
        expect(mocks.queue.mock.invocationCallOrder[0]).toBeLessThan(
            mocks.current.mock.invocationCallOrder[0]
        );
        expect(useFakeAuth().loginForm.loading).toBe(false);
        wrapper.unmount();
    });

    it('expires locally without polling an expired device code', async () => {
        mocks.code.mockResolvedValue({
            json: {
                deviceCode: 'code',
                verificationUrlComplete: 'https://vrchat.com/device',
                interval: 5,
                expiresIn: 2
            }
        });
        const wrapper = mount(QrLogin);
        await wrapper.get('button').trigger('click');
        await flushPromises();
        await vi.advanceTimersByTimeAsync(2000);
        await flushPromises();
        expect(mocks.status).not.toHaveBeenCalled();
        expect(mocks.error).toHaveBeenCalledWith('view.login.qr.failed');
        expect(useFakeAuth().loginForm.loading).toBe(false);
        wrapper.unmount();
    });

    it('ignores a canceled poll response and keeps other login paths locked until it settles', async () => {
        let finish;
        mocks.status.mockReturnValue(
            new Promise((resolve) => {
                finish = resolve;
            })
        );
        const wrapper = mount(QrLogin);
        await wrapper.get('button').trigger('click');
        await flushPromises();
        await vi.advanceTimersByTimeAsync(5000);
        await wrapper.get('button').trigger('click');
        expect(useFakeAuth().loginForm.loading).toBe(true);
        finish({ json: { user: { id: 'usr_late' } } });
        await flushPromises();
        expect(mocks.queue).not.toHaveBeenCalled();
        expect(mocks.current).not.toHaveBeenCalled();
        expect(useFakeAuth().loginForm.loading).toBe(false);
        wrapper.unmount();
    });

    it('cancels the pending timer immediately on unmount', async () => {
        const wrapper = mount(QrLogin);
        await wrapper.get('button').trigger('click');
        await flushPromises();
        wrapper.unmount();
        await flushPromises();
        await vi.advanceTimersByTimeAsync(60000);
        expect(mocks.status).not.toHaveBeenCalled();
        expect(useFakeAuth().loginForm.loading).toBe(false);
    });
});
