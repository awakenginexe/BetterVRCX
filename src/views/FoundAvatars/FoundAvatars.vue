<template>
    <section
        class="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-1"
        :aria-label="t('nav_tooltip.found_avatars')">
        <header class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
                <h1 class="text-lg font-semibold">{{ t('nav_tooltip.found_avatars') }}</h1>
                <p class="mt-1 text-sm text-muted-foreground">{{ t('found_avatars.subtitle') }}</p>
            </div>
            <Button
                variant="outline"
                class="min-h-11"
                data-action="import"
                :disabled="store.loading || store.importState.status === 'loading'"
                @click="store.importHistory()">
                {{ t('found_avatars.import') }}
            </Button>
        </header>

        <div class="flex flex-wrap items-center gap-4">
            <div class="min-w-48 flex-1">
                <label :for="searchId" class="sr-only">{{ t('found_avatars.search') }}</label>
                <Input
                    :id="searchId"
                    v-model="query"
                    type="search"
                    class="min-h-11"
                    :placeholder="t('found_avatars.search')" />
            </div>
            <label class="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <Switch
                    :model-value="store.autoLookupFriends"
                    :aria-label="t('found_avatars.auto_lookup')"
                    @update:model-value="store.setAutoLookupFriends($event)" />
                <span>{{ t('found_avatars.auto_lookup') }}</span>
            </label>
        </div>

        <p v-if="store.error" role="alert" class="text-sm text-destructive">{{ t('found_avatars.storage_error') }}</p>
        <p v-if="store.importState.status !== 'idle'" role="status" class="text-sm text-muted-foreground">
            {{ t(`found_avatars.import_states.${store.importState.status}`) }}
        </p>
        <p v-if="store.loading" role="status" class="py-10 text-center text-muted-foreground">
            {{ t('found_avatars.loading') }}
        </p>
        <p v-else-if="!filtered.length" class="py-10 text-center text-muted-foreground">
            {{ t(query ? 'found_avatars.no_matches' : 'found_avatars.empty') }}
        </p>

        <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-4">
            <Card
                v-for="entry in filtered.slice(0, visibleCount)"
                :key="entry.id"
                class="flex min-w-0 flex-col overflow-hidden">
                <button
                    type="button"
                    data-action="details"
                    class="flex flex-1 flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    @click="selectedId = entry.id">
                    <img
                        v-if="image(entry) && !brokenImages.has(entry.id)"
                        :src="image(entry)"
                        :alt="entry.metadata.name || entry.id"
                        loading="lazy"
                        class="aspect-4/3 w-full object-cover"
                        @error="brokenImages.add(entry.id)" />
                    <div
                        v-else
                        class="grid aspect-4/3 w-full place-items-center bg-muted text-sm text-muted-foreground">
                        {{ t('found_avatars.no_image') }}
                    </div>
                    <div class="flex w-full flex-1 flex-col gap-1 p-3">
                        <span class="truncate font-medium">{{ entry.metadata.name || entry.id }}</span>
                        <span class="truncate text-xs text-muted-foreground">{{
                            entry.metadata.authorName || t('found_avatars.unknown_creator')
                        }}</span>
                        <span class="mt-2 text-xs text-muted-foreground"
                            >{{ t('found_avatars.first_found') }}: {{ date(entry.firstSeenAt) }}</span
                        >
                        <span
                            class="text-xs text-muted-foreground"
                            :class="{ 'found-avatar-error-text': lookupFailed(entry) }"
                            >{{ t(`found_avatars.states.${entry.lookupState}`) }}</span
                        >
                    </div>
                </button>
                <div class="border-t p-3">
                    <Button
                        class="min-h-11 w-full whitespace-normal"
                        variant="secondary"
                        :class="canChange(entry) ? changeButtonClass : lookupButtonClass(entry)"
                        :data-action="canChange(entry) ? 'change-avatar' : 'lookup'"
                        :title="entry.lookupState === 'not_found' ? t('found_avatars.retry_search') : undefined"
                        :disabled="entry.lookupState === 'searching' || Boolean(changingId)"
                        @click="canChange(entry) ? changeAvatar(entry.id) : store.lookupAvatar(entry.id)"
                        >{{
                            t(
                                changingId === entry.id
                                    ? 'found_avatars.changing_avatar'
                                    : canChange(entry)
                                      ? 'found_avatars.change_avatar'
                                      : lookupLabel(entry)
                            )
                        }}</Button
                    >
                    <p v-if="changeError?.avatarId === entry.id" role="alert" class="mt-2 text-sm text-foreground">
                        {{ t(`found_avatars.change_errors.${changeError.state}`) }}
                    </p>
                </div>
            </Card>
        </div>
        <Button
            v-if="filtered.length > visibleCount"
            variant="outline"
            class="min-h-11 self-center"
            @click="visibleCount += 60"
            >{{ t('common.load_more') }}</Button
        >

        <Dialog :open="Boolean(selected)" @update:open="!$event && (selectedId = null)">
            <DialogContent
                v-if="selected"
                style="--muted-foreground: var(--bv-text-regular)"
                class="bv-dialog-shell max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-5xl [&_[data-slot=dialog-close]]:size-11 [&_[data-slot=dialog-close]]:flex [&_[data-slot=dialog-close]]:items-center [&_[data-slot=dialog-close]]:justify-center">
                <DialogHeader>
                    <DialogTitle class="break-words pr-12">{{ selected.metadata.name || selected.id }}</DialogTitle>
                    <DialogDescription>{{ t('found_avatars.saved_details') }}</DialogDescription>
                </DialogHeader>
                <div class="grid min-w-0 items-start gap-4 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
                    <div class="bv-entity-card flex min-w-0 flex-col gap-3 p-4">
                        <img
                            v-if="image(selected) && !brokenImages.has(selected.id)"
                            :src="image(selected)"
                            :alt="selected.metadata.name || selected.id"
                            class="aspect-square w-full rounded-xl object-contain"
                            @error="brokenImages.add(selected.id)" />
                        <div v-else class="grid aspect-square place-items-center text-sm text-muted-foreground">
                            {{ t('found_avatars.no_image') }}
                        </div>
                        <Button
                            class="min-h-11 w-full"
                            variant="secondary"
                            :class="lookupButtonClass(selected)"
                            data-action="lookup"
                            :title="selected.lookupState === 'not_found' ? t('found_avatars.retry_search') : undefined"
                            :disabled="selected.lookupState === 'searching' || Boolean(changingId)"
                            @click="store.lookupAvatar(selected.id)"
                            >{{ t(lookupLabel(selected)) }}</Button
                        >
                        <Button
                            v-if="canChange(selected)"
                            class="min-h-11 w-full whitespace-normal"
                            variant="secondary"
                            :class="changeButtonClass"
                            data-action="change-avatar"
                            :disabled="Boolean(changingId)"
                            @click="changeAvatar(selected.id)"
                            >{{
                                t(changingId ? 'found_avatars.changing_avatar' : 'found_avatars.change_avatar')
                            }}</Button
                        >
                        <p v-if="changeError?.avatarId === selected.id" role="alert" class="text-sm text-foreground">
                            {{ t(`found_avatars.change_errors.${changeError.state}`) }}
                        </p>
                    </div>
                    <div class="flex min-w-0 flex-col gap-4">
                        <div class="bv-entity-card min-w-0 p-4">
                            <dl
                                class="grid min-w-0 grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
                                <dt class="text-muted-foreground">{{ t('found_avatars.avatar_id') }}</dt>
                                <dd class="select-text break-all">{{ selected.id }}</dd>
                                <dt class="text-muted-foreground">{{ t('found_avatars.creator') }}</dt>
                                <dd class="break-words">
                                    {{ selected.metadata.authorName || t('found_avatars.unknown') }}
                                </dd>
                                <dt class="text-muted-foreground">{{ t('found_avatars.first_found') }}</dt>
                                <dd>{{ date(selected.firstSeenAt) }}</dd>
                                <dt class="text-muted-foreground">{{ t('found_avatars.last_seen') }}</dt>
                                <dd>{{ date(selected.lastSeenAt) }}</dd>
                                <dt class="text-muted-foreground">{{ t('found_avatars.first_wearer') }}</dt>
                                <dd class="break-words">{{ firstWearer(selected) }}</dd>
                                <dt class="text-muted-foreground">{{ t('found_avatars.source') }}</dt>
                                <dd>{{ t(`found_avatars.sources.${selected.source}`) }}</dd>
                                <dt class="text-muted-foreground">{{ t('found_avatars.lookup_status') }}</dt>
                                <dd>{{ t(`found_avatars.states.${selected.lookupState}`) }}</dd>
                                <dt class="text-muted-foreground">{{ t('found_avatars.availability') }}</dt>
                                <dd>
                                    {{
                                        t(
                                            canChange(selected)
                                                ? 'found_avatars.verified_public'
                                                : 'found_avatars.unverified_public'
                                        )
                                    }}
                                </dd>
                            </dl>
                            <p
                                v-if="selected.metadata.description"
                                class="mt-4 whitespace-pre-wrap break-words border-t pt-4 text-sm">
                                {{ selected.metadata.description }}
                            </p>
                        </div>
                        <div class="bv-entity-card min-w-0 p-4">
                            <h2 class="font-medium">{{ t('found_avatars.wearers') }}</h2>
                            <p class="mt-1 text-xs text-muted-foreground">{{ t('found_avatars.wearers_hint') }}</p>
                            <p v-if="!selected.wearers.length" class="mt-3 text-sm text-muted-foreground">
                                {{ t('found_avatars.unknown') }}
                            </p>
                            <ul v-else class="mt-2 divide-y">
                                <li
                                    v-for="wearer in selected.wearers"
                                    :key="wearer.userId"
                                    class="flex flex-wrap items-center justify-between gap-x-4 py-2">
                                    <Button
                                        variant="link"
                                        class="min-h-11 max-w-full truncate px-0 text-foreground underline underline-offset-4"
                                        data-action="wearer"
                                        @click="openWearer(wearer.userId)"
                                        >{{ wearer.displayName || wearer.userId }}</Button
                                    >
                                    <div class="text-xs text-muted-foreground">
                                        <div>{{ t('found_avatars.first_seen') }}: {{ date(wearer.firstSeenAt) }}</div>
                                        <div>{{ t('found_avatars.last_seen') }}: {{ date(wearer.lastSeenAt) }}</div>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </section>
</template>

<script setup>
    import { computed, onMounted, ref, useId, watch } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { useNow } from '@vueuse/core';
    import { useFoundAvatarsStore } from '../../stores/foundAvatars';
    import { showUserDialog } from '../../coordinators/userCoordinator';
    import { Button } from '../../components/ui/button';
    import { Card } from '../../components/ui/card';
    import { Input } from '../../components/ui/input';
    import { Switch } from '../../components/ui/switch';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';

    const { t } = useI18n();
    const store = useFoundAvatarsStore();
    const searchId = useId();
    const query = ref('');
    const selectedId = ref(null);
    const visibleCount = ref(60);
    const brokenImages = ref(new Set());
    const changingId = ref('');
    const changeError = ref(null);
    const now = useNow({ interval: 30_000 });
    const changeButtonClass = 'found-avatar-action found-avatar-action--change';
    const lookupFailed = (entry) => ['not_found', 'unavailable'].includes(entry.lookupState);
    const lookupButtonClass = (entry) =>
        `found-avatar-action ${lookupFailed(entry) ? 'found-avatar-action--error' : ''}`;
    const lookupLabel = (entry) =>
        entry.lookupState === 'not_found'
            ? 'found_avatars.states.not_found'
            : entry.lookupState === 'unavailable'
              ? 'found_avatars.retry_search'
              : 'found_avatars.lookup';
    const selected = computed(() => store.entries.find((entry) => entry.id === selectedId.value));
    const filtered = computed(() => {
        const search = query.value.trim().toLowerCase();
        return store.entries
            .filter(
                (entry) =>
                    !search ||
                    [
                        entry.id,
                        entry.metadata.name,
                        entry.metadata.authorName,
                        ...entry.wearers.flatMap((person) => [person.userId, person.displayName])
                    ].some((text) => text?.toLowerCase().includes(search))
            )
            .toSorted((a, b) => (b.lastSeenAt || b.importedAt || '').localeCompare(a.lastSeenAt || a.importedAt || ''));
    });
    const image = (entry) => entry.metadata.thumbnailImageUrl || entry.metadata.imageUrl;
    function canChange(entry) {
        const age = Math.max(now.value.getTime(), Date.now()) - Date.parse(entry.publicVerifiedAt);
        return (
            entry.metadata.releaseStatus === 'public' &&
            age >= 0 &&
            age < 5 * 60_000 &&
            !['unavailable', 'not_found', 'disabled', 'searching'].includes(entry.lookupState)
        );
    }
    const date = (value) => (value ? new Date(value).toLocaleString() : t('found_avatars.unknown'));
    const firstWearer = (entry) =>
        entry.wearers.find((wearer) => wearer.userId === entry.firstWearerId)?.displayName ||
        entry.firstWearerId ||
        t('found_avatars.unknown');
    function openWearer(userId) {
        selectedId.value = null;
        showUserDialog(userId);
    }
    async function changeAvatar(id) {
        if (!id || changingId.value) return;
        changingId.value = id;
        changeError.value = null;
        try {
            const result = await store.changeIntoAvatar(id);
            if (result !== 'selected') changeError.value = { avatarId: id, state: result };
        } catch {
            changeError.value = { avatarId: id, state: 'unavailable' };
        } finally {
            changingId.value = '';
        }
    }
    watch(query, () => {
        visibleCount.value = 60;
    });
    onMounted(() => {
        if (store.importState.status === 'idle') void store.importHistory();
    });
</script>

<style scoped>
    .found-avatar-action {
        --action-tone: var(--bv-accent);
    }

    .found-avatar-action--change {
        --action-tone: var(--bv-status-online);
    }

    .found-avatar-action--error {
        --action-tone: var(--bv-status-busy);
    }

    .found-avatar-action:not(:disabled) {
        border: 1px solid color-mix(in srgb, var(--action-tone) 35%, var(--bv-border-default));
        background-color: color-mix(in srgb, var(--action-tone) 12%, var(--bv-bg-control));
        color: color-mix(in srgb, var(--action-tone) 70%, var(--bv-text-strong));
    }

    .found-avatar-action:not(:disabled):hover {
        border-color: color-mix(in srgb, var(--action-tone) 55%, var(--bv-border-default));
        background-color: color-mix(in srgb, var(--action-tone) 20%, var(--bv-bg-control));
    }

    .found-avatar-error-text {
        color: color-mix(in srgb, var(--bv-status-busy) 70%, var(--bv-text-strong));
    }
</style>
