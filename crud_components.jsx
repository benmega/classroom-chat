// --- User ---
const UserCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="username" />
            <TextInput source="nickname" />
            <BooleanInput source="is_admin" />
            <BooleanInput source="is_approved" />
            <NumberInput source="duck_balance" />
        </SimpleForm>
    </Create>
);

const UserEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <TextInput source="username" />
            <TextInput source="nickname" />
            <BooleanInput source="is_admin" />
            <BooleanInput source="is_approved" />
            <NumberInput source="duck_balance" />
            <TextInput source="created_at" disabled />
        </SimpleForm>
    </Edit>
);

// --- Achievement ---
const AchievementCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="name" />
            <TextInput source="slug" />
            <TextInput source="type" />
            <NumberInput source="reward" />
        </SimpleForm>
    </Create>
);

const AchievementEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <TextInput source="name" />
            <TextInput source="slug" />
            <TextInput source="type" />
            <NumberInput source="reward" />
        </SimpleForm>
    </Edit>
);

// --- Conversation ---
const ConversationCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="title" />
            <ReferenceInput source="creator_id" reference="User" />
        </SimpleForm>
    </Create>
);

const ConversationEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <TextInput source="title" />
            <ReferenceInput source="creator_id" reference="User" />
            <TextInput source="created_at" disabled />
        </SimpleForm>
    </Edit>
);

// --- SessionLog ---
const SessionLogCreate = () => (
    <Create>
        <SimpleForm>
            <ReferenceInput source="user_id" reference="User" />
            <DateInput source="start_time" />
            <DateInput source="end_time" />
            <DateInput source="last_seen" />
        </SimpleForm>
    </Create>
);

const SessionLogEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <ReferenceInput source="user_id" reference="User" />
            <DateInput source="start_time" />
            <DateInput source="end_time" />
            <DateInput source="last_seen" />
        </SimpleForm>
    </Edit>
);

// --- Message ---
const MessageCreate = () => (
    <Create>
        <SimpleForm>
            <ReferenceInput source="user_id" reference="User" />
            <ReferenceInput source="conversation_id" reference="Conversation" />
            <TextInput source="content" />
        </SimpleForm>
    </Create>
);

const MessageEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <ReferenceInput source="user_id" reference="User" />
            <ReferenceInput source="conversation_id" reference="Conversation" />
            <TextInput source="content" />
            <TextInput source="created_at" disabled />
        </SimpleForm>
    </Edit>
);

// --- UserAchievement ---
const UserAchievementCreate = () => (
    <Create>
        <SimpleForm>
            <ReferenceInput source="user_id" reference="User" />
            <ReferenceInput source="achievement_id" reference="Achievement" />
            <DateInput source="earned_at" />
        </SimpleForm>
    </Create>
);

const UserAchievementEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <ReferenceInput source="user_id" reference="User" />
            <ReferenceInput source="achievement_id" reference="Achievement" />
            <DateInput source="earned_at" />
        </SimpleForm>
    </Edit>
);

// --- UserCertificate ---
const UserCertificateCreate = () => (
    <Create>
        <SimpleForm>
            <ReferenceInput source="user_id" reference="User" />
            <ReferenceInput source="achievement_id" reference="Achievement" />
            <TextInput source="url" />
            <BooleanInput source="reviewed" />
            <DateInput source="submitted_at" />
        </SimpleForm>
    </Create>
);

const UserCertificateEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <ReferenceInput source="user_id" reference="User" />
            <ReferenceInput source="achievement_id" reference="Achievement" />
            <TextInput source="url" />
            <BooleanInput source="reviewed" />
            <DateInput source="submitted_at" />
        </SimpleForm>
    </Edit>
);

// --- Project ---
const ProjectCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="name" />
            <ReferenceInput source="user_id" reference="User" />
            <TextInput source="link" />
            <TextInput source="image_url" />
        </SimpleForm>
    </Create>
);

const ProjectEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <TextInput source="name" />
            <ReferenceInput source="user_id" reference="User" />
            <TextInput source="link" />
            <TextInput source="image_url" />
        </SimpleForm>
    </Edit>
);

// --- Challenge ---
const ChallengeCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="title" />
            <TextInput source="type" />
            <TextInput source="difficulty" />
            <NumberInput source="reward" />
            <BooleanInput source="is_active" />
        </SimpleForm>
    </Create>
);

const ChallengeEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <TextInput source="title" />
            <TextInput source="type" />
            <TextInput source="difficulty" />
            <NumberInput source="reward" />
            <BooleanInput source="is_active" />
        </SimpleForm>
    </Edit>
);

// --- AISettings ---
const AISettingsCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="key" />
            <TextInput source="value" />
        </SimpleForm>
    </Create>
);

const AISettingsEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <TextInput source="key" />
            <TextInput source="value" />
        </SimpleForm>
    </Edit>
);

// --- BannedWords ---
const BannedWordsCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="word" />
            <DateInput source="added_on" />
            <TextInput source="reason" />
            <BooleanInput source="active" />
        </SimpleForm>
    </Create>
);

const BannedWordsEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <TextInput source="word" />
            <DateInput source="added_on" />
            <TextInput source="reason" />
            <BooleanInput source="active" />
        </SimpleForm>
    </Edit>
);

// --- Configuration ---
const ConfigurationCreate = () => (
    <Create>
        <SimpleForm>
            <BooleanInput source="ai_teacher_enabled" />
            <BooleanInput source="message_sending_enabled" />
            <NumberInput source="duck_multiplier" />
        </SimpleForm>
    </Create>
);

const ConfigurationEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <BooleanInput source="ai_teacher_enabled" />
            <BooleanInput source="message_sending_enabled" />
            <NumberInput source="duck_multiplier" />
        </SimpleForm>
    </Edit>
);

// --- Classroom ---
const ClassroomCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="name" />
            <TextInput source="language" />
        </SimpleForm>
    </Create>
);

const ClassroomEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <TextInput source="name" />
            <TextInput source="language" />
        </SimpleForm>
    </Edit>
);

// --- Skill ---
const SkillCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="name" />
            <ReferenceInput source="user_id" reference="User" />
            <TextInput source="category" />
            <TextInput source="icon" />
            <NumberInput source="proficiency" />
        </SimpleForm>
    </Create>
);

const SkillEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <TextInput source="name" />
            <ReferenceInput source="user_id" reference="User" />
            <TextInput source="category" />
            <TextInput source="icon" />
            <NumberInput source="proficiency" />
        </SimpleForm>
    </Edit>
);

// --- DuckTradeLog ---
const DuckTradeLogCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="username" />
            <NumberInput source="digital_ducks" />
            <TextInput source="bit_ducks" />
            <TextInput source="byte_ducks" />
            <TextInput source="status" />
            <DateInput source="timestamp" />
        </SimpleForm>
    </Create>
);

const DuckTradeLogEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <TextInput source="username" />
            <NumberInput source="digital_ducks" />
            <TextInput source="bit_ducks" />
            <TextInput source="byte_ducks" />
            <TextInput source="status" />
            <DateInput source="timestamp" />
        </SimpleForm>
    </Edit>
);

// --- Course ---
const CourseCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="name" />
            <TextInput source="domain" />
            <TextInput source="description" />
            <BooleanInput source="is_active" />
            <NumberInput source="default_challenge_value" />
        </SimpleForm>
    </Create>
);

const CourseEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <TextInput source="name" />
            <TextInput source="domain" />
            <TextInput source="description" />
            <BooleanInput source="is_active" />
            <TextInput source="created_at" disabled />
            <NumberInput source="default_challenge_value" />
        </SimpleForm>
    </Edit>
);

// --- CourseInstance ---
const CourseInstanceCreate = () => (
    <Create>
        <SimpleForm>
            <ReferenceInput source="classroom_id" reference="Classroom" />
            <ReferenceInput source="course_id" reference="Course" />
        </SimpleForm>
    </Create>
);

const CourseInstanceEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <ReferenceInput source="classroom_id" reference="Classroom" />
            <ReferenceInput source="course_id" reference="Course" />
            <TextInput source="created_at" disabled />
        </SimpleForm>
    </Edit>
);

// --- DuckTransaction ---
const DuckTransactionCreate = () => (
    <Create>
        <SimpleForm>
            <ReferenceInput source="user_id" reference="User" />
            <NumberInput source="amount" />
            <TextInput source="reason" />
            <DateInput source="timestamp" />
        </SimpleForm>
    </Create>
);

const DuckTransactionEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <ReferenceInput source="user_id" reference="User" />
            <NumberInput source="amount" />
            <TextInput source="reason" />
            <DateInput source="timestamp" />
        </SimpleForm>
    </Edit>
);

// --- ChallengeLog ---
const ChallengeLogCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="username" />
            <TextInput source="domain" />
            <TextInput source="challenge_slug" />
            <DateInput source="timestamp" />
            <ReferenceInput source="course_id" reference="Course" />
            <TextInput source="course_instance" />
            <TextInput source="helper" />
        </SimpleForm>
    </Create>
);

const ChallengeLogEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <TextInput source="username" />
            <TextInput source="domain" />
            <TextInput source="challenge_slug" />
            <DateInput source="timestamp" />
            <ReferenceInput source="course_id" reference="Course" />
            <TextInput source="course_instance" />
            <TextInput source="helper" />
        </SimpleForm>
    </Edit>
);

// --- Note ---
const NoteCreate = () => (
    <Create>
        <SimpleForm>
            <ReferenceInput source="user_id" reference="User" />
            <TextInput source="filename" />
        </SimpleForm>
    </Create>
);

const NoteEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <ReferenceInput source="user_id" reference="User" />
            <TextInput source="filename" />
            <TextInput source="created_at" disabled />
        </SimpleForm>
    </Edit>
);

