#include <Arduino.h>
#include <SPI.h>
#include <RadioLib.h>
#include <ArduinoJson.h>

#include "security/aes_engine.h"
#include "radio/fhss_controller.h"
#include "radio/burst_tx.h"
#include "mesh/flood_routing.h"
#include "mesh/dtn_storage.h"

#define LORA_CS   18
#define LORA_DIO1  2
#define LORA_RST  23
#define LORA_BUSY  4

SX1262 radio = new Module(LORA_CS, LORA_DIO1, LORA_RST, LORA_BUSY);

AESEngine      aesEngine;
FHSSController fhss;
BurstTX        burstTx;
FloodRouter    floodRouter;
DTNStorage     dtnStorage;

static const uint8_t AES_KEY[32] = {
    0x01,0x23,0x45,0x67,0x89,0xab,0xcd,0xef,
    0xfe,0xdc,0xba,0x98,0x76,0x54,0x32,0x10,
    0x00,0x11,0x22,0x33,0x44,0x55,0x66,0x77,
    0x88,0x99,0xaa,0xbb,0xcc,0xdd,0xee,0xff
};

volatile bool radioReceived = false;

bool radioTransmit(uint8_t* data, size_t len) {
    int state = radio.transmit(data, len);
    return state == RADIOLIB_ERR_NONE;
}

void IRAM_ATTR onRadioReceive() {
    radioReceived = true;
}

void setup() {
    Serial.begin(115200);
    Serial.println("[BOOT] Tactical Mesh Chat v1.0");

    if (!aesEngine.init(AES_KEY, sizeof(AES_KEY))) {
        Serial.println("[ERROR] AES init failed");
    }

    uint32_t seed = (uint32_t)ESP.getEfuseMac();
    fhss.init(seed);

    burstTx.init();
    floodRouter.init();
    dtnStorage.init();

    Serial.print("[RADIO] Initializing SX1262...");
    int state = radio.begin(915.0);
    if (state == RADIOLIB_ERR_NONE) {
        Serial.println("OK");
    } else {
        Serial.printf("FAIL (code %d)\n", state);
    }

    radio.setDio1Action(onRadioReceive);
    radio.startReceive();

    Serial.printf("[MESH] DTN pending: %d\n", dtnStorage.getPendingCount());
    Serial.println("[BOOT] Ready");
}

void loop() {
    if (radioReceived) {
        radioReceived = false;
        uint8_t buf[256];
        int len = radio.getPacketLength();
        if (len > 0 && len <= (int)sizeof(buf)) {
            int state = radio.readData(buf, len);
            if (state == RADIOLIB_ERR_NONE) {
                Packet pkt;
                if (len >= 10) {
                    memcpy(&pkt.packetId, buf, 4);
                    memcpy(&pkt.senderId, buf + 4, 4);
                    pkt.ttl = buf[8];
                    pkt.type = buf[9];
                    pkt.payloadLen = (uint8_t)min(len - 10, 200);
                    memcpy(pkt.payload, buf + 10, pkt.payloadLen);

                    if (floodRouter.processPacket(pkt)) {
                        radio.transmit(buf, len);
                        Serial.printf("[MESH] Relayed pkt %08X\n", pkt.packetId);
                    }

                    Serial.write(0xAA);
                    Serial.write(buf, len);
                    Serial.write(0x55);
                }
            }
        }

        float nextFreq = fhss.nextFrequency();
        radio.setFrequency(nextFreq);
        radio.startReceive();
    }

    static uint32_t lastDTNCheck = 0;
    if (millis() - lastDTNCheck > 5000) {
        lastDTNCheck = millis();
        Message pending;
        if (dtnStorage.getNextPending(pending)) {
            burstTx.transmitBurst(pending.data, pending.dataLen);
        }
    }

    if (Serial.available() >= 3) {
        if (Serial.read() == 0xBB) {
            int highByte = Serial.read();
            int lowByte  = Serial.read();
            if (highByte < 0 || lowByte < 0) return;
            uint16_t msgLen = ((uint16_t)(uint8_t)highByte << 8) | (uint8_t)lowByte;
            if (msgLen <= 255) {
                uint8_t buf[255];
                size_t bytesRead = Serial.readBytes(buf, msgLen);
                burstTx.transmitBurst(buf, bytesRead);
            }
        }
    }
}
