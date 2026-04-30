import React from 'react';
import {
    Admin,
    BooleanField,
    BooleanInput,
    Create,
    Datagrid,
    DateField,
    DateInput,
    Edit,
    Layout,
    List,
    Menu,
    NumberField,
    NumberInput,
    ReferenceField,
    ReferenceInput,
    Resource,
    SimpleForm,
    TextField,
    TextInput
} from 'react-admin';
import dataProvider from './dataProvider';

const UserList = () => (
    <List>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <TextField source="username" />
            <TextField source="nickname" />
            <BooleanField source="is_admin" />
            <BooleanField source="is_approved" />
            <NumberField source="duck_balance" />
            <DateField source="created_at" />
        </Datagrid>
    </List>
);



const AchievementList = () => (
    <List>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <TextField source="name" />
            <TextField source="slug" />
            <TextField source="type" />
            <NumberField source="reward" />
        </Datagrid>
    </List>
);

const ConversationList = () => (
    <List>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <TextField source="title" />
            <ReferenceField source="creator_id" reference="User">
                <TextField source="username" />
            </ReferenceField>
            <DateField source="created_at" showTime />
        </Datagrid>
    </List>
);

const SessionLogList = () => (
    <List>
        <Datagrid>
            <TextField source="id" />
            <ReferenceField source="user_id" reference="User">
                <TextField source="username" />
            </ReferenceField>
            <DateField source="start_time" showTime />
            <DateField source="end_time" showTime />
            <DateField source="last_seen" showTime />
        </Datagrid>
    </List>
);

const MessageList = () => (
    <List>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <ReferenceField source="user_id" reference="User">
                <TextField source="username" />
            </ReferenceField>
            <ReferenceField source="conversation_id" reference="Conversation">
                <TextField source="title" />
            </ReferenceField>
            <TextField source="content" />
            <DateField source="created_at" showTime />
        </Datagrid>
    </List>
);

const UserAchievementList = () => (
    <List>
        <Datagrid>
            <TextField source="id" />
            <ReferenceField source="user_id" reference="User">
                <TextField source="username" />
            </ReferenceField>
            <ReferenceField source="achievement_id" reference="Achievement">
                <TextField source="name" />
            </ReferenceField>
            <DateField source="earned_at" showTime />
        </Datagrid>
    </List>
);

const UserCertificateList = () => (
    <List>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <ReferenceField source="user_id" reference="User">
                <TextField source="username" />
            </ReferenceField>
            <ReferenceField source="achievement_id" reference="Achievement">
                <TextField source="name" />
            </ReferenceField>
            <TextField source="url" />
            <BooleanField source="reviewed" />
            <DateField source="submitted_at" showTime />
        </Datagrid>
    </List>
);

const ProjectList = () => (
    <List>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <TextField source="name" />
            <ReferenceField source="user_id" reference="User">
                <TextField source="username" />
            </ReferenceField>
            <TextField source="link" />
            <TextField source="image_url" />
        </Datagrid>
    </List>
);

const ChallengeList = () => (
    <List>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <TextField source="title" />
            <TextField source="type" />
            <TextField source="difficulty" />
            <NumberField source="reward" />
            <BooleanField source="is_active" />
        </Datagrid>
    </List>
);

const AISettingsList = () => (
    <List>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <TextField source="key" />
            <TextField source="value" />
        </Datagrid>
    </List>
);

const BannedWordsList = () => (
    <List>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <TextField source="word" />
            <DateField source="added_on" showTime />
            <TextField source="reason" />
            <BooleanField source="active" />
        </Datagrid>
    </List>
);

const ConfigurationList = () => (
    <List>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <BooleanField source="ai_teacher_enabled" />
            <BooleanField source="message_sending_enabled" />
            <NumberField source="duck_multiplier" />
        </Datagrid>
    </List>
);

const ClassroomList = () => (
    <List>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <TextField source="name" />
            <TextField source="language" />
        </Datagrid>
    </List>
);

const SkillList = () => (
    <List>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <TextField source="name" />
            <ReferenceField source="user_id" reference="User">
                <TextField source="username" />
            </ReferenceField>
            <TextField source="category" />
            <TextField source="icon" />
            <NumberField source="proficiency" />
        </Datagrid>
    </List>
);

const DuckTradeLogList = () => (
    <List>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <TextField source="username" />
            <NumberField source="digital_ducks" />
            <TextField source="bit_ducks" />
            <TextField source="byte_ducks" />
            <TextField source="status" />
            <DateField source="timestamp" showTime />
        </Datagrid>
    </List>
);

const CourseList = () => (
    <List>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <TextField source="name" />
            <TextField source="domain" />
            <TextField source="description" />
            <BooleanField source="is_active" />
            <DateField source="created_at" showTime />
            <NumberField source="default_challenge_value" />
        </Datagrid>
    </List>
);

const CourseInstanceList = () => (
    <List>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <ReferenceField source="classroom_id" reference="Classroom">
                <TextField source="name" />
            </ReferenceField>
            <ReferenceField source="course_id" reference="Course">
                <TextField source="name" />
            </ReferenceField>
            <DateField source="created_at" showTime />
        </Datagrid>
    </List>
);

const DuckTransactionList = () => (
    <List>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <ReferenceField source="user_id" reference="User">
                <TextField source="username" />
            </ReferenceField>
            <NumberField source="amount" />
            <TextField source="reason" />
            <DateField source="timestamp" showTime />
        </Datagrid>
    </List>
);

const ChallengeLogList = () => (
    <List>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <TextField source="username" />
            <TextField source="domain" />
            <TextField source="challenge_slug" />
            <DateField source="timestamp" showTime />
            <ReferenceField source="course_id" reference="Course">
                <TextField source="name" />
            </ReferenceField>
            <TextField source="course_instance" />
            <TextField source="helper" />
        </Datagrid>
    </List>
);

const NoteList = () => (
    <List>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <ReferenceField source="user_id" reference="User">
                <TextField source="username" />
            </ReferenceField>
            <TextField source="filename" />
            <DateField source="created_at" showTime />
        </Datagrid>
    </List>
);


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




const CustomTopMenu = () => (
    <ul style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '10px',
        padding: '20px',
        backgroundColor: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-subtle)',
        maxHeight: '35vh',
        overflowY: 'auto',
        marginBottom: '20px',
        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
        boxShadow: 'var(--shadow-soft)',
        listStyle: 'none',
        margin: '0'
    }}>
        <Menu.ResourceItem name="User" />
        <Menu.ResourceItem name="Message" />
        <Menu.ResourceItem name="Achievement" />
        <Menu.ResourceItem name="Conversation" />
        <Menu.ResourceItem name="SessionLog" />
        <Menu.ResourceItem name="UserAchievement" />
        <Menu.ResourceItem name="UserCertificate" />
        <Menu.ResourceItem name="Project" />
        <Menu.ResourceItem name="Challenge" />
        <Menu.ResourceItem name="AISettings" />
        <Menu.ResourceItem name="BannedWords" />
        <Menu.ResourceItem name="Configuration" />
        <Menu.ResourceItem name="Classroom" />
        <Menu.ResourceItem name="Skill" />
        <Menu.ResourceItem name="DuckTradeLog" />
        <Menu.ResourceItem name="Course" />
        <Menu.ResourceItem name="CourseInstance" />
        <Menu.ResourceItem name="DuckTransaction" />
        <Menu.ResourceItem name="ChallengeLog" />
        <Menu.ResourceItem name="Note" />
    </ul>
);

const CustomLayout = (props) => (
    <Layout {...props} menu={() => null} sidebar={() => null}>
        <CustomTopMenu />
        {props.children}
    </Layout>
);

const AdminPanel = () => {
    return (
        <Admin 
            dataProvider={dataProvider} 
            basename="/admin/advanced-crud"
            layout={CustomLayout}
        >
            <Resource name="User" list={UserList} create={UserCreate} edit={UserEdit} />
            <Resource name="Message" list={MessageList} create={MessageCreate} edit={MessageEdit} />
            <Resource name="Achievement" list={AchievementList} create={AchievementCreate} edit={AchievementEdit} />
            <Resource name="Conversation" list={ConversationList} create={ConversationCreate} edit={ConversationEdit} />
            <Resource name="SessionLog" list={SessionLogList} create={SessionLogCreate} edit={SessionLogEdit} />
            <Resource name="UserAchievement" list={UserAchievementList} create={UserAchievementCreate} edit={UserAchievementEdit} />
            <Resource name="UserCertificate" list={UserCertificateList} create={UserCertificateCreate} edit={UserCertificateEdit} />
            <Resource name="Project" list={ProjectList} create={ProjectCreate} edit={ProjectEdit} />
            <Resource name="Challenge" list={ChallengeList} create={ChallengeCreate} edit={ChallengeEdit} />
            <Resource name="AISettings" list={AISettingsList} create={AISettingsCreate} edit={AISettingsEdit} />
            <Resource name="BannedWords" list={BannedWordsList} create={BannedWordsCreate} edit={BannedWordsEdit} />
            <Resource name="Configuration" list={ConfigurationList} create={ConfigurationCreate} edit={ConfigurationEdit} />
            <Resource name="Classroom" list={ClassroomList} create={ClassroomCreate} edit={ClassroomEdit} />
            <Resource name="Skill" list={SkillList} create={SkillCreate} edit={SkillEdit} />
            <Resource name="DuckTradeLog" list={DuckTradeLogList} create={DuckTradeLogCreate} edit={DuckTradeLogEdit} />
            <Resource name="Course" list={CourseList} create={CourseCreate} edit={CourseEdit} />
            <Resource name="CourseInstance" list={CourseInstanceList} create={CourseInstanceCreate} edit={CourseInstanceEdit} />
            <Resource name="DuckTransaction" list={DuckTransactionList} create={DuckTransactionCreate} edit={DuckTransactionEdit} />
            <Resource name="ChallengeLog" list={ChallengeLogList} create={ChallengeLogCreate} edit={ChallengeLogEdit} />
            <Resource name="Note" list={NoteList} create={NoteCreate} edit={NoteEdit} />
        </Admin>
    );
};

export default AdminPanel;
