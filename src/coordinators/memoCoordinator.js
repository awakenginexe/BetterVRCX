import { useFriendStore, useUserStore } from '../stores';
import { database } from '../services/database';
import { syncFriendSearchIndex } from './searchIndexCoordinator';

/**
 * @returns {Promise<void>}
 */
async function migrateMemos() {
    const json = JSON.parse(await VRCXStorage.GetAll());
    for (const line in json) {
        if (line.substring(0, 8) === 'memo_usr') {
            const userId = line.substring(5);
            const memo = json[line];
            if (memo) {
                await saveUserMemo(userId, memo);
                VRCXStorage.Remove(`memo_${userId}`);
            }
        }
    }
}

/**
 *
 * @param {string} userId
 * @returns
 */
function applyUserMemo(userId, memo) {
    const text = String(memo || '');
    const user = useUserStore().cachedUsers.get(userId);
    if (user) user.$memo = text;
    const friend = useFriendStore().friends.get(userId);
    if (friend) {
        friend.memo = text;
        friend.$nickName = text.split('\n')[0];
        syncFriendSearchIndex(friend);
    }
}

/**
 * @param {string} userId
 */
async function getUserMemo(userId) {
    try {
        const row = await database.getUserMemo(userId);
        applyUserMemo(userId, row?.memo);
        return row;
    } catch (err) {
        console.error(err);
        return {
            userId: '',
            editedAt: '',
            memo: ''
        };
    }
}

/**
 *
 * @param {string} id
 * @param {string} memo
 */
async function saveUserMemo(id, memo) {
    const userStore = useUserStore();
    if (memo) {
        await database.setUserMemo({
            userId: id,
            editedAt: new Date().toJSON(),
            memo
        });
    } else {
        await database.deleteUserMemo(id);
    }
    applyUserMemo(id, memo);
    if (userStore.userDialog.id === id) {
        userStore.setUserDialogMemo(memo);
    }
}

/**
 * @returns {Promise<void>}
 */
async function getAllUserMemos() {
    const memos = await database.getAllUserMemos();
    memos.forEach(({ userId, memo }) => applyUserMemo(userId, memo));
}

/**
 *
 * @param {string} worldId
 * @returns
 */
async function getWorldMemo(worldId) {
    try {
        return await database.getWorldMemo(worldId);
    } catch (err) {
        console.error(err);
        return {
            worldId: '',
            editedAt: '',
            memo: ''
        };
    }
}

// async function getAvatarMemo(avatarId) {
//     try {
//         return await database.getAvatarMemoDB(avatarId);
//     } catch (err) {
//         console.error(err);
//         return {
//             avatarId: '',
//             editedAt: '',
//             memo: ''
//         };
//     }
// }

export {
    migrateMemos,
    getUserMemo,
    saveUserMemo,
    getAllUserMemos,
    getWorldMemo
    // getAvatarMemo
};
