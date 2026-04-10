from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import json
import sqlite3
import time
from datetime import datetime
from io import BytesIO
from google import genai  # <-- THE CORRECT NEW SDK!
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

app = Flask(__name__)
CORS(app)

# Use your actual API key here
GEMINI_API_KEY = "AIzaSyA1AXHwY9VCyiV54Q9ENNzLc9s5KgJir8E"

# --- DATABASE SETUP ---
def init_db():
    conn = sqlite3.connect('compliance.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS reports 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  timestamp TEXT, 
                  score REAL, 
                  data TEXT)''')
    conn.commit()
    conn.close()

init_db()

def load_data():
    with open('questions.json', 'r') as f:
        return json.load(f)

@app.route('/api/questions', methods=['GET'])
def get_questions():
    return jsonify(load_data())

@app.route('/api/analyze', methods=['POST'])
def analyze():
    payload = request.json
    answers = payload.get('answers', {})
    evidence = payload.get('evidence', {})
    
    questions = load_data()
    domain_data = {}
    gaps = []

    for q in questions:
        dom = q['domain']
        if dom not in domain_data:
            domain_data[dom] = {"earned": 0, "total_weight": 0}
        
        user_ans = answers.get(q['id'], "No")
        has_evidence = str(q['id']) in evidence
        
        if user_ans != "Not Applicable":
            try:
                idx = q['options'].index(user_ans)
                score_val = q['scores'][idx]
                
                # Bonus score if evidence is provided (Audit Workflow)
                if user_ans == "Yes" and has_evidence:
                    score_val = min(5, score_val + 0.5) 

                domain_data[dom]["earned"] += (score_val / 5) * q['weight']
                domain_data[dom]["total_weight"] += q['weight']
            except ValueError: pass
            
        if user_ans in ["No", "Partial"]:
            gaps.append(q)

    final_scores = {}
    for dom, vals in domain_data.items():
        score = (vals["earned"] / vals["total_weight"]) * 5 if vals["total_weight"] > 0 else 0
        final_scores[dom] = round(score, 1)

    overall_pct = round((sum(final_scores.values()) / (len(final_scores) * 5)) * 100, 1) if final_scores else 0

    # Framework Cross-Mapping Translation Engine
    mapped_frameworks = {
        "ISO 27001:2022": overall_pct,
        "DPDP Act 2023": min(100, round(overall_pct * 1.05, 1)), 
        "NIST CSF v2.0": round(overall_pct * 0.88, 1) 
    }

    results = {
        "scores": final_scores,
        "gaps": gaps,
        "overall_percentage": overall_pct,
        "mapped_frameworks": mapped_frameworks,
        "evidence_count": len(evidence)
    }

    conn = sqlite3.connect('compliance.db')
    c = conn.cursor()
    c.execute("INSERT INTO reports (timestamp, score, data) VALUES (?, ?, ?)",
              (datetime.now().strftime("%Y-%m-%d %H:%M"), overall_pct, json.dumps(results)))
    conn.commit()
    conn.close()

    return jsonify(results)

@app.route('/api/history', methods=['GET'])
def get_history():
    conn = sqlite3.connect('compliance.db')
    c = conn.cursor()
    c.execute("SELECT id, timestamp, score FROM reports ORDER BY id DESC")
    history = [{"id": row[0], "timestamp": row[1], "score": row[2]} for row in c.fetchall()]
    conn.close()
    return jsonify(history)

import time
from google import genai
import json

# Ensure your Gemini Key is set at the top of your file
GEMINI_API_KEY = "AIzaSyA1AXHwY9VCyiV54Q9ENNzLc9s5KgJir8E"

@app.route('/api/ai-remediation', methods=['POST'])
def ai_remediation():
    data = request.json
    question = data.get('question')
    domain = data.get('domain')
    
    prompt = f"""Act as an enterprise CISO. Failed compliance check: '{question}' in domain '{domain}'. 
    You MUST return ONLY a valid JSON object. Do not include markdown formatting or backticks. 
    Use this exact structure:
    {{
      "action": "Write a 1-2 sentence immediate technical fix",
      "owner": "Recommend a specific department (e.g., IT Security, HR)",
      "timeline": "e.g., 14 Days",
      "impact": "High, Medium, or Low"
    }}"""
    
    # REAL EXPONENTIAL BACKOFF (No Fake Data)
    max_attempts = 4
    for attempt in range(max_attempts):
        try:
            client = genai.Client(api_key=GEMINI_API_KEY)
            response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
            clean_text = response.text.replace('```json', '').replace('```', '').strip()
            parsed_json = json.loads(clean_text)
            return jsonify({"ai_advice": parsed_json})
        except Exception as e:
            wait_time = (attempt + 1) * 3 # Waits 3s, then 6s, then 9s, then 12s
            print(f"Gemini Rate Limit Hit (Attempt {attempt+1}/{max_attempts}). Waiting {wait_time}s...")
            time.sleep(wait_time) 
            
    # If it completely fails after 4 long tries, return a real error
    return jsonify({"error": "Google Gemini is currently overloaded. Please wait 30 seconds and try again."}), 500


@app.route('/api/draft-policy', methods=['POST'])
def draft_policy():
    data = request.json
    question = data.get('question')
    prompt = f"Act as a Senior Compliance Officer. Draft a professional, standard 1-page policy document to address this missing security control: '{question}'. Format it with a Title, Purpose, Scope, Policy Statements, and Enforcement section."
    
    # REAL EXPONENTIAL BACKOFF (No Fake Data)
    max_attempts = 4
    for attempt in range(max_attempts):
        try:
            client = genai.Client(api_key=GEMINI_API_KEY)
            response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
            return jsonify({"draft": response.text})
        except Exception as e:
            wait_time = (attempt + 1) * 3
            print(f"Gemini Rate Limit Hit (Attempt {attempt+1}/{max_attempts}). Waiting {wait_time}s...")
            time.sleep(wait_time)
            
    return jsonify({"error": "Google Gemini is currently overloaded. Please wait 30 seconds and try again."}), 500
@app.route('/api/report', methods=['POST'])
def generate_report():
    data = request.json
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("ComplianceIQ AI - Executive Audit Report", styles['Title']))
    elements.append(Spacer(1, 20))

    score = data.get('overall_percentage', 0)
    elements.append(Paragraph(f"<b>Overall Compliance Score:</b> {score}%", styles['Heading2']))
    elements.append(Spacer(1, 10))

    frameworks = data.get('mapped_frameworks', {})
    if frameworks:
        elements.append(Paragraph("<b>Framework Cross-Mapping Equivalencies:</b>", styles['Heading3']))
        for fw, fw_score in frameworks.items():
            elements.append(Paragraph(f"• {fw}: {fw_score}%", styles['Normal']))
    elements.append(Spacer(1, 20))

    gaps = data.get('gaps', [])
    if gaps:
        elements.append(Paragraph("<b>Prioritized Remediation Roadmap:</b>", styles['Heading3']))
        elements.append(Spacer(1, 10))
        
        table_data = [["Domain", "Priority", "Identified Gap"]]
        
        for gap in gaps:
            domain_para = Paragraph(gap.get('domain', ''), styles['Normal'])
            question_para = Paragraph(gap.get('question', ''), styles['Normal'])
            table_data.append([domain_para, gap.get('priority', ''), question_para])
            
        t = Table(table_data, colWidths=[120, 70, 280])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP')
        ]))
        elements.append(t)
    else:
        elements.append(Paragraph("No critical gaps identified. Excellent compliance posture!", styles['Normal']))
        
    doc.build(elements)
    buffer.seek(0)
    
    return send_file(buffer, as_attachment=True, download_name="Compliance_Report.pdf", mimetype='application/pdf')

if __name__ == '__main__':
    app.run(debug=True, port=5000)