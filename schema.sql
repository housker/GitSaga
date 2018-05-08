DROP DATABASE IF EXISTS test;

CREATE DATABASE test;

USE test;

DROP TABLE IF EXISTS `chapters`;

CREATE TABLE `chapters` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `title` CHAR(50),
  `content` TEXT(500),
  `votes` INTEGER,
  `geolocation` CHAR(50),
  `updated` TIMESTAMP,
  PRIMARY KEY (`id`)
);

/*  Execute this file from the command line by typing:
 *    mysql -u root < server/schema.sql
 *  to create the database and the tables.*/
