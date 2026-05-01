
import os
import sys
sys.path.insert(0, os.path.abspath('backend'))
from application import create_app
from application.extensions import db
from sqlalchemy import inspect

app = create_app()
with app.app_context():
    for mapper in db.Model.registry.mappers:
        model = mapper.class_
        name = model.__name__
        if name in ['User', 'Message', 'Achievement', 'Conversation', 'SessionLog', 'UserAchievement', 'UserCertificate', 'Project', 'Challenge']:
            continue
        print(f'const {name}List = () => (')
        print('    <List>')
        print('        <Datagrid rowClick=\"edit\">')
        for column in inspect(model).columns:
            if 'id' in column.name.lower() and column.name != 'id':
                ref = column.name.replace('_id', '').capitalize()
                print(f'            <ReferenceField source=\"{column.name}\" reference=\"{ref}\">')
                print('                <TextField source=\"id\" />')
                print('            </ReferenceField>')
            elif 'date' in column.name.lower() or 'time' in column.name.lower() or 'at' in column.name.lower() or str(column.type) == 'DATETIME':
                print(f'            <DateField source=\"{column.name}\" showTime />')
            elif str(column.type) == 'BOOLEAN':
                print(f'            <BooleanField source=\"{column.name}\" />')
            elif str(column.type) in ['INTEGER', 'FLOAT']:
                print(f'            <NumberField source=\"{column.name}\" />')
            else:
                print(f'            <TextField source=\"{column.name}\" />')
        print('        </Datagrid>')
        print('    </List>')
        print(');')
        print(f'<Resource name=\"{name}\" list={{{name}List}} />')
        print()

