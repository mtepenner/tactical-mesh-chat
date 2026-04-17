package main

import (
	"context"
	"encoding/binary"
	"io"
	"log"
	"net"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"go.bug.st/serial"
	"tactical-mesh-chat/mesh_gateway/internal/dtn_manager"
	"tactical-mesh-chat/mesh_gateway/internal/protocol"
)

const (
	defaultSerialPort = "/dev/ttyUSB0"
	baudRate          = 115200
	tcpPort           = ":8765"
	frameStart        = 0xAA
	frameEnd          = 0x55
	maxFrameLen       = 300
)

type Hub struct {
	store   *dtn_manager.MessageStore
	clients map[net.Conn]struct{}
	mu      sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		store:   dtn_manager.NewMessageStore(),
		clients: make(map[net.Conn]struct{}),
	}
}

func (h *Hub) addClient(c net.Conn) {
	h.mu.Lock()
	h.clients[c] = struct{}{}
	h.mu.Unlock()
}

func (h *Hub) removeClient(c net.Conn) {
	h.mu.Lock()
	delete(h.clients, c)
	h.mu.Unlock()
	c.Close()
}

func (h *Hub) broadcast(data []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		_ = c.SetWriteDeadline(time.Now().Add(2 * time.Second))
		_, _ = c.Write(data)
	}
}

func (h *Hub) handleSerialRead(ctx context.Context, port serial.Port) {
	var frame []byte
	inFrame := false
	oneByte := make([]byte, 1)

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		n, err := port.Read(oneByte)
		if err != nil {
			if err == io.EOF {
				time.Sleep(10 * time.Millisecond)
				continue
			}
			log.Printf("[SERIAL] Read error: %v", err)
			time.Sleep(100 * time.Millisecond)
			continue
		}
		if n == 0 {
			continue
		}

		b := oneByte[0]
		switch {
		case b == frameStart && !inFrame:
			inFrame = true
			frame = frame[:0]
		case b == frameEnd && inFrame:
			inFrame = false
			if len(frame) > 0 {
				pkt, err := protocol.Unpack(frame)
				if err == nil {
					h.store.Store(pkt)
					out := make([]byte, 0, len(frame)+2)
					out = append(out, frameStart)
					out = append(out, frame...)
					out = append(out, frameEnd)
					h.broadcast(out)
					log.Printf("[HUB] Received pkt %08X from %08X", pkt.PacketID, pkt.SenderID)
				}
			}
		case inFrame:
			frame = append(frame, b)
			if len(frame) > maxFrameLen {
				inFrame = false
				frame = frame[:0]
			}
		}
	}
}

func (h *Hub) handleTCPClient(ctx context.Context, conn net.Conn, port serial.Port) {
	defer h.removeClient(conn)
	log.Printf("[TCP] Client connected: %s", conn.RemoteAddr())

	// Send all stored packets to new client
	for _, pkt := range h.store.GetMissing([]uint32{}) {
		data, err := protocol.Pack(pkt)
		if err == nil {
			out := make([]byte, 0, len(data)+2)
			out = append(out, frameStart)
			out = append(out, data...)
			out = append(out, frameEnd)
			_ = conn.SetWriteDeadline(time.Now().Add(2 * time.Second))
			_, _ = conn.Write(out)
		}
	}

	lenBuf := make([]byte, 2)
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		_ = conn.SetReadDeadline(time.Now().Add(100 * time.Millisecond))
		_, err := io.ReadFull(conn, lenBuf)
		if err != nil {
			if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
				continue
			}
			log.Printf("[TCP] Client %s disconnected: %v", conn.RemoteAddr(), err)
			return
		}

		msgLen := binary.BigEndian.Uint16(lenBuf)
		if msgLen > maxFrameLen {
			log.Printf("[TCP] Client sent oversized message (%d bytes)", msgLen)
			continue
		}

		payload := make([]byte, msgLen)
		if _, err := io.ReadFull(conn, payload); err != nil {
			log.Printf("[TCP] Failed to read payload: %v", err)
			return
		}

		if port != nil {
			header := []byte{0xBB, lenBuf[0], lenBuf[1]}
			out := append(header, payload...)
			if _, err := port.Write(out); err != nil {
				log.Printf("[SERIAL] Write error: %v", err)
			}
		}
	}
}

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("[HUB] Tactical Mesh Chat Gateway starting...")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		log.Println("[HUB] Shutting down...")
		cancel()
	}()

	hub := NewHub()

	// Open serial port
	portName := defaultSerialPort
	if p := os.Getenv("SERIAL_PORT"); p != "" {
		portName = p
	}

	mode := &serial.Mode{
		BaudRate: baudRate,
		DataBits: 8,
		Parity:   serial.NoParity,
		StopBits: serial.OneStopBit,
	}

	var port serial.Port
	var serialErr error
	for i := 0; i < 5; i++ {
		port, serialErr = serial.Open(portName, mode)
		if serialErr == nil {
			break
		}
		log.Printf("[SERIAL] Attempt %d failed: %v, retrying...", i+1, serialErr)
		time.Sleep(2 * time.Second)
	}
	if serialErr != nil {
		log.Printf("[SERIAL] Warning: could not open %s: %v (running in TCP-only mode)", portName, serialErr)
		port = nil
	} else {
		defer port.Close()
		log.Printf("[SERIAL] Opened %s at %d baud", portName, baudRate)
		go hub.handleSerialRead(ctx, port)
	}

	listener, err := net.Listen("tcp", tcpPort)
	if err != nil {
		log.Fatalf("[TCP] Failed to listen on %s: %v", tcpPort, err)
	}
	defer listener.Close()
	log.Printf("[TCP] Listening on %s", tcpPort)

	go func() {
		<-ctx.Done()
		listener.Close()
	}()

	for {
		conn, err := listener.Accept()
		if err != nil {
			select {
			case <-ctx.Done():
				return
			default:
				log.Printf("[TCP] Accept error: %v", err)
				continue
			}
		}
		hub.addClient(conn)
		go hub.handleTCPClient(ctx, conn, port)
	}
}
