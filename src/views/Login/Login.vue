<template>
    <div class="x-login-container">
        <div class="x-login-glow x-login-glow-a" aria-hidden="true"></div>
        <div class="x-login-glow x-login-glow-b" aria-hidden="true"></div>
        <div class="x-login-toolbar m-1.5">
            <LoginSettingsDialog />
            <TooltipWrapper v-if="!noUpdater" side="top" :content="t('view.login.updater')">
                <Button class="rounded-full mr-2 text-xs" size="icon-sm" variant="ghost" @click="showVRCXUpdateDialog">
                    <span class="relative inline-flex items-center justify-center">
                        <ArrowBigDownDash />
                        <span
                            v-if="pendingVRCXUpdate"
                            class="absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full bg-red-500"></span>
                    </span>
                </Button>
            </TooltipWrapper>
            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <TooltipWrapper side="top" :content="t('view.login.language')">
                        <Button class="rounded-full text-xs" size="icon-sm" variant="ghost">
                            <Languages />
                        </Button>
                    </TooltipWrapper>
                </DropdownMenuTrigger>
                <DropdownMenuContent class="max-h-80 overflow-y-auto text-xs">
                    <DropdownMenuCheckboxItem
                        v-for="language in languageCodes"
                        :key="language"
                        :model-value="appLanguage === language"
                        @select="changeAppLanguage(language)">
                        {{ getLanguageName(language) }}
                    </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
        <div class="x-login">
            <Alert
                v-if="vrcStatusStore.hasIssue"
                :variant="vrcStatusStore.isMajor ? 'destructive' : 'warning'"
                class="cursor-pointer mb-3 hover:opacity-80 transition-opacity"
                @click="vrcStatusStore.openStatusPage()">
                <TriangleAlert class="size-4" />
                <AlertTitle class="truncate">{{ t('status_bar.servers_issue') }}</AlertTitle>
                <AlertDescription class="truncate">
                    {{ vrcStatusStore.statusText }}
                </AlertDescription>
            </Alert>
            <div class="x-login-form-container">
                <div class="x-login-panel x-login-primary-panel">
                    <div class="x-login-brand">
                        <img src="../../../images/VRCX.png" alt="" class="x-login-logo" />
                        <h2 class="x-login-title m-0">{{ t('view.login.login') }}</h2>
                    </div>
                    <form id="login-form" @submit.prevent="onSubmit">
                        <FieldGroup class="gap-3">
                            <VeeField v-slot="{ field, errors }" name="username">
                                <Field :data-invalid="!!errors.length">
                                    <FieldLabel for="login-form-username" class="text-foreground">
                                        {{ t('view.login.field.username') }}
                                    </FieldLabel>
                                    <FieldContent>
                                        <InputGroupField
                                            id="login-form-username"
                                            :model-value="field.value"
                                            autocomplete="off"
                                            name="username"
                                            :placeholder="t('view.login.field.username')"
                                            :aria-invalid="!!errors.length"
                                            @update:modelValue="field.onChange"
                                            @blur="field.onBlur" />
                                        <FieldError v-if="errors.length" :errors="errors" />
                                    </FieldContent>
                                </Field>
                            </VeeField>
                            <VeeField v-slot="{ field, errors, handleChange }" name="password">
                                <Field :data-invalid="!!errors.length">
                                    <FieldLabel for="login-form-password" class="text-foreground">
                                        {{ t('view.login.field.password') }}
                                    </FieldLabel>
                                    <FieldContent>
                                        <InputGroupField
                                            id="login-form-password"
                                            :model-value="field.value"
                                            type="password"
                                            autocomplete="off"
                                            name="password"
                                            :placeholder="t('view.login.field.password')"
                                            :aria-invalid="!!errors.length"
                                            show-password
                                            @keydown.delete="handleChange('', false)"
                                            @update:modelValue="field.onChange"
                                            @blur="field.onBlur" />
                                        <FieldError v-if="errors.length" :errors="errors" />
                                    </FieldContent>
                                </Field>
                            </VeeField>
                        </FieldGroup>
                        <label class="inline-flex items-center gap-2 mr-2 mt-3 text-sm">
                            <Checkbox v-model="loginForm.saveCredentials" />
                            <span>{{ t('view.login.field.saveCredentials') }}</span>
                        </label>

                        <Field class="mt-4">
                            <Button type="submit" size="lg" class="x-login-submit">{{ t('view.login.login') }}</Button>
                        </Field>
                    </form>
                    <Button
                        variant="Secondary"
                        size="lg"
                        class="x-login-register"
                        @click="openExternalLink('https://vrchat.com/register')"
                        >{{ t('view.login.register') }}</Button
                    >
                </div>

                <hr v-if="Object.keys(savedCredentials).length !== 0" class="x-vertical-divider" />

                <div v-if="Object.keys(savedCredentials).length !== 0" class="x-login-panel">
                    <h2 class="x-login-title m-0">
                        {{ t('view.login.savedAccounts') }}
                    </h2>
                    <div class="x-scroll-wrapper mt-2">
                        <div class="x-saved-account-list">
                            <Item
                                v-for="user in savedCredentials"
                                :key="user.user.id"
                                class="cursor-pointer hover:bg-muted p-2 border-0"
                                @click="clickSavedLogin(user)">
                                <ItemMedia variant="image">
                                    <Avatar class="rounded-full">
                                        <AvatarImage :src="userImage(user.user)" />
                                        <AvatarFallback>
                                            <User class="size-5 text-muted-foreground" />
                                        </AvatarFallback>
                                    </Avatar>
                                </ItemMedia>
                                <ItemContent class="min-w-0">
                                    <ItemTitle class="truncate max-w-full">{{ user.user.displayName }}</ItemTitle>
                                    <ItemDescription class="truncate text-xs!">
                                        {{ user.user.username }}
                                    </ItemDescription>
                                    <ItemDescription v-if="user.loginParams.endpoint" class="truncate text-xs!">
                                        {{ user.loginParams.endpoint }}
                                    </ItemDescription>
                                </ItemContent>
                                <ItemActions @click.stop>
                                    <Button
                                        size="icon-sm"
                                        variant="ghost"
                                        class="cursor-pointer rounded-full"
                                        @click="clickDeleteSavedLogin(user.user.id)"
                                        ><Trash2 class="text-sm"
                                    /></Button>
                                </ItemActions>
                            </Item>
                        </div>
                    </div>
                </div>
            </div>

            <div class="x-legal-notice-container">
                <div class="text-center text-xs">
                    <p>
                        <a class="cursor-pointer" @click="openExternalLink('https://vrchat.com/home/password')">{{
                            t('view.login.forgotPassword')
                        }}</a>
                    </p>
                    <p>
                        &copy; 2019-2026
                        <a class="cursor-pointer" @click="openExternalLink('https://github.com/pypy-vrc')">pypy</a>
                        &amp;
                        <a class="cursor-pointer" @click="openExternalLink('https://github.com/Natsumi-sama')"
                            >Natsumi</a
                        >
                        &amp;
                        <a class="cursor-pointer" @click="openExternalLink('https://github.com/Map1en')">Map1en</a>
                    </p>
                    <p>{{ t('view.settings.general.legal_notice.info') }}</p>
                    <p>{{ t('view.settings.general.legal_notice.disclaimer1') }}</p>
                    <p>{{ t('view.settings.general.legal_notice.disclaimer2') }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
    import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
    import {
        DropdownMenu,
        DropdownMenuCheckboxItem,
        DropdownMenuContent,
        DropdownMenuTrigger
    } from '@/components/ui/dropdown-menu';
    import { onBeforeMount, onBeforeUnmount, ref, watch } from 'vue';
    import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
    import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
    import { ArrowBigDownDash, Languages, Trash2, TriangleAlert, User } from 'lucide-vue-next';
    import { Field as VeeField, useForm } from 'vee-validate';
    import { useRoute, useRouter } from 'vue-router';
    import { Button } from '@/components/ui/button';
    import { Checkbox } from '@/components/ui/checkbox';
    import { InputGroupField } from '@/components/ui/input-group';
    import { storeToRefs } from 'pinia';
    import { toTypedSchema } from '@vee-validate/zod';
    import { useI18n } from 'vue-i18n';
    import { z } from 'zod';

    import {
        useAppearanceSettingsStore,
        useAuthStore,
        useModalStore,
        useVrcStatusStore,
        useVRCXUpdaterStore
    } from '../../stores';
    import { getLanguageName, languageCodes, resolveSystemLanguage } from '../../localization';
    import { tForLocale } from '../../plugins';
    import { openExternalLink } from '../../shared/utils';

    import configRepository from '../../services/config';
    import { useUserDisplay } from '../../composables/useUserDisplay';
    import { watchState } from '../../services/watchState';

    import LoginSettingsDialog from './Dialog/LoginSettingsDialog.vue';

    const { userImage } = useUserDisplay();
    const { showVRCXUpdateDialog } = useVRCXUpdaterStore();
    const router = useRouter();
    const route = useRoute();
    const { loginForm } = storeToRefs(useAuthStore());
    const { relogin, deleteSavedLogin, login, getAllSavedCredentials } = useAuthStore();
    const { noUpdater, pendingVRCXUpdate } = storeToRefs(useVRCXUpdaterStore());

    const appearanceSettingsStore = useAppearanceSettingsStore();
    const { appLanguage } = storeToRefs(appearanceSettingsStore);
    const { changeAppLanguage } = appearanceSettingsStore;
    const modalStore = useModalStore();

    const vrcStatusStore = useVrcStatusStore();

    const { t } = useI18n();

    const savedCredentials = ref({});
    const requiredMessage = 'Required';

    const formSchema = toTypedSchema(
        z.object({
            username: z.string().min(1, requiredMessage),
            password: z.string().min(1, requiredMessage)
        })
    );

    const { handleSubmit, resetForm, values } = useForm({
        validationSchema: formSchema,
        initialValues: {
            username: loginForm.value.username,
            password: loginForm.value.password
        }
    });

    /**
     *
     * @param userId
     */
    async function clickDeleteSavedLogin(userId) {
        await deleteSavedLogin(userId);
        await updateSavedCredentials();
    }

    /**
     *
     * @param user
     */
    async function clickSavedLogin(user) {
        try {
            await relogin(user);
        } catch {
            // relogin already handles user-facing error display (toast)
        }
        await updateSavedCredentials();
    }

    const onSubmit = handleSubmit(async (formValues) => {
        loginForm.value.username = formValues.username ?? '';
        loginForm.value.password = formValues.password ?? '';
        await login();
        await updateSavedCredentials();
    });

    /**
     *
     */
    async function updateSavedCredentials() {
        if (watchState.isLoggedIn) {
            return;
        }
        savedCredentials.value = await getAllSavedCredentials();
    }

    /**
     *
     */
    function postLoginRedirect() {
        const redirect = route.query.redirect;
        if (typeof redirect === 'string' && redirect.startsWith('/') && redirect !== '/login') {
            return redirect;
        }
        return '/feed';
    }

    watch(
        () => watchState.isLoggedIn,
        (isLoggedIn) => {
            if (isLoggedIn) {
                router.replace(postLoginRedirect());
            }
        }
    );

    watch(
        () => loginForm.value.loading,
        (loading) => {
            if (!loading) {
                updateSavedCredentials();
            }
        }
    );
    let isActive = true;
    let isLanguagePromptOpen = false;

    async function detectAndPromptLanguage() {
        try {
            const savedLanguage = await configRepository.getString('VRCX_appLanguage');
            if (savedLanguage || !isActive) return;

            const systemLanguage = await AppApi.CurrentLanguage();
            if (!systemLanguage || !isActive) return;

            const matchedCode = resolveSystemLanguage(systemLanguage, languageCodes);

            if (!matchedCode || matchedCode === 'en') {
                if (isActive) await changeAppLanguage('en');
                return;
            }

            const languageName = getLanguageName(matchedCode);
            const [promptTitle, promptDescription, promptConfirmText, promptCancelText] = await Promise.all([
                tForLocale(matchedCode, 'view.login.language_detect.title'),
                tForLocale(matchedCode, 'view.login.language_detect.description', {
                    language: languageName
                }),
                tForLocale(matchedCode, 'dialog.alertdialog.confirm'),
                tForLocale(matchedCode, 'dialog.alertdialog.cancel')
            ]);

            isLanguagePromptOpen = true;
            const { ok } = await modalStore.confirm({
                title: promptTitle,
                description: promptDescription,
                confirmText: promptConfirmText,
                cancelText: promptCancelText
            });
            isLanguagePromptOpen = false;

            if (!isActive) return;

            // Re-check: user may have manually switched language while the dialog was open
            const currentLanguage = await configRepository.getString('VRCX_appLanguage');
            if (currentLanguage || !isActive) return;

            if (ok) {
                await changeAppLanguage(matchedCode);
            } else {
                await changeAppLanguage('en');
            }
        } catch (error) {
            isLanguagePromptOpen = false;
            console.error('Language detection failed:', error);
        }
    }

    onBeforeMount(async () => {
        updateSavedCredentials();
        detectAndPromptLanguage();
    });

    onBeforeUnmount(() => {
        isActive = false;
        if (isLanguagePromptOpen) {
            modalStore.handleCancel();
            isLanguagePromptOpen = false;
        }
        resetForm({
            values: {
                username: '',
                password: ''
            }
        });
        loginForm.value.username = '';
        loginForm.value.password = '';
        loginForm.value.endpoint = '';
        loginForm.value.websocket = '';
        savedCredentials.value = {};
    });

    watch(
        values,
        (formValues) => {
            loginForm.value.username = formValues.username ?? '';
            loginForm.value.password = formValues.password ?? '';
        },
        { deep: true }
    );
</script>

<style scoped>
    .x-login-container {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        isolation: isolate;
        overflow: hidden;
    }

    .x-login-toolbar {
        position: absolute;
        top: 10px;
        left: 12px;
        z-index: 3;
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .x-login {
        display: grid;
        grid-template-rows: repeat(2, auto);
        align-items: center;
        width: min(880px, calc(100svw - 48px));
        max-width: 880px;
        z-index: 1;
        animation: login-panel-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .x-login-form-container {
        display: grid;
        gap: 14px;
        min-height: 430px;
        padding: 14px;
        border: 1px solid color-mix(in oklch, var(--border) 72%, white 12%);
        border-radius: 34px;
        background:
            linear-gradient(140deg, color-mix(in oklch, var(--card) 78%, transparent), color-mix(in oklch, var(--accent) 18%, transparent)),
            radial-gradient(circle at 18% 0, color-mix(in oklch, var(--primary) 20%, transparent), transparent 42%);
        box-shadow:
            0 34px 80px color-mix(in oklch, black 30%, transparent),
            inset 0 1px 0 color-mix(in oklch, white 34%, transparent);
        backdrop-filter: blur(28px) saturate(170%);
    }

    .x-login-form-container:has(> div:nth-child(3)) {
        grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
    }

    .x-login-form-container > div {
        display: flex;
        flex-direction: column;
        min-height: 0;
        padding: 22px;
        overflow-y: auto;
    }

    .x-login-panel {
        position: relative;
        border: 1px solid color-mix(in oklch, var(--border) 70%, white 12%);
        border-radius: 26px;
        background:
            linear-gradient(155deg, color-mix(in oklch, var(--card) 66%, transparent), color-mix(in oklch, var(--secondary) 28%, transparent)),
            radial-gradient(circle at 100% 0, color-mix(in oklch, var(--primary) 16%, transparent), transparent 42%);
        box-shadow: inset 0 1px 0 color-mix(in oklch, white 28%, transparent);
        backdrop-filter: blur(22px) saturate(160%);
    }

    .x-login-primary-panel::before {
        content: '';
        position: absolute;
        inset: 10px;
        z-index: -1;
        border-radius: 22px;
        background: linear-gradient(135deg, color-mix(in oklch, var(--primary) 20%, transparent), transparent 45%);
        filter: blur(24px);
        opacity: 0.7;
    }

    .x-login-brand {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        margin-bottom: 18px;
    }

    .x-login-logo {
        width: 58px;
        height: 58px;
        border-radius: 18px;
        box-shadow:
            0 18px 42px color-mix(in oklch, var(--primary) 24%, transparent),
            inset 0 1px 0 color-mix(in oklch, white 34%, transparent);
        animation: login-logo-float 4.8s ease-in-out infinite;
    }

    .x-login-title {
        text-align: center;
        font-size: 22px;
        font-weight: 750;
        letter-spacing: 0;
    }

    .x-login-submit,
    .x-login-register {
        width: 100%;
    }

    .x-login-register {
        margin-top: 10px;
    }

    .x-scroll-wrapper {
        width: 100%;
        height: 100%;
        overflow-y: auto;
    }

    hr.x-vertical-divider {
        height: 100%;
        width: 100%;
        margin: 0;
        border: 0;
        border-radius: 999px;
        background: linear-gradient(180deg, transparent, color-mix(in oklch, var(--border) 90%, white 20%), transparent);
    }

    .x-saved-account-list {
        display: grid;
        gap: 8px;
    }

    .x-saved-account-list > div {
        width: 100%;
        border-radius: 18px;
        transition:
            background-color 0.18s ease,
            transform 0.18s ease,
            box-shadow 0.18s ease;
    }

    .x-saved-account-list > div:hover {
        transform: translateY(-1px);
        box-shadow: 0 14px 30px color-mix(in oklch, var(--primary) 12%, transparent);
    }

    .x-legal-notice-container {
        margin-top: 12px;
        color: color-mix(in oklch, var(--foreground) 62%, transparent);
    }

    .x-login-glow {
        position: absolute;
        z-index: 0;
        width: 34svw;
        min-width: 320px;
        aspect-ratio: 1;
        border-radius: 999px;
        pointer-events: none;
        filter: blur(50px);
        opacity: 0.45;
        animation: login-glow-drift 12s ease-in-out infinite alternate;
    }

    .x-login-glow-a {
        left: 8%;
        top: 14%;
        background: color-mix(in oklch, var(--primary) 58%, transparent);
    }

    .x-login-glow-b {
        right: 8%;
        bottom: 8%;
        background: color-mix(in oklch, var(--chart-3) 46%, transparent);
        animation-delay: -4s;
    }

    @keyframes login-panel-enter {
        from {
            opacity: 0;
            transform: translateY(22px) scale(0.98);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    @keyframes login-logo-float {
        0%,
        100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-5px);
        }
    }

    @keyframes login-glow-drift {
        from {
            transform: translate3d(-4%, -2%, 0) scale(0.96);
        }
        to {
            transform: translate3d(4%, 3%, 0) scale(1.08);
        }
    }

    @media (max-width: 760px) {
        .x-login {
            width: calc(100svw - 24px);
        }

        .x-login-form-container,
        .x-login-form-container:has(> div:nth-child(3)) {
            grid-template-columns: 1fr;
        }

        hr.x-vertical-divider {
            height: 1px;
            min-height: 1px;
        }
    }
</style>
