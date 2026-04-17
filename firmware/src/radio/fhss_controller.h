#pragma once
#include <Arduino.h>
#include <stdint.h>

#define FHSS_NUM_CHANNELS 50

class FHSSController {
public:
    void init(uint32_t seed);
    float nextFrequency();
    float getCurrentChannel() const;
    uint8_t getChannelIndex() const;

private:
    float _table[FHSS_NUM_CHANNELS];
    uint8_t _index;
    uint32_t _seed;
    uint32_t _lcg();
    uint32_t _state;
};
