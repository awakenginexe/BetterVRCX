import { queryClient } from '../../queries/client';
import { queryKeys } from '../../queries/keys';
import { analysisFailure, normalizeAnalysis } from './model';

export function getCachedPerformance(pkg) {
    return queryClient.getQueryData(queryKeys.avatarPerformance(pkg));
}

/** Preserve the fresh API package identity even if the avatar store merges older asset URLs. */
export function cacheOfficialAvatar(metadata) {
    queryClient.setQueryData(queryKeys.avatar(metadata.id), {
        json: metadata,
        params: { avatarId: metadata.id }
    });
}

/** Session-local cache. Successful analysis is immutable for a file/version. */
export async function fetchAvatarPerformance(pkg, { force = false } = {}) {
    if (!pkg.fileId || !pkg.versionId) return { status: 'unavailable' };
    const queryKey = queryKeys.avatarPerformance(pkg);
    if (force) {
        await queryClient.invalidateQueries({
            queryKey,
            exact: true,
            refetchType: 'none'
        });
    }
    return queryClient
        .fetchQuery({
            queryKey,
            staleTime: (query) =>
                query.state.data?.status === 'available'
                    ? Infinity
                    : ['pending', 'unavailable'].includes(
                            query.state.data?.status
                        )
                      ? 60_000
                      : 0,
            gcTime: 4 * 60 * 60_000,
            retry: false,
            queryFn: async () => {
                try {
                    const { default: miscRequest } =
                        await import('../../api/misc');
                    const { json } = await miscRequest.getFileAnalysis(
                        {
                            fileId: pkg.fileId,
                            version: pkg.versionId,
                            variant: pkg.variant
                        },
                        { forceRefresh: force }
                    );
                    return { ...normalizeAnalysis(json), fileAnalysis: json };
                } catch (err) {
                    return analysisFailure(err?.status);
                }
            }
        })
        .catch((err) => analysisFailure(err?.status));
}

export async function resolveOfficialAvatar(avatarId) {
    const { default: avatarRequest } = await import('../../api/avatar');
    const { json } = await avatarRequest.getAvatar({ avatarId });
    return json;
}
