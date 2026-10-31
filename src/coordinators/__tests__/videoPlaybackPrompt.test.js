import { beforeEach, expect, test, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
    confirm: vi.fn(),
    getBool: vi.fn(),
    setBool: vi.fn(),
    open: vi.fn()
}));
vi.mock('../../services/config', () => ({
    default: { getBool: mocks.getBool, setBool: mocks.setBool }
}));
vi.mock('../../stores/modal', () => ({
    useModalStore: () => ({ confirm: mocks.confirm })
}));
vi.mock('../../plugins/i18n', () => ({
    i18n: { global: { t: (key) => key } }
}));
beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    globalThis.AppApi = { OpenSteamStorePage: mocks.open };
    mocks.getBool.mockResolvedValue(false);
    mocks.confirm.mockResolvedValue({ ok: true, checked: false });
});
test('YouTube bot errors prompt once and open the actionable Steam page on acceptance', async () => {
    const { checkYoutubeBotError } = await import('../videoPlaybackPrompt');
    await checkYoutubeBotError('VideoError: Sign in to confirm');
    await checkYoutubeBotError('VideoError: Sign in to confirm');
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(mocks.open).toHaveBeenCalledWith(4296960);
});
test('dismissal can suppress future prompts without opening Steam', async () => {
    mocks.confirm.mockResolvedValue({ ok: false, checked: true });
    const { checkYoutubeBotError } = await import('../videoPlaybackPrompt');
    await checkYoutubeBotError('VideoError: Sign in to confirm');
    expect(mocks.setBool).toHaveBeenCalledWith(
        'VRCX_hideYoutubeBotErrorPrompt',
        true
    );
    expect(mocks.open).not.toHaveBeenCalled();
});
test('other playback errors and persisted suppression do not prompt', async () => {
    mocks.getBool.mockResolvedValue(true);
    const { checkYoutubeBotError } = await import('../videoPlaybackPrompt');
    await checkYoutubeBotError('VideoError: Unsupported codec');
    await checkYoutubeBotError('VideoError: Sign in to confirm');
    expect(mocks.confirm).not.toHaveBeenCalled();
});
