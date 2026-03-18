import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/AppText";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Divider } from "@/components/Divider";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useApp } from "@/context/AppContext";
import { deriveTasks } from "@/lib/tasks";
import { TaskStatus, RiskLevel } from "@/types";

const statusBadge: Record<TaskStatus, "red" | "gray" | "blue" | "green"> = {
  Overdue: "red",
  "Not started": "gray",
  "In progress": "blue",
  Done: "green",
};

const riskColor: Record<RiskLevel, "red" | "amber" | "blue"> = {
  high: "red",
  medium: "amber",
  low: "blue",
};

const riskLabel: Record<RiskLevel, string> = {
  high: "High risk",
  medium: "Medium risk",
  low: "Low risk",
};

type FilterTab = "All" | "Overdue" | "Not started" | "Done";
const FILTER_TABS: FilterTab[] = ["All", "Overdue", "Not started", "Done"];

// Simulated file picker for evidence uploads (SCRUM-37)
function simulateFilePick(): Promise<{ uri: string; fileName: string; type: "photo" | "pdf"; sizeBytes: number } | null> {
  return new Promise((resolve) => {
    // Simulate picking a file with random attributes
    const isPhoto = Math.random() > 0.3;
    const sizeBytes = Math.floor(Math.random() * 5 * 1024 * 1024) + 100000; // 100KB - 5MB
    resolve({
      uri: `file:///mock/${Date.now()}.${isPhoto ? "jpg" : "pdf"}`,
      fileName: isPhoto ? `evidence_photo_${Date.now()}.jpg` : `compliance_doc_${Date.now()}.pdf`,
      type: isPhoto ? "photo" : "pdf",
      sizeBytes,
    });
  });
}

export default function DashboardScreen() {
  const { sessionUser, farmProfile, logout, reports, addEvidence, removeEvidence, getEvidenceForTask } = useApp();
  const tasks = deriveTasks(farmProfile);
  const draftCount = reports.filter((r) => r.status === "draft").length;
  const overdueTasks = tasks.filter((t) => t.status === "Overdue").length;
  const [filter, setFilter] = useState<FilterTab>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<Record<string, string>>({});

  const filtered = filter === "All" ? tasks : tasks.filter((t) => t.status === filter);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  // SCRUM-37: Handle evidence upload
  async function handleUploadEvidence(taskId: string) {
    try {
      const file = await simulateFilePick();
      if (!file) {
        setUploadMessage((prev) => ({ ...prev, [taskId]: "File selection cancelled." }));
        return;
      }

      const result = await addEvidence(taskId, file.uri, file.fileName, file.type, file.sizeBytes);
      if (!result.ok) {
        setUploadMessage((prev) => ({ ...prev, [taskId]: result.error ?? "Upload failed." }));
      } else {
        setUploadMessage((prev) => ({ ...prev, [taskId]: `Uploaded "${file.fileName}" successfully.` }));
      }
    } catch {
      setUploadMessage((prev) => ({ ...prev, [taskId]: "Upload failed. Please try again." }));
    }
  }

  // SCRUM-37: Handle evidence removal
  async function handleRemoveEvidence(evidenceId: string, taskId: string) {
    await removeEvidence(evidenceId);
    setUploadMessage((prev) => ({ ...prev, [taskId]: "Attachment removed." }));
  }

  return (
    <Screen>
      {/* Header */}
      <View style={styles.greeting}>
        <View style={styles.greetingText}>
          <AppText variant="title">Welcome back</AppText>
          <AppText tone="muted">{sessionUser?.name}</AppText>
        </View>
        <View style={styles.avatar}>
          <Ionicons name="person" size={20} color="#3f6a52" />
        </View>
      </View>

      {/* Stats — SCRUM-31 */}
      <View style={styles.statsRow}>
        <Pressable style={[styles.statCard, styles.statTasks]} onPress={() => setFilter("All")}>
          <AppText style={styles.statNumber}>{tasks.length}</AppText>
          <AppText variant="caption" style={styles.statLabel}>Tasks</AppText>
        </Pressable>
        <Pressable style={[styles.statCard, styles.statOverdue]} onPress={() => setFilter("Overdue")}>
          <AppText style={[styles.statNumber, overdueTasks > 0 && styles.statDanger]}>
            {overdueTasks}
          </AppText>
          <AppText variant="caption" style={styles.statLabel}>Overdue</AppText>
        </Pressable>
        <Pressable style={[styles.statCard, styles.statDrafts]}>
          <AppText style={styles.statNumber}>{draftCount}</AppText>
          <AppText variant="caption" style={styles.statLabel}>Drafts</AppText>
        </Pressable>
      </View>

      {/* Task list — SCRUM-31 + SCRUM-32 + SCRUM-42 */}
      <Card>
        <View style={styles.sectionHeader}>
          <Ionicons name="checkbox-outline" size={18} color="#3f6a52" />
          <AppText variant="subtitle">Compliance Tasks</AppText>
        </View>

        {/* Filter tabs — SCRUM-31 */}
        <View style={styles.filterRow}>
          {FILTER_TABS.map((tab) => (
            <Pressable
              key={tab}
              style={[styles.filterTab, filter === tab && styles.filterTabActive]}
              onPress={() => setFilter(tab)}
            >
              <AppText style={[styles.filterLabel, filter === tab && styles.filterLabelActive]}>
                {tab}
              </AppText>
            </Pressable>
          ))}
        </View>

        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={28} color="#c4b79b" />
            <AppText variant="caption" tone="muted" style={styles.emptyText}>
              Complete your farm profile to generate relevant compliance tasks.
            </AppText>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <AppText variant="caption" tone="muted">No tasks with status "{filter}".</AppText>
          </View>
        ) : (
          filtered.map((task, index) => {
            const expanded = expandedId === task.id;
            const evidence = getEvidenceForTask(task.id);
            const taskMsg = uploadMessage[task.id];
            const isMsgSuccess = taskMsg?.includes("successfully") || taskMsg?.includes("removed");
            const isMsgError = taskMsg?.includes("failed") || taskMsg?.includes("exceeds");

            return (
              <View key={task.id}>
                {index > 0 && <Divider />}
                {/* Tappable task row — SCRUM-32 */}
                <Pressable
                  style={styles.taskItem}
                  onPress={() => setExpandedId(expanded ? null : task.id)}
                >
                  <View style={styles.taskTop}>
                    <AppText style={styles.taskTitle}>{task.title}</AppText>
                    <View style={styles.taskBadges}>
                      {/* Risk badge — SCRUM-42 */}
                      <Badge label={riskLabel[task.riskLevel]} color={riskColor[task.riskLevel]} />
                      <Badge label={task.status} color={statusBadge[task.status]} />
                    </View>
                  </View>
                  <View style={styles.taskMeta}>
                    <Ionicons name="calendar-outline" size={13} color="#a09786" />
                    <AppText variant="caption" tone="muted">Due {task.dueDate}</AppText>
                    <AppText variant="caption" tone="muted">{task.source}</AppText>
                    {evidence.length > 0 && (
                      <>
                        <Ionicons name="attach" size={13} color="#3f6a52" />
                        <AppText variant="caption" tone="accent">{evidence.length}</AppText>
                      </>
                    )}
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={13}
                      color="#a09786"
                      style={styles.chevron}
                    />
                  </View>

                  {/* Expanded detail — SCRUM-32 + SCRUM-42 */}
                  {expanded && (
                    <View style={styles.expandedDetail}>
                      <View style={styles.detailSection}>
                        <View style={styles.detailSectionHeader}>
                          <Ionicons name="list-outline" size={14} color="#3f6a52" />
                          <AppText variant="label" tone="accent">What to do</AppText>
                        </View>
                        <AppText variant="caption" tone="muted" style={styles.detailText}>
                          {task.whatToDo}
                        </AppText>
                      </View>
                      <View style={styles.detailSection}>
                        <View style={styles.detailSectionHeader}>
                          <Ionicons name="information-circle-outline" size={14} color="#3f6a52" />
                          <AppText variant="label" tone="accent">Guidance</AppText>
                        </View>
                        <AppText variant="caption" tone="muted" style={styles.detailText}>
                          {task.guidance}
                        </AppText>
                      </View>
                      {/* Penalty explanation — SCRUM-42 */}
                      <View style={[styles.detailSection, styles.penaltyBox]}>
                        <View style={styles.detailSectionHeader}>
                          <Ionicons name="warning-outline" size={14} color="#8a6514" />
                          <AppText variant="label" style={{ color: "#8a6514" }}>Penalty risk</AppText>
                        </View>
                        <AppText variant="caption" style={styles.penaltyText}>
                          {task.penaltyExplanation}
                        </AppText>
                      </View>

                      {/* SCRUM-37: Evidence Attachments */}
                      <View style={styles.detailSection}>
                        <View style={styles.detailSectionHeader}>
                          <Ionicons name="attach" size={14} color="#3f6a52" />
                          <AppText variant="label" tone="accent">Evidence Files</AppText>
                        </View>

                        {evidence.length === 0 ? (
                          <AppText variant="caption" tone="muted">
                            No files attached yet. Upload photo or PDF evidence.
                          </AppText>
                        ) : (
                          evidence.map((att) => (
                            <View key={att.id} style={styles.attachmentRow}>
                              <Ionicons
                                name={att.type === "photo" ? "image-outline" : "document-outline"}
                                size={16}
                                color="#3f6a52"
                              />
                              <View style={styles.attachmentInfo}>
                                <AppText variant="caption" style={styles.attachmentName}>
                                  {att.fileName}
                                </AppText>
                                <AppText variant="caption" tone="muted">
                                  {(att.sizeBytes / 1024).toFixed(0)} KB — {att.addedAt.slice(0, 10)}
                                </AppText>
                              </View>
                              <Pressable
                                onPress={() => handleRemoveEvidence(att.id, task.id)}
                                style={styles.removeBtn}
                              >
                                <Ionicons name="trash-outline" size={14} color="#b5332a" />
                              </Pressable>
                            </View>
                          ))
                        )}

                        <PrimaryButton
                          label="Upload Photo / PDF"
                          variant="secondary"
                          compact
                          onPress={() => handleUploadEvidence(task.id)}
                        />

                        {taskMsg ? (
                          <View style={[styles.uploadMsg, isMsgError && styles.uploadMsgError]}>
                            <Ionicons
                              name={isMsgError ? "alert-circle" : "checkmark-circle"}
                              size={13}
                              color={isMsgError ? "#b5332a" : "#1f7a3f"}
                            />
                            <AppText variant="caption" tone={isMsgError ? "danger" : "success"}>
                              {taskMsg}
                            </AppText>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })
        )}
      </Card>

      <Card variant="outlined">
        <AppText variant="caption" tone="muted" style={styles.sessionNote}>
          Tap a task to see plain-language guidance, penalty risk, and upload evidence.
        </AppText>
      </Card>

      <PrimaryButton label="Sign Out" variant="ghost" onPress={handleLogout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingText: { gap: 2 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#e6efe9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#c5d9cc",
  },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
  },
  statTasks: { backgroundColor: "#e6efe9", borderColor: "#c5d9cc" },
  statOverdue: { backgroundColor: "#fdf0ef", borderColor: "#f0c4c0" },
  statDrafts: { backgroundColor: "#fdf4e3", borderColor: "#edd9a8" },
  statNumber: { fontSize: 22, fontWeight: "800", color: "#2c2517" },
  statDanger: { color: "#b5332a" },
  statLabel: { color: "#7a7062", fontWeight: "600", fontSize: 11 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  filterRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd3be",
    backgroundColor: "#faf8f3",
  },
  filterTabActive: {
    backgroundColor: "#e6efe9",
    borderColor: "#3f6a52",
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7a7062",
  },
  filterLabelActive: {
    color: "#2d5740",
  },
  emptyState: { alignItems: "center", gap: 8, paddingVertical: 16 },
  emptyText: { textAlign: "center" },
  taskItem: { gap: 6, paddingVertical: 6 },
  taskTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  taskTitle: { flex: 1, fontWeight: "600", fontSize: 15 },
  taskBadges: { flexDirection: "column", gap: 4, alignItems: "flex-end" },
  taskMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  chevron: { marginLeft: "auto" },
  expandedDetail: {
    marginTop: 8,
    gap: 10,
  },
  detailSection: {
    gap: 4,
    backgroundColor: "#f9f6ef",
    padding: 12,
    borderRadius: 10,
  },
  detailSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  detailText: {
    lineHeight: 20,
  },
  penaltyBox: {
    backgroundColor: "#fdf8ec",
    borderWidth: 1,
    borderColor: "#edd9a8",
  },
  penaltyText: {
    lineHeight: 20,
    color: "#6b4f18",
  },
  // SCRUM-37: Evidence styles
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fffdf8",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e8e0cf",
  },
  attachmentInfo: {
    flex: 1,
    gap: 2,
  },
  attachmentName: {
    fontWeight: "600",
    color: "#2c2517",
  },
  removeBtn: {
    padding: 6,
  },
  uploadMsg: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  uploadMsgError: {
    backgroundColor: "#fdf0ef",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sessionNote: { textAlign: "center" },
});
