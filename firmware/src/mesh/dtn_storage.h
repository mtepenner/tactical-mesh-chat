#pragma once
#include <Arduino.h>
#include <Preferences.h>
#include "flood_routing.h"

#define DTN_MAX_MESSAGES 20

struct Message {
    uint32_t msgId;
    uint32_t destId;
    uint32_t timestamp;
    uint8_t  data[200];
    uint8_t  dataLen;
    bool     delivered;
};

class DTNStorage {
public:
    void init();
    bool storeMessage(const Message& msg);
    bool getNextPending(Message& out);
    bool markDelivered(uint32_t msgId);
    uint8_t getPendingCount() const;

private:
    Preferences _prefs;
    Message _cache[DTN_MAX_MESSAGES];
    uint8_t _count;
    void _loadFromFlash();
    void _saveToFlash(uint8_t idx);
};
