import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTranscriptionStore } from "@/src/stores/transcriptionStore";
import type { TranscriptionRow } from "@/src/storage/database";

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function TranscriptionItem({
  item,
  onDelete,
  onExpand,
}: {
  item: TranscriptionRow;
  onDelete: (id: number) => void;
  onExpand: (item: TranscriptionRow) => void;
}) {
  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(item.text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [item.text]);

  const handleShare = useCallback(async () => {
    await Share.share({ message: item.text });
  }, [item.text]);

  const handleDelete = useCallback(() => {
    Alert.alert("Delete", "Delete this transcription?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(item.id),
      },
    ]);
  }, [item.id, onDelete]);

  const preview =
    item.text.length > 120 ? item.text.slice(0, 120) + "..." : item.text;

  return (
    <Pressable
      onPress={() => onExpand(item)}
      className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 active:bg-gray-50 dark:active:bg-gray-900"
    >
      <View className="flex-row items-start justify-between mb-1">
        <View className="flex-row items-center gap-2 flex-1">
          <Text className="text-xs text-gray-400">
            {formatDate(item.timestamp)}
          </Text>
          {item.was_processed === 1 && (
            <View className="bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded">
              <Text className="text-[10px] text-purple-600 dark:text-purple-400">
                AI
              </Text>
            </View>
          )}
          {item.is_local === 0 && (
            <View className="bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
              <Text className="text-[10px] text-blue-600 dark:text-blue-400">
                Cloud
              </Text>
            </View>
          )}
        </View>
      </View>
      <Text
        className="text-sm text-gray-800 dark:text-gray-200 leading-5"
        numberOfLines={3}
      >
        {preview}
      </Text>
      <View className="flex-row gap-4 mt-2">
        <Pressable
          onPress={handleCopy}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Copy"
        >
          <FontAwesome name="copy" size={14} color="#9ca3af" />
        </Pressable>
        <Pressable
          onPress={handleShare}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Share"
        >
          <FontAwesome name="share-square-o" size={14} color="#9ca3af" />
        </Pressable>
        <Pressable
          onPress={handleDelete}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Delete"
        >
          <FontAwesome name="trash-o" size={14} color="#ef4444" />
        </Pressable>
      </View>
    </Pressable>
  );
}

function TranscriptionDetail({
  item,
  onClose,
  onDelete,
}: {
  item: TranscriptionRow;
  onClose: () => void;
  onDelete: (id: number) => void;
}) {
  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(item.text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [item.text]);

  const handleShare = useCallback(async () => {
    await Share.share({ message: item.text });
  }, [item.text]);

  const handleDelete = useCallback(() => {
    Alert.alert("Delete", "Delete this transcription?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          onDelete(item.id);
          onClose();
        },
      },
    ]);
  }, [item.id, onDelete, onClose]);

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <Pressable onPress={onClose} hitSlop={8}>
          <FontAwesome name="chevron-left" size={16} color="#3b82f6" />
        </Pressable>
        <Text className="text-xs text-gray-400">
          {formatDate(item.timestamp)}
        </Text>
        <View className="flex-row gap-4">
          <Pressable onPress={handleCopy} hitSlop={8}>
            <FontAwesome name="copy" size={16} color="#6b7280" />
          </Pressable>
          <Pressable onPress={handleShare} hitSlop={8}>
            <FontAwesome name="share-square-o" size={16} color="#6b7280" />
          </Pressable>
          <Pressable onPress={handleDelete} hitSlop={8}>
            <FontAwesome name="trash-o" size={16} color="#ef4444" />
          </Pressable>
        </View>
      </View>
      <View className="flex-1 px-4 py-4">
        <Text
          className="text-base text-gray-800 dark:text-gray-200 leading-6"
          selectable
        >
          {item.text}
        </Text>
        {item.model_used && (
          <Text className="text-xs text-gray-400 mt-4">
            Model: {item.model_used}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { transcriptions, isLoading, searchQuery, loadTranscriptions, search, removeTranscription } =
    useTranscriptionStore();
  const [selectedItem, setSelectedItem] = useState<TranscriptionRow | null>(
    null
  );

  useEffect(() => {
    loadTranscriptions();
  }, [loadTranscriptions]);

  const handleSearch = useCallback(
    (text: string) => {
      search(text);
    },
    [search]
  );

  if (selectedItem) {
    return (
      <TranscriptionDetail
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onDelete={(id) => {
          removeTranscription(id);
          setSelectedItem(null);
        }}
      />
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-black">
      {/* Search Bar */}
      <View className="px-4 pt-2 pb-1">
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
          <FontAwesome name="search" size={14} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-sm text-gray-800 dark:text-gray-200"
            placeholder="Search transcriptions..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Transcription List */}
      <FlatList
        data={transcriptions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TranscriptionItem
            item={item}
            onDelete={removeTranscription}
            onExpand={setSelectedItem}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-20">
            <FontAwesome name="history" size={48} color="#d1d5db" />
            <Text className="text-base text-gray-400 mt-4">
              {searchQuery ? "No results found" : "No transcriptions yet"}
            </Text>
            <Text className="text-sm text-gray-300 mt-1">
              {searchQuery
                ? "Try a different search term"
                : "Record something to get started"}
            </Text>
          </View>
        }
        refreshing={isLoading}
        onRefresh={loadTranscriptions}
      />
    </View>
  );
}
