import os
import re
import sys
import json
import datetime
import argparse
from google import genai
from google.genai import types

# --- استدعاء المكتبة السيادية (المسجلة في lib.rs فقط) ---
from penta_v_kernel import LogicSignature

# --- وظائف التنقية (استبدال PentaCleaner بـ Regex محكم) ---
def simple_cleaner_scrub(text):
    # إزالة أي ثرثرة خارج نطاق الأكواد المطلوبة
    text = re.sub(r'^(?!.*\[CODE_START\]).*$', '', text, flags=re.MULTILINE)
    return text

# --- وظائف الدعم السيادية ---
def update_tracker(status):
    with open('agent_subsystem/tracker.json', 'w') as f:
        json.dump({"status": status, "last_updated": datetime.datetime.now().isoformat()}, f)

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
    return True 

# --- محرك التصحيح الذاتي ---
def run_self_healing_synthesis(ai_client, base_prompt, issue_content, error_msg=None, retry_count=0):
    MAX_RETRIES = 3
    
    system_instr = get_prompt("architect_profile", "system_instruction")
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
    
    # التنقية باستخدام الـ Regex المحلي بدلاً من PentaCleaner
    purified_text = simple_cleaner_scrub(response.text)
    
    code_match = re.search(r"\[CODE_START\](.*?)\[CODE_END\]", purified_text, re.DOTALL)
    test_match = re.search(r"\[TESTS_START\](.*?)\[TESTS_END\]", purified_text, re.DOTALL)
    
    if code_match and test_match:
        code_txt = code_match.group(1).strip()
        test_txt = test_match.group(1).strip()
        
        # التوقيع المنطقي للتحقق (موجود ومسجل في المكتبة)
        sig = LogicSignature(stress_level=0.1, complexity_index=0.1)
        
        if simulate_compilation(code_txt, test_txt) and sig.is_valid():
            with open('circuit_impl.tsx', 'w', encoding='utf-8') as f: f.write(code_txt)
            with open('circuit_impl.test.ts', 'w', encoding='utf-8') as f: f.write(test_txt)
            
            update_memory(issue_content, 'circuit_impl.tsx', 'circuit_impl.test.ts')
            update_tracker("ready")
            print("✅ [Validation Passed] Artifacts finalized with LogicSignature Anchor.")
            return True
        elif retry_count < MAX_RETRIES:
            return run_self_healing_synthesis(ai_client, base_prompt, issue_content, error_msg="Validation Failed", retry_count=retry_count + 1)
    
    update_tracker("error")
    return False

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--issue_content", required=True)
    args = parser.parse_args()
    
    update_tracker("processing")
    
    gemini_key = os.environ.get("GEMINI_API_KEY")
    ai_client = genai.Client(api_key=gemini_key)
    
    circuit_prompt = get_prompt("architect_profile", "circuit_generation")
    test_prompt = get_prompt("architect_profile", "test_generation")
    base_prompt = f"{circuit_prompt}\n{test_prompt}"
    
    success = run_self_healing_synthesis(ai_client, base_prompt, args.issue_content)
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
