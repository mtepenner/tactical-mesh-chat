#include "flood_routing.h"
#include <string.h>

void FloodRouter::init() {
    memset(_seenIds, 0, sizeof(_seenIds));
    _cacheHead = 0;
    _cacheCount = 0;
}

bool FloodRouter::shouldRelay(uint32_t packetId) const {
    for (uint8_t i = 0; i < _cacheCount; i++) {
        uint8_t idx = (_cacheHead + SEEN_CACHE_SIZE - _cacheCount + i) % SEEN_CACHE_SIZE;
        if (_seenIds[idx] == packetId) return false;
    }
    return true;
}

void FloodRouter::markSeen(uint32_t packetId) {
    _seenIds[_cacheHead] = packetId;
    _cacheHead = (_cacheHead + 1) % SEEN_CACHE_SIZE;
    if (_cacheCount < SEEN_CACHE_SIZE) _cacheCount++;
}

bool FloodRouter::processPacket(Packet& pkt) {
    if (!shouldRelay(pkt.packetId)) return false;
    markSeen(pkt.packetId);
    if (pkt.ttl == 0) return false;
    pkt.ttl--;
    return true;
}
