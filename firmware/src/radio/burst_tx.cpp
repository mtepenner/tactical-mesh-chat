#include "burst_tx.h"

// External radio handle (defined in main.cpp)
extern bool radioTransmit(uint8_t* data, size_t len);

void BurstTX::init() {
    _lastTxTime = 0;
    _txCount = 0;
    _initialized = true;
}

bool BurstTX::transmitBurst(uint8_t* data, size_t len) {
    if (!_initialized) return false;
    if (len == 0 || len > BURST_MAX_PAYLOAD) return false;

    uint32_t now = millis();
    if ((now - _lastTxTime) < 100) {
        delay(100 - (now - _lastTxTime));
    }

    uint32_t jitter = random(0, 20);
    delayMicroseconds(jitter * 1000);

    bool ok = radioTransmit(data, len);
    if (ok) {
        _lastTxTime = millis();
        _txCount++;
    }
    return ok;
}

uint32_t BurstTX::getLastTxTime() const { return _lastTxTime; }
uint32_t BurstTX::getTxCount() const { return _txCount; }
