from fpdf import FPDF
import os
import uuid
from datetime import datetime
import hashlib
from typing import Dict, Any, Tuple

class LegalPackBuilder:
    def __init__(self, storage_dir: str = "artifacts"):
        self.storage_dir = storage_dir
        if not os.path.exists(self.storage_dir):
            os.makedirs(self.storage_dir)

    def _generate_generic_pdf(self, title: str, filename: str, content: list) -> Tuple[str, str]:
        pdf = FPDF()
        pdf.add_page()
        
        # Header
        pdf.set_font("Arial", 'B', 16)
        pdf.cell(200, 10, txt=title, ln=True, align='C')
        
        pdf.set_font("Arial", 'I', 10)
        pdf.cell(200, 10, txt=f"Generated securely by PayGuard OS - {datetime.now().strftime('%Y-%m-%d %H:%M')}", ln=True, align='C')
        pdf.ln(10)
        
        # Body
        pdf.set_font("Arial", size=11)
        for line in content:
            pdf.multi_cell(0, 8, txt=line)
            pdf.ln(2)
            
        filepath = os.path.join(self.storage_dir, filename)
        pdf.output(filepath)
        
        # Calculate SHA256 Integrity Hash
        with open(filepath, "rb") as f:
            file_hash = hashlib.sha256(f.read()).hexdigest()
            
        return filepath, file_hash

    def build_bank_dispute(self, data: Dict[str, Any]) -> str:
        amount = data.get("amount", "Unknown")
        destination = data.get("destination_account", "Unknown")
        platform = data.get("platform", "Unknown")
        
        content = [
            f"SUBJECT: URGENT: Fraudulent Transaction Dispute Request",
            f"Dear Dispute Escalation Team,",
            f"This acts as formal notification of an unauthorized and fraudulent transaction execution.",
            f"",
            f"INCIDENT DETAILS:",
            f"- Extracted Transfer Amount: INR {amount}",
            f"- Identified Fraud Platform: {platform}",
            f"- Target Mule Account: {destination}",
            f"",
            f"Legal Ordinance: Under RBI Circular on Customer Liability in Unauthorized Electronic Banking Transactions,",
            f"I command an immediate administrative lien and shadow freeze on the destination account pending investigation.",
            f"",
            f"Please attach this trace log to your internal ticketing system immediately."
        ]
        
        filename = f"bank_dispute_{uuid.uuid4().hex[:6]}.pdf"
        filepath, file_hash = self._generate_generic_pdf("BANK DISPUTE FORM", filename, content)
        return {"path": filepath, "hash": file_hash}
        
    def build_fir_draft(self, data: Dict[str, Any]) -> str:
        fraud_type = data.get("fraud_type", "Cyber Fraud")
        
        content = [
            f"TO: The Officer-In-Charge, Cyber Crime Cell",
            f"SUBJECT: First Information Report (FIR) Draft for {fraud_type}",
            f"",
            f"This draft is automatically synthesized using forensic data extracted securely via PayGuard Engine.",
            f"We hereby report a cyber fraud incident involving the extraction of funds.",
            f"",
            f"TECHNICAL TELEMETRY:",
            f"- Signature Matched: {fraud_type}",
            f"- Financial Velocity: High",
            f"",
            f"Please register this incident under Section 420 of the IPC and Section 66D of the IT Act."
        ]
        
        filename = f"cyber_fir_{uuid.uuid4().hex[:6]}.pdf"
        filepath, file_hash = self._generate_generic_pdf("CYBERCRIME FIR DRAFT", filename, content)
        return {"path": filepath, "hash": file_hash}
