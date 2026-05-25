import os
import sys
import json
import argparse
from google import genai
from google.genai import types
from penta_v_kernel import HeartbeatMonitor 

def main():
    parser = argparse.ArgumentParser(description="Penta-V Sovereign Agent - Sequential Synthesis")
    parser.add_argument('--issue_content', required=True)
    args = parser.parse_args()

    gemini_key = os.environ.get("GEMINI_API_KEY")
    ai_client = genai.Client(api_key=gemini_key)
    
    print("🧠 [Vanguard] Phase 1: Synthesizing Circuit...")
    
    # استدعاء 1: توليد الكود فقط
    code_prompt = f"Act as a Hardware Architect. Generate ONLY the tscircuit code for: {args.issue_content}. Output format: [CODE_START]...[CODE_END]"
    response_code = ai_client.models.generate_content(
        model='gemini-2.5-flash',
        contents=code_prompt,
        config=types.GenerateContentConfig(temperature=0.0)
    )
    
    circuit_code = response_code.text
    
    print("🧪 [Vanguard] Phase 2: Synthesizing Integration Tests...")
    
    # استدعاء 2: توليد الاختبارات بناءً على الكود الناتج
    test_prompt = f"Given the following circuit code:\n{circuit_code}\n\nGenerate the integration test file (.test.ts) covering power-rail continuity, netlist validation, and pin-connectivity. Output format: [TESTS_START]...[TESTS_END]"
    response_tests = ai_client.models.generate_content(
        model='gemini-2.5-flash',
        contents=test_prompt,
        config=types.GenerateContentConfig(temperature=0.0)
    )
    
    # حفظ الملفات بشكل ذري
    import re
    code_match = re.search(r"\[CODE_START\](.*?)\[CODE_END\]", circuit_code, re.DOTALL)
    test_match = re.search(r"\[TESTS_START\](.*?)\[TESTS_END\]", response_tests.text, re.DOTALL)
    
    if code_match and test_match:
        with open('circuit_impl.tsx', 'w', encoding='utf-8') as f: f.write(code_match.group(1).strip())
        with open('circuit_impl.test.ts', 'w', encoding='utf-8') as f: f.write(test_match.group(1).strip())
        print("💾 [System] Atomic files finalized: circuit_impl.tsx & circuit_impl.test.ts")
    else:
        print("🚨 [Penta-V] Validation Failed: Synthesis output incomplete.")

    # التحقق الهيكلي
    HeartbeatMonitor(1.0).track_legacy_stress(0.5)

if __name__ == "__main__":
    main()
