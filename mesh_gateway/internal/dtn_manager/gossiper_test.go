package dtn_manager

import (
	"testing"
	"tactical-mesh-chat/mesh_gateway/internal/protocol"
)

func makePacket(id uint32, msg string) protocol.Packet {
	return protocol.Packet{
		Version:  1,
		PacketID: id,
		SenderID: 0xAABBCCDD,
		TTL:      7,
		Type:     protocol.TypeText,
		Payload:  []byte(msg),
	}
}

func TestStoreAndRetrieve(t *testing.T) {
	store := NewMessageStore()
	p := makePacket(1, "hello")
	store.Store(p)
	if store.Len() != 1 {
		t.Errorf("expected 1 packet, got %d", store.Len())
	}
}

func TestIdempotentStore(t *testing.T) {
	store := NewMessageStore()
	p := makePacket(42, "duplicate")
	store.Store(p)
	store.Store(p)
	if store.Len() != 1 {
		t.Errorf("expected 1 packet after duplicate store, got %d", store.Len())
	}
}

func TestGetMissing(t *testing.T) {
	store := NewMessageStore()
	store.Store(makePacket(1, "msg1"))
	store.Store(makePacket(2, "msg2"))
	store.Store(makePacket(3, "msg3"))

	missing := store.GetMissing([]uint32{1, 3})
	if len(missing) != 1 {
		t.Errorf("expected 1 missing packet, got %d", len(missing))
	}
	if missing[0].PacketID != 2 {
		t.Errorf("expected missing packet ID 2, got %d", missing[0].PacketID)
	}
}

func TestGetHaveList(t *testing.T) {
	store := NewMessageStore()
	store.Store(makePacket(10, "a"))
	store.Store(makePacket(20, "b"))
	have := store.GetHaveList()
	if len(have) != 2 {
		t.Errorf("expected 2 IDs in have list, got %d", len(have))
	}
}

func TestGetMissingEmpty(t *testing.T) {
	store := NewMessageStore()
	missing := store.GetMissing([]uint32{})
	if len(missing) != 0 {
		t.Errorf("expected 0 missing from empty store, got %d", len(missing))
	}
}
