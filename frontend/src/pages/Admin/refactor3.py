import sys

file_path = r'c:\Users\Ben\AntiGravity\classroom-chat\frontend\src\pages\Admin\AdminUserDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_block = '''                    {/* Manual Certificate */}
                    {user.role === 'student' && (
                        <div className="compact-panel">
                            <div className="panel-head"><Award size={16} /> Manual Certificate</div>
                            <div className="dense-form-group-stack">
                                <div className="inline-lbl">Select course to generate certificate:</div>
                                <select 
                                    value={selectedCertCourse} 
                                    onChange={(e) => setSelectedCertCourse(e.target.value)}
                                    className="inline-input full mb-xs"
                                    style={{ padding: '6px 8px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #d1d5db', marginBottom: '8px' }}
                                >
                                    <option value="cs-1">CS1 - Computer Science 1</option>
                                    <option value="cs-2">CS2 - Computer Science 2</option>
                                    <option value="cs-3">CS3 - Computer Science 3</option>
                                    <option value="cs-4">CS4 - Computer Science 4</option>
                                    <option value="cs-5">CS5 - Computer Science 5</option>
                                    <option value="cs-6">CS6 - Computer Science 6</option>
                                    <option value="gd-1">GD1 - Game Development 1</option>
                                    <option value="gd-2">GD2 - Game Development 2</option>
                                    <option value="gd-3">GD3 - Game Development 3</option>
                                    <option value="wd-1">WD1 - Web Development 1</option>
                                    <option value="wd-2">WD2 - Web Development 2</option>
                                    <option value="oz-1">Ozaria 1</option>
                                    <option value="oz-2">Ozaria 2</option>
                                    <option value="oz-3">Ozaria 3</option>
                                    <option value="oz-4">Ozaria 4</option>
                                </select>
                                <button type="button" className="btn-compact primary w-full" onClick={() => handleGenerateManualCertificate(selectedCertCourse)} disabled={formLoading}>
                                    <Sparkles size={14} /> Generate PDF Certificate
                                </button>
                            </div>
                        </div>
                    )}'''

new_block = '''                    {/* Manual Certificate */}
                    {user.role === 'student' && (
                        <div className="compact-panel">
                            <div className="panel-head"><Award size={16} /> Manual Certificate</div>
                            <div className="inline-action-form full">
                                <select 
                                    value={selectedCertCourse} 
                                    onChange={(e) => setSelectedCertCourse(e.target.value)}
                                    className="inline-select"
                                >
                                    <option value="cs-1">CS1 - Computer Science 1</option>
                                    <option value="cs-2">CS2 - Computer Science 2</option>
                                    <option value="cs-3">CS3 - Computer Science 3</option>
                                    <option value="cs-4">CS4 - Computer Science 4</option>
                                    <option value="cs-5">CS5 - Computer Science 5</option>
                                    <option value="cs-6">CS6 - Computer Science 6</option>
                                    <option value="gd-1">GD1 - Game Development 1</option>
                                    <option value="gd-2">GD2 - Game Development 2</option>
                                    <option value="gd-3">GD3 - Game Development 3</option>
                                    <option value="wd-1">WD1 - Web Development 1</option>
                                    <option value="wd-2">WD2 - Web Development 2</option>
                                    <option value="oz-1">Ozaria 1</option>
                                    <option value="oz-2">Ozaria 2</option>
                                    <option value="oz-3">Ozaria 3</option>
                                    <option value="oz-4">Ozaria 4</option>
                                </select>
                                <button type="button" className="btn-compact primary" onClick={() => handleGenerateManualCertificate(selectedCertCourse)} disabled={formLoading}>
                                    <Sparkles size={14} /> Generate
                                </button>
                            </div>
                        </div>
                    )}'''

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully.")
else:
    print("Block not found!")
