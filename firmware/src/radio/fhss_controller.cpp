#include "fhss_controller.h"

// LCG parameters (Numerical Recipes)
static const uint32_t LCG_A = 1664525UL;
static const uint32_t LCG_C = 1013904223UL;

uint32_t FHSSController::_lcg() {
    _state = LCG_A * _state + LCG_C;
    return _state;
}

void FHSSController::init(uint32_t seed) {
    _seed = seed;
    _state = seed;
    _index = 0;

    // Generate frequency hopping table: 902-928 MHz (US ISM)
    // 50 channels spaced 520 kHz apart
    for (int i = 0; i < FHSS_NUM_CHANNELS; i++) {
        uint32_t rnd = _lcg();
        // Map to 902.0 - 928.0 MHz range
        float freq = 902.0f + (float)(rnd % 52000) / 2000.0f;
        _table[i] = freq;
    }
}

float FHSSController::nextFrequency() {
    _index = (_index + 1) % FHSS_NUM_CHANNELS;
    return _table[_index];
}

float FHSSController::getCurrentChannel() const {
    return _table[_index];
}

uint8_t FHSSController::getChannelIndex() const {
    return _index;
}
