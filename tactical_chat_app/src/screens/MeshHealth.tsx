import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ListRenderItemInfo,
} from 'react-native';
import { useMeshBluetooth, MeshNode } from '../hooks/useMeshBluetooth';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
}

function StatCard({ label, value, unit, color = '#4fc3f7' }: StatCardProps): React.JSX.Element {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {unit && <Text style={styles.statUnit}>{unit}</Text>}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface NodeRowProps {
  node: MeshNode;
}

function NodeRow({ node }: NodeRowProps): React.JSX.Element {
  const age = Math.floor((Date.now() - node.lastSeen) / 1000);
  const rssiColor = node.rssi > -70 ? '#4CAF50' : node.rssi > -90 ? '#FFC107' : '#f44336';

  return (
    <View style={styles.nodeRow}>
      <View style={styles.nodeInfo}>
        <Text style={styles.nodeName}>{node.name || node.id}</Text>
        <Text style={styles.nodeId}>{node.id}</Text>
      </View>
      <View style={styles.nodeStats}>
        <Text style={[styles.nodeRssi, { color: rssiColor }]}>{`${node.rssi} dBm`}</Text>
        <Text style={styles.nodeAge}>{`${age}s`}</Text>
      </View>
    </View>
  );
}

interface MeshHealthProps {
  host?: string;
  port?: number;
}

export default function MeshHealth({ host = '192.168.1.1', port = 8765 }: MeshHealthProps): React.JSX.Element {
  const { isConnected, nodes, messages, connect, disconnect, error } = useMeshBluetooth();
  const [packetCount, setPacketCount] = useState(0);
  const [gpsCount, setGpsCount] = useState(0);

  useEffect(() => {
    setPacketCount(messages.length);
    setGpsCount(messages.filter(m => m.type === 'gps').length);
  }, [messages]);

  const avgRssi =
    nodes.length > 0
      ? Math.round(nodes.reduce((sum, n) => sum + n.rssi, 0) / nodes.length)
      : 0;

  const renderNode = useCallback(
    ({ item }: ListRenderItemInfo<MeshNode>) => <NodeRow node={item} />,
    []
  );

  const keyExtractor = useCallback((item: MeshNode) => item.id, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mesh Health</Text>
        <TouchableOpacity
          style={[styles.toggleButton, isConnected ? styles.disconnectBtn : styles.connectBtn]}
          onPress={() => (isConnected ? disconnect() : connect(host, port))}
        >
          <Text style={styles.toggleButtonText}>{isConnected ? 'Disconnect' : 'Connect'}</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.statsRow}>
        <StatCard
          label="Nodes"
          value={nodes.length}
          color={nodes.length > 0 ? '#4CAF50' : '#888'}
        />
        <StatCard label="Packets" value={packetCount} />
        <StatCard label="GPS Fixes" value={gpsCount} color="#4CAF50" />
        <StatCard
          label="Avg RSSI"
          value={avgRssi}
          unit="dBm"
          color={avgRssi > -80 ? '#4CAF50' : '#FFC107'}
        />
      </View>

      <View style={styles.channelBand}>
        <Text style={styles.channelLabel}>Frequency Band: 902–928 MHz (FHSS)</Text>
        <Text style={styles.channelSub}>50 channels · AES-256-GCM encrypted</Text>
      </View>

      <FlatList
        data={nodes}
        renderItem={renderNode}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.nodeList}
        ListHeaderComponent={
          <Text style={styles.nodeListHeader}>
            {`Active Nodes (${nodes.length})`}
          </Text>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {isConnected ? 'Scanning for nodes...' : 'Not connected'}
          </Text>
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
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
  },
  connectBtn: { backgroundColor: '#1e4d8c' },
  disconnectBtn: { backgroundColor: '#7f1d1d' },
  toggleButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  errorBanner: { backgroundColor: '#b00020', padding: 8, alignItems: 'center' },
  errorText: { color: '#fff', fontSize: 12 },
  statsRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statUnit: { color: '#888', fontSize: 10 },
  statLabel: { color: '#aaa', fontSize: 11, marginTop: 2 },
  channelBand: {
    backgroundColor: '#0f172a',
    padding: 12,
    marginHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  channelLabel: { color: '#4fc3f7', fontSize: 13, fontWeight: '600' },
  channelSub: { color: '#888', fontSize: 11, marginTop: 2 },
  nodeList: { paddingHorizontal: 12 },
  nodeListHeader: { color: '#aaa', fontSize: 13, marginBottom: 8 },
  nodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  nodeInfo: {},
  nodeName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  nodeId: { color: '#888', fontSize: 11, fontFamily: 'monospace' },
  nodeStats: { alignItems: 'flex-end' },
  nodeRssi: { fontSize: 14, fontWeight: '600' },
  nodeAge: { color: '#888', fontSize: 11 },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 24 },
});
