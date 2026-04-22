import jsPDF from "jspdf";
import { format } from "date-fns";
import { toast } from "sonner";
import { ROBOTO_REGULAR } from "./fonts";

interface ScanData {
  score?: number | null;
  overall_score?: number | null;
  hydration?: number | null;
  oiliness?: number | null;
  oily_score?: number | null;
  sensitivity?: number | null;
  dry_score?: number | null;
  skin_type?: string | null;
  primary_concern?: string | null;
  created_at: string;
}

interface ReportParams {
  profileName: string;
  cityName?: string | null;
  scans: ScanData[];
  language: string;
}

export async function generateSkinReport({ profileName, cityName, scans, language }: ReportParams) {
  const isRu = language === "ru";
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  
  // 1. FINAL BOSS FONT REGISTRATION (USING LOCAL BASE64)
  try {
    doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.setFont("Roboto", "normal");
  } catch (err) {
    console.error("Font registration error:", err);
  }

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Header Title
  doc.setFont("Roboto", "normal"); // Use Roboto for both RU and EN to be safe
  doc.setFontSize(18);
  doc.text("SkinTrack AI", margin, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(isRu ? "Отчёт о состоянии кожи" : "Skin Condition Report", margin, 27);
  doc.text(format(new Date(), "dd.MM.yyyy"), pageW - margin, 27, { align: "right" });

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, 31, pageW - margin, 31);

  // Patient Info
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.text(isRu ? "Пациент:" : "Patient:", margin, 40);
  doc.text(String(profileName || "—"), margin + 25, 40);

  if (cityName) {
    doc.text(isRu ? "Город:" : "City:", margin, 46);
    doc.text(String(cityName), margin + 25, 46);
  }

  doc.text(isRu ? "Всего сканов:" : "Total scans:", margin, 52);
  doc.text(String(scans?.length || 0), margin + 35, 52);

  let y = 65;
  doc.setFontSize(12);
  doc.text(isRu ? "История замеров:" : "Measurements History:", margin, y);
  y += 10;
  
  doc.setFontSize(9);
  
  (scans || []).forEach((scan, index) => {
    if (y > pageH - 20) {
      doc.addPage();
      y = 20;
    }

    const date = scan.created_at ? new Date(scan.created_at).toLocaleDateString() : '---';
    const score = scan.overall_score || scan.score || 0;
    const type = scan.skin_type || '-';
    
    // Explicit label logic to ensure we see WHAT is being rendered
    const labelDate = isRu ? "Дата" : "Date";
    const labelScore = isRu ? "Балл" : "Score";
    const labelType = isRu ? "Тип" : "Type";

    const line = `${index + 1}. ${labelDate}: ${date} | ${labelScore}: ${score} | ${labelType}: ${type}`;
    
    doc.text(line, margin, y);
    y += 7;
  });

  y += 10;
  if (y > pageH - 30) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  
  doc.setFontSize(7.5);
  doc.setTextColor(120);
  doc.text(
    isRu
      ? "Этот отчёт носит информационный характер и не является медицинским диагнозом."
      : "This report is for informational purposes only and does not constitute a medical diagnosis.",
    margin,
    y + 6,
    { maxWidth: pageW - margin * 2 }
  );

  const pdfBlob = doc.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);
  const fileName = `skintrack-report-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  const link = document.createElement("a");
  link.href = blobUrl; link.download = fileName; link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(blobUrl); }, 1000);
}
