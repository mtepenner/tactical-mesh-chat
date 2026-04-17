#pragma once
#include <Arduino.h>
#include <stdint.h>

#define SEEN_CACHE_SIZE 64

struct Packet {
    uint32_t packetId;
    uint32_t senderId;
    uint8_t  ttl;
    uint8_t  type;
    uint8_t  payload[200];
    uint8_t  payloadLen;
};

class FloodRouter {
public:
    void init();
    bool processPacket(Packet& pkt);
    bool shouldRelay(uint32_t packetId) const;
    void markSeen(uint32_t packetId);

private:
    uint32_t _seenIds[SEEN_CACHE_SIZE];
    uint8_t  _cacheHead;
    uint8_t  _cacheCount;
};
