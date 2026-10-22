import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api/client';
import { toYMD } from '../utils/formatters';

export const AddLoanScreen = () => {
  const navigation = useNavigation();

  const [friendName, setFriendName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    // Default due date: 7 days from today
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return toYMD(d);
  });
  const [receiptUri, setReceiptUri] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick preset selector
  const setPresetDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    setDueDate(toYMD(d));
  };

  // Image Picker for optional receipt photo
  const handlePickReceipt = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Needed',
          'Please allow access to your photos to attach a receipt.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // If base64 is available, use base64 data URL; otherwise use uri
        if (asset.base64) {
          setReceiptUri(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          setReceiptUri(asset.uri);
        }
      }
    } catch (err: any) {
      Alert.alert('Image Error', err.message || 'Could not pick image.');
    }
  };

  const handleSave = async () => {
    setErrorMessage(null);

    // Validation
    const trimmedName = friendName.trim();
    if (!trimmedName) {
      setErrorMessage('Please enter the friend’s name.');
      return;
    }
    if (trimmedName.length > 100) {
      setErrorMessage('Friend’s name cannot exceed 100 characters.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a positive numeric loan amount.');
      return;
    }
    if (parsedAmount > 100_000_000) {
      setErrorMessage('Amount exceeds maximum allowed limit.');
      return;
    }

    // Validate due date format YYYY-MM-DD
    const dateMatch = /^\d{4}-\d{2}-\d{2}$/.test(dueDate);
    const parsedDate = new Date(dueDate);
    if (!dateMatch || isNaN(parsedDate.getTime())) {
      setErrorMessage('Please provide a valid date in YYYY-MM-DD format.');
      return;
    }

    setSaving(true);
    try {
      await api.createLoan({
        friendName: trimmedName,
        amount: parsedAmount,
        dueDate,
        receiptUrl: receiptUri,
      });

      // Navigate back to Dashboard
      navigation.goBack();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save loan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.formTitle}>Loan Information</Text>
          <Text style={styles.formSubtitle}>
            Record who borrowed money, the amount, and when it is due.
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Friend Name */}
          <Text style={styles.label}>Friend's Name *</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor="#94A3B8"
              value={friendName}
              onChangeText={setFriendName}
              maxLength={100}
              editable={!saving}
            />
          </View>

          {/* Amount */}
          <Text style={styles.label}>Amount (₹) *</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              style={styles.textInput}
              placeholder="1000.00"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              editable={!saving}
            />
          </View>

          {/* Due Date */}
          <Text style={styles.label}>Due Date (YYYY-MM-DD) *</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="calendar-outline" size={18} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="2026-11-01"
              placeholderTextColor="#94A3B8"
              value={dueDate}
              onChangeText={setDueDate}
              maxLength={10}
              editable={!saving}
            />
          </View>

          {/* Date presets */}
          <View style={styles.presetsRow}>
            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => setPresetDate(0)}
            >
              <Text style={styles.presetText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => setPresetDate(7)}
            >
              <Text style={styles.presetText}>1 Week</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => setPresetDate(30)}
            >
              <Text style={styles.presetText}>1 Month</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.presetButton}
              onPress={() => setPresetDate(90)}
            >
              <Text style={styles.presetText}>3 Months</Text>
            </TouchableOpacity>
          </View>

          {/* Optional Receipt Attachment (Bonus Feature) */}
          <Text style={styles.label}>Receipt Photo (Optional)</Text>
          {receiptUri ? (
            <View style={styles.receiptPreviewContainer}>
              <Image source={{ uri: receiptUri }} style={styles.receiptPreview} />
              <TouchableOpacity
                style={styles.removeReceiptButton}
                onPress={() => setReceiptUri(null)}
              >
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
                <Text style={styles.removeReceiptText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.attachButton}
              onPress={handlePickReceipt}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={20} color="#10B981" />
              <Text style={styles.attachButtonText}>Attach Receipt Image</Text>
            </TouchableOpacity>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Loan</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  presetButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    marginTop: 4,
    marginBottom: 16,
  },
  attachButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  receiptPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    marginBottom: 16,
  },
  receiptPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  removeReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  removeReceiptText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    flex: 1,
    fontWeight: '500',
  },
});
