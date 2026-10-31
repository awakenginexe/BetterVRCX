<template>
    <div v-if="qrImage" class="mt-3 flex flex-col items-center gap-2 text-center">
        <img :src="qrImage" width="184" height="184" :alt="t('view.login.qr.button')" />
        <p class="text-xs text-muted-foreground">{{ t('view.login.qr.hint') }}</p>
    </div>
    <Button
        v-if="!active"
        variant="secondary"
        size="lg"
        class="mt-2 w-full"
        :disabled="loginForm.loading"
        @click="start">
        <QrCode />{{ t('view.login.qr.button') }}
    </Button>
    <Button v-else size="lg" variant="outline" class="mt-2 w-full" :disabled="finishing" @click="stop">{{
        t('view.login.qr.cancel')
    }}</Button>
</template>

<script setup>
    import { onBeforeUnmount, ref } from 'vue';
    import { Button } from '@/components/ui/button';
    import { QrCode } from 'lucide-vue-next';
    import { toast } from 'vue-sonner';
    import { useI18n } from 'vue-i18n';
    import { storeToRefs } from 'pinia';
    import QRCode from 'qrcode';
    import * as workerTimers from 'worker-timers';
    import { AppDebug } from '../../../services/appConfig';
    import { authRequest } from '../../../api';
    import { getCurrentUser } from '../../../coordinators/userCoordinator';
    import { useAuthStore } from '../../../stores/auth';
    import webApiService from '../../../services/webapi';

    const { t } = useI18n();
    const authStore = useAuthStore();
    const { loginForm } = storeToRefs(authStore);
    const active = defineModel('active', { type: Boolean, default: false });
    const qrImage = ref('');
    const finishing = ref(false);
    let session = 0;
    let pauseTimer;
    let resumePause;

    async function start() {
        if (active.value || loginForm.value.loading) return;
        const current = ++session;
        active.value = true;
        loginForm.value.loading = true;
        try {
            await webApiService.clearCookies();
            if (current !== session) return;
            AppDebug.endpointDomain = AppDebug.endpointDomainVrchat;
            AppDebug.websocketDomain = AppDebug.websocketDomainVrchat;
            await authRequest.getConfig();
            if (current !== session) return;
            const { json: device } = await authRequest.getDeviceCode();
            if (current !== session) return;
            if (!device?.deviceCode || !device.verificationUrlComplete || !(device.expiresIn > 0))
                throw new Error('Invalid device session');
            const image = await QRCode.toDataURL(device.verificationUrlComplete, { width: 184 });
            if (current !== session) return;
            qrImage.value = image;
            const expiresAt = Date.now() + device.expiresIn * 1000;
            let interval = Math.max(1, device.interval || 5);
            while (current === session) {
                await new Promise((resolve) => {
                    resumePause = resolve;
                    pauseTimer = workerTimers.setTimeout(
                        resolve,
                        Math.min(interval * 1000, Math.max(0, expiresAt - Date.now()))
                    );
                });
                resumePause = null;
                if (current !== session) return;
                if (Date.now() >= expiresAt) throw new Error('Device session expired');
                try {
                    const { json } = await authRequest.getDeviceStatus({ deviceCode: device.deviceCode });
                    if (current !== session) return;
                    if (json?.user) {
                        finishing.value = true;
                        authStore.queueSaveCredentials();
                        await getCurrentUser();
                        stop();
                        return;
                    }
                } catch (err) {
                    if (/slow_down/.test(err.message)) interval += 5;
                    else if (!/authorization_pending/.test(err.message)) throw err;
                }
            }
        } catch {
            if (current !== session) return;
            authStore.clearPendingCredentials();
            stop();
            toast.error(t('view.login.qr.failed'));
        } finally {
            loginForm.value.loading = false;
            finishing.value = false;
        }
    }

    function stop() {
        session++;
        active.value = false;
        qrImage.value = '';
        if (resumePause) {
            workerTimers.clearTimeout(pauseTimer);
            resumePause();
            resumePause = null;
        }
    }

    onBeforeUnmount(stop);
</script>
