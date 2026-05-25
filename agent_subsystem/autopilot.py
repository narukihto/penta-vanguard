import os
import sys
import json
import argparse
import re
from google import genai
from google.genai import types
from tavily import TavilyClient
from penta_v_kernel import HeartbeatMonitor 

def search_global_knowledge(issue_content: str, tavily_key: str) -> str:
    if not tavily_key: return "No external intelligence key configured."
    try:
        tavily = TavilyClient(api_key=tavily_key)
        search_query = f"github.com code solution for: {issue_content[:100]} site:github.com"
        response = tavily.search(query=search_query, include_raw_content=False, max_results=3)
        knowledge_block = "\n--- REPOSITORY CONTEXT INJECTION ---\n"
        for result in response.get("results", []):
            knowledge_block += f"Source: {result.get('url')}\nSnippet: {result.get('content')}\n\n"
        return knowledge_block
    except Exception as e: return f"Knowledge retrieval skipped: {str(e)}"

def main():
    parser = argparse.ArgumentParser(description="Penta-V Sovereign Agent")
    parser.add_argument('--issue_content', required=True)
    args = parser.parse_args()

    print("🛰️ [Vanguard] Initializing Sovereign Substrates...")
    gemini_key, tavily_key = os.environ.get("GEMINI_API_KEY"), os.environ.get("TAVILY_API_KEY")
    
    external_context = search_global_knowledge(args.issue_content, tavily_key)

    # قانون الالتزام الهيكلي
    system_rules = """
    SYSTEM RULE: Act as a Hardware Architect. For any circuit request:
    1. Generate the tscircuit code snippet.
    2. MANDATORY: Generate a corresponding integration test file (.test.ts) covering power-rail continuity, netlist validation, and pin-connectivity.
    3. Use strict production-grade components with valid footprints.
    4. Output MUST be strictly formatted as:
       [CODE_START] {circuit_code} [CODE_END]
       [TESTS_START] {test_code} [TESTS_END]
    """

    ai_client = genai.Client(api_key=gemini_key)
    prompt = f"{system_rules}\n\nTARGET ISSUE: {args.issue_content}"
    
    print("🧠 [Vanguard] Synthesizing & Testing...")
    try:
        response = ai_client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=prompt,
            config=types.GenerateContentConfig(system_instruction="Generate production-ready code and tests.", temperature=0.0)
        )
        proposed_code = response.text
        
        # الفصل الذري للملفات
        if "[CODE_START]" in proposed_code and "[TESTS_START]" in proposed_code:
            code_match = re.search(r"\[CODE_START\](.*?)\[CODE_END\]", proposed_code, re.DOTALL)
            test_match = re.search(r"\[TESTS_START\](.*?)\[TESTS_END\]", proposed_code, re.DOTALL)
            
            with open('circuit_impl.tsx', 'w', encoding='utf-8') as f: f.write(code_match.group(1).strip())
            with open('circuit_impl.test.ts', 'w', encoding='utf-8') as f: f.write(test_match.group(1).strip())
            print("💾 [System] Atomic files generated: circuit_impl.tsx & circuit_impl.test.ts")
        else:
            print("🚨 [Penta-V] Validation Failed: Output format missing [CODE_START] or [TESTS_START].")

    except Exception as e:
        print(f"🚨 [Vanguard] Synthesis failure: {str(e)}")

    # التحقق الهيكلي
    monitor = HeartbeatMonitor(1.0)
    monitor.track_legacy_stress(0.5)

if __name__ == "__main__":
    main()
