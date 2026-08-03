import sys

file_path = r'c:\Users\Ben\AntiGravity\classroom-chat\frontend\src\pages\Admin\AdminUserDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_content = '''            {/* ---------------- STANDARD USER OPERATIONS ---------------- */}
            <div className="admin-section-header mt-sm mb-xs">
                <h3 style={{ margin: '1rem 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                    Standard Operations
                </h3>
            </div>
            
            <div className="compact-grid mb-sm">
                {/* Col 1 */}
                <div className="compact-col">
                    {/* Account Identity */}
                    <div className="compact-panel">
                        <div className="panel-head">Account Identity</div>
                        <div className="dense-form mb-sm">
                            <div className="dense-group">
                                <label htmlFor="input-nickname">Nickname</label>
                                <input id="input-nickname" type="text" value={editForm.nickname} onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })} />
                            </div>
                            <div className="dense-group">
                                <label htmlFor="input-username">Username</label>
                                <input id="input-username" type="text" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase() })} />
                            </div>
                            <div className="dense-group">
                                <label htmlFor="input-email">Email</label>
                                <input id="input-email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                            </div>
                        </div>
                        <div className="dense-toggles">
                            <label className="dense-toggle">
                                <input type="checkbox" checked={editForm.can_chat} onChange={(e) => setEditForm({ ...editForm, can_chat: e.target.checked })} />
                                Chat Access Enabled
                            </label>
                        </div>
                    </div>

                    {/* Locker Drawer */}
                    {user.role === 'student' && (
                        <div className="compact-panel">
                            <div className="panel-head">
                                <Lock size={16} /> Locker Drawer
                            </div>
                            <form onSubmit={handleSetDrawer} className="economy-row-card">
                                <div className="econ-header">
                                    <span className="econ-label">Drawer ID</span>
                                    <span className="econ-balance">{user.drawer || 'Not Set'}</span>
                                </div>
                                <div className="econ-action-inputs">
                                    <input type="text" name="drawer" defaultValue={user.drawer || ''} placeholder="e.g. 0xA6" maxLength={6} className="inline-input" />
                                    <button type="submit" className="btn-compact primary" disabled={formLoading}>
                                        <Check size={14} /> Set Drawer
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Course Progress Override */}
                    {user.role === 'student' && (
                        <div className="compact-panel">
                            <div className="panel-head"><Award size={16} /> Course Progress Override</div>
                            <form onSubmit={handlePassChapterPreview} className="inline-action-form full">
                                <select value={selectedChapterId} onChange={(e) => { setSelectedChapterId(e.target.value); setPassPreview(null); }} required className="inline-select">
                                    <option value="">Select Chapter...</option>
                                    <option value="cs1">CS 1</option>
                                    <option value="cs2">CS 2</option>
                                    <option value="cs3">CS 3</option>
                                    <option value="cs4">CS 4</option>
                                    <option value="cs5">CS 5</option>
                                    <option value="cs6">CS 6</option>
                                    <option value="ozaria1">Ozaria 1</option>
                                    <option value="ozaria2">Ozaria 2</option>
                                    <option value="gd1">GD 1</option>
                                    <option value="gd2">GD 2</option>
                                    <option value="wd1">WD 1</option>
                                    <option value="wd2">WD 2</option>
                                </select>
                                <button type="submit" className="btn-compact primary" disabled={passChapterLoading || !selectedChapterId}>
                                    <Check size={14} /> Preview
                                </button>
                            </form>
                            {passPreview && (
                                <div className="dense-preview mt-xs">
                                    <div className="pv-text">Pass will grant {passPreview.ducks_to_award} ducks and complete {passPreview.challenges_to_complete} tasks.</div>
                                    <button className="btn-compact warning w-full mt-xs" onClick={handlePassChapterConfirm}>Confirm Pass Chapter</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Col 2 */}
                <div className="compact-col">
                    {/* Assign Project */}
                    {user.role === 'student' && (
                        <div className="compact-panel">
                            <div className="panel-head">
                                <Code size={16} /> Assign Project
                            </div>
                            <form onSubmit={handleAssignProjectSubmit} className="assign-project-form">
                                <select
                                    value={selectedTemplateName}
                                    onChange={(e) => setSelectedTemplateName(e.target.value)}
                                    required
                                    className="inline-select full"
                                >
                                    <option value="">Select Project Template...</option>
                                    {Object.keys(templates).map(name => <option key={name} value={name}>{name}</option>)}
                                </select>
                                <button type="submit" className="btn-compact primary w-full mt-xs" disabled={templatesSaving || !selectedTemplateName}>
                                    <Plus size={14} /> Assign Project
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Manual Certificate */}
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
                    )}

                    {/* Economy Card */}
                    {user.role === 'student' && (
                        <div className="compact-panel">
                            <div className="panel-head">
                                <Coins size={16} /> Economy Balance
                            </div>
                            <div className="economy-section">
                                {/* Ducks Adjustment */}
                                <form onSubmit={handleAdjustDucks} className="economy-row-card">
                                    <div className="econ-header">
                                        <span className="econ-label">🦆 Ducks</span>
                                        <span className="econ-balance">{(user.duck_balance ?? 0).toLocaleString()}</span>
                                    </div>
                                    <input type="hidden" name="username" value={user.username} />
                                    <div className="econ-preset-pills">
                                        <button type="button" className="preset-pill" onClick={() => handlePresetDuck(1)}>+1</button>
                                        <button type="button" className="preset-pill neg" onClick={() => handlePresetDuck(-1)}>-1</button>
                                    </div>
                                    <div className="econ-action-inputs">
                                        <input
                                            type="number"
                                            name="amount"
                                            step="any"
                                            placeholder="Amount (+/-)"
                                            required
                                            value={duckAmountInput}
                                            onChange={(e) => setDuckAmountInput(e.target.value)}
                                            className="inline-input"
                                        />
                                        <button type="submit" className="btn-compact primary" disabled={formLoading}>
                                            <Check size={14} /> Adjust
                                        </button>
                                    </div>
                                </form>

                                {/* Packets Adjustment */}
                                <form onSubmit={handleAdjustPackets} className="economy-row-card">
                                    <div className="econ-header">
                                        <span className="econ-label">📦 Packets</span>
                                        <span className="econ-balance">{(user.packets ?? 0).toLocaleString()}</span>
                                    </div>
                                    <input type="hidden" name="username" value={user.username} />
                                    <div className="econ-action-inputs">
                                        <input type="number" name="amount" step="any" placeholder="Amount (+/-)" required className="inline-input" />
                                        <button type="submit" className="btn-compact primary" disabled={formLoading}>
                                            <Check size={14} /> Adjust
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>

                {/* Col 3 */}
                <div className="compact-col">
                    {/* Connections */}
                    {(user.role === 'parent' || user.role === 'student') && (
                        <div className="compact-panel">
                            <div className="panel-head"><QrCode size={16} /> Connections</div>
                            <div className="dense-links">
                                <input
                                    type="text"
                                    placeholder={user.role === 'parent' ? "Find students to link..." : "Find parents to link..."}
                                    value={user.role === 'parent' ? childSearchQuery : parentSearchQuery}
                                    onChange={(e) => user.role === 'parent' ? setChildSearchQuery(e.target.value) : setParentSearchQuery(e.target.value)}
                                    className="inline-input full mb-xs"
                                />
                                <div className="link-list">
                                    {(() => {
                                        const query = (user.role === 'parent' ? childSearchQuery : parentSearchQuery).toLowerCase();
                                        const targets = allUsers.filter(u => u.role === (user.role === 'parent' ? 'student' : 'parent'));
                                        const filtered = targets.filter(t => t.username.toLowerCase().includes(query) || (t.nickname && t.nickname.toLowerCase().includes(query)));
                                        const linkedIds = new Set((user.role === 'parent' ? parentChildren : studentParents).map(c => c.id));

                                        if (filtered.length === 0) {
                                            return <div className="link-empty">No accounts match query</div>;
                                        }

                                        return filtered.map(t => {
                                            const isLinked = linkedIds.has(t.id);
                                            return (
                                                <div key={t.id} className="link-item">
                                                    <span className="link-name truncate">{t.nickname || t.username} (@{t.username})</span>
                                                    <button
                                                        type="button"
                                                        className={`btn-compact ${isLinked ? 'danger' : 'primary'} xs`}
                                                        onClick={() => user.role === 'parent' ? handleToggleChildLink(t.id, isLinked) : handleToggleParentLink(t.id, isLinked)}
                                                    >
                                                        {isLinked ? 'Unlink' : 'Link'}
                                                    </button>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                                {user.role === 'student' && connectionCode && (
                                    <div className="qr-tiny-box mt-sm">
                                        <span className="qr-tiny-lbl">Parent QR Code: <strong>{connectionCode}</strong></span>
                                        <button className="btn-icon small" onClick={() => window.print()} title="Print QR Connection Card">
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Perks Matrix */}
                    {user.role === 'student' && (
                        <div className="compact-panel">
                            <div className="panel-head"><Sparkles size={16} /> Perks Matrix</div>
                            <div className="dense-perks">
                                <button type="button" className={`perk-chip ${user.has_chat_font ? 'on' : 'off'}`} onClick={() => handleUpdateUser({ has_chat_font: !user.has_chat_font })}>Chat Font</button>
                                <button type="button" className={`perk-chip ${user.has_animated_border ? 'on' : 'off'}`} onClick={() => handleUpdateUser({ has_animated_border: !user.has_animated_border })}>Border</button>
                                <button type="button" className={`perk-chip ${user.has_auto_bitshift ? 'on' : 'off'}`} onClick={() => handleUpdateUser({ has_auto_bitshift: !user.has_auto_bitshift })}>Bitshift</button>
                                <button type="button" className={`perk-chip ${user.has_auto_claimer ? 'on' : 'off'}`} onClick={() => handleUpdateUser({ has_auto_claimer: !user.has_auto_claimer })}>Auto Claim</button>
                                <button type="button" className={`perk-chip ${user.has_double_duck ? 'on' : 'off'}`} onClick={() => handleUpdateUser({ has_double_duck: !user.has_double_duck })}>2x Duck</button>
                                <button type="button" className={`perk-chip ${user.has_custom_wallpaper ? 'on' : 'off'}`} onClick={() => handleUpdateUser({ has_custom_wallpaper: !user.has_custom_wallpaper })}>Wallpaper</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="compact-divider" />

            {/* ---------------- SENSITIVE ADMINISTRATIVE ACTIONS ---------------- */}
            <div className="admin-section-header mt-lg mb-xs danger-zone-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '1.5rem 0 0.5rem 0', fontSize: '1.1rem', color: '#b91c1c', fontWeight: 800 }}>
                    <ShieldAlert size={20} /> Sensitive Administrative Actions
                </h3>
            </div>

            <div className="compact-grid">
                {/* Col 1 */}
                <div className="compact-col">
                    {/* Access & Privileges */}
                    <div className="compact-panel">
                        <div className="panel-head">Access & Privileges</div>
                        
                        <div className="dense-form mb-sm" style={{ marginBottom: '1rem' }}>
                            <div className="dense-group">
                                <label htmlFor="input-role">Role</label>
                                <select id="input-role" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                                    <option value="student">Student</option>
                                    <option value="parent">Parent</option>
                                    <option value="teacher">Teacher</option>
                                </select>
                            </div>
                        </div>

                        <div className="dense-toggles">
                            <label className="dense-toggle">
                                <input type="checkbox" checked={editForm.is_admin} onChange={(e) => setEditForm({ ...editForm, is_admin: e.target.checked })} />
                                System Administrator
                            </label>
                            <label className="dense-toggle">
                                <input type="checkbox" checked={editForm.is_approved} onChange={(e) => setEditForm({ ...editForm, is_approved: e.target.checked })} />
                                Account Approved
                            </label>
                        </div>
                    </div>
                </div>

                {/* Col 2 */}
                <div className="compact-col">
                    {/* Password & Security */}
                    <div className="compact-panel">
                        <div className="panel-head"><Key size={16} /> Password Reset</div>
                        <form onSubmit={handleResetPassword} className="dense-form-group-stack">
                            <div className="pwd-row">
                                <input type={showNewPassword ? "text" : "password"} name="new_password" placeholder="New Password" required className="inline-input full" />
                                <button type="button" className="btn-icon small" onClick={() => setShowNewPassword(!showNewPassword)}>
                                    {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            <div className="pwd-row mt-xs">
                                <input type={showConfirmPassword ? "text" : "password"} name="confirm_password" placeholder="Confirm Password" required className="inline-input full" />
                                <button type="button" className="btn-icon small" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            <button type="submit" className="btn-compact warning w-full mt-xs" disabled={formLoading}>Reset Password</button>
                        </form>
                    </div>
                </div>

                {/* Col 3 */}
                <div className="compact-col">
                    {/* Danger Zone */}
                    {!user.is_admin && (
                        <div className="compact-panel danger-box">
                            <div className="panel-head" style={{ color: '#dc2626' }}>Danger Zone</div>
                            <button onClick={handleRemoveUser} className="btn-compact danger w-full">
                                <Trash2 size={15} /> Delete Account
                            </button>
                        </div>
                    )}
                </div>
            </div>
'''

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if '{/* ---------------- STANDARD USER OPERATIONS ---------------- */}' in line:
        start_idx = i
    if '{/* Printable QR Code for Parent Connection */}' in line:
        end_idx = i

if start_idx != -1 and end_idx != -1:
    lines[start_idx:end_idx] = [new_content]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Successfully replaced the section.")
else:
    print(f"Could not find bounds. start: {start_idx}, end: {end_idx}")
