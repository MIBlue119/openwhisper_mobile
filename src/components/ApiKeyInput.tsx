import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  getSecureValue,
  setSecureValue,
  deleteSecureValue,
} from "@/src/storage/secureStorage";

interface ApiKeyInputProps {
  label: string;
  secureKey: string;
  placeholder?: string;
}

export function ApiKeyInput({
  label,
  secureKey,
  placeholder = "sk-...",
}: ApiKeyInputProps) {
  const [value, setValue] = useState("");
  const [isStored, setIsStored] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    getSecureValue(secureKey).then((stored) => {
      if (stored) {
        setIsStored(true);
        setValue(stored);
      }
      setIsLoading(false);
    });
  }, [secureKey]);

  const handleSave = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    await setSecureValue(secureKey, trimmed);
    setIsStored(true);
    setIsEditing(false);
  }, [value, secureKey]);

  const handleDelete = useCallback(async () => {
    await deleteSecureValue(secureKey);
    setValue("");
    setIsStored(false);
    setIsEditing(false);
  }, [secureKey]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <ActivityIndicator size="small" color="#6b7280" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {isStored && !isEditing ? (
        <View style={styles.storedRow}>
          <View style={styles.storedIndicator}>
            <FontAwesome name="check-circle" size={16} color="#22c55e" />
            <Text style={styles.storedText}>Key saved</Text>
          </View>
          <View style={styles.actions}>
            <Pressable
              onPress={() => setIsEditing(true)}
              style={styles.actionButton}
            >
              <Text style={styles.actionText}>Edit</Text>
            </Pressable>
            <Pressable onPress={handleDelete} style={styles.actionButton}>
              <Text style={[styles.actionText, styles.deleteText]}>Remove</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={isEditing ? value : ""}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            secureTextEntry={!isEditing}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            onPress={handleSave}
            style={[
              styles.saveButton,
              !value.trim() && styles.saveButtonDisabled,
            ]}
            disabled={!value.trim()}
          >
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  storedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  storedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  storedText: {
    fontSize: 14,
    color: "#22c55e",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "500",
  },
  deleteText: {
    color: "#ef4444",
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
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
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  saveText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
});
