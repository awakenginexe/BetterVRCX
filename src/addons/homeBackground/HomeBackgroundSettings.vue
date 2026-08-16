<template>
    <div class="space-y-6">
        <div class="space-y-1">
            <h3 class="text-base font-semibold text-foreground">Home Wallpaper & Background</h3>
            <p class="text-xs text-muted-foreground">
                Customize the background wallpaper, dimming, and blur for your Home dashboard.
            </p>
        </div>

        <!-- Mode Selector -->
        <div class="space-y-3">
            <label class="text-xs font-medium text-foreground">Wallpaper Source</label>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                    type="button"
                    class="flex flex-col items-start p-3 rounded-lg border text-left transition-all cursor-pointer"
                    :class="
                        state.mode === 'vrchat_photos'
                            ? 'border-primary bg-primary/10 ring-1 ring-primary'
                            : 'border-border bg-card hover:bg-accent/40'
                    "
                    @click="setMode('vrchat_photos')">
                    <span class="text-xs font-semibold text-foreground">VRChat Photos Folder</span>
                    <span class="text-[11px] text-muted-foreground mt-0.5">Use your in-game photography</span>
                </button>

                <button
                    type="button"
                    class="flex flex-col items-start p-3 rounded-lg border text-left transition-all cursor-pointer"
                    :class="
                        state.mode === 'custom'
                            ? 'border-primary bg-primary/10 ring-1 ring-primary'
                            : 'border-border bg-card hover:bg-accent/40'
                    "
                    @click="setMode('custom')">
                    <span class="text-xs font-semibold text-foreground">Custom Image</span>
                    <span class="text-[11px] text-muted-foreground mt-0.5">Select your own wallpaper image</span>
                </button>

                <button
                    type="button"
                    class="flex flex-col items-start p-3 rounded-lg border text-left transition-all cursor-pointer"
                    :class="
                        state.mode === 'preset'
                            ? 'border-primary bg-primary/10 ring-1 ring-primary'
                            : 'border-border bg-card hover:bg-accent/40'
                    "
                    @click="setMode('preset')">
                    <span class="text-xs font-semibold text-foreground">Curated Wallpapers</span>
                    <span class="text-[11px] text-muted-foreground mt-0.5">Choose from high-quality presets</span>
                </button>
            </div>
        </div>

        <!-- VRChat Photos Directory Selection -->
        <div v-if="state.mode === 'vrchat_photos'" class="space-y-3">
            <label class="text-xs font-medium text-foreground">VRChat Pictures Directory</label>
            <div class="flex items-center gap-2">
                <input
                    v-model="state.vrchatPhotosFolder"
                    type="text"
                    placeholder="C:\Users\...\Pictures\VRChat"
                    class="flex-1 h-9 px-3 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    @input="saveHomeBackgroundConfig" />
                <Button size="sm" variant="outline" @click="pickPhotosFolder">
                    <FolderSearch class="size-3.5 mr-1" />
                    Browse Folder
                </Button>
            </div>
            <div class="flex items-center gap-2 mt-2">
                <Button size="sm" variant="outline" @click="fetchRandomVRChatPhoto">
                    <RotateCw class="size-3.5 mr-1" />
                    Pick Random Photo
                </Button>
                <Button size="sm" variant="outline" @click="pickSpecificPhoto">
                    <ImageIcon class="size-3.5 mr-1" />
                    Select Specific Photo
                </Button>
            </div>
        </div>

        <!-- Custom Image Selection -->
        <div v-if="state.mode === 'custom'" class="space-y-3">
            <label class="text-xs font-medium text-foreground">Image File</label>
            <div class="flex items-center gap-2">
                <input
                    v-model="state.customPath"
                    type="text"
                    placeholder="Enter file path or URL..."
                    class="flex-1 h-9 px-3 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    @input="saveHomeBackgroundConfig" />
                <Button size="sm" variant="outline" @click="pickCustomImage">
                    <FolderOpen class="size-3.5 mr-1" />
                    Browse
                </Button>
            </div>
        </div>

        <!-- Preset Selection -->
        <div v-if="state.mode === 'preset'" class="space-y-3">
            <label class="text-xs font-medium text-foreground">Select Preset</label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div
                    v-for="(preset, idx) in defaultPresets"
                    :key="idx"
                    class="relative aspect-video rounded-lg overflow-hidden border cursor-pointer group transition-all"
                    :class="
                        state.presetIndex === idx
                            ? 'border-primary ring-2 ring-primary'
                            : 'border-border hover:border-border-strong'
                    "
                    @click="setPresetIndex(idx)">
                    <img :src="preset" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div
                        v-if="state.presetIndex === idx"
                        class="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <span class="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
                            Active
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Overlay, Blur, and Position Options -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2 border-t border-border">
            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <label class="text-xs font-medium text-foreground">Dim Overlay</label>
                    <span class="text-xs text-muted-foreground font-mono">{{ state.dimOpacity }}%</span>
                </div>
                <input
                    v-model.number="state.dimOpacity"
                    type="range"
                    min="10"
                    max="90"
                    step="5"
                    class="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    @input="saveHomeBackgroundConfig" />
                <p class="text-[11px] text-muted-foreground">Darkens background for text contrast</p>
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <label class="text-xs font-medium text-foreground">Background Blur</label>
                    <span class="text-xs text-muted-foreground font-mono">{{ state.blur }}px</span>
                </div>
                <input
                    v-model.number="state.blur"
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    class="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    @input="saveHomeBackgroundConfig" />
                <p class="text-[11px] text-muted-foreground">Softens wallpaper details</p>
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <label class="text-xs font-medium text-foreground">Vertical Position</label>
                    <span class="text-xs text-muted-foreground font-mono">{{ state.positionY ?? 50 }}%</span>
                </div>
                <input
                    v-model.number="state.positionY"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    class="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    @input="saveHomeBackgroundConfig" />
                <p class="text-[11px] text-muted-foreground">Shift image up (0%) or down (100%)</p>
            </div>
        </div>

        <!-- Upcoming Events Timeframe -->
        <div class="space-y-3 pt-2 border-t border-border">
            <div>
                <label class="text-xs font-medium text-foreground">Upcoming Events Range</label>
                <p class="text-[11px] text-muted-foreground">
                    Only show upcoming group events starting within this timeframe to help you prepare
                </p>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                <button
                    v-for="opt in eventRangeOptions"
                    :key="opt.value"
                    type="button"
                    class="flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer"
                    :class="
                        (state.eventsDaysAhead ?? 7) === opt.value
                            ? 'border-primary bg-primary/10 ring-1 ring-primary text-primary font-semibold'
                            : 'border-border bg-card hover:bg-accent/40 text-foreground'
                    "
                    @click="setEventsDaysAhead(opt.value)">
                    <span class="text-xs font-medium">{{ opt.label }}</span>
                    <span class="text-[10px] text-muted-foreground mt-0.5">{{ opt.sublabel }}</span>
                </button>
            </div>
        </div>

        <!-- Live Preview -->
        <div class="space-y-2 pt-2 border-t border-border">
            <div class="flex items-center justify-between">
                <label class="text-xs font-medium text-foreground">Live Dashboard Preview</label>
                <span class="text-[11px] text-muted-foreground">16:9 Dashboard Simulation</span>
            </div>
            <div
                class="relative w-full max-w-[720px] aspect-[16/9] mx-auto rounded-xl overflow-hidden border border-border shadow-xl select-none">
                <!-- Background Layer -->
                <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <div class="absolute inset-0 transition-all duration-300" :style="backgroundStyle"></div>
                    <div class="absolute inset-0 transition-all duration-300" :style="overlayStyle"></div>
                    <div
                        class="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent"
                        style="mask-image: linear-gradient(to top, black 50%, transparent 100%)" />
                    <div
                        class="absolute inset-0 bg-gradient-to-r from-background/90 via-transparent to-background/50" />
                </div>

                <!-- Miniature Home Dashboard Layout -->
                <div class="relative z-10 flex flex-col justify-between h-full p-4 sm:p-5">
                    <!-- Top: Welcome & Stats -->
                    <div class="space-y-1">
                        <div
                            class="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5 drop-shadow-md">
                            <span>Welcome!</span>
                            <span class="text-primary-foreground font-black">{{ userDisplayName }}</span>
                        </div>
                        <p class="text-[10px] sm:text-xs text-white/80 font-medium line-clamp-1 drop-shadow-sm">
                            Explore your VRChat world, news, and friends activity
                        </p>
                        <div class="flex items-center gap-2 pt-1">
                            <div
                                class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 text-[9px] sm:text-[10px] text-white/80 backdrop-blur-sm">
                                <span class="size-1.5 rounded-full bg-emerald-400"></span>
                                <span>Online Players: <strong class="text-white font-mono">85,289</strong></span>
                            </div>
                            <div
                                class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 text-[9px] sm:text-[10px] text-white/80 backdrop-blur-sm">
                                <span class="text-primary text-[10px]">👥</span>
                                <span>Online Friends: <strong class="text-white font-mono">12</strong></span>
                            </div>
                        </div>
                    </div>

                    <!-- Middle: Spacious Open Area for Wallpaper Subject Focus -->
                    <div class="flex-1 min-h-[40px] pointer-events-none" />

                    <!-- Bottom: Events/News & Friends Locations Mock Cards -->
                    <div class="space-y-2">
                        <div class="grid grid-cols-2 gap-2.5">
                            <div
                                class="p-2 rounded-lg bg-black/40 border border-white/10 backdrop-blur-sm flex flex-col justify-between h-14">
                                <span class="text-[9px] font-bold uppercase tracking-wider text-white/80"
                                    >Upcoming Events</span
                                >
                                <span class="text-[9px] text-white/50 text-center">No upcoming events scheduled</span>
                            </div>
                            <div
                                class="p-2 rounded-lg bg-black/40 border border-white/10 backdrop-blur-sm flex items-center gap-2 h-14">
                                <div
                                    class="size-10 rounded bg-white/10 border border-white/10 shrink-0 flex items-center justify-center text-[10px] text-white/40">
                                    📰
                                </div>
                                <div class="min-w-0">
                                    <span class="text-[9px] font-bold text-white line-clamp-1">Developer Update</span>
                                    <span class="text-[8px] text-white/60 line-clamp-1"
                                        >Latest VRChat news & features...</span
                                    >
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-3 gap-1.5">
                            <div
                                class="h-6 rounded-md bg-black/50 border border-white/10 backdrop-blur-sm px-2 flex items-center justify-between text-[8px] text-white/80">
                                <span class="truncate">Sala Pak Jai</span>
                                <span class="text-white/50 font-mono">3/48</span>
                            </div>
                            <div
                                class="h-6 rounded-md bg-black/50 border border-white/10 backdrop-blur-sm px-2 flex items-center justify-between text-[8px] text-white/80">
                                <span class="truncate">The Arch</span>
                                <span class="text-white/50 font-mono">1/66</span>
                            </div>
                            <div
                                class="h-6 rounded-md bg-black/50 border border-white/10 backdrop-blur-sm px-2 flex items-center justify-between text-[8px] text-white/80">
                                <span class="truncate">Japan Shrine</span>
                                <span class="text-white/50 font-mono">1/50</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { computed, onMounted } from 'vue';
    import { storeToRefs } from 'pinia';
    import { FolderOpen, FolderSearch, ImageIcon, RotateCw } from 'lucide-vue-next';
    import { Button } from '@/components/ui/button';
    import { useUserStore } from '@/stores';
    import { useHomeBackground } from './homeBackgroundStore';

    const userStore = useUserStore();
    const { currentUser } = storeToRefs(userStore);
    const userDisplayName = computed(() => currentUser.value?.displayName || '_ANXE_');

    const {
        state,
        activePhotoUrl,
        defaultPresets,
        backgroundStyle,
        overlayStyle,
        saveHomeBackgroundConfig,
        initPhotosLocation,
        fetchRandomVRChatPhoto,
        pickSpecificPhoto,
        pickCustomImage,
        pickPhotosFolder
    } = useHomeBackground();

    const eventRangeOptions = [
        { value: 1, label: '1 Day', sublabel: 'Next 24h' },
        { value: 3, label: '3 Days', sublabel: 'Within 3d' },
        { value: 5, label: '5 Days', sublabel: 'Within 5d' },
        { value: 7, label: '7 Days', sublabel: 'Within 1w' },
        { value: 14, label: '14 Days', sublabel: 'Within 2w' },
        { value: 30, label: '30 Days', sublabel: 'Within 1m' },
        { value: 0, label: 'All', sublabel: 'Any Time' }
    ];

    function setEventsDaysAhead(days) {
        state.eventsDaysAhead = days;
        saveHomeBackgroundConfig();
    }

    function setMode(mode) {
        state.mode = mode;
        saveHomeBackgroundConfig();
        if (mode === 'vrchat_photos' && !activePhotoUrl.value) {
            fetchRandomVRChatPhoto();
        }
    }

    function setPresetIndex(idx) {
        state.presetIndex = idx;
        saveHomeBackgroundConfig();
    }

    onMounted(async () => {
        await initPhotosLocation();
        if (state.mode === 'vrchat_photos' && !activePhotoUrl.value) {
            fetchRandomVRChatPhoto();
        }
    });
</script>
