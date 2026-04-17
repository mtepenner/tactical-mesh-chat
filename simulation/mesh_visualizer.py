#!/usr/bin/env python3
"""
Mesh gossip protocol simulation with visualization.
Simulates N nodes, flood routing, and DTN store-and-forward.
"""

import random
import math
import time
from dataclasses import dataclass, field
from typing import Dict, List, Set, Optional, Tuple
from collections import defaultdict


# ── Configuration ─────────────────────────────────────────────────────────────
NUM_NODES = 12
RADIO_RANGE = 250.0      # meters
AREA_SIZE = 600.0         # simulation area (square)
SIM_DURATION = 60         # seconds of simulated time
TICK_INTERVAL = 1.0       # seconds per tick
MAX_TTL = 7
FHSS_CHANNELS = 50
PACKET_LOSS_RATE = 0.05   # 5% packet loss


# ── Data structures ────────────────────────────────────────────────────────────
@dataclass
class Packet:
    packet_id: int
    sender_id: int
    ttl: int
    payload: str
    hops: int = 0
    created_at: float = field(default_factory=time.time)


@dataclass
class Node:
    node_id: int
    x: float
    y: float
    seen_ids: Set[int] = field(default_factory=set)
    dtn_store: List[Packet] = field(default_factory=list)
    rx_count: int = 0
    tx_count: int = 0
    relay_count: int = 0
    fhss_index: int = 0

    def distance_to(self, other: 'Node') -> float:
        return math.sqrt((self.x - other.x) ** 2 + (self.y - other.y) ** 2)

    def can_reach(self, other: 'Node') -> bool:
        return self.distance_to(other) <= RADIO_RANGE


# ── FHSS simulation ────────────────────────────────────────────────────────────
def build_fhss_table(seed: int) -> List[float]:
    rng = random.Random(seed)
    return [902.0 + rng.random() * 26.0 for _ in range(FHSS_CHANNELS)]


# ── Simulation engine ──────────────────────────────────────────────────────────
class MeshSimulation:
    def __init__(self, num_nodes: int = NUM_NODES, seed: int = 42):
        self.rng = random.Random(seed)
        self.nodes: List[Node] = []
        self.packet_counter = 0
        self.tick = 0
        self.delivered: Dict[int, List[int]] = defaultdict(list)  # packet_id -> [node_ids]
        self.all_packets: List[Packet] = []
        self.stats = {
            'total_packets': 0,
            'total_relays': 0,
            'total_rx': 0,
            'delivery_ratios': [],
        }
        self._place_nodes(num_nodes)

    def _place_nodes(self, n: int) -> None:
        for i in range(n):
            x = self.rng.uniform(50, AREA_SIZE - 50)
            y = self.rng.uniform(50, AREA_SIZE - 50)
            self.nodes.append(Node(node_id=i, x=x, y=y,
                                   fhss_index=self.rng.randint(0, FHSS_CHANNELS - 1)))

    def _new_packet(self, origin: Node, payload: str) -> Packet:
        self.packet_counter += 1
        pkt = Packet(
            packet_id=self.packet_counter,
            sender_id=origin.node_id,
            ttl=MAX_TTL,
            payload=payload,
        )
        self.all_packets.append(pkt)
        self.stats['total_packets'] += 1
        return pkt

    def _neighbors(self, node: Node) -> List[Node]:
        return [n for n in self.nodes if n.node_id != node.node_id and node.can_reach(n)]

    def _transmit(self, sender: Node, pkt: Packet) -> None:
        if pkt.ttl == 0:
            return
        sender.tx_count += 1
        self.stats['total_relays'] += 1

        for neighbor in self._neighbors(sender):
            if self.rng.random() < PACKET_LOSS_RATE:
                continue  # simulated packet loss
            if pkt.packet_id in neighbor.seen_ids:
                continue  # already seen, skip

            neighbor.rx_count += 1
            neighbor.seen_ids.add(pkt.packet_id)
            self.delivered[pkt.packet_id].append(neighbor.node_id)
            self.stats['total_rx'] += 1

            # Relay with decremented TTL
            relay_pkt = Packet(
                packet_id=pkt.packet_id,
                sender_id=pkt.sender_id,
                ttl=pkt.ttl - 1,
                payload=pkt.payload,
                hops=pkt.hops + 1,
                created_at=pkt.created_at,
            )
            neighbor.relay_count += 1
            neighbor.dtn_store.append(relay_pkt)
            self._transmit(neighbor, relay_pkt)

    def originate(self, origin_id: int, payload: str) -> None:
        origin = self.nodes[origin_id]
        pkt = self._new_packet(origin, payload)
        origin.seen_ids.add(pkt.packet_id)
        self.delivered[pkt.packet_id] = [origin_id]
        self._transmit(origin, pkt)

    def run(self, duration: float = SIM_DURATION) -> None:
        ticks = int(duration / TICK_INTERVAL)
        print(f"\n{'='*60}")
        print(f"  Tactical Mesh Simulation  |  {len(self.nodes)} nodes  |  {duration}s")
        print(f"{'='*60}")
        print(f"  Radio range: {RADIO_RANGE}m  |  Area: {AREA_SIZE}x{AREA_SIZE}m")
        print(f"  Packet loss: {PACKET_LOSS_RATE*100:.0f}%  |  Max TTL: {MAX_TTL}")
        print(f"{'='*60}\n")

        for t in range(ticks):
            self.tick = t
            # Random origination: ~2 packets per tick on average
            for _ in range(self.rng.randint(0, 3)):
                origin_id = self.rng.randint(0, len(self.nodes) - 1)
                self.originate(origin_id, f"msg_{self.packet_counter+1}_t{t}")

        self._print_summary()

    def _print_summary(self) -> None:
        total = self.stats['total_packets']
        if total == 0:
            print("No packets generated.")
            return

        reach_counts = [len(self.delivered[p.packet_id]) for p in self.all_packets]
        avg_reach = sum(reach_counts) / len(reach_counts) if reach_counts else 0
        max_reach = max(reach_counts) if reach_counts else 0
        min_reach = min(reach_counts) if reach_counts else 0

        fully_delivered = sum(1 for c in reach_counts if c == len(self.nodes))
        delivery_pct = (fully_delivered / total * 100) if total > 0 else 0

        print(f"{'─'*60}")
        print(f"  SIMULATION RESULTS")
        print(f"{'─'*60}")
        print(f"  Packets originated : {total}")
        print(f"  Total relay events : {self.stats['total_relays']}")
        print(f"  Total RX events    : {self.stats['total_rx']}")
        print(f"  Full delivery      : {fully_delivered}/{total} ({delivery_pct:.1f}%)")
        print(f"  Avg nodes reached  : {avg_reach:.1f} / {len(self.nodes)}")
        print(f"  Min/Max reached    : {min_reach} / {max_reach}")
        print(f"{'─'*60}")
        print(f"\n  Node Statistics:")
        print(f"  {'ID':>3}  {'Pos':>18}  {'TX':>6}  {'RX':>6}  {'Relay':>6}  {'Neighbors':>9}")
        print(f"  {'─'*3}  {'─'*18}  {'─'*6}  {'─'*6}  {'─'*6}  {'─'*9}")
        for n in self.nodes:
            nbrs = len(self._neighbors(n))
            print(f"  {n.node_id:>3}  ({n.x:>6.1f},{n.y:>6.1f})  "
                  f"{n.tx_count:>6}  {n.rx_count:>6}  {n.relay_count:>6}  {nbrs:>9}")
        print(f"\n{'='*60}\n")

    def topology_summary(self) -> None:
        print("\n  Network Topology (adjacency):")
        for node in self.nodes:
            nbrs = self._neighbors(node)
            ids = [str(n.node_id) for n in nbrs]
            print(f"  Node {node.node_id:>2}: connects to [{', '.join(ids)}]")
        print()


def main() -> None:
    sim = MeshSimulation(num_nodes=NUM_NODES, seed=2024)
    sim.topology_summary()
    sim.run(duration=SIM_DURATION)
    print("Simulation complete.")


if __name__ == '__main__':
    main()
