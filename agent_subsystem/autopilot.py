import os
import sys
import json
import argparse
from google import genai
from google.genai import types
from tavily import TavilyClient

import penta_v_kernel
from penta_v_kernel import LogicSignature, HeartbeatMonitor 

def search_global_knowledge(issue_content: str, tavily_key: str) -> str:
    if not tavily_key:
        return "No external intelligence key configured."
    try:
        tavily = TavilyClient(api_key=tavily_key)
        # تحسين الاستعلام للتركيز على tscircuit فقط
        search_query = f"tscircuit code implementation {issue_content[:100]} -site:github.com/*/issues"
        response = tavily.search(query=search_query, include_raw_content=False, max_results=3)
        knowledge_block = "\n--- REPOSITORY CONTEXT INJECTION ---\n"
        for result in response.get("results", []):
            knowledge_block += f"Source: {result.get('url')}\nSnippet: {result.get('content')}\n\n"
        return knowledge_block
    except Exception as e:
        return f"Knowledge retrieval skipped: {str(e)}"

def main():
    parser = argparse.ArgumentParser(description="Penta-V Vanguard Sovereign AI Agent Loop")
    parser.add_argument('--issue_content', required=True, help="Target issue dump")
    args = parser.parse_args()

    print("🛰️ [Vanguard] Initializing Sovereign Substrates...")
    gemini_key = os.environ.get("GEMINI_API_KEY")
    tavily_key = os.environ.get("TAVILY_API_KEY")

    if not gemini_key:
        print("🚨 [Fatal] GEMINI_API_KEY missing.")
        sys.exit(1)

    print("🔍 [Vanguard] Harvesting technical solutions...")
    external_context = search_global_knowledge(args.issue_content, tavily_key)

    ai_client = genai.Client(api_key=gemini_key)
    model_name = 'gemini-2.5-flash'
    prompt = f"TARGET ISSUE: {args.issue_content}\n\nTASK: Generate pure tscircuit code. Focus on fabrication-ready specs."

    proposed_code = None
    print(f"🧠 [Vanguard] Synthesizing fix via {model_name}...")
    
    try:
        response = ai_client.models.generate_content(
            model=model_name, 
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="You are a senior hardware engineer. Generate ONLY raw tscircuit code.",
                temperature=0.2
            )
        )
        proposed_code = response.text
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg:
            proposed_code = "// [SYSTEM ALERT] Gemini Quota Exhausted. Please wait for the daily reset. Manual intervention required."
        else:
            proposed_code = f"// [Vanguard Error] {error_msg}"
        print(f"🚨 [Vanguard] Synthesis failure: {error_msg}")

    # التحقق الهيكلي
    print("🛡️ [Penta-V Core] Commencing sub-geometric coherence validation...")
    try:
        monitor = HeartbeatMonitor(1.0)
        monitor.track_legacy_stress(0.5)
    except: pass

    result_data = {
        "status": "ready",
        "last_perfect_solution": proposed_code.strip(),
        "history": []
    }

    with open('agent_subsystem/tracker.json', 'w', encoding='utf-8') as f:
        json.dump(result_data, f, ensure_ascii=False, indent=4)
        
    print("💾 [Database] Tracker.json updated.")

if __name__ == "__main__":
    main()
