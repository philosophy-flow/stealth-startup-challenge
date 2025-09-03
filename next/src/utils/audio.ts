import { createHash } from "crypto";

// Constants
export const AUDIO_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50; // Maximum number of cached audio files
const MAX_BUFFER_SIZE = 5 * 1024 * 1024; // 5MB max per audio buffer

// Cache interface
interface CachedAudio {
    buffer: Buffer;
    expires: number;
}

// Single cache keyed by audio ID (singleton by nature of JS modules)
const audioCache = new Map<string, CachedAudio>();

// Generate stable audio ID using SHA256 hash
export function generateAudioId(text: string, voice: string): string {
    // Use null byte separator to prevent collision if text contains underscores
    const hash = createHash("sha256").update(`${text}\x00${voice}`).digest("hex").substring(0, 16);
    return `audio_${voice}_${hash}`;
}

// Get audio from cache if not expired
export function getFromCache(text: string, voice: string): Buffer | null {
    const audioId = generateAudioId(text, voice);
    const cached = audioCache.get(audioId);

    if (!cached) {
        return null;
    }

    // Check expiration
    if (Date.now() > cached.expires) {
        audioCache.delete(audioId);
        return null;
    }

    console.log(`[AudioCache] Cache hit for: "${text.substring(0, 50)}..." with voice: ${voice}`);
    return cached.buffer;
}

// Store audio in cache
export function storeAudio(text: string, voice: string, buffer: Buffer): string {
    const audioId = generateAudioId(text, voice);

    // Don't cache if buffer is too large
    if (buffer.length > MAX_BUFFER_SIZE) {
        console.log(`[AudioCache] Buffer too large (${buffer.length} bytes), skipping cache`);
        return audioId;
    }

    // Evict oldest entry if cache is full
    if (audioCache.size >= MAX_CACHE_SIZE) {
        const firstKey = audioCache.keys().next().value;
        if (firstKey) {
            audioCache.delete(firstKey);
            console.log(`[AudioCache] Evicted oldest entry to maintain cache size`);
        }
    }

    // Store in cache with TTL
    audioCache.set(audioId, {
        buffer,
        expires: Date.now() + AUDIO_CACHE_TTL_MS,
    });

    console.log(`[AudioCache] Cached audio for: "${text.substring(0, 50)}..." with voice: ${voice}`);
    return audioId;
}

// Get audio buffer by ID for serving
export function getAudioBuffer(audioId: string): Buffer | undefined {
    const cached = audioCache.get(audioId);

    // Check if exists and not expired
    if (!cached || Date.now() > cached.expires) {
        return undefined;
    }

    return cached.buffer;
}

// Clean up expired cache entries
function cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, value] of audioCache.entries()) {
        if (now > value.expires) {
            audioCache.delete(key);
            removed++;
        }
    }

    if (removed > 0) {
        console.log(`[AudioCache] Cleaned up ${removed} expired entries`);
    }
}

// Get cache statistics (exported for potential debugging use)
export function getStats() {
    return {
        cacheSize: audioCache.size,
    };
}

// Clear all caches (exported for potential testing/reset scenarios)
export function clear(): void {
    audioCache.clear();
    console.log("[AudioCache] Cache cleared");
}

// Run cleanup every minute
if (typeof setInterval !== "undefined") {
    setInterval(cleanup, 60 * 1000);
}
