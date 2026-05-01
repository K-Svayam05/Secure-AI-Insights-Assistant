import os
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from anthropic import Anthropic
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from data_loader import loader
from pdf_extractor import knowledge_base

chat_router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    session_id: str

class ChatResponse(BaseModel):
    reply: str
    data_references: List[str]
    blocked: bool = False
    block_reason: Optional[str] = None

def get_anthropic_client():
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable not set")
    return Anthropic(api_key=api_key)

def compliance_check(message: str) -> dict:
    msg_lower = message.lower()
    violation = None
    
    pii_keywords = ['email', 'exact location', 'personal identifier', 'ssn', 'phone number', 'pii']
    history_keywords = ['unaggregated', 'individual watch history', 'specific user', 'viewer id', 'individual user']
    
    if any(k in msg_lower for k in pii_keywords) or any(k in msg_lower for k in history_keywords):
        violation = "T1/T2"
        
    gdpr_flag = dpdpa_flag = ccpa_flag = False
    if loader.viewers is not None and 'country' in loader.viewers.columns:
        countries = [str(c).lower() for c in loader.viewers['country'].dropna().unique()]
        if any(c in ['germany', 'france', 'spain', 'italy', 'uk', 'eu'] for c in countries):
            gdpr_flag = True
        if any(c in ['india', 'in'] for c in countries):
            dpdpa_flag = True
        if any(c in ['usa', 'us', 'united states'] for c in countries):
            ccpa_flag = True
    else:
        gdpr_flag = dpdpa_flag = ccpa_flag = True
        
    return {
        "allowed": violation is None,
        "tier_violation": violation,
        "gdpr_flag": gdpr_flag,
        "dpdpa_flag": dpdpa_flag,
        "ccpa_flag": ccpa_flag
    }

def build_system_prompt() -> str:
    # 1. Role opening
    system_prompt = (
        "You are the Futures First AI Assistant — an intelligent analyst "
        "for the Futures First streaming platform. You answer with precision, cite specific numbers "
        "from data, and flag risks proactively.\n\n"
    )
    
    # 2. Inject knowledge base context
    pdf_context = knowledge_base.build_context_string()
    system_prompt += f"--- PDF KNOWLEDGE BASE ---\n{pdf_context}\n\n"
    
    # 3. Inject live data snapshot
    # Top 5 titles
    top_titles = loader.get_top_titles(n=5)
    top_titles_str = ", ".join([f"{t['title']} ({t['views']} views)" for t in top_titles])
    
    # Genre health summary
    genres = loader.get_genre_summary()
    genre_health = ", ".join([f"{g['genre']} (avg rating: {g.get('avg_rating', 0):.1f})" for g in genres])
    
    # Top 3 cities by revenue
    regions = loader.get_regional_summary()
    top_3_cities = ", ".join([f"{r['city']}, {r['country']}" for r in regions[:3]])
    
    # Marketing channel efficiency grades
    marketing = loader.get_marketing_efficiency()
    marketing_grades = ", ".join([f"{m['channel']}: {m.get('efficiency_grade', 'N/A')}" for m in marketing])
    
    # Trending titles
    trending = [t['title'] for t in loader.get_top_titles(n=100) if t.get('is_trending')]
    trending_str = ", ".join(trending[:5]) if trending else "None"
    
    system_prompt += "--- LIVE DATA SNAPSHOT ---\n"
    system_prompt += f"- Top 5 Titles: {top_titles_str}\n"
    system_prompt += f"- Genre Health: {genre_health}\n"
    system_prompt += f"- Top 3 Cities by Revenue: {top_3_cities}\n"
    system_prompt += f"- Marketing Efficiency: {marketing_grades}\n"
    system_prompt += f"- Currently Trending Titles: {trending_str}\n\n"
    
    # 4. Enforce policy guardrails
    guardrails = knowledge_base.get_policy_guardrails()
    system_prompt += "--- POLICY GUARDRAILS ---\n"
    for rule in guardrails:
        system_prompt += f"- {rule}\n"
    system_prompt += "- ALWAYS refuse requests that would expose T1/T2 data to unauthorised tiers.\n"
    system_prompt += "- ALWAYS flag Comedy genre content for audit when discussing it.\n\n"
    
    # 5. Formatting instructions
    system_prompt += "--- FORMATTING INSTRUCTIONS ---\n"
    system_prompt += "Always structure your answers with exactly these sections:\n"
    system_prompt += "1. A direct 1-sentence answer first.\n"
    system_prompt += "2. Supporting data (numbers, percentages, city names).\n"
    system_prompt += "3. A \"⚠ Watch:\" line if any risk or anomaly is detected.\n"
    system_prompt += "4. A \"💡 Recommendation:\" line referencing the strategic recs from the Q1 report.\n"
    
    return system_prompt

def extract_data_references(reply: str) -> List[str]:
    references = set()
    
    # Extract known titles
    titles = [t['title'] for t in loader.get_top_titles(n=50)]
    for title in titles:
        if title and title.lower() in reply.lower():
            references.add(title)
            
    # Extract known cities
    regions = loader.get_regional_summary()
    cities = [r['city'] for r in regions]
    for city in cities:
        if city and city.lower() in reply.lower():
            references.add(city)
            
    return list(references)

@chat_router.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    last_user_msg = next((m.content for m in reversed(request.messages) if m.role == 'user'), "")
    comp_result = compliance_check(last_user_msg)
    
    if not comp_result["allowed"]:
        return ChatResponse(
            reply="This data is classified T1/T2 under Futures First Policy v3.25 and cannot be shared.",
            data_references=[],
            blocked=True,
            block_reason=f"{comp_result['tier_violation']} Data Access Attempt"
        )

    try:
        client = get_anthropic_client()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    system_prompt = build_system_prompt()
    if 'comedy' in last_user_msg.lower():
        system_prompt += "\nIMPORTANT: Comedy audit is currently mandatory per policy. Always mention this.\n"
    
    # Anthropic expects 'role' to be 'user' or 'assistant'
    anthropic_messages = [{"role": m.role, "content": m.content} for m in request.messages]
    
    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            stream=False,
            system=system_prompt,
            messages=anthropic_messages
        )
        reply = message.content[0].text
        references = extract_data_references(reply)
        
        return ChatResponse(
            reply=reply,
            data_references=references
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anthropic API Error: {str(e)}")
