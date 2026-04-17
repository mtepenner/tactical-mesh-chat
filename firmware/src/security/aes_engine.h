#pragma once
#include <Arduino.h>
#include <stdint.h>
#include <stddef.h>

class AESEngine {
public:
    bool init(const uint8_t* key, size_t keyLen);
    bool encrypt(const uint8_t* plaintext, size_t len,
                 uint8_t* iv_out, uint8_t* ciphertext_out, uint8_t* tag_out);
    bool decrypt(const uint8_t* ciphertext, size_t len,
                 const uint8_t* iv, const uint8_t* tag,
                 uint8_t* plaintext_out);
    bool computeHMAC(const uint8_t* data, size_t len, uint8_t* hmac_out);

private:
    uint8_t _key[32];
    size_t _keyLen;
    bool _initialized;
    uint32_t _nonceCounter;
};
