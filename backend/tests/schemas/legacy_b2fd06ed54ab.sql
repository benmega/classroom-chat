-- Schema only (no rows) of a long-lived database at Alembic revision b2fd06ed54ab.
--
-- Its tables were built over time by db.create_all() and by the migrations up to
-- that revision, so the DDL is not what the models generate today: extra server
-- defaults, unnamed and doubled constraints, tables that later revisions create or
-- drop. tests/test_schema.py upgrades this schema to head and compares the result
-- with the models.
--
-- Do not edit it to make a migration pass: fix the migration.

CREATE TABLE "achievement" (
	id INTEGER NOT NULL,
	slug VARCHAR(64) NOT NULL,
	name VARCHAR(128) NOT NULL,
	description VARCHAR(256),
	type VARCHAR(64) NOT NULL,
	requirement_value VARCHAR(128),
	reward INTEGER DEFAULT 1 NOT NULL,
	source VARCHAR(255) DEFAULT (NULL),
	PRIMARY KEY (id),
	CONSTRAINT uq_achievement_slug UNIQUE (slug),
	UNIQUE (slug)
);

CREATE TABLE ai_settings (
	id INTEGER NOT NULL,
	"key" VARCHAR(50),
	value VARCHAR(1000),
	PRIMARY KEY (id)
);

CREATE TABLE "banned_words" (
	id INTEGER NOT NULL,
	word VARCHAR(255) NOT NULL,
	added_on DATETIME,
	reason TEXT,
	active BOOLEAN NOT NULL,
	PRIMARY KEY (id),
	CONSTRAINT uq_banned_words_word UNIQUE (word),
	UNIQUE (word)
);

CREATE TABLE "challenge_logs" (
	id INTEGER NOT NULL,
	domain VARCHAR(100) NOT NULL,
	challenge_slug VARCHAR(255) NOT NULL,
	course_id VARCHAR(100),
	course_instance VARCHAR(100),
	timestamp DATETIME NOT NULL,
	helper VARCHAR(100) DEFAULT (NULL),
	user_id INTEGER NOT NULL,
	PRIMARY KEY (id),
	CONSTRAINT fk_challenge_logs_user_id_users FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE "challenges" (
	id INTEGER NOT NULL,
	name VARCHAR(255) NOT NULL,
	slug VARCHAR(255) NOT NULL,
	domain VARCHAR(100) NOT NULL,
	course_id VARCHAR(100),
	description TEXT,
	difficulty VARCHAR(50) NOT NULL,
	value INTEGER NOT NULL,
	is_active BOOLEAN NOT NULL,
	created_at DATETIME NOT NULL,
	classroom_id VARCHAR(64),
	PRIMARY KEY (id),
	CONSTRAINT uq_challenges_slug UNIQUE (slug),
	CONSTRAINT fk_challenges_classroom_id_classrooms FOREIGN KEY(classroom_id) REFERENCES classrooms (id) ON DELETE SET NULL,
	CONSTRAINT uq_challenges_name_domain UNIQUE (name, domain)
);

CREATE TABLE classroom_join_attempts (
	id INTEGER NOT NULL,
	student_id INTEGER NOT NULL,
	attempted_at DATETIME NOT NULL,
	code_attempted VARCHAR(10) NOT NULL,
	success BOOLEAN,
	CONSTRAINT pk_classroom_join_attempts PRIMARY KEY (id),
	CONSTRAINT fk_classroom_join_attempts_student_id_users FOREIGN KEY(student_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE "classrooms" (
	id VARCHAR(64) NOT NULL,
	name VARCHAR(255) NOT NULL,
	language VARCHAR(64) NOT NULL,
	created_at DATETIME DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	join_code VARCHAR(5),
	PRIMARY KEY (id)
);

CREATE TABLE "configuration" (
	id INTEGER NOT NULL,
	ai_teacher_enabled BOOLEAN,
	message_sending_enabled BOOLEAN,
	duck_multiplier FLOAT DEFAULT 1,
	PRIMARY KEY (id)
);

CREATE TABLE connection_attempts (
	id INTEGER NOT NULL,
	parent_id INTEGER NOT NULL,
	attempted_at DATETIME NOT NULL,
	code_attempted VARCHAR(10) NOT NULL,
	success BOOLEAN,
	CONSTRAINT pk_connection_attempts PRIMARY KEY (id),
	CONSTRAINT fk_connection_attempts_parent_id_users FOREIGN KEY(parent_id) REFERENCES users (id)
);

CREATE TABLE course_instance_requests (
	id INTEGER NOT NULL,
	student_id INTEGER NOT NULL,
	course_instance_id VARCHAR(64) NOT NULL,
	requested_course_id VARCHAR(64),
	url TEXT NOT NULL,
	status VARCHAR(20),
	created_at DATETIME,
	CONSTRAINT pk_course_instance_requests PRIMARY KEY (id),
	CONSTRAINT fk_course_instance_requests_student_id_users FOREIGN KEY(student_id) REFERENCES users (id)
);

CREATE TABLE "course_instances" (
	id VARCHAR(64) NOT NULL,
	classroom_id VARCHAR(64) NOT NULL,
	course_id VARCHAR(64),
	created_at DATETIME DEFAULT (CURRENT_TIMESTAMP),
	PRIMARY KEY (id),
	FOREIGN KEY(classroom_id) REFERENCES classrooms (id),
	FOREIGN KEY(course_id) REFERENCES courses (id)
);

CREATE TABLE courses (
	id VARCHAR(64) NOT NULL,
	name VARCHAR(255) NOT NULL,
	domain VARCHAR(255) NOT NULL,
	description TEXT,
	is_active BOOLEAN,
	created_at DATETIME, default_challenge_value INTEGER DEFAULT 0,
	PRIMARY KEY (id)
);

CREATE TABLE "duck_trade_log" (
	id INTEGER NOT NULL,
	digital_ducks INTEGER NOT NULL,
	bit_ducks JSON NOT NULL,
	byte_ducks JSON NOT NULL,
	status VARCHAR(20),
	timestamp DATETIME NOT NULL,
	user_id INTEGER NOT NULL,
	PRIMARY KEY (id),
	CONSTRAINT fk_duck_trade_log_user_id_users FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE duck_transactions (
                id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                amount FLOAT NOT NULL,
                reason VARCHAR(200),
                timestamp DATETIME,
                PRIMARY KEY (id),
                FOREIGN KEY(user_id) REFERENCES users (id)
            );

CREATE TABLE level_games (
	id INTEGER NOT NULL,
	course_id VARCHAR(64),
	chapter INTEGER,
	lesson INTEGER,
	challenge_level VARCHAR(10),
	assigned_lesson VARCHAR(50) NOT NULL,
	progression_order INTEGER NOT NULL,
	game_name VARCHAR(255) NOT NULL,
	game_url VARCHAR(1000) NOT NULL,
	platform VARCHAR(100),
	comment TEXT,
	requires_account BOOLEAN NOT NULL,
	rating FLOAT,
	verified BOOLEAN NOT NULL,
	created_at DATETIME NOT NULL,
	CONSTRAINT pk_level_games PRIMARY KEY (id)
);

CREATE TABLE message_classrooms (
	message_id INTEGER NOT NULL,
	classroom_id VARCHAR(64) NOT NULL,
	CONSTRAINT pk_message_classrooms PRIMARY KEY (message_id, classroom_id),
	CONSTRAINT fk_message_classrooms_message_id_messages FOREIGN KEY(message_id) REFERENCES messages (id) ON DELETE CASCADE,
	CONSTRAINT fk_message_classrooms_classroom_id_classrooms FOREIGN KEY(classroom_id) REFERENCES classrooms (id) ON DELETE CASCADE
);

CREATE TABLE message_users (
	message_id INTEGER NOT NULL,
	user_id INTEGER NOT NULL,
	CONSTRAINT pk_message_users PRIMARY KEY (message_id, user_id),
	CONSTRAINT fk_message_users_message_id_messages FOREIGN KEY(message_id) REFERENCES messages (id) ON DELETE CASCADE,
	CONSTRAINT fk_message_users_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE "messages" (
	id INTEGER NOT NULL,
	user_id INTEGER NOT NULL,
	content TEXT NOT NULL,
	message_type VARCHAR(12) NOT NULL,
	is_struck BOOLEAN,
	created_at DATETIME,
	edited_at DATETIME,
	deleted_at DATETIME,
	is_global BOOLEAN,
	target_live BOOLEAN, has_animated_border BOOLEAN, chat_font_color VARCHAR(7), animated_border_speed VARCHAR(10),
	PRIMARY KEY (id),
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE "notes" (
	id INTEGER NOT NULL,
	user_id INTEGER NOT NULL,
	filename VARCHAR(255) NOT NULL,
	created_at DATETIME DEFAULT (CURRENT_TIMESTAMP),
	PRIMARY KEY (id),
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE parent_messages (
	id INTEGER NOT NULL,
	parent_id INTEGER NOT NULL,
	subject VARCHAR(255),
	body TEXT NOT NULL,
	status VARCHAR(20),
	created_at DATETIME,
	resolved_at DATETIME,
	resolved_by_id INTEGER,
	CONSTRAINT pk_parent_messages PRIMARY KEY (id),
	CONSTRAINT fk_parent_messages_parent_id_users FOREIGN KEY(parent_id) REFERENCES users (id) ON DELETE CASCADE,
	CONSTRAINT fk_parent_messages_resolved_by_id_users FOREIGN KEY(resolved_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE parent_students (
	parent_id INTEGER NOT NULL,
	student_id INTEGER NOT NULL,
	CONSTRAINT pk_parent_students PRIMARY KEY (parent_id, student_id),
	CONSTRAINT uq_parent_student UNIQUE (parent_id, student_id),
	CONSTRAINT fk_parent_students_parent_id_users FOREIGN KEY(parent_id) REFERENCES users (id),
	CONSTRAINT fk_parent_students_student_id_users FOREIGN KEY(student_id) REFERENCES users (id)
);

CREATE TABLE project_templates (
	id INTEGER NOT NULL,
	name VARCHAR(100) NOT NULL,
	description TEXT NOT NULL,
	chapter VARCHAR(100),
	CONSTRAINT pk_project_templates PRIMARY KEY (id),
	CONSTRAINT uq_project_templates_name UNIQUE (name)
);

CREATE TABLE projects (
	id INTEGER NOT NULL,
	name VARCHAR(100) NOT NULL,
	description TEXT,
	link VARCHAR(255),
	user_id INTEGER NOT NULL, teacher_comment TEXT, code_snippet TEXT, github_link VARCHAR(255), video_url VARCHAR(255), image_url VARCHAR(255), video_transcript TEXT, created_at DATETIME, packets_awarded DOUBLE DEFAULT '0.0' NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE session_logs (
	id INTEGER NOT NULL,
	user_id INTEGER NOT NULL,
	start_time DATETIME NOT NULL,
	end_time DATETIME,
	last_seen DATETIME NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE "skills" (
	id INTEGER NOT NULL,
	name VARCHAR(50) NOT NULL,
	user_id INTEGER NOT NULL,
	category VARCHAR(50) DEFAULT 'concept',
	icon VARCHAR(50) DEFAULT 'fas fa-code',
	proficiency INTEGER DEFAULT 1,
	PRIMARY KEY (id),
	CONSTRAINT uq_skill_name_user UNIQUE (name, user_id),
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE standard_projects (
	id INTEGER NOT NULL,
	name VARCHAR(100) NOT NULL,
	description TEXT,
	link VARCHAR(255),
	github_link VARCHAR(255),
	video_url VARCHAR(255),
	code_snippet TEXT,
	image_url VARCHAR(255),
	CONSTRAINT pk_standard_projects PRIMARY KEY (id)
);

CREATE TABLE "store_items" (
	id INTEGER NOT NULL,
	name VARCHAR(128) NOT NULL,
	description TEXT NOT NULL,
	base_price DOUBLE NOT NULL,
	CONSTRAINT pk_store_items PRIMARY KEY (id),
	CONSTRAINT uq_store_items_name UNIQUE (name)
);

CREATE TABLE submissions (
	id INTEGER NOT NULL,
	user_id INTEGER NOT NULL,
	classroom_id VARCHAR(64),
	original_filename VARCHAR(255) NOT NULL,
	stored_path VARCHAR(255) NOT NULL,
	file_size INTEGER NOT NULL,
	note VARCHAR(500),
	teacher_note VARCHAR(500),
	status VARCHAR(20),
	timestamp DATETIME NOT NULL,
	CONSTRAINT pk_submissions PRIMARY KEY (id),
	CONSTRAINT fk_submissions_user_id_users FOREIGN KEY(user_id) REFERENCES users (id),
	CONSTRAINT fk_submissions_classroom_id_classrooms FOREIGN KEY(classroom_id) REFERENCES classrooms (id)
);

CREATE TABLE track_change_requests (
	id INTEGER NOT NULL,
	student_id INTEGER NOT NULL,
	requester_type VARCHAR(20) NOT NULL,
	requested_track VARCHAR(50) NOT NULL,
	status VARCHAR(20) NOT NULL,
	created_at DATETIME NOT NULL,
	CONSTRAINT pk_track_change_requests PRIMARY KEY (id),
	CONSTRAINT fk_track_change_requests_student_id_users FOREIGN KEY(student_id) REFERENCES users (id)
);

CREATE TABLE "user_achievement" (
	id INTEGER NOT NULL,
	user_id INTEGER NOT NULL,
	achievement_id INTEGER NOT NULL,
	earned_at DATETIME,
	PRIMARY KEY (id),
	CONSTRAINT uq_user_achievement_user_id UNIQUE (user_id, achievement_id),
	FOREIGN KEY(user_id) REFERENCES users (id),
	UNIQUE (user_id, achievement_id),
	FOREIGN KEY(achievement_id) REFERENCES achievement (id)
);

CREATE TABLE "user_certificate" (
	id INTEGER NOT NULL,
	user_id INTEGER NOT NULL,
	achievement_id INTEGER NOT NULL,
	url VARCHAR(256) NOT NULL,
	submitted_at DATETIME,
	file_path VARCHAR(256) DEFAULT (NULL),
	reviewed BOOLEAN DEFAULT 0,
	reviewed_at DATETIME DEFAULT (NULL),
	PRIMARY KEY (id),
	CONSTRAINT uq_user_certificate_user_id UNIQUE (user_id, achievement_id),
	FOREIGN KEY(user_id) REFERENCES users (id),
	UNIQUE (user_id, achievement_id),
	FOREIGN KEY(achievement_id) REFERENCES achievement (id)
);

CREATE TABLE user_classrooms (
	user_id INTEGER NOT NULL,
	classroom_id VARCHAR(64) NOT NULL,
	enrolled_at DATETIME NOT NULL,
	PRIMARY KEY (user_id, classroom_id),
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
	FOREIGN KEY(classroom_id) REFERENCES classrooms (id) ON DELETE CASCADE
);

CREATE TABLE user_item_purchases (
	id INTEGER NOT NULL,
	user_id INTEGER NOT NULL,
	item_id INTEGER NOT NULL,
	times_purchased INTEGER NOT NULL,
	CONSTRAINT pk_user_item_purchases PRIMARY KEY (id),
	CONSTRAINT uq_user_item UNIQUE (user_id, item_id),
	CONSTRAINT fk_user_item_purchases_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
	CONSTRAINT fk_user_item_purchases_item_id_store_items FOREIGN KEY(item_id) REFERENCES store_items (id) ON DELETE CASCADE
);

CREATE TABLE "users" (
	id INTEGER NOT NULL,
	current_activity VARCHAR(255),
	last_activity_time DATETIME,
	username VARCHAR(50) NOT NULL,
	password_hash VARCHAR(200) NOT NULL,
	profile_picture VARCHAR(150),
	ip_address VARCHAR(45),
	is_online BOOLEAN,
	nickname VARCHAR(50) DEFAULT (NULL) NOT NULL,
	earned_ducks DOUBLE DEFAULT 0 NOT NULL,
	duck_balance DOUBLE DEFAULT 0 NOT NULL,
	packets DOUBLE DEFAULT 0 NOT NULL,
	last_daily_duck DATE DEFAULT (NULL),
	is_admin BOOLEAN DEFAULT 0,
	slug VARCHAR(100),
	last_achievement_evaluation DATETIME,
	is_approved BOOLEAN DEFAULT 0,
	bio VARCHAR(500),
	created_at DATETIME,
	role VARCHAR(20) NOT NULL,
	email VARCHAR(120),
	cognito_sub VARCHAR(50),
	has_seen_tutorial BOOLEAN,
	connection_code VARCHAR(10),
	has_chat_font BOOLEAN,
	chat_font_color VARCHAR(7),
	has_animated_border BOOLEAN,
	has_auto_bitshift BOOLEAN,
	has_custom_wallpaper BOOLEAN,
	profile_wallpaper VARCHAR(255),
	has_auto_claimer BOOLEAN,
	drawer VARCHAR(4),
	has_double_duck BOOLEAN,
	animated_border_speed VARCHAR(10), active_track VARCHAR(50) DEFAULT 'ozaria' NOT NULL, can_chat BOOLEAN,
	PRIMARY KEY (id),
	CONSTRAINT uq_users_slug UNIQUE (slug),
	CONSTRAINT uq_users_email UNIQUE (email),
	CONSTRAINT uq_users_cognito_sub UNIQUE (cognito_sub),
	CONSTRAINT uq_users_drawer UNIQUE (drawer),
	CONSTRAINT uq_users_connection_code UNIQUE (connection_code),
	CONSTRAINT uq_users_username UNIQUE (username)
);

CREATE INDEX ix_challenge_log_user_slug_instance ON challenge_logs (user_id, challenge_slug, course_instance);

CREATE INDEX ix_challenge_logs_timestamp ON challenge_logs (timestamp);

CREATE INDEX ix_challenge_logs_user_id ON challenge_logs (user_id);

CREATE INDEX ix_classroom_join_attempts_attempted_at ON classroom_join_attempts (attempted_at);

CREATE INDEX ix_classroom_join_attempts_student_id ON classroom_join_attempts (student_id);

CREATE UNIQUE INDEX ix_classrooms_join_code ON classrooms (join_code);

CREATE INDEX ix_connection_attempts_attempted_at ON connection_attempts (attempted_at);

CREATE INDEX ix_connection_attempts_parent_id ON connection_attempts (parent_id);

CREATE INDEX ix_duck_trade_log_status ON duck_trade_log (status);

CREATE INDEX ix_duck_trade_log_timestamp ON duck_trade_log (timestamp);

CREATE INDEX ix_duck_trade_log_user_id ON duck_trade_log (user_id);

CREATE INDEX ix_duck_transactions_timestamp ON duck_transactions (timestamp);

CREATE INDEX ix_duck_transactions_user_id ON duck_transactions (user_id);

CREATE INDEX ix_level_games_assigned_lesson ON level_games (assigned_lesson);

CREATE INDEX ix_level_games_challenge_level ON level_games (challenge_level);

CREATE INDEX ix_level_games_chapter ON level_games (chapter);

CREATE INDEX ix_level_games_course_id ON level_games (course_id);

CREATE INDEX ix_level_games_lesson ON level_games (lesson);

CREATE INDEX ix_level_games_progression_order ON level_games (progression_order);

CREATE INDEX ix_messages_created_at ON messages (created_at);

CREATE INDEX ix_messages_user_id ON messages (user_id);

CREATE INDEX ix_parent_messages_created_at ON parent_messages (created_at);

CREATE INDEX ix_parent_messages_parent_id ON parent_messages (parent_id);

CREATE INDEX ix_parent_messages_status ON parent_messages (status);

CREATE INDEX ix_session_logs_user_id ON session_logs (user_id);

CREATE INDEX ix_submissions_classroom_id ON submissions (classroom_id);

CREATE INDEX ix_submissions_status ON submissions (status);

CREATE INDEX ix_submissions_timestamp ON submissions (timestamp);

CREATE INDEX ix_submissions_user_id ON submissions (user_id);

CREATE INDEX ix_track_change_requests_student_id_status ON track_change_requests (student_id, status);

CREATE INDEX ix_user_achievement_achievement_id ON user_achievement (achievement_id);

CREATE INDEX ix_user_achievement_user_id ON user_achievement (user_id);
