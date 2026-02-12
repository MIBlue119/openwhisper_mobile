import { useCallback, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface PickerOption {
  value: string;
  label: string;
  description?: string;
}

interface PickerSelectProps {
  label: string;
  options: PickerOption[];
  value: string | undefined;
  onChange: (value: string) => void;
}

export function PickerSelect({
  label,
  options,
  value,
  onChange,
}: PickerSelectProps) {
  const [visible, setVisible] = useState(false);
  const selectedOption = options.find((o) => o.value === value);

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setVisible(false);
    },
    [onChange]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={styles.trigger}
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`Select ${label}`}
      >
        <Text
          style={[styles.triggerText, !selectedOption && styles.placeholder]}
        >
          {selectedOption?.label ?? "Select..."}
        </Text>
        <FontAwesome name="chevron-down" size={12} color="#9ca3af" />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView style={styles.optionList}>
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.option,
                    option.value === value && styles.optionSelected,
                  ]}
                  onPress={() => handleSelect(option.value)}
                >
                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionLabel,
                        option.value === value && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {option.description && (
                      <Text style={styles.optionDesc}>
                        {option.description}
                      </Text>
                    )}
                  </View>
                  {option.value === value && (
                    <FontAwesome
                      name="check"
                      size={14}
                      color="#3b82f6"
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
  },
  triggerText: {
    fontSize: 14,
    color: "#1f2937",
  },
  placeholder: {
    color: "#9ca3af",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 32,
  },
  modal: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 12,
  },
  optionList: {
    flexGrow: 0,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
  },
  optionSelected: {
    backgroundColor: "#eff6ff",
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1f2937",
  },
  optionLabelSelected: {
    color: "#1d4ed8",
  },
  optionDesc: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
});
