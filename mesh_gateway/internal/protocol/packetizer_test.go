package protocol

import (
	"testing"
)

func TestPackUnpack(t *testing.T) {
	original := Packet{
		Version:  1,
		PacketID: 0xDEADBEEF,
		SenderID: 0x12345678,
		TTL:      7,
		Type:     TypeText,
		Payload:  []byte("hello mesh"),
	}

	packed, err := Pack(original)
	if err != nil {
		t.Fatalf("Pack failed: %v", err)
	}

	unpacked, err := Unpack(packed)
	if err != nil {
		t.Fatalf("Unpack failed: %v", err)
	}

	if unpacked.Version != original.Version {
		t.Errorf("Version mismatch: got %d, want %d", unpacked.Version, original.Version)
	}
	if unpacked.PacketID != original.PacketID {
		t.Errorf("PacketID mismatch: got %08X, want %08X", unpacked.PacketID, original.PacketID)
	}
	if unpacked.SenderID != original.SenderID {
		t.Errorf("SenderID mismatch: got %08X, want %08X", unpacked.SenderID, original.SenderID)
	}
	if unpacked.TTL != original.TTL {
		t.Errorf("TTL mismatch: got %d, want %d", unpacked.TTL, original.TTL)
	}
	if unpacked.Type != original.Type {
		t.Errorf("Type mismatch: got %d, want %d", unpacked.Type, original.Type)
	}
	if string(unpacked.Payload) != string(original.Payload) {
		t.Errorf("Payload mismatch: got %q, want %q", unpacked.Payload, original.Payload)
	}
}

func TestPackUnpackGPS(t *testing.T) {
	gps := GPSPayload{Lat: 37.7749, Lon: -122.4194, Alt: 100}
	data, err := PackGPSPayload(gps)
	if err != nil {
		t.Fatalf("PackGPSPayload failed: %v", err)
	}
	got, err := UnpackGPSPayload(data)
	if err != nil {
		t.Fatalf("UnpackGPSPayload failed: %v", err)
	}
	if got.Alt != gps.Alt {
		t.Errorf("Alt mismatch: got %d, want %d", got.Alt, gps.Alt)
	}
}

func TestUnpackTooShort(t *testing.T) {
	_, err := Unpack([]byte{0x01, 0x02})
	if err == nil {
		t.Error("expected error for short packet, got nil")
	}
}

func TestTextPayload(t *testing.T) {
	tp := TextPayload{Message: "tactical message"}
	data := PackTextPayload(tp)
	got := UnpackTextPayload(data)
	if got.Message != tp.Message {
		t.Errorf("Message mismatch: got %q, want %q", got.Message, tp.Message)
	}
}
