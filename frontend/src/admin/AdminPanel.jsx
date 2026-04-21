import React from 'react';
import { 
    Admin, 
    Resource, 
    ListGuesser, 
    EditGuesser, 
    ShowGuesser,
    List,
    Datagrid,
    TextField,
    NumberField,
    DateField,
    BooleanField,
    Edit,
    SimpleForm,
    TextInput,
    BooleanInput,
    NumberInput,
    Title
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

const UserEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <TextInput source="username" />
            <TextInput source="nickname" />
            <BooleanInput source="is_admin" />
            <BooleanInput source="is_approved" />
            <NumberInput source="duck_balance" />
            <TextInput source="bio" multiline />
        </SimpleForm>
    </Edit>
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

const MessageList = () => (
    <List>
        <Datagrid rowClick="edit">
            <TextField source="id" />
            <TextField source="user_id" />
            <TextField source="conversation_id" />
            <TextField source="content" />
            <DateField source="created_at" showTime />
        </Datagrid>
    </List>
);

const AdminPanel = () => {
    return (
        <Admin 
            dataProvider={dataProvider} 
            basename="/admin/advanced-crud"
        >
            <Resource name="User" list={UserList} edit={UserEdit} />
            <Resource name="Message" list={MessageList} />
            <Resource name="Achievement" list={AchievementList} />
            <Resource name="Conversation" list={ListGuesser} />
            <Resource name="SessionLog" list={ListGuesser} />
            <Resource name="UserAchievement" list={ListGuesser} />
            <Resource name="UserCertificate" list={ListGuesser} />
            <Resource name="Project" list={ListGuesser} />
            <Resource name="Challenge" list={ListGuesser} />
        </Admin>
    );
};

export default AdminPanel;
