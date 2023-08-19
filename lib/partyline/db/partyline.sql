SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `partyline` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `partyline`;

DROP TABLE IF EXISTS `channel`;
CREATE TABLE `channel` (
  `id` int(10) UNSIGNED NOT NULL,
  `id_ur` int(10) UNSIGNED NOT NULL,
  `type` tinyint(1) UNSIGNED NOT NULL DEFAULT '0',
  `name` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created` int(10) UNSIGNED NOT NULL,
  `sidebar` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tagline` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `tag1` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `tag2` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `tag3` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `channel`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `id_ur` (`id_ur`),
  ADD KEY `tag1` (`tag1`),
  ADD KEY `tag2` (`tag2`),
  ADD KEY `tag3` (`tag3`);

ALTER TABLE `channel`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

DROP TABLE IF EXISTS `channel_message`;
CREATE TABLE `channel_message` (
  `id` int(10) UNSIGNED NOT NULL,
  `id_cl` int(10) UNSIGNED NOT NULL,
  `id_ur` int(10) UNSIGNED NOT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created` int(10) UNSIGNED NOT NULL,
  `updated` int(10) UNSIGNED NOT NULL DEFAULT '0',
  `updated_id_ur` int(10) UNSIGNED NOT NULL DEFAULT '0',
  `deleted` int(10) UNSIGNED NOT NULL DEFAULT '0',
  `deleted_id_ur` int(10) UNSIGNED NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `channel_message`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_cl` (`id_cl`),
  ADD KEY `id_ur` (`id_ur`),
  ADD KEY `updated_id_ur` (`updated_id_ur`),
  ADD KEY `deleted_id_ur` (`deleted_id_ur`);

ALTER TABLE `channel_message`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id` int(10) UNSIGNED NOT NULL,
  `confirmed` int(10) UNSIGNED NOT NULL DEFAULT '0',
  `username` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `login` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `login_created` int(10) UNSIGNED NOT NULL DEFAULT '0',
  `login_remember` tinyint(1) UNSIGNED NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

ALTER TABLE `user`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;
