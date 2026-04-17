#include "dtn_storage.h"
#include <string.h>

void DTNStorage::init() {
    _count = 0;
    _prefs.begin("dtn", false);
    _loadFromFlash();
}

void DTNStorage::_loadFromFlash() {
    _count = _prefs.getUChar("count", 0);
    if (_count > DTN_MAX_MESSAGES) _count = 0;
    for (uint8_t i = 0; i < _count; i++) {
        char key[16];
        snprintf(key, sizeof(key), "msg%d", i);
        _prefs.getBytes(key, &_cache[i], sizeof(Message));
    }
}

void DTNStorage::_saveToFlash(uint8_t idx) {
    char key[16];
    snprintf(key, sizeof(key), "msg%d", idx);
    _prefs.putBytes(key, &_cache[idx], sizeof(Message));
    _prefs.putUChar("count", _count);
}

bool DTNStorage::storeMessage(const Message& msg) {
    if (_count >= DTN_MAX_MESSAGES) return false;
    for (uint8_t i = 0; i < _count; i++) {
        if (_cache[i].msgId == msg.msgId) return true;
    }
    _cache[_count] = msg;
    _saveToFlash(_count);
    _count++;
    return true;
}

bool DTNStorage::getNextPending(Message& out) {
    for (uint8_t i = 0; i < _count; i++) {
        if (!_cache[i].delivered) {
            out = _cache[i];
            return true;
        }
    }
    return false;
}

bool DTNStorage::markDelivered(uint32_t msgId) {
    for (uint8_t i = 0; i < _count; i++) {
        if (_cache[i].msgId == msgId) {
            _cache[i].delivered = true;
            _saveToFlash(i);
            return true;
        }
    }
    return false;
}

uint8_t DTNStorage::getPendingCount() const {
    uint8_t cnt = 0;
    for (uint8_t i = 0; i < _count; i++) {
        if (!_cache[i].delivered) cnt++;
    }
    return cnt;
}
