<template>
    <div class="bv-entity-card flex h-full min-h-0 flex-col overflow-hidden p-2">
        <div class="shrink-0" style="display: flex; align-items: center; justify-content: space-between">
            <div style="display: flex; align-items: center; gap: 6px">
                <Button
                    class="rounded-full"
                    variant="ghost"
                    size="icon-sm"
                    :disabled="userDialog.isMutualFriendsLoading"
                    @click="getUserMutualFriends(userDialog.id)">
                    <Spinner v-if="userDialog.isMutualFriendsLoading" />
                    <RefreshCw v-else />
                </Button>
                <span class="inline-flex items-center gap-1 text-sm">
                    <Users class="size-3.5 text-muted-foreground" />
                    {{ t('dialog.user.groups.total_count', { count: userDialog.mutualFriends.length }) }}
                </span>
            </div>
            <div style="display: flex; align-items: center">
                <Input v-model="searchQuery" class="h-8 w-40 mr-2" placeholder="Search friends" @click.stop />
                <span style="margin-right: 6px">{{ t('dialog.user.groups.sort_by') }}</span>
                <Select
                    :model-value="userDialogMutualFriendSortingKey"
                    :disabled="userDialog.isMutualFriendsLoading"
                    @update:modelValue="setUserDialogMutualFriendSortingByKey">
                    <SelectTrigger size="sm" @click.stop>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem
                            v-for="(item, key) in userDialogMutualFriendSortingOptions"
                            :key="String(key)"
                            :value="String(key)">
                            {{ t(item.name) }}
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
        <div class="min-h-0 flex-1 overflow-auto">
            <div v-if="userDialog.isMutualFriendsLoading" class="flex flex-1 h-full items-center justify-center p-8 text-muted-foreground">
                <Spinner class="size-6" />
            </div>
            <div v-else-if="filteredMutualFriends.length === 0" class="flex flex-1 h-full flex-col items-center justify-center p-8 text-center">
                <div class="rounded-full bg-muted/50 p-3 mb-3">
                    <Users class="size-6 text-muted-foreground" />
                </div>
                <p class="text-sm font-semibold text-foreground">
                    {{ t('dialog.user.mutual_friends.no_mutual_friends') }}
                </p>
            </div>
            <ul v-else class="flex flex-wrap items-start" style="margin-top: 8px; min-width: 130px">
                <li
                    v-for="user in filteredMutualFriends"
                    :key="user.id"
                    class="bv-entity-item-card cursor-pointer w-[167px] text-[13px]"
                    @click="showUserDialog(user.id)">
                    <div class="relative inline-block flex-none size-9 mr-2.5">
                        <Avatar class="size-9">
                            <AvatarImage :src="userImage(user)" class="object-cover" />
                            <AvatarFallback>
                                <User class="size-4 text-muted-foreground" />
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <div class="flex-1 overflow-hidden">
                        <span
                            class="block truncate font-medium leading-[18px]"
                            :style="{ color: user.$userColour }"
                            v-text="user.displayName"></span>
                    </div>
                </li>
            </ul>
        </div>
    </div>
</template>

<script setup>
    import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Button } from '@/components/ui/button';
    import { RefreshCw, User, Users } from 'lucide-vue-next';
    import { Spinner } from '@/components/ui/spinner';
    import { Input } from '@/components/ui/input';
    import { computed, onMounted, ref, watch } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { compareByDisplayName, compareByFriendOrder, compareByLastActiveRef } from '../../../shared/utils';
    import { useUserDisplay } from '../../../composables/useUserDisplay';
    import { database } from '../../../services/database';
    import { processBulk } from '../../../services/request';
    import { useOptionKeySelect } from '../../../composables/useOptionKeySelect';
    import { useUserStore } from '../../../stores';
    import { userDialogMutualFriendSortingOptions } from '../../../shared/constants';
    import { userRequest } from '../../../api';
    import { showUserDialog } from '../../../coordinators/userCoordinator';

    const { t } = useI18n();
    const { userImage } = useUserDisplay();

    const userStore = useUserStore();
    const { userDialog, currentUser } = storeToRefs(userStore);
    const { cachedUsers } = userStore;

    const { selectedKey: userDialogMutualFriendSortingKey, selectByKey: setUserDialogMutualFriendSortingByKey } =
        useOptionKeySelect(
            userDialogMutualFriendSortingOptions,
            () => userDialog.value.mutualFriendSorting,
            setUserDialogMutualFriendSorting
        );

    const searchQuery = ref('');
    const filteredMutualFriends = computed(() => {
        const friends = userDialog.value.mutualFriends;
        const query = searchQuery.value.trim().toLowerCase();
        if (!query) return friends;
        return friends.filter((u) => (u.displayName || '').toLowerCase().includes(query));
    });

    onMounted(() => {
        const userId = userDialog.value.id;
        if (
            userId &&
            userId !== currentUser.value.id &&
            (userDialog.value.activeTab === 'mutual' || userDialog.value.lastActiveTab === 'mutual')
        ) {
            getUserMutualFriends(userId);
        }
    });

    watch(
        () => userDialog.value.id,
        (newId, oldId) => {
            searchQuery.value = '';
            if (newId && newId !== oldId) {
                userDialog.value.mutualFriends = [];
                userDialog.value.isMutualFriendsLoading = false;
                if (
                    (userDialog.value.activeTab === 'mutual' || userDialog.value.lastActiveTab === 'mutual') &&
                    newId !== currentUser.value.id
                ) {
                    getUserMutualFriends(newId);
                }
            }
        }
    );

    /**
     *
     * @param sortOrder
     */
    async function setUserDialogMutualFriendSorting(sortOrder) {
        const D = userDialog.value;
        D.mutualFriendSorting = sortOrder;
        switch (sortOrder.value) {
            case 'alphabetical':
                D.mutualFriends.sort(compareByDisplayName);
                break;
            case 'lastActive':
                D.mutualFriends.sort(compareByLastActiveRef);
                break;
            case 'friendOrder':
                D.mutualFriends.sort(compareByFriendOrder);
                break;
        }
    }

    /**
     *
     * @param userId
     */
    async function getUserMutualFriends(userId) {
        if (!userId || currentUser.value.hasSharedConnectionsOptOut) {
            return;
        }
        if (userDialog.value.isMutualFriendsLoading && userDialog.value.id === userId && userDialog.value.mutualFriends.length > 0) {
            return;
        }
        userDialog.value.mutualFriends = [];
        userDialog.value.isMutualFriendsLoading = true;
        const targetUserId = userId;
        const params = {
            userId: targetUserId,
            n: 100,
            offset: 0
        };
        processBulk({
            fn: userRequest.getMutualFriends,
            N: -1,
            params,
            handle: (args) => {
                if (userDialog.value.id !== targetUserId) {
                    return;
                }
                for (const json of args.json) {
                    if (userDialog.value.mutualFriends.some((u) => u.id === json.id)) {
                        continue;
                    }
                    const ref = cachedUsers.get(json.id);
                    if (typeof ref !== 'undefined') {
                        userDialog.value.mutualFriends.push(ref);
                    } else {
                        userDialog.value.mutualFriends.push(json);
                    }
                }
                setUserDialogMutualFriendSorting(userDialog.value.mutualFriendSorting);
            },
            done: (success) => {
                if (userDialog.value.id === targetUserId) {
                    userDialog.value.isMutualFriendsLoading = false;
                }
                if (success) {
                    const mutualIds = userDialog.value.mutualFriends.map((u) => u.id);
                    database.updateMutualsForFriend(targetUserId, mutualIds);
                }
            }
        });
    }

    defineExpose({ getUserMutualFriends });
</script>
