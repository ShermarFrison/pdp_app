import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/components/AppText";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Divider } from "@/components/Divider";
import { Field } from "@/components/Field";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useApp } from "@/context/AppContext";
import { TICKET_CATEGORIES } from "@/data/seed";
import { t } from "@/lib/i18n";
import { TicketStatus } from "@/types";

const statusBadge: Record<TicketStatus, "blue" | "amber" | "green"> = {
  open: "blue",
  in_progress: "amber",
  resolved: "green",
};

const statusLabel: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export default function HelpScreen() {
  const { helpTickets, submitHelpTicket, language } = useApp();
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [screenshotUri, setScreenshotUri] = useState("");
  const [feedback, setFeedback] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  async function handleSubmit() {
    if (!category) {
      setFeedback("Please select a category.");
      return;
    }

    if (!message.trim()) {
      setFeedback("Please describe your issue.");
      return;
    }

    const ticket = await submitHelpTicket(
      category,
      message.trim(),
      screenshotUri.trim() || undefined,
    );

    setFeedback(`Ticket submitted! Your confirmation ID: ${ticket.confirmationId}`);
    setCategory("");
    setMessage("");
    setScreenshotUri("");
  }

  function simulateScreenshot() {
    const uri = `file:///mock/screenshot_${Date.now()}.png`;
    setScreenshotUri(uri);
  }

  const isSuccess = feedback.includes("submitted");
  const isError = feedback.includes("Please");

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">{t("help.title", language)}</AppText>
        <AppText tone="muted">{t("help.subtitle", language)}</AppText>
      </View>

      <Card variant="elevated">
        <View style={styles.sectionHeader}>
          <Ionicons name="create-outline" size={16} color="#3f6a52" />
          <AppText variant="subtitle">{t("help.new_ticket", language)}</AppText>
        </View>

        {/* Category selector */}
        <AppText variant="label" tone="muted">Category</AppText>
        <View style={styles.categoryGrid}>
          {TICKET_CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
              onPress={() => setCategory(cat)}
            >
              <AppText
                variant="caption"
                style={[styles.categoryText, category === cat && styles.categoryTextActive]}
              >
                {cat}
              </AppText>
            </Pressable>
          ))}
        </View>

        <Field
          label="Describe your issue"
          value={message}
          multiline
          placeholder="What happened? What did you expect?"
          onChangeText={setMessage}
        />

        {/* Optional screenshot */}
        <View style={styles.screenshotSection}>
          <AppText variant="label" tone="muted">Screenshot (optional)</AppText>
          {screenshotUri ? (
            <View style={styles.screenshotPreview}>
              <Ionicons name="image-outline" size={16} color="#3f6a52" />
              <AppText variant="caption" tone="accent" style={{ flex: 1 }}>
                {screenshotUri.split("/").pop()}
              </AppText>
              <Pressable onPress={() => setScreenshotUri("")}>
                <Ionicons name="close-circle" size={16} color="#b5332a" />
              </Pressable>
            </View>
          ) : (
            <PrimaryButton
              label={t("help.attach_screenshot", language)}
              variant="ghost"
              compact
              onPress={simulateScreenshot}
            />
          )}
        </View>

        <PrimaryButton label={t("help.submit", language)} onPress={handleSubmit} />

        {feedback ? (
          <View style={[styles.feedbackBar, isSuccess ? styles.feedbackSuccess : isError ? styles.feedbackError : null]}>
            <Ionicons
              name={isSuccess ? "checkmark-circle" : "alert-circle"}
              size={16}
              color={isSuccess ? "#1f7a3f" : "#b5332a"}
            />
            <AppText
              variant="caption"
              tone={isSuccess ? "success" : "danger"}
              style={styles.feedbackText}
            >
              {feedback}
            </AppText>
          </View>
        ) : null}
      </Card>

      {/* Ticket history */}
      <Card>
        <Pressable style={styles.sectionHeader} onPress={() => setShowHistory(!showHistory)}>
          <Ionicons name="time-outline" size={16} color="#3f6a52" />
          <AppText variant="subtitle">{t("help.my_tickets", language)}</AppText>
          <Badge label={String(helpTickets.length)} color="gray" />
          <Ionicons
            name={showHistory ? "chevron-up" : "chevron-down"}
            size={16}
            color="#a09786"
            style={{ marginLeft: "auto" }}
          />
        </Pressable>

        {showHistory && (
          helpTickets.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="help-buoy-outline" size={24} color="#c4b79b" />
              <AppText variant="caption" tone="muted">No tickets submitted yet.</AppText>
            </View>
          ) : (
            helpTickets.map((ticket, index) => (
              <View key={ticket.id}>
                {index > 0 && <Divider />}
                <View style={styles.ticketItem}>
                  <View style={styles.ticketTopRow}>
                    <AppText variant="caption" style={styles.ticketId}>
                      {ticket.confirmationId}
                    </AppText>
                    <Badge label={statusLabel[ticket.status]} color={statusBadge[ticket.status]} />
                  </View>
                  <AppText variant="label" style={styles.ticketCategory}>
                    {ticket.category}
                  </AppText>
                  <AppText variant="caption" tone="muted" numberOfLines={2}>
                    {ticket.message}
                  </AppText>
                  <View style={styles.ticketMeta}>
                    <Ionicons name="time-outline" size={12} color="#a09786" />
                    <AppText variant="caption" tone="muted">
                      {ticket.createdAt.slice(0, 10)}
                    </AppText>
                    {ticket.screenshotUri && (
                      <>
                        <Ionicons name="image-outline" size={12} color="#a09786" />
                        <AppText variant="caption" tone="muted">Screenshot attached</AppText>
                      </>
                    )}
                  </View>
                </View>
              </View>
            ))
          )
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#ddd3be",
    backgroundColor: "#faf8f3",
  },
  categoryChipActive: {
    borderColor: "#3f6a52",
    backgroundColor: "#e6efe9",
  },
  categoryText: {
    fontWeight: "600",
    color: "#7a7062",
  },
  categoryTextActive: {
    color: "#2d5740",
    fontWeight: "700",
  },
  screenshotSection: {
    gap: 6,
  },
  screenshotPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#e6efe9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  feedbackBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  feedbackSuccess: {
    backgroundColor: "#e3f3e8",
    borderColor: "#b2dbc2",
  },
  feedbackError: {
    backgroundColor: "#fdf0ef",
    borderColor: "#f0c4c0",
  },
  feedbackText: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
  },
  ticketItem: {
    gap: 4,
    paddingVertical: 8,
  },
  ticketTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  ticketId: {
    fontWeight: "700",
    color: "#3f6a52",
    fontFamily: "monospace",
    fontSize: 12,
  },
  ticketCategory: {
    fontWeight: "600",
    color: "#2c2517",
  },
  ticketMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
