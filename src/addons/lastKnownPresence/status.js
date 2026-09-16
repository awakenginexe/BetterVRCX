/** VRChat status values, as used by useUserDisplay and the status picker. */
export function isHiddenPresenceStatus(status) {
    return status === 'ask me' || status === 'busy';
}
