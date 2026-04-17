import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ListRenderItemInfo,
} from 'react-native';
import { useMeshBluetooth, MeshMessage } from '../hooks/useMeshBluetooth';

interface ChatRoomProps {
  host?: string;
  port?: number;
}

interface MessageItemProps {
  item: MeshMessage;
}

function MessageItem({ item }: MessageItemProps): React.JSX.Element {
  const isOwn = item.senderId === 0xDEADBEEF;
  const time = new Date(item.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.messageRow, isOwn ? styles.ownRow : styles.otherRow]}>
      <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        {!isOwn && (
          <Text style={styles.senderLabel}>{`Node ${item.senderId.toString(16).toUpperCase()}`}</Text>
        )}
        <Text style={styles.messageText}>{item.payload}</Text>
        <Text style={styles.timeLabel}>{time}</Text>
      </View>
    </View>
  );
}

export default function ChatRoom({ host = '192.168.1.1', port = 8765 }: ChatRoomProps): React.JSX.Element {
  const { isConnected, messages, connect, disconnect, sendMessage, error } = useMeshBluetooth();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList<MeshMessage>>(null);

  useEffect(() => {
    connect(host, port);
    return () => disconnect();
  }, [host, port, connect, disconnect]);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    if (sendMessage(text)) {
      setInputText('');
    }
  }, [inputText, sendMessage]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MeshMessage>) => <MessageItem item={item} />,
    []
  );

  const keyExtractor = useCallback(
    (item: MeshMessage) => `${item.packetId}-${item.timestamp}`,
    []
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <View style={[styles.statusDot, isConnected ? styles.dotGreen : styles.dotRed]} />
        <Text style={styles.headerText}>
          {isConnected ? 'Mesh Connected' : 'Disconnected'}
        </Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No messages yet. Send the first!</Text>
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor="#888"
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  dotGreen: { backgroundColor: '#4CAF50' },
  dotRed: { backgroundColor: '#f44336' },
  headerText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  errorBanner: { backgroundColor: '#b00020', padding: 8, alignItems: 'center' },
  errorText: { color: '#fff', fontSize: 12 },
  messageList: { paddingHorizontal: 12, paddingVertical: 8 },
  messageRow: { marginVertical: 4 },
  ownRow: { alignItems: 'flex-end' },
  otherRow: { alignItems: 'flex-start' },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 12,
  },
  ownBubble: { backgroundColor: '#1e4d8c' },
  otherBubble: { backgroundColor: '#2a2a2a' },
  senderLabel: { color: '#4fc3f7', fontSize: 11, marginBottom: 2 },
  messageText: { color: '#fff', fontSize: 15 },
  timeLabel: { color: '#aaa', fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 40 },
  inputRow: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#1e4d8c',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendButtonDisabled: { backgroundColor: '#333' },
  sendButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
