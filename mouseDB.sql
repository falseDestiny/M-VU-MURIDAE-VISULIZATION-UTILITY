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
-- Table structure
--

DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    userid SERIAL NOT NULL PRIMARY KEY,
    username citext NOT NULL,
    password text NOT NULL,
    email TEXT UNIQUE CONSTRAINT valid_email CHECK (email ~ '\A\S+@\S+\.\S+\Z'),
    admin boolean NOT NULL
);

DROP TABLE IF EXISTS datasets CASCADE;
CREATE TABLE datasets (
    datasetID SERIAL NOT NULL PRIMARY KEY,
    uploadDate timestamp default current_timestamp,
    userid SERIAL REFERENCES users,
    heatData json NOT NULL,
    vectorData json NOT NULL,
    locationMap json NOT NULL,
    datasetName text NOT NULL,
    UNIQUE (datasetID)
);

-- ------------------------------------------------------------

--
-- GRANT PERMISSIONS
--
GRANT select, update, insert ON users, datasets TO owner;
GRANT delete ON users, datasets TO owner;
GRANT select, usage ON users_userid_seq, datasets_datasetID_seq TO owner;

-- ------------------------------------------------------------

--
-- INSERT SOME USERS FOR DEVELOPMENT
--
INSERT INTO users (username, password, email, admin) VALUES ('justin', crypt('password', gen_salt('bf')), 'fox51v2@yahoo.com', true);
INSERT INTO users (username, password, email, admin) VALUES ('sean', crypt('password', gen_salt('bf')), 'fox51v@yahoo.com', true);
INSERT INTO users (username, password, email, admin) VALUES ('shane', crypt('password', gen_salt('bf')), 'fox51@yahoo.com', true);
INSERT INTO users (username, password, email, admin) VALUES ('user', crypt('password', gen_salt('bf')), 'fox5@yahoo.com', false);
