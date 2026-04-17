import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ListRenderItemInfo,
} from 'react-native';
import { useMeshBluetooth, MeshMessage } from '../hooks/useMeshBluetooth';

interface GPSCoord {
  nodeId: number;
  lat: number;
  lon: number;
  alt: number;
  timestamp: number;
}

function parseGPSPayload(payload: string): { lat: number; lon: number; alt: number } | null {
  try {
    const parts = payload.split(',');
    if (parts.length < 3) return null;
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    const alt = parseInt(parts[2], 10);
    if (isNaN(lat) || isNaN(lon)) return null;
    return { lat, lon, alt };
  } catch {
    return null;
  }
}

interface NodeItemProps {
  coord: GPSCoord;
}

function NodeItem({ coord }: NodeItemProps): React.JSX.Element {
  const age = Math.floor((Date.now() - coord.timestamp) / 1000);
  return (
    <View style={styles.nodeCard}>
      <View style={styles.nodeHeader}>
        <Text style={styles.nodeId}>
          {`Node ${coord.nodeId.toString(16).toUpperCase().padStart(8, '0')}`}
        </Text>
        <Text style={styles.nodeAge}>{`${age}s ago`}</Text>
      </View>
      <Text style={styles.nodeCoords}>
        {`Lat: ${coord.lat.toFixed(5)}  Lon: ${coord.lon.toFixed(5)}`}
      </Text>
      <Text style={styles.nodeAlt}>{`Alt: ${coord.alt}m`}</Text>
    </View>
  );
}

interface TacticalMapProps {
  host?: string;
  port?: number;
}

export default function TacticalMap({ host = '192.168.1.1', port = 8765 }: TacticalMapProps): React.JSX.Element {
  const { isConnected, messages } = useMeshBluetooth();
  const [nodePositions, setNodePositions] = useState<Map<number, GPSCoord>>(new Map());

  useEffect(() => {
    const gpsMessages = messages.filter((m: MeshMessage) => m.type === 'gps');
    if (gpsMessages.length === 0) return;

    setNodePositions(prev => {
      const next = new Map(prev);
      for (const msg of gpsMessages) {
        const parsed = parseGPSPayload(msg.payload);
        if (parsed) {
          next.set(msg.senderId, {
            nodeId: msg.senderId,
            ...parsed,
            timestamp: msg.timestamp,
          });
        }
      }
      return next;
    });
  }, [messages]);

  const coords = Array.from(nodePositions.values());

  const renderNode = useCallback(
    ({ item }: ListRenderItemInfo<GPSCoord>) => <NodeItem coord={item} />,
    []
  );

  const keyExtractor = useCallback(
    (item: GPSCoord) => item.nodeId.toString(),
    []
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tactical Map</Text>
        <View style={[styles.statusDot, isConnected ? styles.dotGreen : styles.dotRed]} />
      </View>

      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderText}>
          {`${coords.length} node${coords.length !== 1 ? 's' : ''} tracked`}
        </Text>
        {coords.length === 0 && (
          <Text style={styles.mapHint}>Waiting for GPS beacons...</Text>
        )}
        {coords.map(c => (
          <View key={c.nodeId} style={styles.mapDot}>
            <Text style={styles.mapDotLabel}>
              {`●  Node ${c.nodeId.toString(16).toUpperCase()}\n   ${c.lat.toFixed(3)}, ${c.lon.toFixed(3)}`}
            </Text>
          </View>
        ))}
      </View>

      <FlatList
        data={coords}
        renderItem={renderNode}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.nodeList}
        ListHeaderComponent={
          coords.length > 0 ? (
            <Text style={styles.listHeader}>Node Positions</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  dotGreen: { backgroundColor: '#4CAF50' },
  dotRed: { backgroundColor: '#f44336' },
  mapPlaceholder: {
    height: 200,
    backgroundColor: '#111827',
    margin: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  mapPlaceholderText: { color: '#4fc3f7', fontSize: 16, fontWeight: '600' },
  mapHint: { color: '#555', fontSize: 12, marginTop: 8 },
  mapDot: { marginTop: 8 },
  mapDotLabel: { color: '#4CAF50', fontSize: 12, textAlign: 'center' },
  nodeList: { paddingHorizontal: 12 },
  listHeader: { color: '#aaa', fontSize: 13, marginBottom: 8, marginTop: 4 },
  nodeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4fc3f7',
  },
  nodeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  nodeId: { color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: 'monospace' },
  nodeAge: { color: '#888', fontSize: 11 },
  nodeCoords: { color: '#4fc3f7', fontSize: 12, fontFamily: 'monospace' },
  nodeAlt: { color: '#aaa', fontSize: 11, marginTop: 2 },
});
