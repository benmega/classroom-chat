import json
import re

def main():
    with open("eslint_report.json", "r", encoding="utf8") as f:
        report = json.load(f)
    
    modified_files = set()

    for file_res in report:
        filepath = file_res['filePath']
        messages = file_res['messages']
        
        if not messages:
            continue
            
        with open(filepath, "r", encoding="utf8") as f:
            content = f.read()
            
        # We need to find elements that have click events but no key events.
        # It's easier to just match `onClick={` or `onClick={()` in a tag with `role="button"` and inject `onKeyDown`.
        
        # A simple string replacement on the file text:
        # Find all `onClick={` or `onClick={(` or `onClick={e` 
        # and replace with `onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={`
        
        # We only want to do this for lines/blocks that are missing it.
        # Let's just use regex to replace onClick where it doesn't already have onKeyDown nearby.
        
        # Actually, let's just do it for all `role="button"` tags that have `onClick=` but no `onKeyDown=`.
        # Regex to find <div role="button" ... onClick=... >
        
        def replacer(match):
            tag_content = match.group(0)
            if "onKeyDown=" not in tag_content:
                # insert before onClick
                tag_content = tag_content.replace("onClick=", "onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick=")
            return tag_content
            
        new_content = re.sub(r'<[a-zA-Z0-9_]+[^>]+role="button"[^>]+onClick=[^>]+>', replacer, content)
        
        # also for <span role="button" ...
        
        if new_content != content:
            with open(filepath, "w", encoding="utf8") as f:
                f.write(new_content)
            modified_files.add(filepath)
            
    print(f"Modified {len(modified_files)} files.")

if __name__ == "__main__":
    main()
