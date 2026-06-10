<template>
    <Dialog
        :open="props.visible"
        @update:open="
            (open) => {
                if (!open) cancel();
            }
        ">
        <DialogContent class="x-dialog sm:max-w-125" :show-close-button="false">
            <DialogHeader>
                <DialogTitle>{{ t('dialog.user.note_memo.header') }}</DialogTitle>
            </DialogHeader>

            <FieldGroup class="gap-4 py-2 flex-1 overflow-y-auto">
                <template v-if="!hideUserNotes || (hideUserNotes && hideUserMemos)">
                    <Field>
                        <FieldLabel>{{ t('dialog.user.info.note') }}</FieldLabel>
                        <FieldContent>
                            <InputGroupTextareaField
                                v-model="note"
                                :autosize="{ minRows: 6, maxRows: 12 }"
                                :maxlength="256"
                                :rows="6"
                                :placeholder="t('dialog.user.info.note_placeholder')"
                                input-class="resize-none"
                                show-count />
                        </FieldContent>
                    </Field>
                </template>
                <template v-if="!hideUserMemos || (hideUserNotes && hideUserMemos)">
                    <Field>
                        <FieldLabel>{{ t('dialog.user.info.memo') }}</FieldLabel>
                        <FieldContent>
                            <InputGroupTextareaField
                                v-model="memo"
                                :autosize="{ minRows: 6, maxRows: 12 }"
                                :rows="6"
                                :placeholder="t('dialog.user.info.memo_placeholder')"
                                input-class="resize-none" />
                        </FieldContent>
                    </Field>
                </template>
            </FieldGroup>

            <DialogFooter>
                <Button variant="secondary" @click="cancel" class="mr-2">{{
                    t('dialog.user.note_memo.cancel')
                }}</Button>
                <Button @click="saveChanges">{{ t('dialog.user.note_memo.confirm') }}</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup>
    import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { ref, watch } from 'vue';
    import { Button } from '@/components/ui/button';
    import { InputGroupTextareaField } from '@/components/ui/input-group';
    import { Field, FieldContent, FieldGroup, FieldLabel } from '@/components/ui/field';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { miscRequest, userRequest } from '../../../api';
    import { replaceBioSymbols } from '../../../shared/utils';
    import { saveUserMemo } from '../../../coordinators/memoCoordinator';
    import { useAppearanceSettingsStore, useUserStore } from '../../../stores';

    const { userDialog } = storeToRefs(useUserStore());
    const { cachedUsers } = useUserStore();
    const { hideUserNotes, hideUserMemos } = storeToRefs(useAppearanceSettingsStore());

    const { t } = useI18n();

    const props = defineProps({
        visible: {
            type: Boolean,
            required: true
        }
    });

    const emit = defineEmits(['update:visible']);

    const note = ref('');
    const memo = ref('');

    watch(
        () => props.visible,
        (val) => {
            if (!val) return;
            note.value = userDialog.value.note;
            memo.value = userDialog.value.memo;
        }
    );

    function saveChanges() {
        cleanNote(note.value);
        checkNote(userDialog.value.ref, note.value);
        onUserMemoChange();
        emit('update:visible', false);
    }

    function cancel() {
        emit('update:visible', false);
    }

    function checkNote(ref, note) {
        if (ref.note !== note) {
            addNote(ref.id, note);
        }
    }

    async function addNote(userId, note) {
        const args = await miscRequest.saveNote({
            targetUserId: userId,
            note
        });
        handleNoteChange(args);
    }

    function handleNoteChange(args) {
        let _note = '';
        let targetUserId = '';
        if (typeof args.json !== 'undefined') {
            _note = replaceBioSymbols(args.json.note);
        }
        if (typeof args.params !== 'undefined') {
            targetUserId = args.params.targetUserId;
        }
        if (targetUserId === userDialog.value.id) {
            if (_note === args.params.note) {
                userDialog.value.note = _note;
            } else {
                // response is cached sadge :<
                userRequest.getUser({ userId: targetUserId });
            }
        }
        const ref = cachedUsers.get(targetUserId);
        if (typeof ref !== 'undefined') {
            ref.note = _note;
        }
    }

    function onUserMemoChange() {
        const D = userDialog.value;
        saveUserMemo(D.id, memo.value);
    }

    function cleanNote(note) {
        if (!note.value) return;
        // remove newlines because they aren't supported
        note.value = note.value?.replace(/[\r\n]/g, '');
    }
</script>
