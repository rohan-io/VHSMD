import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/constants/theme";

interface TrimesterTimelineProps {
  currentTrimester: 1 | 2 | 3;
  gestationalWeeks: number;
  gestationalDays?: number;
  edd: string;
  isHighRisk?: boolean;
}

export const TrimesterTimeline: React.FC<TrimesterTimelineProps> = ({
  currentTrimester,
  gestationalWeeks,
  gestationalDays = 0,
  edd,
  isHighRisk = false,
}) => {
  const steps = [
    {
      num: 1,
      label: "1st Trimester",
      weeks: "Weeks 1–12",
      desc: "Registration & ANC 1",
      icon: "leaf-outline" as const,
    },
    {
      num: 2,
      label: "2nd Trimester",
      weeks: "Weeks 13–27",
      desc: "ANC 2 & TT Vaccines",
      icon: "fitness-outline" as const,
    },
    {
      num: 3,
      label: "3rd Trimester",
      weeks: "Weeks 28–40",
      desc: "ANC 3/4 & Birth Plan",
      icon: "heart-circle-outline" as const,
    },
    {
      num: 4,
      label: "Delivery & Child",
      weeks: "EDD",
      desc: "Institutional Birth",
      icon: "happy-outline" as const,
    },
  ];

  return (
    <View style={styles.container} testID="trimester-visual-timeline">
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <Text style={styles.title}>Gestational Timeline</Text>
          <Text style={styles.currentAge}>
            Currently:{" "}
            <Text style={styles.ageBold}>
              {gestationalWeeks} Weeks {gestationalDays} Days
            </Text>
          </Text>
        </View>

        <View style={styles.eddBadge}>
          <Ionicons name="calendar" size={13} color={theme.colors.brandDark} />
          <Text style={styles.eddText}>EDD: {edd}</Text>
        </View>
      </View>

      {/* Progress Track */}
      <View style={styles.trackContainer}>
        {steps.map((step, idx) => {
          const isDone = currentTrimester > step.num;
          const isCurrent = currentTrimester === step.num;
          const isFuture = currentTrimester < step.num;

          return (
            <React.Fragment key={step.num}>
              {/* Step Node */}
              <View style={styles.nodeWrapper}>
                <View
                  style={[
                    styles.circleNode,
                    isDone && styles.circleDone,
                    isCurrent && styles.circleCurrent,
                    isFuture && styles.circleFuture,
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <Ionicons
                      name={step.icon}
                      size={14}
                      color={isCurrent ? "#FFFFFF" : theme.colors.textMuted}
                    />
                  )}
                </View>

                <Text
                  style={[
                    styles.nodeLabel,
                    isCurrent && styles.nodeLabelCurrent,
                    isDone && styles.nodeLabelDone,
                  ]}
                  numberOfLines={1}
                >
                  {step.label}
                </Text>
                <Text style={styles.nodeWeeks}>{step.weeks}</Text>
              </View>

              {/* Connecting Line */}
              {idx < steps.length - 1 && (
                <View
                  style={[
                    styles.connectorLine,
                    currentTrimester > step.num ? styles.connectorDone : styles.connectorPending,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Clinical Guidance Milestone Box */}
      <View style={[styles.guidanceBox, isHighRisk && styles.guidanceBoxHighRisk]}>
        <Ionicons
          name={isHighRisk ? "alert-circle" : "information-circle"}
          size={18}
          color={isHighRisk ? theme.colors.error : theme.colors.brand}
        />
        <View style={styles.guidanceTextCol}>
          <Text style={styles.guidanceTitle}>
            {currentTrimester === 1
              ? "1st Trimester Protocols: Register early, baseline Hb & BP, IFA & TT1 start."
              : currentTrimester === 2
              ? "2nd Trimester Protocols: ANC 2 visit, TT2/Booster, Calcium tablets & Quickening check."
              : "3rd Trimester Protocols: ANC 3 & 4 visits, check fetal lie & BP, arrange 108 ambulance transport."}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titleCol: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  currentAge: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  ageBold: {
    fontWeight: "800",
    color: theme.colors.brand,
  },
  eddBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.brandLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  eddText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.brandDark,
  },
  trackContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  nodeWrapper: {
    alignItems: "center",
    width: 70,
  },
  circleNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  circleDone: {
    backgroundColor: theme.colors.success,
  },
  circleCurrent: {
    backgroundColor: theme.colors.brand,
    borderWidth: 2,
    borderColor: theme.colors.brandDark,
  },
  circleFuture: {
    backgroundColor: theme.colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  nodeLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  nodeLabelCurrent: {
    color: theme.colors.brandDark,
    fontWeight: "800",
  },
  nodeLabelDone: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
  },
  nodeWeeks: {
    fontSize: 9,
    color: theme.colors.textMuted,
    marginTop: 1,
    textAlign: "center",
  },
  connectorLine: {
    flex: 1,
    height: 3,
    marginBottom: 26,
    marginHorizontal: -4,
  },
  connectorDone: {
    backgroundColor: theme.colors.success,
  },
  connectorPending: {
    backgroundColor: theme.colors.border,
  },
  guidanceBox: {
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: theme.radius.sm,
    padding: 10,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.brand,
  },
  guidanceBoxHighRisk: {
    backgroundColor: theme.colors.errorLight,
    borderLeftColor: theme.colors.error,
  },
  guidanceTextCol: {
    flex: 1,
  },
  guidanceTitle: {
    fontSize: 11,
    color: theme.colors.textPrimary,
    lineHeight: 16,
    fontWeight: "600",
  },
});
