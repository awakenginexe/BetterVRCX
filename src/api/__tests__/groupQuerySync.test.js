import { beforeEach, describe, expect, test, vi } from 'vitest';

const mockRequest = vi.fn();
const mockInvalidateQueries = vi.fn().mockResolvedValue();
const mockApplyGroup = vi.fn((json) => json);

vi.mock('../../services/request', () => ({
    request: (...args) => mockRequest(...args)
}));

vi.mock('../../stores', () => ({
    useGroupStore: () => ({
        applyGroup: (...args) => mockApplyGroup(...args)
    }),
    useUserStore: () => ({
        currentUser: { id: 'usr_me' }
    })
}));

vi.mock('../../queries', () => ({
    queryClient: {
        invalidateQueries: (...args) => mockInvalidateQueries(...args)
    },
    entityQueryPolicies: {
        user: {},
        avatar: {},
        world: {},
        worldCollection: {}
    }
}));

import groupRequest from '../group';

describe('group query sync', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('group mutations invalidate scoped active group queries', async () => {
        mockRequest.mockResolvedValue({ ok: true });

        await groupRequest.setGroupRepresentation('grp_1', {
            isRepresenting: true
        });
        await groupRequest.deleteGroupPost({
            groupId: 'grp_1',
            postId: 'post_1'
        });
        await groupRequest.setGroupMemberProps('usr_me', 'grp_1', {
            visibility: 'visible'
        });

        expect(mockInvalidateQueries).toHaveBeenCalledTimes(3);
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: ['group', 'grp_1'],
            refetchType: 'active'
        });
    });

    test('role and gallery mutations send only their body and refresh scoped data', async () => {
        mockRequest.mockResolvedValue({ id: 'new' });
        await groupRequest.createGroupRole({
            groupId: 'grp_1',
            name: 'Member'
        });
        expect(mockRequest).toHaveBeenLastCalledWith('groups/grp_1/roles', {
            method: 'POST',
            params: { name: 'Member' }
        });
        await groupRequest.editGroupRole({
            groupId: 'grp_1',
            roleId: 'role_1',
            order: 2
        });
        expect(mockRequest).toHaveBeenLastCalledWith(
            'groups/grp_1/roles/role_1',
            { method: 'PUT', params: { order: 2 } }
        );
        await groupRequest.deleteGroupRole({
            groupId: 'grp_1',
            roleId: 'role_1'
        });
        await groupRequest.createGroupGallery({
            groupId: 'grp_1',
            name: 'Photos'
        });
        expect(mockRequest).toHaveBeenLastCalledWith('groups/grp_1/galleries', {
            method: 'POST',
            params: { name: 'Photos' }
        });
        await groupRequest.editGroupGallery({
            groupId: 'grp_1',
            galleryId: 'gal_1',
            name: 'New'
        });
        expect(mockRequest).toHaveBeenLastCalledWith(
            'groups/grp_1/galleries/gal_1',
            { method: 'PUT', params: { name: 'New' } }
        );
        await groupRequest.deleteGroupGallery({
            groupId: 'grp_1',
            galleryId: 'gal_1'
        });
        await groupRequest.deleteGroupGalleryImage({
            groupId: 'grp_1',
            galleryId: 'gal_1',
            imageId: 'img_1'
        });
        expect(mockInvalidateQueries).toHaveBeenCalledTimes(7);
    });

    test('calendar accepts optional pagination without changing the group id', async () => {
        mockRequest.mockResolvedValue({});
        await groupRequest.getGroupCalendar('grp_1', {
            n: 100,
            offset: 200,
            after: '2026-10-19'
        });
        expect(mockRequest).toHaveBeenCalledWith('calendar/grp_1', {
            method: 'GET',
            params: { n: 100, offset: 200, after: '2026-10-19' }
        });
    });
});

test('group and calendar writes use their dedicated endpoints with unchanged payloads', async () => {
    mockRequest.mockResolvedValue({});
    const recurrence = {
        frequency: 'weekly',
        interval: 2,
        timezone: 'Asia/Bangkok',
        daysOfWeek: ['SA']
    };
    const event = {
        groupId: 'grp_1',
        title: 'Weekly meetup',
        recurrence,
        occurrenceKind: 'series'
    };
    await groupRequest.createGroupEvent(event);
    expect(mockRequest).toHaveBeenLastCalledWith('calendar/grp_1/event', {
        method: 'POST',
        params: event
    });
    const edit = { ...event, eventId: 'event_1' };
    await groupRequest.editGroupEvent(edit);
    expect(mockRequest).toHaveBeenLastCalledWith(
        'calendar/grp_1/event_1/event',
        { method: 'PUT', params: edit }
    );
    await groupRequest.checkTransferGroup({
        groupId: 'grp_1',
        transferTargetId: 'usr_next'
    });
    expect(mockRequest).toHaveBeenLastCalledWith('groups/grp_1/transfer', {
        method: 'GET',
        params: { transferTargetId: 'usr_next' }
    });
    await groupRequest.transferGroup({
        groupId: 'grp_1',
        transferTargetId: 'usr_next'
    });
    expect(mockRequest).toHaveBeenLastCalledWith('groups/grp_1/transfer', {
        method: 'POST',
        params: { transferTargetId: 'usr_next' }
    });
});
