DROP DATABASE IF EXISTS test;

CREATE DATABASE test;

USE test;

-- CREATE TABLE items (
--   id int NOT NULL AUTO_INCREMENT,
--   quantity integer NOT NULL,
--   description varchar(50) NOT NULL,
--   PRIMARY KEY (ID)
-- );


DROP TABLE IF EXISTS `chapters`;

CREATE TABLE `chapters` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `title` CHAR,
  `content` CHAR,
  `votes` INTEGER,
  `updated` TIMESTAMP,
  PRIMARY KEY (`id`)
);

/*  Execute this file from the command line by typing:
 *    mysql -u root < server/schema.sql
 *  to create the database and the tables.*/
