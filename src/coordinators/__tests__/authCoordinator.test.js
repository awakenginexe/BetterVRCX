import { describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
    state: { isLoggedIn: true, isFriendsLoaded: true, isFavoritesLoaded: true },
    auth: {
        updateStoredUser: vi.fn(),
        clearPendingCredentials: vi.fn(),
        loginForm: { lastUserLoggedIn: 'usr_a' },
        setAttemptingAutoLogin: vi.fn(),
        autoLoginAttempts: new Set([1])
    },
    close: vi.fn(),
    clear: vi.fn(),
    remove: vi.fn(),
    cache: vi.fn()
}));
vi.mock('../../plugins/i18n', () => ({
    i18n: { global: { t: (key) => key } }
}));
vi.mock('noty', () => ({
    default: class {
        show() {}
    }
}));
vi.mock('../../services/websocket', () => ({
    closeWebSocket: mocks.close,
    initWebsocket: vi.fn()
}));
vi.mock('../../shared/utils', () => ({ escapeTag: (value) => value }));
vi.mock('../../queries', () => ({ queryClient: { clear: mocks.cache } }));
vi.mock('../../stores/auth', () => ({ useAuthStore: () => mocks.auth }));
vi.mock('../../stores/user', () => ({
    useUserStore: () => ({
        currentUser: { id: 'usr_a' },
        setUserDialogVisible: vi.fn()
    })
}));
vi.mock('../../stores/notification', () => ({
    useNotificationStore: () => ({ setNotificationInitStatus: vi.fn() })
}));
vi.mock('../../stores/updateLoop', () => ({ useUpdateLoopStore: () => ({}) }));
vi.mock('../userCoordinator', () => ({
    applyCurrentUser: vi.fn(),
    clearUserDialogCaches: vi.fn()
}));
vi.mock('../../services/watchState', () => ({ watchState: mocks.state }));
vi.mock('../../services/config', () => ({ default: { remove: mocks.remove } }));
vi.mock('../../services/webapi', () => ({
    default: { clearCookies: mocks.clear }
}));
import { runLogoutFlow } from '../authCoordinator';

describe('logout session cleanup', () => {
    it('detaches the socket and discards pending secrets before awaiting storage, then awaits cookie cleanup', async () => {
        let finish;
        mocks.auth.updateStoredUser.mockImplementation(() => {
            expect(mocks.close).toHaveBeenCalledTimes(1);
            expect(mocks.auth.clearPendingCredentials).toHaveBeenCalledTimes(1);
            return Promise.resolve();
        });
        mocks.clear.mockReturnValue(
            new Promise((resolve) => {
                finish = resolve;
            })
        );
        const pending = runLogoutFlow();
        await Promise.resolve();
        expect(mocks.state.isLoggedIn).toBe(false);
        expect(mocks.remove).not.toHaveBeenCalled();
        finish();
        await pending;
        expect(mocks.remove).toHaveBeenCalledWith('lastUserLoggedIn');
        expect(mocks.auth.loginForm.lastUserLoggedIn).toBe('');
        expect(mocks.auth.autoLoginAttempts.size).toBe(0);
        expect(mocks.cache).toHaveBeenCalledTimes(1);
    });
});
