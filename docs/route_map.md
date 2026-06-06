# Classroom Chat Route Map

## Application Routes (Frontend)

Every available page in the React application, its component, and its required user role.

|Path|Component|Required Role|Sources|
|-|-|-|-|
|`/`|`Chat`|Student|`App.jsx`, `Layout.jsx`|
|`/login`|`Login`|Public (Guest)|`App.jsx`|
|`/signup`|`Signup`|Public (Guest)|`App.jsx`|
|`/profile/:slug?`|`Profile`|Student|`App.jsx`, `Layout.jsx`|
|`/achievements`|`Achievements`|Student|`App.jsx`, `Layout.jsx`|
|`/bit-shift`|`BitShift`|Student|`App.jsx`, `Layout.jsx`|
|`/submit-certificate`|`SubmitCertificate`|Student|`App.jsx`, `Layout.jsx`|
|`/submit-challenge`|`SubmitChallenge`|Student|`App.jsx`, `Layout.jsx`|
|`/history`|`History`|Student|`App.jsx`, `Layout.jsx`|
|`/settings`|`EditProfile`|Student|`App.jsx`, `Profile/index.jsx`|
|`/project/new`|`ManageProject`|Student|`App.jsx`, `Profile/index.jsx`|
|`/project/edit/:projectId`|`ManageProject`|Student|`App.jsx`, `Profile/index.jsx`|
|`/admin`|`AdminDashboard`|Admin|`App.jsx`, `AdminLayout.jsx`|
|`/admin/dashboard`|`AdminDashboard`|Admin|`App.jsx`|
|`/admin/pending-users`|`PendingUsers`|Admin|`App.jsx`, `AdminLayout.jsx`|
|`/admin/pending-trades`|`PendingTrades`|Admin|`App.jsx`, `AdminLayout.jsx`|
|`/admin/projects`|`AdminProjects`|Admin|`App.jsx`, `AdminLayout.jsx`|
|`/admin/add-achievement`|`AdminAchievements`|Admin|`App.jsx`, `AdminLayout.jsx`|
|`/admin/certificates`|`AdminCertificates`|Admin|`App.jsx`, `AdminLayout.jsx`|
|`/admin/documents`|`AdminDocuments`|Admin|`App.jsx`, `AdminLayout.jsx`|
|`/admin/advanced`|`AdvancedPanel`|Admin|`App.jsx`, `AdminLayout.jsx`|

## Backend API Endpoints

Key functional endpoints identified across backend blueprints.

|Path|Handler|Required Role|Blueprint|
|-|-|-|-|
|`/user/login`|`login`|Public|`user\\\_routes.py`|
|`/user/api/auth/status`|`auth\\\_status`|Public|`user\\\_routes.py`|
|`/user/logout`|`logout`|Public|`user\\\_routes.py`|
|`/user/signup`|`signup`|Public|`user\\\_routes.py`|
|`/user/profile`|`profile`|Student|`user\\\_routes.py`|
|`/user/profile/<slug>`|`view\\\_user\\\_profile`|Public|`user\\\_routes.py`|
|`/user/edit\\\_profile`|`edit\\\_profile`|Student|`user\\\_routes.py`|
|`/user/project/new`|`new\\\_project`|Student|`user\\\_routes.py`|
|`/user/project/edit/<id>`|`edit\\\_project`|Student|`user\\\_routes.py`|
|`/admin/dashboard`|`dashboard`|Admin|`admin\\\_routes.py`|
|`/admin/approve\\\_user/<id>`|`approve\\\_user`|Admin|`admin\\\_routes.py`|
|`/admin/reject\\\_user/<id>`|`reject\\\_user`|Admin|`admin\\\_routes.py`|
|`/admin/update\\\_duck\\\_multiplier`|`update\\\_duck\\\_multiplier`|**Public (Risk!)**|`admin\\\_routes.py`|
|`/admin/project/edit/<id>`|`edit\\\_project\\\_details`|**Public (Risk!)**|`admin\\\_routes.py`|
|`/message/send\\\_message`|`send\\\_message`|Student|`message\\\_routes.py`|
|`/message/api/conversations/<id>`|`get\\\_conversation\\\_history`|**Public (Risk!)**|`message\\\_routes.py`|
|`/message/view\\\_conversation/`|`view\\\_conversation`|Public|`message\\\_routes.py`|
|`/achievements/`|`achievements\\\_page`|Student|`achievement\\\_routes.py`|
|`/achievements/submit\\\_certificate`|`submit\\\_certificate`|Student|`achievement\\\_routes.py`|
|`/achievements/view\\\_certificate/<id>`|`view\\\_certificate`|Public|`achievement\\\_routes.py`|
|`/challenge/submit`|`submit\\\_challenge`|Student|`challenge\\\_routes.py`|
|`/session/heartbeat`|`heartbeat`|Student|`session\\\_routes.py`|

## Orphaned Routes

|Route|Type|Description|
|-|-|-|
|`/settings`|Frontend|No direct link in sidebar/dropdown. Only accessible from the Profile page.|
|`/admin/dashboard`|Frontend|Exists but navigation links only to `/admin`.|
|`/admin/set\\\_username`|Backend|No UI or API call found in the current application.|
|`/admin/verify\\\_password`|Backend|Legacy route, not used by the current frontend.|
|`/admin/clear-partial-history`|Backend|Functional but missing a corresponding button in the Admin UI.|
|`/admin/strike\\\_message/<id>`|Backend|Not linked in the Chat or Dashboard UI.|

## Security Discrepancies \& Discovered Flaws

|Path|Risk|Fault Description|
|-|-|-|
|`/admin/update\\\_duck\\\_multiplier`|**Critical**|Missing `@admin\\\_only` decorator. Any user can manipulate global reward rates.|
|`/admin/project/edit/<id>`|**High**|Missing `@admin\\\_only` decorator. Publicly editable project metadata.|
|`/message/api/conversations/<id>`|**High**|Public access to sensitive private chat histories without ownership check.|
|`/achievements/view\\\_certificate/`|**Medium**|Student certificates are served publicly viacert\_id.|
|`/message/view\\\_conversation/`|**Medium**|Publicly accessible conversation view.|
|`Profile/index.jsx` Broken Link|**Functional**|Links to `/admin/certificates/view/` which 404s (should be `/achievements/view\\\_certificate/`).|



