import json
import os
import subprocess

conversations = [
    "53d7a95f-86c7-4bd5-b251-299dadf31fcd",
    "1f471403-89b8-4453-bd20-3e7bb60068cf",
    "74699775-02a6-4eed-8650-7a2fe013795f",
    "0ddb575d-a51b-4c81-a504-4d96399cca1d",
    "adb36044-3647-4852-8841-90f96b2fba3f",
    "dedaad17-9a02-453f-a352-00276c1eb073",
    "c471912c-7675-47fd-ad73-0a3b9d9e4240",
    "9a1ed1d1-a596-4f73-9a40-06a615af16ad",
    "e085ba71-e87e-4234-a36c-5862a3998dee",
    "eff59e18-d9ef-4c4d-b036-24d3a55b609e",
    "72f5a4e5-f0f5-46f3-8fac-97ebe1bbd7cc",
    "3700cf47-e90c-4801-8d8b-e37d1e828464",
    "24d1371f-6533-418c-bb7f-1ba815d8367c",
    "4b414e15-812e-41ed-8a32-9e6f017fdab5",
    "13f9d5eb-5aec-4549-a1b4-86870a7101d1"
]

brain_dir = r"C:\Users\Ben\.gemini\antigravity\brain"

for conv_id in conversations:
    transcript_path = os.path.join(brain_dir, conv_id, ".system_generated", "logs", "transcript_full.jsonl")
    if not os.path.exists(transcript_path):
        print(f"Skipping {conv_id}, transcript not found.")
        continue

    print(f"\n--- Replaying {conv_id} ---")

    with open(transcript_path, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip(): continue
            try:
                entry = json.loads(line)
            except Exception:
                continue

            if entry.get('type') == 'PLANNER_RESPONSE' and 'tool_calls' in entry:
                for call in entry['tool_calls']:
                    tool_name = call.get('name')
                    args = call.get('args', {})

                    if tool_name == 'write_to_file':
                        target = args.get('TargetFile')
                        content = args.get('CodeContent')
                        if target and ('frontend' in target or 'refactor' in target):
                            os.makedirs(os.path.dirname(target), exist_ok=True)
                            with open(target, 'w', encoding='utf-8') as tf:
                                tf.write(content)
                            print(f"[{conv_id}] Wrote file: {target}")

                    elif tool_name == 'replace_file_content':
                        target = args.get('TargetFile')
                        old_str = args.get('TargetContent')
                        new_str = args.get('ReplacementContent')

                        if target and ('frontend' in target) and old_str and new_str and os.path.exists(target):
                            with open(target, 'r', encoding='utf-8') as tf:
                                t_content = tf.read()
                            if old_str in t_content:
                                t_content = t_content.replace(old_str, new_str, 1)
                                with open(target, 'w', encoding='utf-8') as tf:
                                    tf.write(t_content)
                                print(f"[{conv_id}] Replaced content in: {target}")
                            else:
                                print(f"[{conv_id}] WARNING: Could not find TargetContent in {target}")

                    elif tool_name == 'multi_replace_file_content':
                        target = args.get('TargetFile')
                        chunks = args.get('ReplacementChunks', [])

                        if target and ('frontend' in target) and chunks and os.path.exists(target):
                            with open(target, 'r', encoding='utf-8') as tf:
                                t_content = tf.read()

                            for chunk in chunks:
                                old_str = chunk.get('TargetContent')
                                new_str = chunk.get('ReplacementContent')
                                if old_str and new_str:
                                    if old_str in t_content:
                                        t_content = t_content.replace(old_str, new_str, 1)
                                    else:
                                        print(f"[{conv_id}] WARNING: Could not find one of the TargetContents in {target}")

                            with open(target, 'w', encoding='utf-8') as tf:
                                tf.write(t_content)
                            print(f"[{conv_id}] Multi-replaced content in: {target}")

                    elif tool_name == 'run_command':
                        cmd = args.get('CommandLine', '')
                        if 'python' in cmd and 'refactor' in cmd and 'frontend' in args.get('Cwd', ''):
                            print(f"[{conv_id}] Executing script: {cmd}")
                            subprocess.run(cmd, shell=True, cwd=args.get('Cwd'))
