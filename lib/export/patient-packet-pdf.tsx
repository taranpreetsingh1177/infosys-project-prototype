import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { PatientPacket } from "@/lib/export/patient-packet-data";

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
    lineHeight: 1.45,
  },
  brand: {
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#555555",
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#444444",
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#dddddd",
  },
  metaItem: {
    minWidth: "28%",
  },
  metaLabel: {
    fontSize: 8,
    color: "#666666",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#cccccc",
  },
  body: {
    fontSize: 10,
    marginBottom: 6,
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 4,
  },
  bulletMark: {
    width: 12,
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
  },
  insightNote: {
    fontSize: 8,
    color: "#666666",
    fontStyle: "italic",
    marginBottom: 4,
  },
  insightBlock: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: "#f7f7f7",
  },
  insightTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    fontSize: 8,
    color: "#888888",
    textAlign: "center",
  },
  empty: {
    fontSize: 10,
    color: "#777777",
    fontStyle: "italic",
  },
});

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <Text style={styles.empty}>None recorded for this visit.</Text>;
  }
  return (
    <>
      {items.map((item, index) => (
        <View key={`${index}-${item.slice(0, 24)}`} style={styles.bullet}>
          <Text style={styles.bulletMark}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </>
  );
}

function PatientPacketDocument({ packet }: { packet: PatientPacket }) {
  return (
    <Document
      title={`Visit summary — ${packet.patientName}`}
      author="Clinical Scribe"
      subject="Patient visit summary"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>Visit summary</Text>
        <Text style={styles.title}>{packet.patientName}</Text>
        <Text style={styles.subtitle}>
          Shareable summary of your clinical visit. Discuss any questions with
          your clinician.
        </Text>

        <View style={styles.metaRow}>
          <MetaItem label="Visit date" value={packet.visitDate} />
          <MetaItem label="Visit type" value={packet.visitType} />
          {packet.mrn ? <MetaItem label="MRN" value={packet.mrn} /> : null}
          {packet.dateOfBirth ? (
            <MetaItem label="Date of birth" value={packet.dateOfBirth} />
          ) : null}
        </View>

        {packet.soap.map((section) => (
          <View key={section.title} style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.narrative.trim() ? (
              <Text style={styles.body}>{section.narrative.trim()}</Text>
            ) : (
              <Text style={styles.empty}>No narrative for this section.</Text>
            )}
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key findings</Text>
          <BulletList items={packet.keyFindings.map((f) => f.text)} />
        </View>

        {packet.insights.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Points for discussion</Text>
            <Text style={styles.insightNote}>
              For discussion with your clinician — these are decision-support
              notes, not a diagnosis.
            </Text>
            {packet.insights.map((insight, index) => (
              <View
                key={`${insight.title}-${index}`}
                style={styles.insightBlock}
                wrap={false}
              >
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.body}>{insight.summary}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.footer} fixed>
          Generated for patient sharing · Not a complete medical record · Page{" "}
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} of ${totalPages}`
            }
          />
        </Text>
      </Page>
    </Document>
  );
}

export async function renderPatientPacketPdf(
  packet: PatientPacket,
): Promise<Buffer> {
  // @react-pdf's renderToBuffer types expect DocumentProps on the root element.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(<PatientPacketDocument packet={packet} /> as any);
}
