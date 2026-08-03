import sys

file_path = r'c:\Users\Ben\AntiGravity\classroom-chat\frontend\src\pages\Admin\AdminUserDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Add activeTab state
for i, line in enumerate(lines):
    if 'const [duckAmountInput' in line:
        lines.insert(i + 1, "    const [activeTab, setActiveTab] = useState('standard');\n")
        break

# 2. Extract bounds for main content replacement
start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if '{/* ACTIVE LEARNING TRACK (Unified Card Style with Course Path Icons) */}' in line:
        start_idx = i
    if '{/* Printable QR Code for Parent Connection */}' in line:
        end_idx = i

if start_idx != -1 and end_idx != -1:
    old_main_content_lines = lines[start_idx:end_idx]
    old_main_content = "".join(old_main_content_lines)

    # We need to reconstruct the tabs and wrap the sections in activeTab conditions.
    # The active learning track and standard ops are activeTab === 'standard'
    # Account & connections is activeTab === 'account'
    # Sensitive is activeTab === 'sensitive'
    
    # We will split old_main_content into pieces manually.
    
    # Track section: from start to STANDARD USER OPERATIONS
    track_split = old_main_content.split('{/* ---------------- STANDARD USER OPERATIONS ---------------- */}')
    track_content = track_split[0]
    
    # Standard ops: from STANDARD to ACCOUNT & CONNECTIONS
    ops_split = track_split[1].split('{/* ---------------- ACCOUNT & CONNECTIONS ---------------- */}')
    std_ops_content = ops_split[0]
    
    # Account: from ACCOUNT to SENSITIVE
    acc_split = ops_split[1].split('{/* ---------------- SENSITIVE ADMINISTRATIVE ACTIONS ---------------- */}')
    acc_content = acc_split[0]
    
    # Sensitive: from SENSITIVE to end
    sens_content = acc_split[1]

    # Clean up dividers in std_ops and acc_content
    std_ops_content = std_ops_content.replace('<div className="compact-divider" />', '')
    acc_content = acc_content.replace('<div className="compact-divider" />', '')

    new_content = f'''            {{/* TABS */}}
            <div className="admin-tabs">
                <button 
                    className={{`admin-tab ${{activeTab === 'standard' ? 'active' : ''}}`}}
                    onClick={{() => setActiveTab('standard')}}
                >
                    Standard Operations
                </button>
                <button 
                    className={{`admin-tab ${{activeTab === 'account' ? 'active' : ''}}`}}
                    onClick={{() => setActiveTab('account')}}
                >
                    Account & Connections
                </button>
                <button 
                    className={{`admin-tab ${{activeTab === 'sensitive' ? 'active' : ''}}`}}
                    onClick={{() => setActiveTab('sensitive')}}
                >
                    Sensitive Actions
                </button>
            </div>

            {{activeTab === 'standard' && (
                <>
{track_content}

{std_ops_content}
                </>
            )}}

            {{activeTab === 'account' && (
                <>
{acc_content}
                </>
            )}}

            {{activeTab === 'sensitive' && (
                <>
{sens_content}
                </>
            )}}
'''

    lines[start_idx:end_idx] = [new_content]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Successfully replaced main content with tabs.")
else:
    print(f"Could not find bounds. start: {start_idx}, end: {end_idx}")
