import { ref, watch } from 'vue';
import { defineStore } from 'pinia';

import { router } from '../plugins/router';
import { useAdvancedSettingsStore } from './settings/advanced';
import { watchState } from '../services/watchState';

import configRepository from '../services/config';
import { BUILTIN_PROVIDERS } from '../services/avatarSearch/providers';

export const useAvatarProviderStore = defineStore('AvatarProvider', () => {
    const advancedSettingsStore = useAdvancedSettingsStore();

    const isAvatarProviderDialogVisible = ref(false);

    const avatarRemoteDatabaseProvider = ref('');
    const avatarSearchMode = ref('fallback');
    const avatarSearchContactEmail = ref('');
    const avatarSearchSources = ref(BUILTIN_PROVIDERS.map((p) => p.id));

    async function initSearchSettings() {
        avatarSearchContactEmail.value = await configRepository.getString(
            'VRCX_avatarSearchContactEmail',
            ''
        );
        const mode = await configRepository.getString(
            'VRCX_avatarSearchMode',
            'fallback'
        );
        if (['fallback', 'deep', 'custom'].includes(mode))
            avatarSearchMode.value = mode;
        try {
            const sources = JSON.parse(
                await configRepository.getString(
                    'VRCX_avatarSearchSources',
                    'null'
                )
            );
            if (Array.isArray(sources))
                avatarSearchSources.value = BUILTIN_PROVIDERS.map(
                    (p) => p.id
                ).filter((id) => sources.includes(id));
        } catch {
            /* Keep defaults for malformed legacy configuration. */
        }
    }

    async function setAvatarSearchMode(mode) {
        if (!['fallback', 'deep', 'custom'].includes(mode)) return;
        avatarSearchMode.value = mode;
        await configRepository.setString('VRCX_avatarSearchMode', mode);
    }

    async function setAvatarSearchContactEmail(value) {
        avatarSearchContactEmail.value = String(value)
            .replace(/[\r\n]/g, '')
            .trim();
        await configRepository.setString(
            'VRCX_avatarSearchContactEmail',
            avatarSearchContactEmail.value
        );
    }

    async function setAvatarSearchSource(source, enabled) {
        const selected = new Set(avatarSearchSources.value);
        if (enabled) selected.add(source);
        else selected.delete(source);
        avatarSearchSources.value = BUILTIN_PROVIDERS.map((p) => p.id).filter(
            (id) => selected.has(id)
        );
        await configRepository.setString(
            'VRCX_avatarSearchSources',
            JSON.stringify(avatarSearchSources.value)
        );
    }

    const avatarRemoteDatabaseProviderList = ref([
        'https://api.avtrdb.com/v3/avatar/search/vrcx'
    ]);
    watch(
        () => watchState.isLoggedIn,
        () => {
            isAvatarProviderDialogVisible.value = false;
        },
        { flush: 'sync' }
    );

    async function initAvatarProviderState() {
        avatarRemoteDatabaseProviderList.value = JSON.parse(
            await configRepository.getString(
                'VRCX_avatarRemoteDatabaseProviderList',
                '[ "https://api.avtrdb.com/v3/avatar/search/vrcx" ]'
            )
        );
        const deprecated = 'https://avtr.just-h.party/vrcx_search.php';
        const v1 = 'https://api.avtrdb.com/v1/avatar/search/vrcx';
        const v2 = 'https://api.avtrdb.com/v2/avatar/search/vrcx';
        const v3 = 'https://api.avtrdb.com/v3/avatar/search/vrcx';

        const newList = avatarRemoteDatabaseProviderList.value
            .filter((u) => u !== deprecated)
            .map((u) => (u === v1 || u === v2 ? v3 : u));

        if (
            JSON.stringify(newList) !==
            JSON.stringify(avatarRemoteDatabaseProviderList.value)
        ) {
            avatarRemoteDatabaseProviderList.value = newList;
            await configRepository.setString(
                'VRCX_avatarRemoteDatabaseProviderList',
                JSON.stringify(newList)
            );
        }

        if (
            await configRepository.getString(
                'VRCX_avatarRemoteDatabaseProvider'
            )
        ) {
            // move existing provider to new list
            const avatarRemoteDatabaseProvider =
                await configRepository.getString(
                    'VRCX_avatarRemoteDatabaseProvider'
                );
            if (
                !avatarRemoteDatabaseProviderList.value.includes(
                    avatarRemoteDatabaseProvider
                )
            ) {
                avatarRemoteDatabaseProviderList.value.push(
                    avatarRemoteDatabaseProvider
                );
            }
            await configRepository.remove('VRCX_avatarRemoteDatabaseProvider');
            await configRepository.setString(
                'VRCX_avatarRemoteDatabaseProviderList',
                JSON.stringify(avatarRemoteDatabaseProviderList.value)
            );
        }
        if (avatarRemoteDatabaseProviderList.value.length > 0) {
            avatarRemoteDatabaseProvider.value =
                avatarRemoteDatabaseProviderList.value[0];
        }
    }

    /**
     * @param {string} url
     */
    function addAvatarProvider(url) {
        if (!url) {
            return;
        }
        showAvatarProviderDialog();
        if (!avatarRemoteDatabaseProviderList.value.includes(url)) {
            avatarRemoteDatabaseProviderList.value.push(url);
        }
        saveAvatarProviderList();
    }

    /**
     * @param {string} url
     */
    function removeAvatarProvider(url) {
        const length = avatarRemoteDatabaseProviderList.value.length;
        for (let i = 0; i < length; ++i) {
            if (avatarRemoteDatabaseProviderList.value[i] === url) {
                avatarRemoteDatabaseProviderList.value.splice(i, 1);
            }
        }
        saveAvatarProviderList();
    }

    async function saveAvatarProviderList() {
        avatarRemoteDatabaseProviderList.value =
            avatarRemoteDatabaseProviderList.value.filter(Boolean);
        await configRepository.setString(
            'VRCX_avatarRemoteDatabaseProviderList',
            JSON.stringify(avatarRemoteDatabaseProviderList.value)
        );
        if (avatarRemoteDatabaseProviderList.value.length > 0) {
            avatarRemoteDatabaseProvider.value =
                avatarRemoteDatabaseProviderList.value[0];
            advancedSettingsStore.setAvatarRemoteDatabase(true);
        } else {
            avatarRemoteDatabaseProvider.value = '';
            advancedSettingsStore.setAvatarRemoteDatabase(
                avatarSearchSources.value.length > 0
            );
        }
    }

    function showAvatarProviderDialog() {
        router.push({ name: 'settings' });
        isAvatarProviderDialogVisible.value = true;
    }

    /**
     * @param {string} provider
     */
    function setAvatarProvider(provider) {
        avatarRemoteDatabaseProvider.value = provider;
    }

    initAvatarProviderState();
    initSearchSettings();

    return {
        isAvatarProviderDialogVisible,
        avatarRemoteDatabaseProvider,
        avatarRemoteDatabaseProviderList,
        avatarSearchMode,
        avatarSearchSources,
        avatarSearchContactEmail,
        setAvatarSearchContactEmail,
        setAvatarSearchMode,
        setAvatarSearchSource,

        addAvatarProvider,
        removeAvatarProvider,
        saveAvatarProviderList,
        showAvatarProviderDialog,
        setAvatarProvider
    };
});
