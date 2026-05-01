import re

with open("frontend/src/admin/AdminPanel.jsx", "r") as f:
    content = f.read()

with open("crud_components.jsx", "r", encoding="utf-8") as f:
    crud_content = f.read()

# Remove the old UserCreate, UserEdit if any, actually UserEdit is there
content = re.sub(r"const UserEdit = \(\) => \([\s\S]*?\);", "", content)

# We need to add the imports for DateInput, Create, ReferenceInput
# Let's just make sure they are in the react-admin import
import_pattern = re.compile(r"import \{([\s\S]*?)\} from 'react-admin';")
imports_match = import_pattern.search(content)
if imports_match:
    imports = imports_match.group(1)
    new_imports = set([i.strip() for i in imports.split(",") if i.strip()])
    new_imports.update(["Create", "DateInput", "ReferenceInput"])
    new_imports_str = ",\n    ".join(sorted(list(new_imports)))
    content = content[:imports_match.start(1)] + "\n    " + new_imports_str + "\n" + content[imports_match.end(1):]

# Find the start of the components, let's place crud_content before `const AdminPanel = () => {`
admin_panel_index = content.find("const AdminPanel = () => {")
content = content[:admin_panel_index] + "\n" + crud_content + "\n" + content[admin_panel_index:]

# Update all <Resource name="..." list={...List} /> to include edit and create
def repl_resource(m):
    resource_name = m.group(1)
    if "create=" not in m.group(0):
        # build replacement
        return f'<Resource name="{resource_name}" list={{{resource_name}List}} create={{{resource_name}Create}} edit={{{resource_name}Edit}} />'
    return m.group(0)

content = re.sub(r'<Resource name="([^"]+)" list=\{[^}]+\}\s*(?:edit=\{[^}]+\})?\s*/>', repl_resource, content)

# Now inject the CustomMenu and CustomLayout right before AdminPanel
custom_layout_code = """
import { Layout, Menu } from 'react-admin';

const CustomMenu = () => (
    <Menu sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        maxHeight: '50vh', 
        overflowY: 'auto', 
        gap: '10px', 
        padding: '10px',
        backgroundColor: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '20px'
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
    </Menu>
);

const CustomLayout = (props) => <Layout {...props} menu={CustomMenu} />;
"""

# Wait, `import { Layout, Menu } from 'react-admin';` should be added to the top or we can just add Layout, Menu to the destructured imports
# Let's just modify `imports` instead.
imports_match = import_pattern.search(content)
if imports_match:
    imports = imports_match.group(1)
    new_imports = set([i.strip() for i in imports.split(",") if i.strip()])
    new_imports.update(["Layout", "Menu"])
    new_imports_str = ",\n    ".join(sorted(list(new_imports)))
    content = content[:imports_match.start(1)] + "\n    " + new_imports_str + "\n" + content[imports_match.end(1):]

custom_layout_code_no_import = """
const CustomMenu = () => (
    <Menu sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        maxHeight: '50vh', 
        overflowY: 'auto', 
        gap: '10px', 
        padding: '10px',
        backgroundColor: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '20px'
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
    </Menu>
);

const CustomLayout = (props) => <Layout {...props} menu={CustomMenu} />;
"""

admin_panel_index = content.find("const AdminPanel = () => {")
content = content[:admin_panel_index] + "\n" + custom_layout_code_no_import + "\n" + content[admin_panel_index:]

# Also pass layout={CustomLayout} to <Admin ...>
content = content.replace("<Admin \n            dataProvider={dataProvider} \n            basename=\"/admin/advanced-crud\"\n        >", "<Admin \n            dataProvider={dataProvider} \n            basename=\"/admin/advanced-crud\"\n            layout={CustomLayout}\n        >")

# Wait, `AdminPanel.jsx` has `<Admin dataProvider={dataProvider} basename="/admin/advanced-crud">`
content = re.sub(r'<Admin([^>]+)>', r'<Admin\1 layout={CustomLayout}>', content)


with open("frontend/src/admin/AdminPanel.jsx", "w", encoding="utf-8") as f:
    f.write(content)
