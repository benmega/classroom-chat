/** Overrides for the dynamic admin panel: what cannot be inferred from column types (FK references, hidden fields, read-only fields). */

/**
 * FK reference overrides.
 *
 * Key:   "<ResourceName>.<columnName>"   (ResourceName must match the react-admin Resource name)
 * Value: { reference: "<ResourceName>", displayField: "<field to show inside ReferenceField>" }
 *
 * The resource name in the key must be the CamelCase name used in AdminPanel
 * (e.g. "User", "Achievement", "Course") — NOT the SQLAlchemy table name.
 *
 * displayField is a key of the referenced record, i.e. a column attribute name. User's
 * username column is mapped as "_username" (a "username" property sits on top of it).
 */
export const FK_OVERRIDES = {
    "Challenge.classroom_id":       { reference: "Classroom",    displayField: "name" },
    "Message.user_id":              { reference: "User",         displayField: "_username" },
    "UserAchievement.user_id":      { reference: "User",         displayField: "_username" },
    "UserAchievement.achievement_id":{ reference: "Achievement", displayField: "name" },
    "UserCertificate.user_id":      { reference: "User",         displayField: "_username" },
    "UserCertificate.achievement_id":{ reference: "Achievement", displayField: "name" },
    "Project.user_id":              { reference: "User",         displayField: "_username" },
    "SessionLog.user_id":           { reference: "User",         displayField: "_username" },
    "Skill.user_id":                { reference: "User",         displayField: "_username" },
    "CourseInstance.classroom_id":  { reference: "Classroom",    displayField: "name" },
    "CourseInstance.course_id":     { reference: "Course",       displayField: "name" },
    "DuckTransaction.user_id":      { reference: "User",         displayField: "_username" },
    "DuckTradeLog.user_id":         { reference: "User",         displayField: "_username" },
    "ChallengeLog.user_id":         { reference: "User",         displayField: "_username" },
    "ChallengeLog.course_id":       { reference: "Course",       displayField: "name" },
    "Note.user_id":                 { reference: "User",         displayField: "_username" },
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
    "SessionLog",
    "UserAchievement",
    "UserCertificate",
    "Project",
    "ProjectTemplate",
    "Challenge",
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
