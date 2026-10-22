import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Loan } from '../types';
import { formatINR, formatDate } from '../utils/formatters';

interface LoanItemProps {
  loan: Loan;
  onRepay: (id: string) => Promise<void>;
  isRepaying: boolean;
}

export const LoanItem: React.FC<LoanItemProps> = ({ loan, onRepay, isRepaying }) => {
  const handleRepayPress = () => {
    const message = `Has ${loan.friendName} repaid the full amount of ${formatINR(loan.amount)}?`;

    if (Platform.OS === 'web') {
      // Alert.alert's onPress callbacks are never invoked on web because the
      // react-native-web polyfill uses synchronous window.confirm() which
      // returns a boolean rather than calling button callbacks.
      // Instead we use window.confirm() directly and call onRepay ourselves.
      // eslint-disable-next-line no-alert
      const confirmed = window.confirm(`Confirm Repayment\n\n${message}`);
      if (confirmed) {
        onRepay(loan.id);
      }
    } else {
      Alert.alert(
        'Confirm Repayment',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Mark Repaid',
            style: 'default',
            onPress: () => onRepay(loan.id),
          },
        ]
      );
    }
  };

  return (
    <View
      style={[
        styles.card,
        loan.isOverdue && !loan.isRepaid ? styles.overdueCardBorder : null,
        loan.isRepaid ? styles.repaidCard : null,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.friendInfo}>
          <View
            style={[
              styles.avatarCircle,
              loan.isRepaid
                ? { backgroundColor: '#E2E8F0' }
                : loan.isOverdue
                ? { backgroundColor: '#FEE2E2' }
                : { backgroundColor: '#ECFDF5' },
            ]}
          >
            <Ionicons
              name={loan.isRepaid ? 'checkmark-circle' : loan.isOverdue ? 'alert-circle' : 'person'}
              size={18}
              color={loan.isRepaid ? '#64748B' : loan.isOverdue ? '#DC2626' : '#059669'}
            />
          </View>
          <View>
            <Text style={styles.friendName}>{loan.friendName}</Text>
            <Text style={styles.dueDateText}>
              Due: {formatDate(loan.dueDate)}
            </Text>
          </View>
        </View>

        <View style={styles.amountCol}>
          <Text
            style={[
              styles.amountText,
              loan.isRepaid ? styles.repaidAmountText : null,
            ]}
          >
            {formatINR(loan.amount)}
          </Text>

          {/* Status Badge */}
          {loan.isRepaid ? (
            <View style={[styles.badge, styles.repaidBadge]}>
              <Ionicons name="checkmark" size={12} color="#059669" />
              <Text style={styles.repaidBadgeText}>Repaid</Text>
            </View>
          ) : loan.isOverdue ? (
            <View style={[styles.badge, styles.overdueBadge]}>
              <Ionicons name="warning" size={12} color="#DC2626" />
              <Text style={styles.overdueBadgeText}>Overdue</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.pendingBadge]}>
              <Ionicons name="time-outline" size={12} color="#2563EB" />
              <Text style={styles.pendingBadgeText}>Pending</Text>
            </View>
          )}
        </View>
      </View>

      {/* Receipt photo thumbnail if attached */}
      {loan.receiptUrl ? (
        <View style={styles.receiptContainer}>
          <Ionicons name="receipt-outline" size={14} color="#64748B" />
          <Text style={styles.receiptLabel}>Receipt attached</Text>
          <Image
            source={{ uri: loan.receiptUrl }}
            style={styles.receiptThumb}
            resizeMode="cover"
          />
        </View>
      ) : null}

      {/* Repay Action Button for Unpaid Loans */}
      {!loan.isRepaid && (
        <TouchableOpacity
          style={[styles.repayButton, isRepaying && styles.disabledButton]}
          onPress={handleRepayPress}
          disabled={isRepaying}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-done" size={16} color="#059669" />
          <Text style={styles.repayButtonText}>
            {isRepaying ? 'Processing...' : 'Mark as Repaid'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  overdueCardBorder: {
    borderColor: '#F87171',
    borderWidth: 1.5,
    backgroundColor: '#FFFBFB',
  },
  repaidCard: {
    opacity: 0.88,
    backgroundColor: '#F8FAFC',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  dueDateText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  repaidAmountText: {
    color: '#64748B',
    textDecorationLine: 'line-through',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  overdueBadge: {
    backgroundColor: '#FEE2E2',
  },
  overdueBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  repaidBadge: {
    backgroundColor: '#ECFDF5',
  },
  repaidBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  pendingBadge: {
    backgroundColor: '#EFF6FF',
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  repayButton: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  repayButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  receiptContainer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  receiptLabel: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  receiptThumb: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
