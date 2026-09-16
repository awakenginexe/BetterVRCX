import { ref } from 'vue';
import { defineStore } from 'pinia';
import configRepository from '../config';
import { createAppUsageTracker } from './tracker';

// Amplitude client/project key is public and included in the application bundle.
const API_KEY = 'c307cde012b9dc860b44c9565797bc93';
const ENABLED_KEY = 'BetterVRCX_appUsageAnalyticsEnabled';
export const useAppAnalyticsStore = defineStore('AppAnalytics', () => {
    const enabled = ref(true);
    let initialization;
    let preferenceChanged = false;
    let booted = false;
    let tracker;
    function init() {
        initialization ??= configRepository
            .getBool(ENABLED_KEY, true)
            .then((saved) => {
                if (!preferenceChanged) enabled.value = saved === true;
            })
            .catch(() => {
                if (!preferenceChanged) enabled.value = false;
            });
        return initialization;
    }
    function start() {
        if (!booted || !enabled.value || !import.meta.env.PROD) return;
        tracker ??= createAppUsageTracker({
            apiKey: API_KEY,
            version: VERSION.match(/\d+\.\d+\.\d+/)?.[0] || VERSION,
            getSession: () => AppApi.GetAppUsageSession(),
            loadClient: async () =>
                (await import('@amplitude/analytics-browser')).createInstance()
        });
        void tracker.start();
    }
    async function boot() {
        if (booted) return;
        booted = true;
        // Main renderer only. Reload/HMR disposes timers without fabricating App Closed.
        window.betterVrcxAppUsageClosing = () => tracker?.close();
        window.addEventListener('pagehide', () => tracker?.dispose(), {
            once: true
        });
        await init();
        start();
    }
    function setEnabled(value) {
        preferenceChanged = true;
        enabled.value = value === true;
        if (!enabled.value) tracker?.disable();
        else start();
        return configRepository.setBool(ENABLED_KEY, enabled.value);
    }
    return { enabled, init, boot, setEnabled };
});
