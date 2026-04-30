import json

with open(r'C:\Users\Ben\.gemini\antigravity\brain\1c80c760-9d37-44e6-b9dc-2c6ff03cf75b\.system_generated\logs\overview.txt', encoding='utf-8') as f:
    for line in f:
        if 'exact replacement' in line:
            content = json.loads(line)['content']
            with open(r'c:\Users\Ben\AntiGravity\classroom-chat\scratch\nginx_config.txt', 'w', encoding='utf-8') as out:
                out.write(content)
