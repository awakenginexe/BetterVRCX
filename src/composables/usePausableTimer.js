import { onBeforeUnmount, watch } from 'vue';

export function usePausableTimer(onComplete, paused) {
    let timer;
    let deadline = 0;
    let remaining = 0;
    let started = false;

    function clearScheduledTimer() {
        clearTimeout(timer);
        timer = undefined;
    }

    function resume() {
        if (!started || paused.value || timer || remaining <= 0) {
            return;
        }
        deadline = Date.now() + remaining;
        timer = setTimeout(() => {
            timer = undefined;
            remaining = 0;
            onComplete();
        }, remaining);
    }

    function start(duration) {
        if (started) {
            return;
        }
        started = true;
        remaining = Math.max(0, duration);
        if (remaining === 0) {
            onComplete();
            return;
        }
        resume();
    }

    function reset() {
        clearScheduledTimer();
        deadline = 0;
        remaining = 0;
        started = false;
    }

    watch(paused, (isPaused) => {
        if (isPaused) {
            if (timer) {
                remaining = Math.max(0, deadline - Date.now());
                clearScheduledTimer();
            }
            return;
        }
        resume();
    });

    onBeforeUnmount(reset);

    return { reset, start };
}
