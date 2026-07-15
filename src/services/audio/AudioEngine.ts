import { EQ_BANDS } from '@/core/constants';
import type { RepeatMode, Track } from '@/core/types';
import { db } from '@/infrastructure/db/db';
import { getTrackFile } from '@/infrastructure/fs/fileSystem';
import { clamp, shuffleArray } from '@/lib/utils';
import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore } from '@/stores/settingsStore';

interface Deck {
  audio: HTMLAudioElement;
  source: MediaElementAudioSourceNode | null;
  gain: GainNode | null;
  objectUrl: string | null;
}

/**
 * Singleton playback engine built on two HTMLAudioElement "decks" routed
 * through a shared Web Audio chain:
 *
 *   deck A ─┐
 *           ├─ deckGain ─ EQ(10×Biquad) ─ Compressor ─ MasterGain ─ Analyser ─ out
 *   deck B ─┘
 *
 * Two decks make gapless-ish crossfade possible; the shared chain powers the
 * equalizer, loudness normalization and the visualizers. The engine owns all
 * playback state and mirrors it into the zustand player store for the UI.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private decks: [Deck, Deck];
  private active = 0;
  private eqFilters: BiquadFilterNode[] = [];
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  private positionTimer: number | null = null;
  private sleepTimeout: number | null = null;
  private sleepAtEndOfTrack = false;
  private crossfading = false;
  /** Position to seek to when playback resumes after a session restore. */
  private pendingRestorePosition: number | null = null;

  constructor() {
    this.decks = [this.createDeck(), this.createDeck()];

    // React to relevant settings live.
    useSettingsStore.subscribe((state, prev) => {
      if (
        state.volume !== prev.volume ||
        state.muted !== prev.muted ||
        state.normalization !== prev.normalization
      ) {
        this.applyVolume();
        this.applyNormalization();
      }
      if (state.playbackRate !== prev.playbackRate) this.applyPlaybackRate();
      if (
        state.eqEnabled !== prev.eqEnabled ||
        state.eqGains !== prev.eqGains ||
        state.eqPreset !== prev.eqPreset
      ) {
        this.applyEq();
      }
    });
  }

  // ── Graph setup ─────────────────────────────────────────────

  private createDeck(): Deck {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.addEventListener('ended', () => this.handleEnded(audio));
    audio.addEventListener('timeupdate', () => this.maybeStartCrossfade(audio));
    return { audio, source: null, gain: null, objectUrl: null };
  }

  /** Lazily builds the AudioContext (requires a user gesture on first play). */
  private ensureContext() {
    if (this.ctx) return;
    const ctx = new AudioContext();
    this.ctx = ctx;

    this.eqFilters = EQ_BANDS.map((freq, i) => {
      const filter = ctx.createBiquadFilter();
      filter.type = i === 0 ? 'lowshelf' : i === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.1;
      filter.gain.value = 0;
      return filter;
    });

    this.compressor = ctx.createDynamicsCompressor();
    this.masterGain = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.82;

    let node: AudioNode = this.eqFilters[0];
    for (let i = 1; i < this.eqFilters.length; i++) {
      node.connect(this.eqFilters[i]);
      node = this.eqFilters[i];
    }
    node.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    for (const deck of this.decks) {
      deck.source = ctx.createMediaElementSource(deck.audio);
      deck.gain = ctx.createGain();
      deck.source.connect(deck.gain);
      deck.gain.connect(this.eqFilters[0]);
    }

    this.applyVolume();
    this.applyNormalization();
    this.applyEq();
    this.applyPlaybackRate();
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  // ── Settings application ────────────────────────────────────

  private applyVolume() {
    const { volume, muted } = useSettingsStore.getState();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : volume, this.ctx.currentTime, 0.02);
    } else {
      // Before the graph exists, fall back to element volume.
      this.decks.forEach((d) => (d.audio.volume = muted ? 0 : volume));
    }
  }

  private applyNormalization() {
    if (!this.compressor || !this.ctx) return;
    const { normalization } = useSettingsStore.getState();
    const t = this.ctx.currentTime;
    if (normalization) {
      this.compressor.threshold.setTargetAtTime(-24, t, 0.05);
      this.compressor.knee.setTargetAtTime(30, t, 0.05);
      this.compressor.ratio.setTargetAtTime(6, t, 0.05);
      this.compressor.attack.setTargetAtTime(0.01, t, 0.05);
      this.compressor.release.setTargetAtTime(0.25, t, 0.05);
    } else {
      // Transparent: ratio 1 means no compression.
      this.compressor.threshold.setTargetAtTime(0, t, 0.05);
      this.compressor.knee.setTargetAtTime(0, t, 0.05);
      this.compressor.ratio.setTargetAtTime(1, t, 0.05);
    }
  }

  private applyEq() {
    if (!this.ctx || this.eqFilters.length === 0) return;
    const { eqEnabled, eqGains } = useSettingsStore.getState();
    const t = this.ctx.currentTime;
    this.eqFilters.forEach((filter, i) => {
      filter.gain.setTargetAtTime(eqEnabled ? (eqGains[i] ?? 0) : 0, t, 0.05);
    });
  }

  private applyPlaybackRate() {
    const { playbackRate } = useSettingsStore.getState();
    this.decks.forEach((d) => (d.audio.playbackRate = playbackRate));
  }

  // ── Queue management ────────────────────────────────────────

  /** Replaces the queue and starts playing at `startIndex`. */
  async playTracks(trackIds: string[], startIndex = 0, options?: { shuffle?: boolean }) {
    if (trackIds.length === 0) return;
    const shuffle = options?.shuffle ?? usePlayerStore.getState().shuffle;

    let queue = [...trackIds];
    let index = startIndex;
    if (shuffle) {
      const first = trackIds[startIndex];
      const rest = shuffleArray(trackIds.filter((_, i) => i !== startIndex));
      queue = [first, ...rest];
      index = 0;
    }

    usePlayerStore.setState({ queue, originalQueue: [...trackIds], index, shuffle });
    await this.loadAndPlay(queue[index]);
  }

  async playQueueIndex(index: number) {
    const { queue } = usePlayerStore.getState();
    if (index < 0 || index >= queue.length) return;
    usePlayerStore.setState({ index });
    await this.loadAndPlay(queue[index]);
  }

  addToQueue(trackIds: string[]) {
    const { queue, originalQueue } = usePlayerStore.getState();
    usePlayerStore.setState({
      queue: [...queue, ...trackIds],
      originalQueue: [...originalQueue, ...trackIds],
    });
  }

  playNext(trackIds: string[]) {
    const { queue, originalQueue, index } = usePlayerStore.getState();
    const next = [...queue];
    next.splice(index + 1, 0, ...trackIds);
    usePlayerStore.setState({ queue: next, originalQueue: [...originalQueue, ...trackIds] });
  }

  removeFromQueue(removeIndex: number) {
    const { queue, index } = usePlayerStore.getState();
    if (removeIndex === index) return; // don't remove the playing track
    const next = queue.filter((_, i) => i !== removeIndex);
    usePlayerStore.setState({ queue: next, index: removeIndex < index ? index - 1 : index });
  }

  moveInQueue(from: number, to: number) {
    const { queue, index } = usePlayerStore.getState();
    if (from === to) return;
    const next = [...queue];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    let newIndex = index;
    if (from === index) newIndex = to;
    else if (from < index && to >= index) newIndex = index - 1;
    else if (from > index && to <= index) newIndex = index + 1;

    usePlayerStore.setState({ queue: next, index: newIndex });
  }

  toggleShuffle() {
    const { shuffle, queue, originalQueue, index } = usePlayerStore.getState();
    const currentId = queue[index];
    if (!shuffle) {
      const rest = shuffleArray(queue.filter((_, i) => i !== index));
      usePlayerStore.setState({ shuffle: true, queue: [currentId, ...rest], index: 0 });
    } else {
      const restoredIndex = Math.max(0, originalQueue.indexOf(currentId));
      usePlayerStore.setState({ shuffle: false, queue: [...originalQueue], index: restoredIndex });
    }
  }

  cycleRepeat() {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    const { repeat } = usePlayerStore.getState();
    usePlayerStore.setState({ repeat: order[(order.indexOf(repeat) + 1) % order.length] });
  }

  // ── Transport ───────────────────────────────────────────────

  private deck(): Deck {
    return this.decks[this.active];
  }

  private async loadAndPlay(trackId: string, options?: { paused?: boolean; position?: number }) {
    const track = await db.tracks.get(trackId);
    if (!track) return;

    this.ensureContext();
    if (this.ctx?.state === 'suspended') await this.ctx.resume();

    this.cancelCrossfade();
    const deck = this.deck();
    const other = this.decks[1 - this.active];
    other.audio.pause();

    await this.setDeckSource(deck, track);
    deck.audio.playbackRate = useSettingsStore.getState().playbackRate;
    if (deck.gain && this.ctx) deck.gain.gain.setValueAtTime(1, this.ctx.currentTime);

    if (options?.position) deck.audio.currentTime = options.position;

    usePlayerStore.setState((s) => ({
      currentTrack: track,
      duration: track.duration || deck.audio.duration || 0,
      position: options?.position ?? 0,
      loadCount: s.loadCount + 1,
    }));

    if (options?.paused) {
      usePlayerStore.setState({ isPlaying: false });
      return;
    }

    try {
      await deck.audio.play();
      usePlayerStore.setState({ isPlaying: true });
      this.startPositionTimer();
      void this.registerPlay(track);
    } catch (error) {
      usePlayerStore.setState({ isPlaying: false });
      throw error;
    }
  }

  private async setDeckSource(deck: Deck, track: Track) {
    const file = await getTrackFile(track);
    if (deck.objectUrl) URL.revokeObjectURL(deck.objectUrl);
    deck.objectUrl = URL.createObjectURL(file);
    deck.audio.src = deck.objectUrl;
    deck.audio.load();
  }

  private async registerPlay(track: Track) {
    await db.tracks.update(track.id, {
      playCount: (track.playCount ?? 0) + 1,
      lastPlayedAt: Date.now(),
    });
  }

  async togglePlay() {
    const { isPlaying, currentTrack, queue, index } = usePlayerStore.getState();
    if (isPlaying) {
      this.pause();
      return;
    }
    const deck = this.deck();
    if (!deck.audio.src && currentTrack) {
      // Session restore: the file wasn't loaded yet.
      const position = this.pendingRestorePosition ?? 0;
      this.pendingRestorePosition = null;
      await this.loadAndPlay(currentTrack.id, { position });
      return;
    }
    if (!deck.audio.src && queue.length > 0) {
      await this.playQueueIndex(Math.max(0, index));
      return;
    }
    if (deck.audio.src) {
      this.ensureContext();
      if (this.ctx?.state === 'suspended') await this.ctx.resume();
      await deck.audio.play();
      usePlayerStore.setState({ isPlaying: true });
      this.startPositionTimer();
    }
  }

  pause() {
    this.deck().audio.pause();
    this.cancelCrossfade();
    usePlayerStore.setState({ isPlaying: false });
    this.stopPositionTimer();
  }

  stop() {
    const deck = this.deck();
    deck.audio.pause();
    deck.audio.currentTime = 0;
    this.cancelCrossfade();
    usePlayerStore.setState({ isPlaying: false, position: 0 });
    this.stopPositionTimer();
  }

  async next(manual = true) {
    const { queue, index, repeat } = usePlayerStore.getState();
    if (queue.length === 0) return;

    let nextIndex = index + 1;
    if (nextIndex >= queue.length) {
      if (repeat === 'all' || manual) nextIndex = 0;
      else {
        this.stop();
        return;
      }
      if (repeat !== 'all' && manual && queue.length === 1) {
        // Single-track queue wrap: just restart.
        this.seek(0);
        return;
      }
    }
    await this.playQueueIndex(nextIndex);
  }

  async previous() {
    const deck = this.deck();
    const { index } = usePlayerStore.getState();
    if (deck.audio.currentTime > 3 || index <= 0) {
      this.seek(0);
      return;
    }
    await this.playQueueIndex(index - 1);
  }

  seek(seconds: number) {
    const deck = this.deck();
    const duration = usePlayerStore.getState().duration || deck.audio.duration || 0;
    deck.audio.currentTime = clamp(seconds, 0, Math.max(0, duration - 0.2));
    usePlayerStore.setState({ position: deck.audio.currentTime });
  }

  seekBy(delta: number) {
    this.seek(this.deck().audio.currentTime + delta);
  }

  // ── Track end & crossfade ───────────────────────────────────

  private async handleEnded(audio: HTMLAudioElement) {
    if (audio !== this.deck().audio || this.crossfading) return;

    if (this.sleepAtEndOfTrack) {
      this.sleepAtEndOfTrack = false;
      usePlayerStore.setState({ sleepTimerEndsAt: null });
      this.pause();
      return;
    }

    const { repeat } = usePlayerStore.getState();
    if (repeat === 'one') {
      audio.currentTime = 0;
      await audio.play();
      return;
    }
    await this.next(false);
  }

  private maybeStartCrossfade(audio: HTMLAudioElement) {
    const deck = this.deck();
    if (audio !== deck.audio || this.crossfading) return;

    const { crossfadeSeconds } = useSettingsStore.getState();
    const { queue, index, repeat, isPlaying } = usePlayerStore.getState();
    if (!isPlaying || crossfadeSeconds <= 0 || repeat === 'one') return;

    const duration = audio.duration;
    if (!Number.isFinite(duration) || duration <= crossfadeSeconds * 2) return;

    const remaining = duration - audio.currentTime;
    if (remaining > crossfadeSeconds) return;

    const hasNext = index + 1 < queue.length || repeat === 'all';
    if (!hasNext) return;

    void this.startCrossfade(crossfadeSeconds, remaining);
  }

  private async startCrossfade(fadeSeconds: number, remaining: number) {
    if (!this.ctx || this.crossfading) return;
    this.crossfading = true;

    try {
      const { queue, index, repeat } = usePlayerStore.getState();
      const nextIndex = index + 1 < queue.length ? index + 1 : repeat === 'all' ? 0 : -1;
      if (nextIndex < 0) return;

      const nextTrack = await db.tracks.get(queue[nextIndex]);
      if (!nextTrack) return;

      const fade = Math.min(fadeSeconds, remaining);
      const outDeck = this.deck();
      const inDeck = this.decks[1 - this.active];

      await this.setDeckSource(inDeck, nextTrack);
      inDeck.audio.playbackRate = useSettingsStore.getState().playbackRate;

      const t = this.ctx.currentTime;
      inDeck.gain?.gain.setValueAtTime(0.0001, t);
      inDeck.gain?.gain.exponentialRampToValueAtTime(1, t + fade);
      outDeck.gain?.gain.setValueAtTime(Math.max(outDeck.gain.gain.value, 0.0001), t);
      outDeck.gain?.gain.exponentialRampToValueAtTime(0.0001, t + fade);

      await inDeck.audio.play();

      // Swap decks immediately: the store now tracks the incoming song.
      this.active = 1 - this.active;
      usePlayerStore.setState((s) => ({
        index: nextIndex,
        currentTrack: nextTrack,
        duration: nextTrack.duration || inDeck.audio.duration || 0,
        position: 0,
        loadCount: s.loadCount + 1,
      }));
      void this.registerPlay(nextTrack);

      window.setTimeout(
        () => {
          outDeck.audio.pause();
          outDeck.audio.removeAttribute('src');
          outDeck.audio.load();
          if (outDeck.objectUrl) {
            URL.revokeObjectURL(outDeck.objectUrl);
            outDeck.objectUrl = null;
          }
          this.crossfading = false;
        },
        fade * 1000 + 150,
      );
    } catch {
      this.crossfading = false;
    }
  }

  private cancelCrossfade() {
    this.crossfading = false;
  }

  // ── Sleep timer ─────────────────────────────────────────────

  setSleepTimer(minutes: number | 'end-of-track' | null) {
    if (this.sleepTimeout) {
      window.clearTimeout(this.sleepTimeout);
      this.sleepTimeout = null;
    }
    this.sleepAtEndOfTrack = false;

    if (minutes === null) {
      usePlayerStore.setState({ sleepTimerEndsAt: null });
      return;
    }
    if (minutes === 'end-of-track') {
      this.sleepAtEndOfTrack = true;
      usePlayerStore.setState({ sleepTimerEndsAt: -1 });
      return;
    }
    const endsAt = Date.now() + minutes * 60_000;
    usePlayerStore.setState({ sleepTimerEndsAt: endsAt });
    this.sleepTimeout = window.setTimeout(() => {
      this.pause();
      usePlayerStore.setState({ sleepTimerEndsAt: null });
    }, minutes * 60_000);
  }

  // ── Session restore ─────────────────────────────────────────

  /** Restores queue/index/position without touching the audio files yet. */
  async restore(queue: string[], originalQueue: string[], index: number, position: number, shuffle: boolean, repeat: RepeatMode) {
    if (queue.length === 0 || index < 0 || index >= queue.length) return;
    const track = await db.tracks.get(queue[index]);
    if (!track) return;
    this.pendingRestorePosition = position;
    usePlayerStore.setState({
      queue,
      originalQueue,
      index,
      shuffle,
      repeat,
      currentTrack: track,
      duration: track.duration,
      position,
      isPlaying: false,
    });
  }

  // ── Position ticker ─────────────────────────────────────────

  private startPositionTimer() {
    if (this.positionTimer) return;
    this.positionTimer = window.setInterval(() => {
      const deck = this.deck();
      if (!deck.audio.paused) {
        usePlayerStore.setState({
          position: deck.audio.currentTime,
          duration: usePlayerStore.getState().currentTrack?.duration || deck.audio.duration || 0,
        });
      }
    }, 250);
  }

  private stopPositionTimer() {
    if (this.positionTimer) {
      window.clearInterval(this.positionTimer);
      this.positionTimer = null;
    }
  }
}

export const player = new AudioEngine();
