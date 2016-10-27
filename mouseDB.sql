DROP DATABASE IF EXISTS mousedb;
CREATE DATABASE mousedb;
\c mousedb;

CREATE EXTENSION pgcrypto;
CREATE EXTENSION citext;
-- ------------------------------------------------------------

--
-- Create role
--

CREATE ROLE owner LOGIN PASSWORD '41PubBNmfQhmfCNy';

-- ------------------------------------------------------------

--
-- Table structure for users
--

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    userid SERIAL NOT NULL PRIMARY KEY,
    username citext NOT NULL,
    password text NOT NULL,
    admin boolean NOT NULL
);

DROP TABLE IF EXISTS datasets;
CREATE TABLE datasets (
    datasetID SERIAL NOT NULL PRIMARY KEY,
    uploadDate date NOT NULL,
    userid SERIAL REFERENCES users,
    UNIQUE (datasetID)
);

DROP TABLE IF EXISTS subject;
CREATE TABLE subject (
    idRFID int NOT NULL PRIMARY KEY,
    label text,
    customColor text
);

DROP TABLE IF EXISTS dataline;
CREATE TABLE dataline (
    datalineID SERIAL NOT NULL PRIMARY KEY,
    datasetID SERIAL REFERENCES datasets,
    idRFID int references subject,
    gridPos text NOT NULL,
    duration int NOT NULL
);

DROP TABLE IF EXISTS subjectmap;
CREATE TABLE subjectmap(
    datasetID SERIAL references datasets,
    idRFID int references subject
);
-- ------------------------------------------------------------

--
-- GRANT PERMISSIONS
--
GRANT select, update, insert ON users TO owner;
GRANT select, usage ON users_userid_seq TO owner;

-- ------------------------------------------------------------

--
-- INSERT SOME USERS FOR DEVELOPMENT
--
INSERT INTO users (username, password, admin) VALUES ('justin', crypt('password', gen_salt('bf')), true);
INSERT INTO users (username, password, admin) VALUES ('sean', crypt('password', gen_salt('bf')), true);
INSERT INTO users (username, password, admin) VALUES ('shane', crypt('password', gen_salt('bf')), true);
INSERT INTO users (username, password, admin) VALUES ('user', crypt('password', gen_salt('bf')), false);