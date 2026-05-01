import os
import pdfplumber

class PDFKnowledgeBase:
    def __init__(self):
        self.data_dir = os.path.join(os.path.dirname(__file__), 'data')
        
        self.structured_data = {
            "quarterly_executive_report": { "kpis": "", "top_10_titles": "", "risks": "", "strategic_recs": "" },
            "campaign_performance":       { "channel_breakdown": "", "stellar_run_phases": "", "comedy_analysis": "" },
            "content_roadmap":            { "genre_priority": "", "release_calendar": "", "franchise_candidates": "" },
            "policy_guidelines":          { "data_tiers": "", "compliance": "", "ai_tool_rules": "", "comedy_audit": "" },
            "audience_behavior":          { "demographics": "", "genre_affinity": "", "device_patterns": "", "peak_hours": "" }
        }
        
        self.pdf_mapping = {
            "quarterly_executive_report_Q1_2025.pdf": "quarterly_executive_report",
            "campaign_performance_summary.pdf": "campaign_performance",
            "content_roadmap_H2_2025.pdf": "content_roadmap",
            "policy_guidelines.pdf": "policy_guidelines",
            "audience_behavior_report_Q1_2025.pdf": "audience_behavior"
        }
        
        self.load_pdfs()

    def _extract_text_from_pdf(self, filename: str) -> str:
        filepath = os.path.join(self.data_dir, filename)
        if not os.path.exists(filepath):
            return ""
        
        text = ""
        try:
            with pdfplumber.open(filepath) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            print(f"Warning: Could not read {filename} - {e}")
        return text

    def load_pdfs(self):
        """Extracts text from all 5 PDFs and maps content into the structured dict."""
        for filename, doc_key in self.pdf_mapping.items():
            full_text = self._extract_text_from_pdf(filename)
            if not full_text:
                continue
                
            sections = list(self.structured_data[doc_key].keys())
            
            # Heuristic parser: Search for section names in text and slice the document
            lower_text = full_text.lower()
            positions = {}
            
            for sec in sections:
                # Convert 'top_10_titles' -> 'top 10 titles'
                search_term = sec.replace("_", " ")
                idx = lower_text.find(search_term)
                if idx != -1:
                    positions[sec] = idx
            
            parsed_sections = {sec: "" for sec in sections}
            
            if positions:
                # Sort discovered sections by their appearance index
                sorted_secs = sorted(positions.items(), key=lambda item: item[1])
                for i in range(len(sorted_secs)):
                    current_sec = sorted_secs[i][0]
                    start_idx = sorted_secs[i][1]
                    end_idx = sorted_secs[i+1][1] if i + 1 < len(sorted_secs) else len(full_text)
                    
                    parsed_sections[current_sec] = full_text[start_idx:end_idx].strip()
            else:
                # Fallback: if explicit headers are missing, dump everything into the first section
                parsed_sections[sections[0]] = full_text.strip()
                
            # Populate structured data with parsed text
            for sec in sections:
                if parsed_sections[sec]:
                    self.structured_data[doc_key][sec] = parsed_sections[sec]

    def build_context_string(self) -> str:
        """Returns a compact string summarizing the most decision-relevant facts."""
        context_parts = []
        
        # Enforce compactness by limiting characters per section to keep total below 3000 tokens
        # 3000 tokens ≈ 12000 chars. We have ~19 total subsections. ~500 chars/subsection max.
        max_chars_per_section = 500
        
        for doc_name, sections in self.structured_data.items():
            doc_context = [f"[{doc_name.upper()}]"]
            has_content = False
            
            for sec_name, sec_text in sections.items():
                if sec_text:
                    has_content = True
                    clean_text = sec_text.replace("\n", " ")
                    clean_text = " ".join(clean_text.split()) # Remove multi-spaces
                    truncated = clean_text[:max_chars_per_section]
                    if len(clean_text) > max_chars_per_section:
                        truncated += "..."
                        
                    doc_context.append(f"{sec_name}: {truncated}")
            
            if has_content:
                context_parts.append(" | ".join(doc_context))
                
        return "\n\n".join(context_parts)

    def get_policy_guardrails(self) -> list:
        """Returns the T1-T4 data classification rules and AI tool usage rules as a list of strings."""
        guardrails = []
        policy_data = self.structured_data.get("policy_guidelines", {})
        
        data_tiers = policy_data.get("data_tiers", "")
        if data_tiers:
            guardrails.append(f"DATA TIERS GUARDRAIL: {data_tiers[:1000]}")
        else:
            # Hardcoded safety fallback if PDF is missing
            guardrails.append("DATA TIERS GUARDRAIL: Adhere strictly to T1 (Public), T2 (Internal), T3 (Confidential), and T4 (Restricted) classifications.")
            
        ai_rules = policy_data.get("ai_tool_rules", "")
        if ai_rules:
            guardrails.append(f"AI USAGE GUARDRAIL: {ai_rules[:1000]}")
        else:
            # Hardcoded safety fallback if PDF is missing
            guardrails.append("AI USAGE GUARDRAIL: Never expose PII or T4 data to external LLMs. Comply with internal security checks.")
            
        return guardrails

# Singleton exposed to other modules
knowledge_base = PDFKnowledgeBase()
