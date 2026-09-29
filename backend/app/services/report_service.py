"""
Forensic PDF Report Generator using ReportLab.
Produces an audit-ready dossier containing video properties, prediction, multimodal breakdown,
suspicious timestamps, and Grad-CAM visual evidence.
"""

import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from backend.app.utils.paths import HEATMAPS_DIR

class ForensicReportService:
    @staticmethod
    def generate_pdf_report(analysis_dict: dict, output_pdf_path: str) -> str:
        os.makedirs(os.path.dirname(output_pdf_path), exist_ok=True)
        doc = SimpleDocTemplate(output_pdf_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            'DocSubtitle',
            parent=styles['Normal'],
            fontSize=11,
            leading=14,
            textColor=colors.HexColor('#64748b'),
            spaceAfter=12
        )
        section_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#1e293b'),
            spaceBefore=10,
            spaceAfter=6
        )
        normal_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontSize=10,
            leading=13,
            textColor=colors.HexColor('#334155')
        )
        badge_style = ParagraphStyle(
            'Badge',
            parent=styles['Normal'],
            fontSize=16,
            leading=20,
            alignment=1, # Centered
            textColor=colors.HexColor('#dc2626') if analysis_dict.get('prediction') == 'FAKE' else colors.HexColor('#16a34a')
        )

        elements = []

        # 1. Header
        elements.append(Paragraph("NEURAL FACIAL MEDIA FORENSICS", title_style))
        elements.append(Paragraph("Temporal-Spectral Inconsistency Modeling Audit Report", subtitle_style))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#cbd5e1'), spaceAfter=14))

        # 2. Executive Summary Box
        pred = analysis_dict.get("prediction", "UNKNOWN")
        conf = analysis_dict.get("confidence", 0.0) * 100.0
        anl_id = analysis_dict.get("id", "ANL-SAMPLE")
        meta = analysis_dict.get("metadata", {})

        summary_data = [
            [
                Paragraph(f"<b>Audit ID:</b> {anl_id}<br/><b>Filename:</b> {analysis_dict.get('filename', 'video.mp4')}<br/><b>Resolution:</b> {meta.get('width', 0)}x{meta.get('height', 0)} ({meta.get('fps', 0)} FPS)<br/><b>Duration:</b> {meta.get('duration', 0)} sec", normal_style),
                Paragraph(f"<b>FINAL FORENSIC VERDICT:</b><br/><br/><b>{pred}</b><br/>Confidence: {conf:.1f}%", badge_style)
            ]
        ]
        t_summary = Table(summary_data, colWidths=[320, 220])
        t_summary.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
            ('PADDING', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(t_summary)
        elements.append(Spacer(1, 14))

        # 3. Multimodal Analysis Breakdown
        elements.append(Paragraph("Multimodal Anomaly Breakdown", section_style))
        sp_score = analysis_dict.get("spatial", {}).get("score", 0.0) * 100.0
        tm_score = analysis_dict.get("temporal", {}).get("score", 0.0) * 100.0
        au_score = analysis_dict.get("audio", {}).get("score", 0.0) * 100.0
        sy_score = analysis_dict.get("sync", {}).get("score", 0.0)
        sy_status = analysis_dict.get("sync", {}).get("status", "N/A")

        fb = analysis_dict.get("facial_behavior", {})
        blink_s = fb.get("blink", 0.0) * 100.0
        gaze_s = fb.get("gaze", 0.0) * 100.0
        lip_s = fb.get("lip", 0.0) * 100.0

        table_data = [
            ["Forensic Dimension", "Metric / Description", "Anomaly Score", "Assessment"],
            ["Spatial Appearance", "EfficientNet-B4 + 2D FFT Spectral Profile", f"{sp_score:.1f}%", "High Anomaly" if sp_score > 50 else "Nominal"],
            ["Temporal Sequence", "Bi-LSTM Inter-frame Inconsistency", f"{tm_score:.1f}%", "High Anomaly" if tm_score > 50 else "Nominal"],
            ["Acoustic Branch", "Wav2Vec 2.0 Speech Feature Anomaly", f"{au_score:.1f}%", "Anomalous" if au_score > 50 else "Nominal"],
            ["Audio-Visual Sync", f"Lip-Speech Cross-Modal Correlation ({sy_score:.2f})", sy_status.replace('_', ' ').title(), "Mismatch Detected" if sy_score < 0.5 else "In-Sync"],
            ["Eye Blink Dynamics", f"Mean EAR: {fb.get('mean_ear', 0.0):.3f}", f"{blink_s:.1f}%", "Abnormal" if blink_s > 50 else "Normal"],
            ["Gaze & Fixation", "Conjugate Eye Alignment / Pupil Deviation", f"{gaze_s:.1f}%", "Abnormal" if gaze_s > 50 else "Normal"],
            ["Lip Motion Dynamics", f"Mean MAR: {fb.get('mean_mar', 0.0):.3f}", f"{lip_s:.1f}%", "Abnormal" if lip_s > 50 else "Normal"]
        ]

        t_breakdown = Table(table_data, colWidths=[130, 200, 90, 120])
        t_breakdown.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ]))
        elements.append(t_breakdown)
        elements.append(Spacer(1, 14))

        # 4. Grad-CAM Explainability Section
        elements.append(Paragraph("Grad-CAM Spatial Evidence & Suspicious Regions", section_style))
        heatmaps = analysis_dict.get("heatmaps", [])
        
        img_row = []
        for hm in heatmaps[:2]: # Show up to 2 heatmaps
            rel_url = hm.get("image_url", "")
            # Map /results/heatmaps/xyz.jpg to physical file
            filename = os.path.basename(rel_url)
            full_img_path = os.path.join(str(HEATMAPS_DIR), filename)
            if os.path.exists(full_img_path):
                img_row.append([
                    RLImage(full_img_path, width=200, height=200),
                    Paragraph(f"<b>Frame {hm.get('frame', 0)}</b><br/>Timestamp: {hm.get('timestamp', 0):.2f}s<br/>Anomaly: {hm.get('anomaly_score', 0):.2f}<br/><i>Grad-CAM highlights facial manipulation boundaries and blending seams.</i>", normal_style)
                ])

        if img_row:
            t_imgs = Table(img_row, colWidths=[210, 330])
            t_imgs.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(t_imgs)
        else:
            elements.append(Paragraph("No significant visual anomaly detected or heatmaps pending.", normal_style))

        elements.append(Spacer(1, 14))

        # 5. Conclusion & Timestamp
        elements.append(Paragraph("Investigative Conclusion", section_style))
        verdict_text = (
            f"The analyzed media file <b>{analysis_dict.get('filename')}</b> exhibits characteristics consistent with "
            f"<b>{pred}</b> media with a system confidence score of <b>{conf:.1f}%</b>. "
            f"The primary contributing factors include spatial anomaly score of {sp_score:.1f}%, "
            f"temporal inconsistency of {tm_score:.1f}%, and audio-visual synchronization status of '{sy_status}'."
        )
        elements.append(Paragraph(verdict_text, normal_style))
        elements.append(Spacer(1, 10))
        elements.append(Paragraph(f"Report Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')} | IEEE Research Media Forensics Framework", subtitle_style))

        # Build PDF
        doc.build(elements)
        return output_pdf_path
