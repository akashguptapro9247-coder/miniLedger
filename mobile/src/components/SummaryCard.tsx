import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LoanSummary } from '../types';
import { formatINR } from '../utils/formatters';

interface SummaryCardProps {
  summary: LoanSummary | null;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ summary }) => {
  const totalLent = summary ? summary.totalLent : 0;
  const totalRepaid = summary ? summary.totalRepaid : 0;
  const overdueAmount = summary ? summary.overdueAmount : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.cardHeader}>LEDGER SUMMARY</Text>

      {/* Main total lent block */}
      <View style={styles.mainBlock}>
        <Text style={styles.mainLabel}>Total Amount Lent</Text>
        <Text style={styles.mainValue}>{formatINR(totalLent)}</Text>
      </View>

      <View style={styles.divider} />

      {/* Repaid & Overdue 2-column stats */}
      <View style={styles.row}>
        <View style={styles.statCol}>
          <View style={styles.labelRow}>
            <View style={[styles.indicatorDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.statLabel}>Total Repaid</Text>
          </View>
          <Text style={[styles.statValue, { color: '#047857' }]}>
            {formatINR(totalRepaid)}
          </Text>
        </View>

        <View style={styles.verticalDivider} />

        <View style={styles.statCol}>
          <View style={styles.labelRow}>
            <View style={[styles.indicatorDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.statLabel}>Overdue Amount</Text>
          </View>
          <Text style={[styles.statValue, { color: '#DC2626' }]}>
            {formatINR(overdueAmount)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  mainBlock: {
    marginBottom: 14,
  },
  mainLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  mainValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
  },
  verticalDivider: {
    width: 1,
    height: 38,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});
