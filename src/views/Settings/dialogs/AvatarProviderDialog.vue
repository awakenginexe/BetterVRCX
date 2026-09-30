<template>
    <Dialog :open="isAvatarProviderDialogVisible" @update:open="(open) => (open ? null : closeDialog())">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{{ t('dialog.avatar_database_provider.header') }}</DialogTitle>
            </DialogHeader>
            <div class="space-y-3 mb-4">
                <p class="text-xs text-muted-foreground">{{ t('avatar_search_v2.network_hint') }}</p>
                <label class="block text-sm font-medium">{{ t('avatar_search_v2.mode') }}</label>
                <Select :model-value="avatarSearchMode" @update:modelValue="setAvatarSearchMode">
                    <SelectTrigger size="sm" :aria-label="t('avatar_search_v2.mode')"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="fallback">{{ t('avatar_search_v2.fallback') }}</SelectItem>
                        <SelectItem value="deep">{{ t('avatar_search_v2.deep') }}</SelectItem>
                        <SelectItem value="custom">{{ t('avatar_search_v2.custom') }}</SelectItem>
                    </SelectContent>
                </Select>
                <div class="flex flex-wrap gap-4">
                    <label
                        v-for="provider in BUILTIN_PROVIDERS"
                        :key="provider.id"
                        class="flex items-center gap-2 text-sm">
                        <Checkbox
                            :model-value="avatarSearchSources?.includes(provider.id)"
                            @update:modelValue="(enabled) => setAvatarSearchSource(provider.id, enabled === true)" />
                        {{ provider.label }}
                    </label>
                </div>
                <p v-if="!avatarSearchSources?.length" class="text-xs text-muted-foreground">
                    {{ t('avatar_search_v2.no_sources') }}
                </p>
                <div v-if="avatarSearchSources?.includes('avtricu')" class="space-y-1.5">
                    <label class="text-sm" for="avatar-search-contact">{{ t('avatar_search_v2.contact') }}</label>
                    <Input
                        id="avatar-search-contact"
                        type="email"
                        :model-value="avatarSearchContactEmail"
                        @change="(event) => setAvatarSearchContactEmail(event.target.value)"
                        :placeholder="t('avatar_search_v2.contact_placeholder')" />
                    <p class="text-xs text-muted-foreground">{{ t('avatar_search_v2.contact_hint') }}</p>
                </div>
            </div>
            <div>
                <h3 class="text-sm font-medium mb-2">{{ t('avatar_search_v2.custom') }}</h3>
                <InputGroupAction
                    class="mt-1.5"
                    v-for="(provider, index) in avatarRemoteDatabaseProviderList"
                    :key="index"
                    v-model="avatarRemoteDatabaseProviderList[index]"
                    size="sm"
                    @change="saveAvatarProviderList">
                    <template #actions>
                        <Trash2
                            class="cursor-pointer opacity-80 hover:opacity-100"
                            @click="removeAvatarProvider(provider)" />
                    </template>
                </InputGroupAction>

                <Button size="sm" style="margin-top: 6px" @click="addProvider">
                    {{ t('dialog.avatar_database_provider.add_provider') }}
                </Button>
            </div>
        </DialogContent>
    </Dialog>
</template>

<script setup>
    import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Checkbox } from '@/components/ui/checkbox';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { BUILTIN_PROVIDERS } from '../../../services/avatarSearch/providers';
    import { InputGroupAction } from '@/components/ui/input-group';
    import { Trash2 } from 'lucide-vue-next';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { useAvatarProviderStore } from '../../../stores';

    const { t } = useI18n();

    const avatarProviderStore = useAvatarProviderStore();

    const { avatarRemoteDatabaseProviderList, avatarSearchMode, avatarSearchSources, avatarSearchContactEmail } =
        storeToRefs(avatarProviderStore);
    const {
        saveAvatarProviderList,
        removeAvatarProvider,
        setAvatarSearchMode,
        setAvatarSearchSource,
        setAvatarSearchContactEmail
    } = avatarProviderStore;

    defineProps({
        isAvatarProviderDialogVisible: {
            type: Boolean,
            required: true
        }
    });

    const emit = defineEmits(['update:isAvatarProviderDialogVisible']);

    /**
     *
     */
    function closeDialog() {
        emit('update:isAvatarProviderDialogVisible', false);
    }

    /**
     *
     */
    function addProvider() {
        avatarRemoteDatabaseProviderList.value.push('');
    }
</script>
