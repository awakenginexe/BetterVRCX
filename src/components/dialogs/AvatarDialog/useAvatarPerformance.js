import { computed, onScopeDispose, ref, watch } from 'vue';
import {
    analysisFailure,
    resolveAvatarPackages
} from '../../../services/avatarPerformance/model';
import {
    fetchAvatarPerformance,
    cacheOfficialAvatar,
    getCachedPerformance,
    resolveOfficialAvatar
} from '../../../services/avatarPerformance/service';

/**
 * @param {() => any} avatar Official metadata, supplied only after the detail request resolves.
 * @param {() => boolean} enabled
 * @param {(platform: string, result: any) => void} [onAnalysis]
 * @param {(metadata: any) => void} [onMetadata]
 */
export function useAvatarPerformance(
    avatar,
    enabled,
    onAnalysis = () => {},
    onMetadata = () => {}
) {
    const packages = ref([]);
    const results = ref({});
    const selectedPlatform = ref('');
    const refreshing = ref(false);
    let generation = 0;
    let currentAvatarId = '';
    onScopeDispose(() => ++generation);

    function load(metadata, force = false) {
        const run = ++generation;
        currentAvatarId = metadata?.id || '';
        packages.value = resolveAvatarPackages(metadata);
        if (
            !packages.value.some(
                (pkg) => pkg.platform === selectedPlatform.value
            )
        ) {
            selectedPlatform.value = packages.value[0]?.platform || '';
        }
        const refreshPlatform = force ? selectedPlatform.value : '';
        results.value = {};
        for (const pkg of packages.value) {
            const cached =
                pkg.platform !== refreshPlatform && getCachedPerformance(pkg);
            results.value[pkg.platform] = cached || {
                status: pkg.fileId ? 'loading' : 'unavailable'
            };
            fetchAvatarPerformance(pkg, {
                force: pkg.platform === refreshPlatform
            }).then((result) => {
                if (run !== generation || !enabled()) return;
                results.value[pkg.platform] = result;
                onAnalysis(pkg.platform, result);
            });
        }
    }

    watch(
        [avatar, enabled],
        ([metadata, visible]) => {
            refreshing.value = false;
            load(visible ? metadata : null);
        },
        { immediate: true }
    );

    async function refresh() {
        if (refreshing.value || !enabled() || !currentAvatarId) return;
        const run = generation;
        const avatarId = currentAvatarId;
        const platform = selectedPlatform.value;
        refreshing.value = true;
        try {
            const metadata = await resolveOfficialAvatar(avatarId);
            if (run !== generation || !enabled()) return;
            onMetadata(metadata);
            cacheOfficialAvatar(metadata);
            load(metadata, true);
        } catch (err) {
            if (run === generation && enabled()) {
                const result = analysisFailure(err?.status);
                results.value[platform] = result;
                onAnalysis(platform, result);
            }
        } finally {
            if (currentAvatarId === avatarId) refreshing.value = false;
        }
    }

    return {
        packages,
        results,
        selectedPlatform,
        refreshing,
        refresh,
        selectedResult: computed(
            () =>
                results.value[selectedPlatform.value] || {
                    status: avatar() ? 'unavailable' : 'loading'
                }
        )
    };
}
