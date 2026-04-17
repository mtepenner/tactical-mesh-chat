#pragma once
#include <Arduino.h>
#include <stdint.h>
#include <stddef.h>

#define BURST_MAX_PAYLOAD 255
#define BURST_TIMEOUT_MS  500

class BurstTX {
public:
    void init();
    bool transmitBurst(uint8_t* data, size_t len);
    uint32_t getLastTxTime() const;
    uint32_t getTxCount() const;

private:
    uint32_t _lastTxTime;
    uint32_t _txCount;
    bool _initialized;
};
