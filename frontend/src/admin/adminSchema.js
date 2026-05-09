/**
 * File: adminSchema.js
 * Summary: Override configuration for the dynamic admin panel.
 *
 * The admin UI auto-generates fields from the backend /api/admin/crud/schema/<resource>
 * endpoint. This file only defines what CANNOT be inferred from column types alone:
 *
 *   - FK reference overrides: which React-Admin "reference" resource and display
 *     field to use for a foreign-key column (instead of showing a raw integer ID).
 *   - Hidden fields: columns that exist in the DB but should NOT appear in the UI
 *     for a particular resource (beyond the global password_hash filter on the backend).
 *   - Read-only fields: columns that should render as disabled inputs in edit/create.
 *
 * When you add a new column to a SQLAlchemy model, you do NOT need to touch this file
 * unless that column is a FK, should be hidden, or should be read-only.
 */

/**
 * FK reference overrides.
 *
 * Key:   "<ResourceName>.<columnName>"   (ResourceName must match the react-admin Resource name)
 * Value: { reference: "<ResourceName>", displayField: "<field to show inside ReferenceField>" }
 *
 * The resource name in the key must be the CamelCase name used in AdminPanel
 * (e.g. "User", "Achievement", "Course") — NOT the SQLAlchemy table name.
 */
export const FK_OVERRIDES = {
    // User
    "Conversation.creator_id":      { reference: "User",         displayField: "username" },
    "Conversation.classroom_id":    { reference: "Classroom",    displayField: "name" },

    // Challenge
    "Challenge.classroom_id":       { reference: "Classroom",    displayField: "name" },

    // Message
    "Message.user_id":              { reference: "User",         displayField: "username" },
    "Message.conversation_id":      { reference: "Conversation", displayField: "title" },

    // UserAchievement
    "UserAchievement.user_id":      { reference: "User",         displayField: "username" },
    "UserAchievement.achievement_id":{ reference: "Achievement", displayField: "name" },

    // UserCertificate
    "UserCertificate.user_id":      { reference: "User",         displayField: "username" },
    "UserCertificate.achievement_id":{ reference: "Achievement", displayField: "name" },

    // Project
    "Project.user_id":              { reference: "User",         displayField: "username" },

    // SessionLog
    "SessionLog.user_id":           { reference: "User",         displayField: "username" },

    // Skill
    "Skill.user_id":                { reference: "User",         displayField: "username" },

    // CourseInstance
    "CourseInstance.classroom_id":  { reference: "Classroom",    displayField: "name" },
    "CourseInstance.course_id":     { reference: "Course",       displayField: "name" },

    // DuckTransaction
    "DuckTransaction.user_id":      { reference: "User",         displayField: "username" },

    // ChallengeLog
    "ChallengeLog.course_id":       { reference: "Course",       displayField: "name" },

    // Note
    "Note.user_id":                 { reference: "User",         displayField: "username" },
};

/**
 * Fields to hide entirely from the admin UI for a specific resource.
 * These still exist in the database — they are just not surfaced here.
 *
 * Key:   "<ResourceName>"
 * Value: Set of column names to hide
 */
export const HIDDEN_FIELDS = {
    User: new Set(["password_hash"]),
};

/**
 * Fields that are always read-only in edit/create forms (shown as disabled inputs).
 * The primary key ("id") is handled automatically and does not need to be listed here.
 */
export const READONLY_FIELDS = new Set(["created_at", "submitted_at", "earned_at", "timestamp", "added_on", "start_time", "end_time", "last_seen"]);

/**
 * The ordered list of resources to show in the admin navigation.
 * Order here controls the menu order.
 */
export const RESOURCES = [
    "User",
    "Message",
    "Achievement",
    "Conversation",
    "SessionLog",
    "UserAchievement",
    "UserCertificate",
    "Project",
    "Challenge",
    "AISettings",
    "BannedWords",
    "Configuration",
    "Classroom",
    "Skill",
    "DuckTradeLog",
    "Course",
    "CourseInstance",
    "DuckTransaction",
    "ChallengeLog",
    "Note",
];
