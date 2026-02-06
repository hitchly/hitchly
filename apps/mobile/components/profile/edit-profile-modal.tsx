import Ionicons from "@expo/vector-icons/Ionicons";
import type {
  SaveAddressInput,
  UpdatePreferencesInput,
  UpdateProfileInput,
  UpdateVehicleInput,
} from "@hitchly/db"; // Ensure this matches your export location
import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../context/theme-context";
import {
  LocationForm,
  PreferencesForm,
  ProfileForm,
  VehicleForm,
} from "./profile-forms";

export type EditModalState =
  | { type: "profile"; initialData: UpdateProfileInput }
  | { type: "preferences"; initialData: UpdatePreferencesInput }
  | { type: "vehicle"; initialData: UpdateVehicleInput }
  | { type: "location"; initialData: SaveAddressInput }
  | null;

interface EditProfileModalProps {
  state: EditModalState;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditProfileModal = ({
  state,
  onClose,
  onSuccess,
}: EditProfileModalProps) => {
  const { colors } = useTheme();

  if (!state) return null;

  const getTitle = () => {
    switch (state.type) {
      case "profile":
        return "Edit Profile";
      case "preferences":
        return "Edit Preferences";
      case "vehicle":
        return "Edit Vehicle";
      case "location":
        return "Edit Address";
      default:
        return "";
    }
  };

  return (
    <Modal
      visible={!!state}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalOverlay}
      >
        <View
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {getTitle()}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {state.type === "profile" && (
              <ProfileForm
                initialData={state.initialData}
                onSuccess={onSuccess}
              />
            )}
            {state.type === "preferences" && (
              <PreferencesForm
                initialData={state.initialData}
                onSuccess={onSuccess}
              />
            )}
            {state.type === "vehicle" && (
              <VehicleForm
                initialData={state.initialData}
                onSuccess={onSuccess}
              />
            )}
            {state.type === "location" && (
              <LocationForm
                initialData={state.initialData}
                onSuccess={onSuccess}
              />
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold" },
});
