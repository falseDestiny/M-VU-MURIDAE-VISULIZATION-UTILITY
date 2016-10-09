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
    id SERIAL NOT NULL,
    username citext NOT NULL,
    password text NOT NULL,
    PRIMARY KEY (id)
);

-- ------------------------------------------------------------

--
-- GRANT PERMISSIONS
--
GRANT select, update, insert ON users TO owner;
GRANT select, usage ON users_id_seq TO owner;
