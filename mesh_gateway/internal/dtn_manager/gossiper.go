package dtn_manager

import (
	"sync"
	"tactical-mesh-chat/mesh_gateway/internal/protocol"
)

type SyncRequest struct {
	HaveList []uint32 `json:"have"`
}

type SyncResponse struct {
	Packets []protocol.Packet `json:"packets"`
}

type MessageStore struct {
	mu      sync.RWMutex
	packets map[uint32]protocol.Packet
}

func NewMessageStore() *MessageStore {
	return &MessageStore{
		packets: make(map[uint32]protocol.Packet),
	}
}

func (ms *MessageStore) Store(pkt protocol.Packet) {
	ms.mu.Lock()
	defer ms.mu.Unlock()
	ms.packets[pkt.PacketID] = pkt
}

func (ms *MessageStore) GetHaveList() []uint32 {
	ms.mu.RLock()
	defer ms.mu.RUnlock()
	ids := make([]uint32, 0, len(ms.packets))
	for id := range ms.packets {
		ids = append(ids, id)
	}
	return ids
}

func (ms *MessageStore) GetMissing(have []uint32) []protocol.Packet {
	haveSet := make(map[uint32]struct{}, len(have))
	for _, id := range have {
		haveSet[id] = struct{}{}
	}

	ms.mu.RLock()
	defer ms.mu.RUnlock()

	var missing []protocol.Packet
	for id, pkt := range ms.packets {
		if _, ok := haveSet[id]; !ok {
			missing = append(missing, pkt)
		}
	}
	return missing
}

func (ms *MessageStore) Len() int {
	ms.mu.RLock()
	defer ms.mu.RUnlock()
	return len(ms.packets)
}
