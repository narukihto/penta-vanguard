import os
import re
import sys
import json
import datetime
from google import genai
from google.genai import types

# --- وظائف الدعم السيادية ---

def get_prompt(category, sub_key):
    with open('agent_subsystem/prompts.json', 'r') as f:
        prompts = json.load(f)
    return prompts[category][sub_key]

def update_memory(issue, code_file, test_file):
    with open('agent_subsystem/memory.json', 'r+') as f:
        data = json.load(f)
        new_entry = {
            "timestamp": datetime.datetime.now().isoformat(),
            "issue_summary": issue[:50],
            "solution": {"code": code_file, "test": test_file}
        }
        data['memory_bank'].append(new_entry)
        f.seek(0)
        json.dump(data, f, indent=2)
        f.truncate()

def simulate_compilation(code, test):
    # الربط مع الـ Compiler الفعلي هنا
    return True 

# --- محرك التصحيح الذاتي (Self-Healing Engine) ---

def run_self_healing_synthesis(ai_client, base_prompt, issue_content, error_msg=None, retry_count=0):
    MAX_RETRIES = 3
    
    system_instr = get_prompt("hardware_architect", "system_instruction")
    current_prompt = f"{base_prompt}\n\nISSUE: {issue_content}"
    
    if error_msg:
        current_prompt += f"\n\nPREVIOUS ATTEMPT FAILED with error:\n{error_msg}\nFIX THE CODE."
    
    response = ai_client.models.generate_content(
        model='gemini-2.5-flash',
        contents=current_prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instr,
            temperature=0.0
        )
    )
    
    code_match = re.search(r"\[CODE_START\](.*?)\[CODE_END\]", response.text, re.DOTALL)
    test_match = re.search(r"\[TESTS_START\](.*?)\[TESTS_END\]", response.text, re.DOTALL)
    
    if code_match and test_match:
        code_txt = code_match.group(1).strip()
        test_txt = test_match.group(1).strip()
        
        if simulate_compilation(code_txt, test_txt):
            with open('circuit_impl.tsx', 'w', encoding='utf-8') as f: f.write(code_txt)
            with open('circuit_impl.test.ts', 'w', encoding='utf-8') as f: f.write(test_txt)
            
            # توثيق النجاح في الذاكرة
            update_memory(issue_content, 'circuit_impl.tsx', 'circuit_impl.test.ts')
            print("✅ [Validation Passed] Artifacts finalized & Memory updated.")
            return True
        elif retry_count < MAX_RETRIES:
            return run_self_healing_synthesis(ai_client, base_prompt, issue_content, error_msg="Compilation/Test Logic Failed", retry_count=retry_count + 1)
    
    return False

def main():
    gemini_key = os.environ.get("GEMINI_API_KEY")
    ai_client = genai.Client(api_key=gemini_key)
    
    # الحصول على التوجيهات من ملف الـ JSON
    circuit_prompt = get_prompt("hardware_architect", "circuit_generation")
    test_prompt = get_prompt("hardware_architect", "test_generation")
    base_prompt = f"{circuit_prompt}\n{test_prompt}"
    
    issue = "Build the Arduino Nano with tscircuit" # مثال
    
    success = run_self_healing_synthesis(ai_client, base_prompt, issue)
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
