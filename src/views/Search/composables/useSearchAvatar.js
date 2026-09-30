import { getCurrentScope, onScopeDispose, ref, unref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { toast } from 'vue-sonner';

import {
    useAdvancedSettingsStore,
    useAvatarProviderStore,
    useSearchStore
} from '../../../stores';
import { lookupAvatars } from '../../../coordinators/avatarCoordinator';
import { i18n } from '../../../plugins/i18n';

/**
 * Avatar search composable for Search view.
 * Searches remote avatar databases only (local avatar browsing is handled by My Avatars page).
 */
export function useSearchAvatar() {
    const { avatarRemoteDatabase } = storeToRefs(useAdvancedSettingsStore());
    const { searchText } = storeToRefs(useSearchStore());
    const providerStore = useAvatarProviderStore();

    const searchAvatarPageNum = ref(0);
    const searchAvatarResults = ref([]);
    const searchAvatarPage = ref([]);
    const isSearchAvatarLoading = ref(false);
    const emptyState = () => ({
        mode: unref(providerStore.avatarSearchMode) || 'fallback',
        activeProvider: null,
        attemptedProviders: [],
        failedProviders: [],
        resultSources: [],
        pagination: {}
    });
    const avatarSearchState = ref(emptyState());
    let requestId = 0;
    const stop = watch(
        [
            searchText,
            () => unref(providerStore.avatarSearchMode),
            () => unref(providerStore.avatarSearchSources),
            () => unref(providerStore.avatarRemoteDatabaseProvider),
            () => unref(providerStore.avatarSearchContactEmail),
            avatarRemoteDatabase
        ],
        clearAvatarSearch,
        { deep: true, flush: 'sync' }
    );
    if (getCurrentScope())
        onScopeDispose(() => {
            stop();
            clearAvatarSearch();
        });

    /**
     *
     */
    async function searchAvatar() {
        const current = ++requestId;
        const query = searchText.value.trim();
        avatarSearchState.value = emptyState();
        isSearchAvatarLoading.value = true;
        try {
            const avatars = new Map();
            if (query.length >= 3 && avatarRemoteDatabase.value) {
                const data = await lookupAvatars('search', query, {
                    isCurrent: () => current === requestId,
                    onState: (state) => {
                        if (current === requestId)
                            avatarSearchState.value = state;
                    }
                });
                data?.forEach((avatar) => avatars.set(avatar.id, avatar));
            }
            if (current !== requestId) return;
            const avatarsArray = Array.from(avatars.values());
            searchAvatarPageNum.value = 0;
            searchAvatarResults.value = avatarsArray;
            searchAvatarPage.value = avatarsArray.slice(0, 10);
            const state = avatarSearchState.value;
            if (
                !avatars.size &&
                state.attemptedProviders.length &&
                state.failedProviders.length === state.attemptedProviders.length
            )
                toast.error(i18n.global.t('avatar_search_v2.all_failed'));
        } catch (error) {
            if (current === requestId) {
                searchAvatarResults.value = [];
                searchAvatarPage.value = [];
                console.debug('[AvatarSearch] Search unavailable:', error);
                toast.error(i18n.global.t('avatar_search_v2.failed'));
            }
        } finally {
            if (current === requestId) isSearchAvatarLoading.value = false;
        }
    }

    /**
     *
     * @param n
     */
    function moreSearchAvatar(n) {
        let offset;
        if (n === -1) {
            searchAvatarPageNum.value--;
            offset = searchAvatarPageNum.value * 10;
        }
        if (n === 1) {
            searchAvatarPageNum.value++;
            offset = searchAvatarPageNum.value * 10;
        }
        searchAvatarPage.value = searchAvatarResults.value.slice(
            offset,
            offset + 10
        );
    }

    /**
     *
     */
    function clearAvatarSearch() {
        requestId++;
        isSearchAvatarLoading.value = false;
        avatarSearchState.value = emptyState();
        searchAvatarResults.value = [];
        searchAvatarPage.value = [];
        searchAvatarPageNum.value = 0;
    }

    return {
        searchAvatarPageNum,
        searchAvatarResults,
        searchAvatarPage,
        isSearchAvatarLoading,
        avatarSearchState,
        searchAvatar,
        moreSearchAvatar,
        clearAvatarSearch
    };
}
