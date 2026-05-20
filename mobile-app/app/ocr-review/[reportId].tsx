import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { AppText } from "@/components/AppText";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useApp } from "@/context/AppContext";
import { t } from "@/lib/i18n";
import { extractFromFile } from "@/lib/ocr";
import { ExtractionResult, OcrApplyMap } from "@/types";

export default function OcrReviewScreen() {
  const router = useRouter();
  const { reportId, uri, fileName } = useLocalSearchParams<{
    reportId: string;
    uri: string;
    fileName: string;
  }>();
  const { language, applyOcrExtractionV2 } = useApp();

  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [docType, setDocType] = useState("");
  const [docDate, setDocDate] = useState("");
  const [refId, setRefId] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!uri || !fileName) return;
    (async () => {
      const r = await extractFromFile(String(uri), String(fileName));
      setResult(r);
      setDocType(r.documentType.value);
      setDocDate(r.documentDate.value);
      setRefId(r.referenceId.value);
      setBusy(false);
    })();
  }, [uri, fileName]);

  async function handleApply() {
    if (!result || !reportId) return;
    const sourceMap: OcrApplyMap = {
      documentType: docType === result.documentType.value ? "extracted" : "edited",
      documentDate: docDate === result.documentDate.value ? "extracted" : "edited",
      referenceId: refId === result.referenceId.value ? "extracted" : "edited",
    };
    await applyOcrExtractionV2(
      String(reportId),
      result,
      { documentType: docType, documentDate: docDate, referenceId: refId },
      sourceMap,
    );
    router.replace("/(tabs)/reports");
  }

  function handleCancel() {
    router.back();
  }

  if (busy || !result) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color="#3f6a52" />
          <AppText tone="muted">{t("ocr.review_title", language)}…</AppText>
        </View>
      </Screen>
    );
  }

  const lowDocType = result.documentType.confidence < 0.7;
  const lowDocDate = result.documentDate.confidence < 0.7;
  const lowRefId = result.referenceId.confidence < 0.7;

  return (
    <Screen>
      <Card>
        <View style={styles.header}>
          <Ionicons name="scan-outline" size={18} color="#2a5a8a" />
          <AppText variant="subtitle">{t("ocr.review_title", language)}</AppText>
        </View>
        <AppText variant="caption" tone="muted">
          {t("ocr.extracted_from", language)}: {result.sourceFileName}
        </AppText>

        <View style={styles.fieldRow}>
          <Field
            label={t("ocr.document_type", language)}
            value={docType}
            onChangeText={setDocType}
            testID="field-documentType"
          />
          {lowDocType && (
            <View testID="badge-documentType-low">
              <Badge label={t("ocr.low_confidence", language)} color="amber" />
            </View>
          )}
        </View>

        <View style={styles.fieldRow}>
          <Field
            label={t("ocr.document_date", language)}
            value={docDate}
            onChangeText={setDocDate}
            testID="field-documentDate"
          />
          {lowDocDate && (
            <View testID="badge-documentDate-low">
              <Badge label={t("ocr.low_confidence", language)} color="amber" />
            </View>
          )}
        </View>

        <View style={styles.fieldRow}>
          <Field
            label={t("ocr.reference_id", language)}
            value={refId}
            onChangeText={setRefId}
            testID="field-referenceId"
          />
          {lowRefId && (
            <View testID="badge-referenceId-low">
              <Badge label={t("ocr.low_confidence", language)} color="amber" />
            </View>
          )}
        </View>

        <PrimaryButton label={t("ocr.confirm_apply", language)} onPress={handleApply} testID="apply" />
        <PrimaryButton label={t("ocr.cancel", language)} variant="ghost" onPress={handleCancel} testID="cancel" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { gap: 12, alignItems: "center", paddingTop: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  fieldRow: { gap: 4 },
});
