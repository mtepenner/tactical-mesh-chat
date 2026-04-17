#include "aes_engine.h"
#include <string.h>

// Hardware-accelerated AES-256-GCM using ESP32 mbedtls
#include "mbedtls/gcm.h"
#include "mbedtls/md.h"

bool AESEngine::init(const uint8_t* key, size_t keyLen) {
    if (keyLen != 32) return false;
    memcpy(_key, key, 32);
    _keyLen = keyLen;
    _initialized = true;
    _nonceCounter = 0;
    return true;
}

bool AESEngine::encrypt(const uint8_t* plaintext, size_t len,
                         uint8_t* iv_out, uint8_t* ciphertext_out, uint8_t* tag_out) {
    if (!_initialized) return false;

    // Build 12-byte IV: 8 random bytes + 4-byte counter
    uint32_t r1 = esp_random();
    uint32_t r2 = esp_random();
    memcpy(iv_out, &r1, 4);
    memcpy(iv_out + 4, &r2, 4);
    memcpy(iv_out + 8, &_nonceCounter, 4);
    _nonceCounter++;

    mbedtls_gcm_context gcm;
    mbedtls_gcm_init(&gcm);
    int ret = mbedtls_gcm_setkey(&gcm, MBEDTLS_CIPHER_ID_AES, _key, 256);
    if (ret != 0) { mbedtls_gcm_free(&gcm); return false; }

    ret = mbedtls_gcm_crypt_and_tag(&gcm, MBEDTLS_GCM_ENCRYPT,
        len, iv_out, 12, nullptr, 0,
        plaintext, ciphertext_out, 16, tag_out);

    mbedtls_gcm_free(&gcm);
    return ret == 0;
}

bool AESEngine::decrypt(const uint8_t* ciphertext, size_t len,
                         const uint8_t* iv, const uint8_t* tag,
                         uint8_t* plaintext_out) {
    if (!_initialized) return false;

    mbedtls_gcm_context gcm;
    mbedtls_gcm_init(&gcm);
    int ret = mbedtls_gcm_setkey(&gcm, MBEDTLS_CIPHER_ID_AES, _key, 256);
    if (ret != 0) { mbedtls_gcm_free(&gcm); return false; }

    ret = mbedtls_gcm_auth_decrypt(&gcm, len, iv, 12,
        nullptr, 0, tag, 16,
        ciphertext, plaintext_out);

    mbedtls_gcm_free(&gcm);
    return ret == 0;
}

bool AESEngine::computeHMAC(const uint8_t* data, size_t len, uint8_t* hmac_out) {
    if (!_initialized) return false;

    const mbedtls_md_info_t* md_info = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
    if (!md_info) return false;

    int ret = mbedtls_md_hmac(md_info, _key, _keyLen, data, len, hmac_out);
    return ret == 0;
}
