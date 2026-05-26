import os
import re
import sys
import json
import datetime
import argparse
import traceback
from google import genai
from google.genai import types

from penta_v_kernel import LogicSignature

def ensure_infrastructure():
    os.makedirs('agent_subsystem', exist_ok=True)
    if not os.path.exists('agent_subsystem/tracker.json'):
        with open('agent_subsystem/tracker.json', 'w') as f:
            json.dump({"status": "init", "last_updated": datetime.datetime.now().isoformat()}, f)
    
    if not os.path.exists('agent_subsystem/memory.json'):
        with open('agent_subsystem/memory.json', 'w') as f:
            json.dump({"memory_bank": []}, f)
            
    if not os.path.exists('agent_subsystem/prompts.json'):
        default_prompts = {
            "architect_profile": {
                "system_instruction": "You are the Lead Protocol Architect specializing in high-performance circuit engineering.",
                "circuit_generation": "Generate high-fidelity tscircuit code based on the structural requirements.",
                "test_generation": "Generate comprehensive TypeScript test suites for the structural verification."
            }
        }
        with open('agent_subsystem/prompts.json', 'w') as f:
            json.dump(default_prompts, f, indent=2)

def simple_cleaner_scrub(text):
    text = re.sub(r'^(?!.*\[CODE_START\]).*$', '', text, flags=re.MULTILINE)
    return text

def update_tracker(status):
    ensure_infrastructure()
    with open('agent_subsystem/tracker.json', 'w') as f:
        json.dump({"status": status, "last_updated": datetime.datetime.now().isoformat()}, f)

def get_prompt(category, sub_key):
    ensure_infrastructure()
    try:
        with open('agent_subsystem/prompts.json', 'r') as f:
            prompts = json.load(f)
        return prompts[category][sub_key]
    except Exception as e:
        print(f"CRITICAL_JSON_ERROR: Failed to read category {category}, key {sub_key}. Error: {str(e)}", file=sys.stderr)
        return "Default structural instruction template placeholder"

def update_memory(issue, code_file, test_file):
    ensure_infrastructure()
    try:
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
    except Exception as e:
        print(f"MEMORY_WRITE_ERROR: {str(e)}", file=sys.stderr)

def run_self_healing_synthesis(ai_client, base_prompt, issue_content, error_msg=None, retry_count=0):
    MAX_RETRIES = 3
    system_instr = get_prompt("architect_profile", "system_instruction")
    current_prompt = f"{base_prompt}\n\nISSUE: {issue_content}"
    
    if error_msg:
        current_prompt += f"\n\nPREVIOUS ATTEMPT FAILED with error:\n{error_msg}\nFIX THE CODE."
    
    try:
        response = ai_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=current_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instr,
                temperature=0.0
            )
        )
    except Exception:
        traceback.print_exc(file=sys.stderr)
        return False
    
    purified_text = simple_cleaner_scrub(response.text)
    code_match = re.search(r"\[CODE_START\](.*?)\[CODE_END\]", purified_text, re.DOTALL)
    test_match = re.search(r"\[TESTS_START\](.*?)\[TESTS_END\]", purified_text, re.DOTALL)
    
    if code_match and test_match:
        code_txt = code_match.group(1).strip()
        test_txt = test_match.group(1).strip()
        
        try:
            print("DEBUG: Attempting LogicSignature init...", file=sys.stderr)
            sig = LogicSignature(0.1, 0.1)
            is_valid_sig = sig.is_valid()
            print(f"DEBUG: LogicSignature valid? {is_valid_sig}", file=sys.stderr)
            
            if is_valid_sig:
                with open('circuit_impl.tsx', 'w', encoding='utf-8') as f: f.write(code_txt)
                with open('circuit_impl.test.ts', 'w', encoding='utf-8') as f: f.write(test_txt)
                update_memory(issue_content, 'circuit_impl.tsx', 'circuit_impl.test.ts')
                update_tracker("ready")
                return True
            else:
                print("DEBUG: LogicSignature returned False.", file=sys.stderr)
        except Exception:
            traceback.print_exc(file=sys.stderr)
            
        if retry_count < MAX_RETRIES:
            return run_self_healing_synthesis(ai_client, base_prompt, issue_content, error_msg="Validation Failed", retry_count=retry_count + 1)
    
    update_tracker("error")
    return False

def main():
    ensure_infrastructure()
    parser = argparse.ArgumentParser()
    parser.add_argument("--issue_content", required=True)
    args = parser.parse_args()
    
    if not os.environ.get("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY not found in environment!", file=sys.stderr)
        sys.exit(1)
        
    update_tracker("processing")
    ai_client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    circuit_prompt = get_prompt("architect_profile", "circuit_generation")
    test_prompt = get_prompt("architect_profile", "test_generation")
    base_prompt = f"{circuit_prompt}\n{test_prompt}"
    
    if not run_self_healing_synthesis(ai_client, base_prompt, args.issue_content):
        sys.exit(1)

if __name__ == "__main__":
    main()
