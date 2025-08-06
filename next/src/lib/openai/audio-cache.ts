// In-memory audio cache with TTL
interface CachedAudio {
    buffer: Buffer;
    contentType: string;
    expires: number;
}

class AudioCache {
    private cache: Map<string, CachedAudio> = new Map();
    private readonly TTL = 5 * 60 * 1000; // 5 minutes

    // Generate cache key from text and voice
    getCacheKey(text: string, voice: string): string {
        return `${text}_${voice}`;
    }

    // Get audio from cache if it exists and hasn't expired
    get(text: string, voice: string): Buffer | null {
        const key = this.getCacheKey(text, voice);
        const cached = this.cache.get(key);

        if (!cached) {
            return null;
        }

        // Check if expired
        if (Date.now() > cached.expires) {
            this.cache.delete(key);
            return null;
        }

        console.log(`[AudioCache] Cache hit for: "${text.substring(0, 50)}..." with voice: ${voice}`);
        return cached.buffer;
    }

    // Store audio in cache
    set(text: string, voice: string, buffer: Buffer): void {
        const key = this.getCacheKey(text, voice);
        this.cache.set(key, {
            buffer,
            contentType: "audio/mpeg",
            expires: Date.now() + this.TTL,
        });
        console.log(`[AudioCache] Cached audio for: "${text.substring(0, 50)}..." with voice: ${voice}`);
    }

    // Clean up expired entries
    cleanup(): void {
        const now = Date.now();
        let removed = 0;

        for (const [key, value] of this.cache.entries()) {
            if (now > value.expires) {
                this.cache.delete(key);
                removed++;
            }
        }

        if (removed > 0) {
            console.log(`[AudioCache] Cleaned up ${removed} expired entries`);
        }
    }

    // Get cache size
    size(): number {
        return this.cache.size;
    }

    // Clear all cache
    clear(): void {
        this.cache.clear();
        console.log("[AudioCache] Cache cleared");
    }
}

// Export singleton instance
export const audioCache = new AudioCache();

// Run cleanup every minute
if (typeof setInterval !== "undefined") {
    setInterval(() => {
        audioCache.cleanup();
    }, 60 * 1000);
}
