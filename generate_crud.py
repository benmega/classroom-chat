import re

with open("frontend/src/admin/AdminPanel.jsx", "r") as f:
    content = f.read()

# Extract list components and their fields
list_pattern = re.compile(r"const (\w+)List = \(\) => \([\s\S]*?<Datagrid[\s\S]*?>([\s\S]*?)</Datagrid>[\s\S]*?\);")
matches = list_pattern.findall(content)

components_code = ""

for name, fields_block in matches:
    # Generate Create and Edit based on fields
    fields = []
    in_reference = False
    for line in fields_block.split("\n"):
        line = line.strip()
        if not line:
            continue
        if "<ReferenceField" in line:
            source = re.search(r'source="([^"]+)"', line).group(1)
            ref = re.search(r'reference="([^"]+)"', line).group(1)
            fields.append((source, f'ReferenceInput reference="{ref}"'))
            if "/>" not in line:
                in_reference = True
            continue
        if "</ReferenceField" in line:
            in_reference = False
            continue
        
        if in_reference:
            continue
            
        if "<TextField" in line:
            source = re.search(r'source="([^"]+)"', line).group(1)
            fields.append((source, "TextInput"))
        elif "<NumberField" in line:
            source = re.search(r'source="([^"]+)"', line).group(1)
            fields.append((source, "NumberInput"))
        elif "<BooleanField" in line:
            source = re.search(r'source="([^"]+)"', line).group(1)
            fields.append((source, "BooleanInput"))
        elif "<DateField" in line:
            source = re.search(r'source="([^"]+)"', line).group(1)
            # DateInput can handle Date strings
            fields.append((source, "DateInput"))

    # Build Create
    create_comp = f"const {name}Create = () => (\n    <Create>\n        <SimpleForm>\n"
    for source, type_str in fields:
        if source == "id" or source == "created_at" or source == "updated_at":
            continue # Skip read-only in create
        if type_str.startswith("ReferenceInput"):
            ref = re.search(r'reference="([^"]+)"', type_str).group(1)
            create_comp += f'            <ReferenceInput source="{source}" reference="{ref}" />\n'
        else:
            create_comp += f'            <{type_str} source="{source}" />\n'
    create_comp += "        </SimpleForm>\n    </Create>\n);\n"
    
    # Build Edit
    edit_comp = f"const {name}Edit = () => (\n    <Edit>\n        <SimpleForm>\n"
    for source, type_str in fields:
        if source == "id" or source == "created_at" or source == "updated_at":
            edit_comp += f'            <TextInput source="{source}" disabled />\n'
            continue
        if type_str.startswith("ReferenceInput"):
            ref = re.search(r'reference="([^"]+)"', type_str).group(1)
            edit_comp += f'            <ReferenceInput source="{source}" reference="{ref}" />\n'
        else:
            edit_comp += f'            <{type_str} source="{source}" />\n'
    edit_comp += "        </SimpleForm>\n    </Edit>\n);\n"

    with open("crud_components.jsx", "a", encoding="utf-8") as out:
        out.write(f"// --- {name} ---\n")
        out.write(create_comp + "\n")
        out.write(edit_comp + "\n")
