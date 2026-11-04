import { database } from '../services/database';
import { watchState } from '../services/watchState';
import { useFeedStore } from '../stores/feed';
import { useFriendStore } from '../stores/friend';
import { useNotificationStore } from '../stores/notification';
import { useSharedFeedStore } from '../stores/sharedFeed';
import { useUserStore } from '../stores/user';

const pendingProfiles = new Map();

export function recordUserProfile(profile, userId) {
    const account = useUserStore().currentUser;
    if (
        !watchState.isLoggedIn ||
        !useFriendStore().friends.has(userId) ||
        typeof profile?.bio !== 'string' ||
        !Array.isArray(profile.bioLinks)
    )
        return Promise.resolve();
    const snapshot = {
        id: userId,
        bio: profile.bio,
        bioLinks: profile.bioLinks.filter((link) => typeof link === 'string')
    };
    const key = `${account.id}:${userId}`;
    const isCurrent = () =>
        watchState.isLoggedIn &&
        useUserStore().currentUser === account &&
        useFriendStore().friends.has(userId);
    const operation = (pendingProfiles.get(key) || Promise.resolve())
        .catch(() => {})
        .then(async () => {
            if (!isCurrent()) return;
            const previous = await database.getUserProfile(userId);
            if (!isCurrent()) return;
            if (
                previous &&
                previous.bio === snapshot.bio &&
                JSON.stringify(previous.bioLinks) ===
                    JSON.stringify(snapshot.bioLinks)
            )
                return;
            if (previous) {
                const entry = {
                    created_at: new Date().toJSON(),
                    type: 'Bio',
                    userId,
                    displayName:
                        profile.displayName ||
                        useFriendStore().friends.get(userId)?.ref
                            ?.displayName ||
                        userId,
                    bio: snapshot.bio,
                    previousBio: previous.bio,
                    bioLinks: snapshot.bioLinks,
                    previousBioLinks: previous.bioLinks
                };
                const persistedEntry = await database.addBioToDatabase(entry);
                if (!isCurrent()) return;
                if (persistedEntry) {
                    useFeedStore().addFeedEntry(persistedEntry);
                    useSharedFeedStore().addEntry(persistedEntry);
                    useNotificationStore().queueFeedNoty(persistedEntry);
                }
            }
            await database.setUserProfile(snapshot);
        });
    pendingProfiles.set(key, operation);
    return operation.finally(() => {
        if (pendingProfiles.get(key) === operation) pendingProfiles.delete(key);
    });
}
