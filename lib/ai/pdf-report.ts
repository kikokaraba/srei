/**
 * AI Property Report - PDF generation
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ValuationResult } from "./valuation";

const formatPrice = (n: number) =>
  new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

interface PropertyForReport {
  id: string;
  title: string;
  city: string;
  district: string;
  address: string;
  price: number;
  area_m2: number;
  price_per_m2: number;
  rooms: number | null;
  floor: number | null;
  condition: string;
  source: string;
}

export function generatePropertyReportPDF(
  property: PropertyForReport,
  valuation: ValuationResult
): Uint8Array {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("SRIA - AI Property Report", pageWidth / 2, y, { align: "center" });
  y += 12;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(property.title, pageWidth / 2, y, { align: "center" });
  y += 6;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`${property.district}, ${property.city} | ${property.address}`, pageWidth / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y += 18;

  // Valuation result
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("AI Odhadovaná hodnota", 14, y);
  y += 10;

  doc.setFontSize(24);
  doc.setTextColor(34, 197, 94); // emerald
  doc.text(formatPrice(valuation.estimatedPrice), 14, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `€${valuation.pricePerM2.toLocaleString()}/m² | Rozsah: ${formatPrice(valuation.priceRange.low)} - ${formatPrice(valuation.priceRange.high)}`,
    14,
    y
  );
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Spoľahlivosť: ${valuation.confidence.toUpperCase()} (${valuation.confidenceScore}/100) | ${valuation.comparables.count} podobných nehnuteľností`, 14, y);
  doc.setTextColor(0, 0, 0);
  y += 16;

  // Analysis
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Analýza", 14, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const analysisLines = doc.splitTextToSize(valuation.analysis, pageWidth - 28);
  doc.text(analysisLines, 14, y);
  y += analysisLines.length * 5 + 4;

  if (valuation.marketInsight) {
    const insightLines = doc.splitTextToSize(valuation.marketInsight, pageWidth - 28);
    doc.text(insightLines, 14, y);
    y += insightLines.length * 5 + 8;
  }

  // Factors
  if (valuation.factors.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Faktory ovplyvňujúce cenu", 14, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [["Faktor", "Vplyv", "Popis"]],
      body: valuation.factors.map((f) => [
        f.factor,
        f.impact === "positive" ? "+" : f.impact === "negative" ? "-" : "0",
        f.description,
      ]),
      theme: "striped",
      headStyles: { fillColor: [55, 65, 81] },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
      columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 15 }, 2: { cellWidth: "auto" } },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  // Comparables summary
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Porovnateľné nehnuteľnosti", 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Priemer: ${formatPrice(valuation.comparables.avgPrice)} | Priem. €/m²: ${formatPrice(valuation.comparables.avgPricePerM2)} | Rozsah: ${formatPrice(valuation.comparables.priceRange.min)} - ${formatPrice(valuation.comparables.priceRange.max)}`,
    14,
    y
  );
  y += 16;

  // Warnings
  if (valuation.warnings.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(180, 80, 80);
    doc.text("Varovania:", 14, y);
    y += 6;
    valuation.warnings.forEach((w) => {
      const lines = doc.splitTextToSize(`• ${w}`, pageWidth - 28);
      doc.text(lines, 14, y);
      y += lines.length * 5;
    });
    doc.setTextColor(0, 0, 0);
    y += 6;
  }

  // Disclaimer
  y = doc.internal.pageSize.getHeight() - 25;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "AI nástroje poskytujú orientačné analýzy. Pred investičným rozhodnutím odporúčame konzultovať s odborníkom. SRIA s.r.o.",
    14,
    y,
    { align: "center", maxWidth: pageWidth - 28 }
  );
  doc.text(
    `Vygenerované: ${new Date().toLocaleString("sk-SK")}`,
    pageWidth / 2,
    y + 8,
    { align: "center" }
  );
  doc.setTextColor(0, 0, 0);

  const buf = doc.output("arraybuffer");
  return new Uint8Array(buf instanceof ArrayBuffer ? buf : (buf as unknown as ArrayBuffer));
}
