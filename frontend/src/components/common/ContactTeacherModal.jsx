/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */
import React, { useState } from "react";
import { X, Send, MessageSquare } from "lucide-react";
import client from "../../api/client";
import toast from "react-hot-toast";

const ContactTeacherModal = ({ isOpen, onClose }) => {
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [sent, setSent] = useState(false);

    if (!isOpen) return null;

    const handleClose = () => {
        setSubject("");
        setBody("");
        setSent(false);
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!body.trim()) return;
        setIsSending(true);
        try {
            await client.post("/api/parents/contact-teacher", { subject: subject.trim(), body: body.trim() });
            setSent(true);
            toast.success("Message sent to teacher!");
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to send message.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Contact Teacher"
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.6)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1100,
                animation: "fadeIn 0.2s ease",
                padding: "1rem",
            }}
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div
                className="glass-panel"
                style={{
                    width: "100%",
                    maxWidth: "460px",
                    padding: "2rem",
                    background: "var(--bg-primary)",
                    borderRadius: "16px",
                    boxShadow: "var(--shadow-xl)",
                    position: "relative",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                        <MessageSquare size={20} color="var(--primary-color)" />
                        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Message the Teacher</h3>
                    </div>
                    <button
                        onClick={handleClose}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "0.25rem", borderRadius: "6px", display: "flex", alignItems: "center" }}
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {sent ? (
                    <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>✅</div>
                        <h4 style={{ margin: "0 0 0.5rem", color: "var(--text-primary)" }}>Message Sent!</h4>
                        <p style={{ margin: "0 0 1.5rem", color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.5 }}>
                            The teacher has received your message and will follow up with you.
                        </p>
                        <button className="btn-secondary" onClick={handleClose} style={{ justifyContent: "center" }}>
                            Close
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                            Send a message to your child&#39;s teacher. They&#39;ll receive it in their inbox.
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }} htmlFor="ct-subject">
                                Subject <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span>
                            </label>
                            <input
                                id="ct-subject"
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="e.g. Progress update, Question about class..."
                                maxLength={100}
                                style={{
                                    padding: "0.625rem 0.75rem",
                                    borderRadius: "8px",
                                    border: "1px solid var(--border-subtle)",
                                    background: "var(--bg-secondary)",
                                    color: "var(--text-primary)",
                                    fontSize: "0.875rem",
                                    outline: "none",
                                    width: "100%",
                                    boxSizing: "border-box",
                                }}
                            />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }} htmlFor="ct-body">
                                <span>Message <span style={{ color: "var(--error-color)" }}>*</span></span>
                                <span style={{ fontWeight: 400, color: body.length > 1800 ? "var(--error-color)" : "var(--text-muted)" }}>
                                    {body.length}/2000
                                </span>
                            </label>
                            <textarea
                                id="ct-body"
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Type your message here..."
                                maxLength={2000}
                                required
                                rows={5}
                                style={{
                                    padding: "0.625rem 0.75rem",
                                    borderRadius: "8px",
                                    border: "1px solid var(--border-subtle)",
                                    background: "var(--bg-secondary)",
                                    color: "var(--text-primary)",
                                    fontSize: "0.875rem",
                                    resize: "vertical",
                                    outline: "none",
                                    width: "100%",
                                    boxSizing: "border-box",
                                    fontFamily: "inherit",
                                    lineHeight: 1.5,
                                }}
                            />
                        </div>

                        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={handleClose}
                                style={{ flex: 1, justifyContent: "center", fontSize: "0.875rem" }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-premium"
                                disabled={isSending || !body.trim()}
                                style={{ flex: 1, justifyContent: "center", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
                            >
                                {isSending ? "Sending..." : <><Send size={15} /> Send Message</>}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ContactTeacherModal;
