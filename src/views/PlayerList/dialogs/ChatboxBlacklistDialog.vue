<template>
    <Dialog v-model:open="chatboxBlacklistDialog.visible">
        <DialogContent class="chatbox-blacklist bv-surface">
            <DialogHeader>
                <DialogTitle>{{ t('dialog.chatbox_blacklist.header') }}</DialogTitle>
            </DialogHeader>
            <div v-if="chatboxBlacklistDialog.visible" class="chatbox-blacklist__body">
                <section class="chatbox-blacklist__section">
                    <h2>{{ t('dialog.chatbox_blacklist.keyword_blacklist') }}</h2>
                    <InputGroupAction
                        class="mt-1.5"
                        v-for="(item, index) in chatboxBlacklist"
                        :key="index"
                        v-model="chatboxBlacklist[index]"
                        size="sm"
                        @change="saveChatboxBlacklist">
                        <template #actions>
                            <Button
                                class="bv-focus-ring"
                                data-action="delete"
                                variant="outline"
                                :aria-label="`${t('common.actions.delete')} ${item}`"
                                @click="
                                    chatboxBlacklist.splice(index, 1);
                                    saveChatboxBlacklist();
                                ">
                                <X class="h-3 w-3" />
                            </Button>
                        </template>
                    </InputGroupAction>
                    <Button size="sm" variant="outline" style="margin-top: 6px" @click="chatboxBlacklist.push('')">
                        {{ t('dialog.chatbox_blacklist.add_item') }}
                    </Button>
                </section>
                <section class="chatbox-blacklist__section bv-danger-zone">
                    <h2>{{ t('dialog.chatbox_blacklist.user_blacklist') }}</h2>
                    <Badge
                        v-for="user in chatboxUserBlacklist"
                        :key="user[0]"
                        variant="outline"
                        style="margin-right: 6px; margin-top: 6px">
                        <span>{{ user[1] }}</span>
                        <button
                            type="button"
                            class="chatbox-blacklist__delete bv-focus-ring"
                            data-action="delete"
                            :aria-label="`${t('common.actions.delete')} ${user[1]}`"
                            @click="deleteChatboxUserBlacklist(user[0])">
                            <X class="h-3 w-3" style="line-height: 1" />
                        </button>
                    </Badge>
                </section>
            </div>
        </DialogContent>
    </Dialog>
</template>

<script setup>
    import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { Button } from '@/components/ui/button';
    import { InputGroupAction } from '@/components/ui/input-group';
    import { X } from 'lucide-vue-next';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { Badge } from '../../../components/ui/badge';
    import { usePhotonStore } from '../../../stores';

    const { t } = useI18n();

    const photonStore = usePhotonStore();
    const { chatboxUserBlacklist, chatboxBlacklist } = storeToRefs(photonStore);
    const { saveChatboxBlacklist } = photonStore;

    defineProps({
        chatboxBlacklistDialog: {
            type: Object,
            required: true
        }
    });

    const emit = defineEmits(['deleteChatboxUserBlacklist']);

    /**
     *
     * @param userId
     */
    function deleteChatboxUserBlacklist(userId) {
        emit('deleteChatboxUserBlacklist', userId);
    }
</script>

<style scoped>
    .chatbox-blacklist__body {
        display: grid;
        gap: 14px;
    }

    .chatbox-blacklist__section {
        padding: 12px;
        border: 1px solid var(--bv-border);
        border-radius: 10px;
    }

    .chatbox-blacklist__section h2 {
        margin: 0 0 8px;
        color: var(--bv-text-strong);
        font-size: 13px;
        font-weight: 700;
    }

    .chatbox-blacklist__delete {
        display: inline-flex;
        align-items: center;
        margin-left: 8px;
        padding: 0;
        border: 0;
        border-radius: 4px;
        color: inherit;
        background: transparent;
        cursor: pointer;
    }
</style>
