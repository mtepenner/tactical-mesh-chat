# 📡 Tactical Mesh Chat

An offline-first, decentralized tactical communication system designed for austere environments. This project leverages LoRa (SX1262) radios running custom C++ firmware, bridged through a Go-based gateway to a React Native smartphone application to deliver resilient text and GPS sharing over a Delay Tolerant Network (DTN).

## 📑 Table of Contents
- [Features](#-features)
- [Architecture](#-architecture)
- [Technologies Used](#-technologies-used)
- [Installation](#-installation)
- [Usage](#-usage)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Features
* **Resilient LoRa Mesh:** Implements flood routing with duplicate detection, strict burst transmission logic, and pseudo-random frequency hopping (FHSS).
* **Delay Tolerant Networking (DTN):** Features non-volatile storage for pending messages and "gossiper" logic to synchronize missing data packets between nodes.
* **Military-Grade Security:** Utilizes hardware-accelerated AES-256-GCM encryption and HMAC validation.
* **Optimized Payloads:** Compresses text and GPS coordinates into tiny binary packets for ultra-low bandwidth environments.
* **Tactical Smartphone UI:** A React Native application providing an offline-first chat room, a tactical map for peer GPS locations, and mesh health metrics like SNR and hop-counts.
* **Bluetooth Integration:** Seamlessly connects the user's mobile device to the ESP32/nRF52 gateway hub.

## 🏗️ Architecture
The ecosystem relies on three primary components working in tandem:
1. **Radio Firmware (C++/Arduino):** The hardware controller running on ESP32/nRF52 microcontrollers with LoRa transceivers.
2. **Mesh Gateway (Go):** The "Comms Hub" that bridges the serial connection from the radio to the Bluetooth/network interface of the mobile app.
3. **Tactical Chat App (React Native):** The end-user interface for drafting messages and viewing the tactical map.
4. *(Optional)* **Simulation:** A Python-based `mesh_visualizer.py` script to test multi-hop gossip behavior locally.

## 🛠️ Technologies Used
* **Hardware:** ESP32 / nRF52, LoRa (SX1262)
* **Firmware:** C++, PlatformIO, Hardware AES
* **Gateway:** Go (Golang)
* **Mobile App:** React Native, TypeScript, Bluetooth Low Energy (BLE)
* **CI/CD:** GitHub Actions (Automated crypto and firmware testing)

## 💻 Installation

### Prerequisites
* [PlatformIO](https://platformio.org/) installed for compiling C++ firmware.
* [Go 1.21+](https://go.dev/dl/) installed.
* [Node.js 18+](https://nodejs.org/) and a React Native environment configured.
* [Python 3.8+](https://www.python.org/) (stdlib only — no extra packages needed for the simulation).
* ESP32 or nRF52 development boards equipped with LoRa (SX1262) transceivers.

### Setup Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/mtepenner/tactical-mesh-chat.git
   cd tactical-mesh-chat
   ```

2. Run all tests (Go unit tests + Python mesh simulation):
   ```bash
   make all
   ```

3. Build the Go gateway binary:
   ```bash
   make build-gateway   # outputs mesh_gateway/bin/gateway
   ```

4. Flash firmware to your microcontroller (requires a connected ESP32 and PlatformIO):
   ```bash
   cd firmware && pio run --target upload
   ```

5. Install dependencies and type-check the React Native app:
   ```bash
   cd tactical_chat_app
   npm install
   npx tsc --noEmit        # TypeScript validation
   npx react-native run-android  # or run-ios
   ```

6. Run the standalone mesh gossip simulation:
   ```bash
   make test-python
   # or directly:
   python3 simulation/mesh_visualizer.py
   ```

## 🎮 Usage
1. Power on your configured LoRa radio node.
2. Open the **Tactical Mesh Chat** app on your smartphone and connect to the node via Bluetooth.
3. Navigate to the **Chat Room** to send and receive offline-first messages.
4. Open the **Tactical Map** to broadcast your GPS coordinates and track connected peers.
5. Monitor signal integrity and network behavior via the **Mesh Health** screen.

## 🤝 Contributing
Contributions to routing efficiency and security are highly encouraged. Please ensure that any changes to the encryption modules pass the `test-crypto.yml` pipeline validating the AES-256-GCM and HMAC implementations.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/NewRoutingAlgorithm`)
3. Commit your Changes (`git commit -m 'Improve DTN storage logic'`)
4. Push to the Branch (`git push origin feature/NewRoutingAlgorithm`)
5. Open a Pull Request

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
