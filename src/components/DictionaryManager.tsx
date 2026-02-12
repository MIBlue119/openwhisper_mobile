import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  getDictionaryWords,
  addDictionaryWord,
  removeDictionaryWord,
  getDictionaryWordList,
  type DictionaryWordRow,
} from "@/src/storage/database";
import { storage } from "@/src/storage/mmkv";
import { SettingKeys } from "@/src/hooks/useSettings";

/** Sync dictionary from SQLite to MMKV for fast access during transcription */
function syncToMMKV(): void {
  const words = getDictionaryWordList();
  storage.set(SettingKeys.CUSTOM_DICTIONARY, JSON.stringify(words));
}

export function DictionaryManager() {
  const [words, setWords] = useState<DictionaryWordRow[]>([]);
  const [newWord, setNewWord] = useState("");

  useEffect(() => {
    setWords(getDictionaryWords());
  }, []);

  const handleAdd = useCallback(() => {
    const trimmed = newWord.trim();
    if (!trimmed) return;
    addDictionaryWord(trimmed);
    setWords(getDictionaryWords());
    syncToMMKV();
    setNewWord("");
  }, [newWord]);

  const handleRemove = useCallback((id: number) => {
    removeDictionaryWord(id);
    setWords(getDictionaryWords());
    syncToMMKV();
  }, []);

  return (
    <View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={newWord}
          onChangeText={setNewWord}
          placeholder="Add word or phrase..."
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Pressable
          onPress={handleAdd}
          style={[
            styles.addButton,
            !newWord.trim() && styles.addButtonDisabled,
          ]}
          disabled={!newWord.trim()}
          accessibilityRole="button"
          accessibilityLabel="Add word"
        >
          <FontAwesome name="plus" size={14} color="#ffffff" />
        </Pressable>
      </View>

      {words.length === 0 ? (
        <Text style={styles.emptyText}>
          Add words to improve transcription accuracy for names, jargon, or
          technical terms.
        </Text>
      ) : (
        <View style={styles.wordList}>
          {words.map((word) => (
            <View key={word.id} style={styles.wordChip}>
              <Text style={styles.wordText}>{word.word}</Text>
              <Pressable
                onPress={() => handleRemove(word.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${word.word}`}
              >
                <FontAwesome name="times" size={12} color="#9ca3af" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1f2937",
    backgroundColor: "#ffffff",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  emptyText: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
    paddingVertical: 12,
  },
  wordList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  wordChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  wordText: {
    fontSize: 13,
    color: "#374151",
  },
});
