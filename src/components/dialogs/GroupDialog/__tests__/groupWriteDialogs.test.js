import { beforeEach, describe, expect, test, vi } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { reactive } from 'vue';

const mocks = vi.hoisted(() => ({
    groupStore: null,
    userStore: null,
    locationStore: null,
    allowed: true,
    instanceAnnouncement: vi.fn(),
    createGroup: vi.fn(),
    editGroup: vi.fn(),
    createGroupEvent: vi.fn(),
    editGroupEvent: vi.fn(),
    deleteGroupEvent: vi.fn(),
    transferGroup: vi.fn(),
    checkTransferGroup: vi.fn(),
    confirm: vi.fn(),
    markGroupEventMutation: vi.fn(),
    fetch: vi.fn(),
    showEditGroupEventDialog: vi.fn()
}));
vi.mock('pinia', async (importOriginal) => {
    const actual = await importOriginal();
    const { toRefs } = await import('vue');
    return { ...actual, storeToRefs: (store) => toRefs(store) };
});
vi.mock('../../../../stores', () => ({
    useGroupStore: () => mocks.groupStore,
    useAuthStore: () => ({
        cachedConfig: { constants: { GROUPS: { MAX_OWNED: 1 } } }
    }),
    useLocationStore: () => mocks.locationStore,
    useGalleryStore: () => ({ showFullscreenImageDialog: vi.fn() }),
    useUserStore: () => mocks.userStore,
    useModalStore: () => ({ confirm: mocks.confirm, alert: vi.fn() })
}));
vi.mock('../../../../api', () => ({
    groupRequest: mocks,
    instanceRequest: mocks,
    queryRequest: { fetch: mocks.fetch }
}));
vi.mock('../../../../coordinators/groupCoordinator', () => ({
    applyGroup: (json) => json,
    showGroupDialog: vi.fn()
}));
vi.mock('../../../../shared/utils', () => ({
    hasGroupPermission: () => mocks.allowed,
    getFaviconUrl: () => '',
    debounce: (fn) => fn,
    parseLocation: () => ({ isRealInstance: true, groupId: 'grp_1' }),
    extractFileId: () => 'file_banner',
    extractFileVersion: () => 3
}));
vi.mock('../../../../composables/useUserDisplay', () => ({
    useUserDisplay: () => ({ userImage: () => '' })
}));
vi.mock('../GallerySelectDialog.vue', () => ({
    default: { template: '<div />' }
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('vue-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import GroupEditDialog from '../GroupEditDialog.vue';
import GroupEventEditDialog from '../GroupEventEditDialog.vue';
import GroupTransferDialog from '../GroupTransferDialog.vue';
import InstanceAnnouncementDialog from '../../InstanceAnnouncementDialog.vue';

beforeEach(() => {
    vi.clearAllMocks();
    mocks.allowed = true;
    mocks.locationStore = reactive({
        lastLocation: { location: 'wrld_1:instance' }
    });
    mocks.userStore = reactive({
        currentUser: { id: 'usr_me' },
        isVRCPlus: true,
        isLocalUserVrcPlusSupporter: true,
        subsetOfLanguages: {}
    });
    mocks.groupStore = reactive({
        currentUserGroups: new Map(),
        cachedGroups: new Map([['grp_1', { bannerUrl: 'banner' }]]),
        groupEditDialog: {
            visible: true,
            mode: 'create',
            loading: false,
            roleTemplatesLoading: false,
            name: ' Test Group ',
            shortCode: 'TEST',
            description: ' Description ',
            joinState: 'open',
            privacy: 'default',
            roleTemplate: 'default',
            roleTemplates: [{ value: 'default', name: 'Default' }],
            languages: [],
            links: [],
            rules: '',
            bannerId: '',
            iconId: '',
            groupRef: {}
        },
        groupEventEditDialog: {
            visible: true,
            mode: 'create',
            loading: false,
            groupId: 'grp_1',
            groupRef: {},
            startsAt: '2030-01-01T15:00:00Z',
            endsAt: '2030-01-01T16:00:00Z',
            title: ' Event ',
            description: ' Details ',
            accessType: 'group',
            category: 'other',
            tags: [],
            imageId: '',
            roleIds: [],
            platforms: [],
            languages: [],
            hostEarlyJoinMinutes: 60,
            guestEarlyJoinMinutes: 5,
            closeInstanceAfterEndMinutes: 5,
            recurrence: null
        },
        showEditGroupEventDialog: mocks.showEditGroupEventDialog,
        markGroupEventMutation: mocks.markGroupEventMutation
    });
    mocks.createGroup.mockResolvedValue({ json: { id: 'grp_new' } });
    mocks.editGroup.mockResolvedValue({ json: { id: 'grp_1' } });
    mocks.confirm.mockResolvedValue({ ok: true });
    mocks.checkTransferGroup.mockResolvedValue({
        json: { requirements: { targetIsGroupMember: true } }
    });
});

const setup = (component, props) => shallowMount(component, { props }).vm;

describe('group write dialogs', () => {
    test.each(['account', 'closed', 'replaced'])(
        'does not reopen a stale parent event editor after %s changes',
        async (change) => {
            const D = mocks.groupStore.groupEventEditDialog;
            D.mode = 'edit';
            D.eventId = 'event_child';
            D.seriesId = 'event_parent';
            let resolve;
            mocks.fetch.mockReturnValueOnce(
                new Promise((done) => {
                    resolve = done;
                })
            );
            const pending = setup(GroupEventEditDialog).editParentEvent();
            if (change === 'account')
                mocks.userStore.currentUser.id = 'usr_other';
            if (change === 'closed') D.visible = false;
            if (change === 'replaced')
                mocks.groupStore.groupEventEditDialog = {
                    ...D,
                    eventId: 'event_new'
                };
            resolve({ json: { id: 'event_parent' } });
            await pending;
            expect(mocks.showEditGroupEventDialog).not.toHaveBeenCalled();
        }
    );

    test('announcements require the current group instance and use its banner by default', async () => {
        const vm = setup(InstanceAnnouncementDialog, {
            open: true,
            location: 'wrld_1:instance'
        });
        vm.message = ' Hello ';
        await vm.sendAnnouncement();
        expect(mocks.instanceAnnouncement).toHaveBeenCalledWith({
            location: 'wrld_1:instance',
            title: 'Instance Announcement',
            message: 'Hello',
            imageId: 'file_banner',
            imageVersion: 3
        });
        mocks.locationStore.lastLocation.location = 'wrld_else:instance';
        await vm.sendAnnouncement();
        expect(mocks.instanceAnnouncement).toHaveBeenCalledTimes(1);
    });
    test('creates with the API privacy value and trims user text', async () => {
        const vm = setup(GroupEditDialog);
        await vm.saveGroup();
        expect(mocks.createGroup).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Test Group',
                description: 'Description',
                privacy: 'default',
                joinState: 'open'
            })
        );
    });
    test('creation requires VRC+ and available ownership capacity at submit time', async () => {
        const vm = setup(GroupEditDialog);
        mocks.userStore.isLocalUserVrcPlusSupporter = false;
        await vm.saveGroup();
        mocks.userStore.isLocalUserVrcPlusSupporter = true;
        mocks.groupStore.currentUserGroups.set('grp_owned', {
            ownerId: 'usr_me'
        });
        await vm.saveGroup();
        expect(mocks.createGroup).not.toHaveBeenCalled();
    });
    test('does not edit after group-data-manage permission is lost', async () => {
        mocks.groupStore.groupEditDialog.mode = 'edit';
        mocks.groupStore.groupEditDialog.groupId = 'grp_1';
        mocks.allowed = false;
        await setup(GroupEditDialog).saveGroup();
        expect(mocks.editGroup).not.toHaveBeenCalled();
    });
    test('weekly recurrence accepts the default weekday pattern and preserves a saved timezone', async () => {
        mocks.groupStore.groupEventEditDialog.recurrence = {
            frequency: 'weekly',
            interval: 2,
            timezone: 'Asia/Bangkok'
        };
        await setup(GroupEventEditDialog).saveEvent();
        expect(mocks.createGroupEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                occurrenceKind: 'series',
                title: 'Event',
                recurrence: {
                    frequency: 'weekly',
                    interval: 2,
                    timezone: 'Asia/Bangkok'
                }
            })
        );
    });
    test('calendar mutation requires manage permission, including delete after confirmation', async () => {
        const D = mocks.groupStore.groupEventEditDialog;
        D.mode = 'edit';
        D.eventId = 'event_1';
        mocks.allowed = false;
        const vm = setup(GroupEventEditDialog);
        await vm.saveEvent();
        await vm.deleteEvent();
        expect(mocks.editGroupEvent).not.toHaveBeenCalled();
        expect(mocks.deleteGroupEvent).not.toHaveBeenCalled();
    });
    test('ownership transfer requires current ownership and explicit confirmation', async () => {
        const dialogData = reactive({
            visible: true,
            groupId: 'grp_1',
            groupName: 'Group',
            ownerId: 'usr_me'
        });
        const vm = setup(GroupTransferDialog, { dialogData });
        const member = { userId: 'usr_next', user: { displayName: 'Next' } };
        await vm.selectMember(member);
        mocks.confirm.mockResolvedValueOnce({ ok: false });
        await vm.confirmTransfer();
        expect(mocks.transferGroup).not.toHaveBeenCalled();
        await vm.confirmTransfer();
        expect(mocks.transferGroup).toHaveBeenCalledWith({
            groupId: 'grp_1',
            transferTargetId: 'usr_next'
        });
        dialogData.ownerId = 'usr_other';
        await vm.confirmTransfer();
        expect(mocks.transferGroup).toHaveBeenCalledTimes(1);
    });
});
