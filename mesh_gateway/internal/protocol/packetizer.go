package protocol

import (
	"bytes"
	"encoding/binary"
	"errors"
	"math"
)

const (
	TypeText uint8 = 0
	TypeGPS  uint8 = 1
)

// Packet is the fundamental unit of the mesh protocol.
// Wire format: [Version(1)][PacketID(4)][SenderID(4)][TTL(1)][Type(1)][PayloadLen(2)][Payload(N)]
type Packet struct {
	Version  uint8
	PacketID uint32
	SenderID uint32
	TTL      uint8
	Type     uint8
	Payload  []byte
}

type TextPayload struct {
	Message string
}

type GPSPayload struct {
	Lat float32
	Lon float32
	Alt int16
}

func Pack(p Packet) ([]byte, error) {
	buf := new(bytes.Buffer)
	if err := binary.Write(buf, binary.BigEndian, p.Version); err != nil {
		return nil, err
	}
	if err := binary.Write(buf, binary.BigEndian, p.PacketID); err != nil {
		return nil, err
	}
	if err := binary.Write(buf, binary.BigEndian, p.SenderID); err != nil {
		return nil, err
	}
	if err := binary.Write(buf, binary.BigEndian, p.TTL); err != nil {
		return nil, err
	}
	if err := binary.Write(buf, binary.BigEndian, p.Type); err != nil {
		return nil, err
	}
	payloadLen := uint16(len(p.Payload))
	if err := binary.Write(buf, binary.BigEndian, payloadLen); err != nil {
		return nil, err
	}
	buf.Write(p.Payload)
	return buf.Bytes(), nil
}

func Unpack(data []byte) (Packet, error) {
	if len(data) < 13 {
		return Packet{}, errors.New("packet too short")
	}
	buf := bytes.NewReader(data)
	var p Packet
	if err := binary.Read(buf, binary.BigEndian, &p.Version); err != nil {
		return Packet{}, err
	}
	if err := binary.Read(buf, binary.BigEndian, &p.PacketID); err != nil {
		return Packet{}, err
	}
	if err := binary.Read(buf, binary.BigEndian, &p.SenderID); err != nil {
		return Packet{}, err
	}
	if err := binary.Read(buf, binary.BigEndian, &p.TTL); err != nil {
		return Packet{}, err
	}
	if err := binary.Read(buf, binary.BigEndian, &p.Type); err != nil {
		return Packet{}, err
	}
	var payloadLen uint16
	if err := binary.Read(buf, binary.BigEndian, &payloadLen); err != nil {
		return Packet{}, err
	}
	if int(payloadLen) > buf.Len() {
		return Packet{}, errors.New("payload length exceeds data")
	}
	p.Payload = make([]byte, payloadLen)
	if _, err := buf.Read(p.Payload); err != nil {
		return Packet{}, err
	}
	return p, nil
}

func PackTextPayload(tp TextPayload) []byte {
	return []byte(tp.Message)
}

func UnpackTextPayload(data []byte) TextPayload {
	return TextPayload{Message: string(data)}
}

func PackGPSPayload(gp GPSPayload) ([]byte, error) {
	buf := new(bytes.Buffer)
	if err := binary.Write(buf, binary.BigEndian, math.Float32bits(gp.Lat)); err != nil {
		return nil, err
	}
	if err := binary.Write(buf, binary.BigEndian, math.Float32bits(gp.Lon)); err != nil {
		return nil, err
	}
	if err := binary.Write(buf, binary.BigEndian, gp.Alt); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func UnpackGPSPayload(data []byte) (GPSPayload, error) {
	if len(data) < 10 {
		return GPSPayload{}, errors.New("GPS payload too short")
	}
	buf := bytes.NewReader(data)
	var latBits, lonBits uint32
	var alt int16
	if err := binary.Read(buf, binary.BigEndian, &latBits); err != nil {
		return GPSPayload{}, err
	}
	if err := binary.Read(buf, binary.BigEndian, &lonBits); err != nil {
		return GPSPayload{}, err
	}
	if err := binary.Read(buf, binary.BigEndian, &alt); err != nil {
		return GPSPayload{}, err
	}
	return GPSPayload{
		Lat: math.Float32frombits(latBits),
		Lon: math.Float32frombits(lonBits),
		Alt: alt,
	}, nil
}
