-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: project4
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `contact_messages`
--

DROP TABLE IF EXISTS `contact_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contact_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contact_messages`
--

LOCK TABLES `contact_messages` WRITE;
/*!40000 ALTER TABLE `contact_messages` DISABLE KEYS */;
INSERT INTO `contact_messages` VALUES (1,'Sample Manager','manager@example.com','613-555-0199','Hi, I am interested in joining your employee benefit service for our company.',1,'2026-06-21 16:18:36');
/*!40000 ALTER TABLE `contact_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employers`
--

DROP TABLE IF EXISTS `employers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `brand_primary_color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '#2563eb',
  `brand_secondary_color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '#4f46e5',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employers`
--

LOCK TABLES `employers` WRITE;
/*!40000 ALTER TABLE `employers` DISABLE KEYS */;
INSERT INTO `employers` VALUES (1,'Joe\'s Smoke Shop','joessmokeshop','https://images.unsplash.com/photo-1556742049-0cfed4f6a45d','100 Main Street, Ottawa, ON','613-555-0200','https://joessmokeshop.ca','manager@joessmokeshop.ca','#2563eb','#4f46e5','active','2026-06-21 16:18:36','2026-06-21 16:18:36'),(2,'Loblows','loblowsmart','https://images.unsplash.com/photo-1578916171728-46686eac8d58','200 Market Road, Ottawa, ON','6472832708','https://loblowsmart.ca','manager@loblowsmart.ca','#16a34a','#2563eb','active','2026-06-21 16:18:36','2026-06-21 16:18:36'),(3,'Algonquin college','algonquincollege','https://www.bing.com/th/id/OIP.xmKqzJWT17XZ1QKW3-D12gHaGL?w=193&h=161&c=8&rs=1&qlt=90&o=6&dpr=1.5&pid=3.1&rm=2',NULL,'6472832708','ac.orv','pate1648@algonquinlive.com','#2563eb','#4f46e5','active','2026-06-21 16:19:58','2026-06-21 16:19:58'),(4,'AMC','amc','https://www.bing.com/th/id/OIP.xmKqzJWT17XZ1QKW3-D12gHaGL?w=193&h=161&c=8&rs=1&qlt=90&o=6&dpr=1.5&pid=3.1&rm=2',NULL,'6472832708','ac.orv','pate1648@algonquinlive.com','#2563eb','#4f46e5','active','2026-06-21 17:02:57','2026-06-21 17:02:57');
/*!40000 ALTER TABLE `employers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `enrollment_batches`
--

DROP TABLE IF EXISTS `enrollment_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `enrollment_batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `partnership_id` int NOT NULL,
  `uploaded_by_user_id` int NOT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_count` int DEFAULT '0',
  `skipped_count` int DEFAULT '0',
  `status` enum('active','revoked') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `revoked_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_batches_partnership` (`partnership_id`),
  KEY `fk_batches_uploaded_by` (`uploaded_by_user_id`),
  CONSTRAINT `fk_batches_partnership` FOREIGN KEY (`partnership_id`) REFERENCES `partnerships` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_batches_uploaded_by` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `enrollment_batches`
--

LOCK TABLES `enrollment_batches` WRITE;
/*!40000 ALTER TABLE `enrollment_batches` DISABLE KEYS */;
INSERT INTO `enrollment_batches` VALUES (1,3,2,'demo_5_employees.csv',5,0,'active',NULL,'2026-06-21 16:20:36'),(7,4,9,'random_5_employees.csv',5,0,'active',NULL,'2026-06-21 20:03:35');
/*!40000 ALTER TABLE `enrollment_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `team_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `event_date` datetime DEFAULT NULL,
  `booking_link` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_events_team` (`team_id`),
  CONSTRAINT `fk_events_team` FOREIGN KEY (`team_id`) REFERENCES `home_buying_teams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `events`
--

LOCK TABLES `events` WRITE;
/*!40000 ALTER TABLE `events` DISABLE KEYS */;
INSERT INTO `events` VALUES (1,1,'First-Time Buyer Webinar','Live session covering affordability, pre-approval, and next steps.','2026-06-28 12:18:36','https://calendly.com/homeboost/webinar',1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(2,1,'Mortgage Q&A Session','Employees can ask mortgage and buying questions to the HomeBoost team.','2026-07-05 12:18:36','https://calendly.com/homeboost/mortgage-qa',1,'2026-06-21 16:18:36','2026-06-21 16:18:36');
/*!40000 ALTER TABLE `events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `faqs`
--

DROP TABLE IF EXISTS `faqs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faqs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `question` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `answer` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int DEFAULT '0',
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `faqs`
--

LOCK TABLES `faqs` WRITE;
/*!40000 ALTER TABLE `faqs` DISABLE KEYS */;
INSERT INTO `faqs` VALUES (1,'Who can use the employee portal?','Employees connected to an active employer partnership can create an account and access their assigned Home Buying Team resources.',1,1,1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(2,'Can employers upload employees?','Employer login is not required. The assigned HBT Admin can upload employees using a CSV file for the correct partnership.',2,2,1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(3,'Can a CSV upload be revoked?','Yes. HBT Admins can revoke a specific CSV upload batch, and the system removes only employees created by that exact upload.',3,3,1,'2026-06-21 16:18:36','2026-06-21 16:18:36');
/*!40000 ALTER TABLE `faqs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `home_buying_teams`
--

DROP TABLE IF EXISTS `home_buying_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `home_buying_teams` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `home_buying_teams`
--

LOCK TABLES `home_buying_teams` WRITE;
/*!40000 ALTER TABLE `home_buying_teams` DISABLE KEYS */;
INSERT INTO `home_buying_teams` VALUES (1,'HomeBoost Ottawa Team','A modern home buying team that supports employees with mortgage guidance, realtor strategy, events, and personalized next steps.','https://images.unsplash.com/photo-1560518883-ce09059eeffa','hbt@test.com','613-555-0100','https://homeboost.ca/ottawa',1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(2,'HomeBoost Toronto Team','A professional home buying support team helping employees with mortgage planning, realtor guidance, financial readiness, and first-time homebuyer education across the Greater Toronto Area.','https://images.unsplash.com/photo-1600585154340-be6161a56a0c','toronto@homeboost.ca','416-555-0188','https://homeboost.ca/toronto',1,'2026-06-21 16:18:36','2026-06-21 16:18:36');
/*!40000 ALTER TABLE `home_buying_teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message_threads`
--

DROP TABLE IF EXISTS `message_threads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_threads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_id` int DEFAULT NULL,
  `hbt_team_id` int DEFAULT NULL,
  `partnership_id` int DEFAULT NULL,
  `assigned_member_id` int DEFAULT NULL,
  `status` enum('open','pending','closed') COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `employee_id` (`employee_id`),
  KEY `hbt_team_id` (`hbt_team_id`),
  KEY `partnership_id` (`partnership_id`),
  KEY `assigned_member_id` (`assigned_member_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `message_threads_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `message_threads_ibfk_2` FOREIGN KEY (`hbt_team_id`) REFERENCES `home_buying_teams` (`id`) ON DELETE SET NULL,
  CONSTRAINT `message_threads_ibfk_3` FOREIGN KEY (`partnership_id`) REFERENCES `partnerships` (`id`) ON DELETE SET NULL,
  CONSTRAINT `message_threads_ibfk_4` FOREIGN KEY (`assigned_member_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `message_threads_ibfk_5` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_threads`
--

LOCK TABLES `message_threads` WRITE;
/*!40000 ALTER TABLE `message_threads` DISABLE KEYS */;
INSERT INTO `message_threads` VALUES (1,'Message for Toronto HBT Admin',21,2,4,9,'open',21,'2026-06-21 20:04:36','2026-06-21 20:04:36'),(2,'Admin support request',NULL,1,NULL,NULL,'closed',2,'2026-06-21 20:15:43','2026-06-21 20:16:12');
/*!40000 ALTER TABLE `message_threads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `thread_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `message_body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `thread_id` (`thread_id`),
  KEY `sender_id` (`sender_id`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`thread_id`) REFERENCES `message_threads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES (1,1,21,'\nHiii',1,'2026-06-21 20:04:36'),(2,2,2,'Hii i need your help\n',1,'2026-06-21 20:15:43');
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `page_sections`
--

DROP TABLE IF EXISTS `page_sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `page_sections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `page_id` int NOT NULL,
  `section_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subtitle` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `button_text` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `button_link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_order` int DEFAULT '0',
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_page_sections_page` (`page_id`),
  CONSTRAINT `fk_page_sections_page` FOREIGN KEY (`page_id`) REFERENCES `pages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `page_sections`
--

LOCK TABLES `page_sections` WRITE;
/*!40000 ALTER TABLE `page_sections` DISABLE KEYS */;
INSERT INTO `page_sections` VALUES (1,1,'hero','Premium Home Buying Benefits for Employees','One platform for employer home-buying benefits','A beautiful branded portal that connects every employee to trusted home-buying guidance. HomeBoost turns employer partnerships into a complete digital benefit experience with resources, quizzes, events, booking links, and role-based dashboards.','https://images.unsplash.com/photo-1560518883-ce09059eeffa','Open Portal','/login',1,1,1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(2,1,'how-it-works','How the partnership works','Simple setup for employers and employees','Admin creates a Home Buying Team, creates an employer partnership, and HBT members manage employee enrollment, resources, quizzes, events, and support.',NULL,'View Employer Portals','/partners',2,2,1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(3,2,'welcome','Welcome to your Employee Benefit Portal','Your home-buying journey starts here','Access resources, quizzes, team members, events, and booking links connected to your employer partnership.',NULL,'Start Quiz','/quiz/1',1,1,1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(4,1,'contact_intro','Get in touch with our team','We are here to help employers and employees learn more about the HomeBoost benefit program.','Have questions about setting up an employer partnership, enrolling employees, or accessing home-buying resources? Send us a message and our team will follow up with the next steps.','https://images.unsplash.com/photo-1556761175-b413da4baf72','Send Message','/contact',1,0,1,'2026-06-21 16:33:13','2026-06-21 16:33:13');
/*!40000 ALTER TABLE `page_sections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pages`
--

DROP TABLE IF EXISTS `pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pages`
--

LOCK TABLES `pages` WRITE;
/*!40000 ALTER TABLE `pages` DISABLE KEYS */;
INSERT INTO `pages` VALUES (1,'Home','home','Main public homepage',1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(2,'Employee Portal','employee-portal','Employee portal landing content',1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(3,'Pricing','pricing','Pricing and plans page',1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(4,'Contact','contact','Contact page',1,'2026-06-21 16:18:36','2026-06-21 16:18:36');
/*!40000 ALTER TABLE `pages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `partnerships`
--

DROP TABLE IF EXISTS `partnerships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `partnerships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `team_id` int NOT NULL,
  `employer_id` int NOT NULL,
  `slug` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `fk_partnership_team` (`team_id`),
  KEY `fk_partnership_employer` (`employer_id`),
  CONSTRAINT `fk_partnership_employer` FOREIGN KEY (`employer_id`) REFERENCES `employers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_partnership_team` FOREIGN KEY (`team_id`) REFERENCES `home_buying_teams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partnerships`
--

LOCK TABLES `partnerships` WRITE;
/*!40000 ALTER TABLE `partnerships` DISABLE KEYS */;
INSERT INTO `partnerships` VALUES (1,1,1,'joessmokeshop','active','2026-06-21 16:18:36','2026-06-21 16:18:36'),(2,1,2,'loblowsmart','active','2026-06-21 16:18:36','2026-06-21 16:18:36'),(3,1,3,'algonquincollege','active','2026-06-21 16:19:58','2026-06-21 16:19:58'),(4,2,4,'amc','active','2026-06-21 17:02:57','2026-06-21 17:02:57');
/*!40000 ALTER TABLE `partnerships` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pricing_plans`
--

DROP TABLE IF EXISTS `pricing_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pricing_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `features` text COLLATE utf8mb4_unicode_ci,
  `button_text` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `button_link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_order` int DEFAULT '0',
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pricing_plans`
--

LOCK TABLES `pricing_plans` WRITE;
/*!40000 ALTER TABLE `pricing_plans` DISABLE KEYS */;
INSERT INTO `pricing_plans` VALUES (1,'Employer Starter','Contact Us','Launch a branded home-buying benefit portal for your employees.','Branded portal\nEmployee signup\nResource library\nContact support','Contact Sales','/contact',1,1,1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(2,'Partnership Plus','Custom','Advanced support for organizations with multiple locations or teams.','Multiple employers\nCSV enrollment\nQuiz reporting\nEvents and booking links','Request Quote','/contact',2,2,1,'2026-06-21 16:18:36','2026-06-21 16:18:36');
/*!40000 ALTER TABLE `pricing_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quiz_answers`
--

DROP TABLE IF EXISTS `quiz_answers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quiz_answers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL,
  `question_id` int NOT NULL,
  `answer_text` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_quiz_answers_submission` (`submission_id`),
  KEY `fk_quiz_answers_question` (`question_id`),
  CONSTRAINT `fk_quiz_answers_question` FOREIGN KEY (`question_id`) REFERENCES `quiz_questions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_quiz_answers_submission` FOREIGN KEY (`submission_id`) REFERENCES `quiz_submissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quiz_answers`
--

LOCK TABLES `quiz_answers` WRITE;
/*!40000 ALTER TABLE `quiz_answers` DISABLE KEYS */;
INSERT INTO `quiz_answers` VALUES (1,1,1,'Yes','2026-06-21 16:25:45'),(2,1,2,'False','2026-06-21 16:25:45'),(3,1,3,'$0 - $10,000','2026-06-21 16:25:45'),(4,1,4,'Mortgage pre-approval, Finding a realtor','2026-06-21 16:25:45'),(5,1,5,'yes','2026-06-21 16:25:45'),(6,2,1,'Yes','2026-06-21 17:28:30'),(7,2,2,'True','2026-06-21 17:28:30'),(8,2,3,'$10,000 - $25,000','2026-06-21 17:28:30'),(9,2,4,'Understanding affordability','2026-06-21 17:28:30');
/*!40000 ALTER TABLE `quiz_answers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quiz_options`
--

DROP TABLE IF EXISTS `quiz_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quiz_options` (
  `id` int NOT NULL AUTO_INCREMENT,
  `question_id` int NOT NULL,
  `option_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_correct` tinyint(1) DEFAULT '0',
  `display_order` int DEFAULT '0',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_quiz_options_question` (`question_id`),
  CONSTRAINT `fk_quiz_options_question` FOREIGN KEY (`question_id`) REFERENCES `quiz_questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quiz_options`
--

LOCK TABLES `quiz_options` WRITE;
/*!40000 ALTER TABLE `quiz_options` DISABLE KEYS */;
INSERT INTO `quiz_options` VALUES (1,1,'Yes',0,1,1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(2,1,'No',0,2,2,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(3,1,'Not sure yet',0,3,3,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(4,2,'True',0,1,1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(5,2,'False',0,2,2,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(6,3,'$0 - $10,000',0,1,1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(7,3,'$10,000 - $25,000',0,2,2,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(8,3,'$25,000+',0,3,3,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(9,4,'Mortgage pre-approval',0,1,1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(10,4,'Finding a realtor',0,2,2,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(11,4,'Understanding affordability',0,3,3,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(12,4,'Learning the buying process',0,4,4,'2026-06-21 16:18:36','2026-06-21 16:18:36');
/*!40000 ALTER TABLE `quiz_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quiz_questions`
--

DROP TABLE IF EXISTS `quiz_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quiz_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quiz_id` int NOT NULL,
  `question_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'multiple_choice',
  `is_required` tinyint(1) DEFAULT '1',
  `display_order` int DEFAULT '0',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_quiz_questions_quiz` (`quiz_id`),
  CONSTRAINT `fk_quiz_questions_quiz` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quiz_questions`
--

LOCK TABLES `quiz_questions` WRITE;
/*!40000 ALTER TABLE `quiz_questions` DISABLE KEYS */;
INSERT INTO `quiz_questions` VALUES (1,1,'Are you planning to buy a home within the next 12 months?','multiple_choice',1,1,1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(2,1,'Have you spoken with a mortgage advisor before?','true_false',1,2,2,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(3,1,'What is your estimated down payment range?','dropdown',1,3,3,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(4,1,'What support do you need most right now?','checkbox',0,4,4,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(5,1,'Tell us anything else about your home buying goals.','paragraph',0,5,5,'2026-06-21 16:18:36','2026-06-21 16:18:36');
/*!40000 ALTER TABLE `quiz_questions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quiz_submissions`
--

DROP TABLE IF EXISTS `quiz_submissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quiz_submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quiz_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `partnership_id` int DEFAULT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `follow_up_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'new',
  PRIMARY KEY (`id`),
  KEY `fk_quiz_submissions_quiz` (`quiz_id`),
  KEY `fk_quiz_submissions_user` (`user_id`),
  KEY `fk_quiz_submissions_partnership` (`partnership_id`),
  CONSTRAINT `fk_quiz_submissions_partnership` FOREIGN KEY (`partnership_id`) REFERENCES `partnerships` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_quiz_submissions_quiz` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_quiz_submissions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quiz_submissions`
--

LOCK TABLES `quiz_submissions` WRITE;
/*!40000 ALTER TABLE `quiz_submissions` DISABLE KEYS */;
INSERT INTO `quiz_submissions` VALUES (1,1,3,1,'Demo Employee','employee@test.com','2026-06-21 16:25:45','new'),(2,1,NULL,4,'Maya Patel','maya.patel867@test.com','2026-06-21 17:28:30','new');
/*!40000 ALTER TABLE `quiz_submissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quizzes`
--

DROP TABLE IF EXISTS `quizzes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quizzes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `team_id` int DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `access_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'public',
  `is_global` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_quizzes_team` (`team_id`),
  CONSTRAINT `fk_quizzes_team` FOREIGN KEY (`team_id`) REFERENCES `home_buying_teams` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quizzes`
--

LOCK TABLES `quizzes` WRITE;
/*!40000 ALTER TABLE `quizzes` DISABLE KEYS */;
INSERT INTO `quizzes` VALUES (1,NULL,'Homeownership Readiness Quiz','Answer a few questions to help your Home Buying Team understand your goals and next steps.',1,'public',1,'2026-06-21 16:18:36','2026-06-21 16:18:36');
/*!40000 ALTER TABLE `quizzes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resources`
--

DROP TABLE IF EXISTS `resources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resources` (
  `id` int NOT NULL AUTO_INCREMENT,
  `team_id` int DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resource_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resource_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_order` int DEFAULT '0',
  `sort_order` int DEFAULT '0',
  `is_global` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_resources_team` (`team_id`),
  CONSTRAINT `fk_resources_team` FOREIGN KEY (`team_id`) REFERENCES `home_buying_teams` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resources`
--

LOCK TABLES `resources` WRITE;
/*!40000 ALTER TABLE `resources` DISABLE KEYS */;
INSERT INTO `resources` VALUES (1,NULL,'First-Time Homebuyer Checklist','A simple checklist to prepare employees for the home buying process.','Planning','article','https://homeboost.ca/resources/checklist','https://images.unsplash.com/photo-1560518883-ce09059eeffa',1,1,1,1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(2,NULL,'Mortgage Pre-Approval Guide','Learn what documents and steps are needed before applying for a mortgage.','Mortgage','article','https://homeboost.ca/resources/pre-approval','https://images.unsplash.com/photo-1560520031-3a4dc4e9de0c',2,2,1,1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(3,1,'Ottawa Market Starter Guide','Local buying tips and planning guidance for Ottawa employees.','Local Market','article','https://homeboost.ca/resources/ottawa-market','https://images.unsplash.com/photo-1564013799919-ab600027ffc6',3,3,0,1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(4,NULL,'First-Time Home Buyer Guide','A practical guide that explains the basic steps employees should follow before buying their first home, including budgeting, mortgage pre-approval, down payment planning, credit score preparation, and working with a trusted realtor.','Home Buying Education','article','https://www.cmhc-schl.gc.ca/consumers/home-buying','https://images.unsplash.com/photo-1560518883-ce09059eeffa',0,0,1,1,'2026-06-21 16:30:20','2026-06-21 16:30:20'),(5,NULL,'Understanding Down Payments','A short educational resource explaining how down payments work, why they matter, and how employees can plan savings before purchasing a home.','Financial Readiness','video','https://www.cmhc-schl.gc.ca/consumers/home-buying','https://images.unsplash.com/photo-1579621970563-ebec7560ff3e',0,0,1,1,'2026-06-21 16:32:02','2026-06-21 16:32:02');
/*!40000 ALTER TABLE `resources` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `section_cards`
--

DROP TABLE IF EXISTS `section_cards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `section_cards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `section_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `button_text` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `button_link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_order` int DEFAULT '0',
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_section_cards_section` (`section_id`),
  CONSTRAINT `fk_section_cards_section` FOREIGN KEY (`section_id`) REFERENCES `page_sections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `section_cards`
--

LOCK TABLES `section_cards` WRITE;
/*!40000 ALTER TABLE `section_cards` DISABLE KEYS */;
INSERT INTO `section_cards` VALUES (1,2,'Employer Branded Portals','Each partner company gets a dedicated public portal URL connected to the assigned Home Buying Team.',NULL,'View Portals','/partners',1,1,1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(2,2,'Employee Enrollment','HBT admins can upload employee CSV files and revoke the exact upload batch when needed.',NULL,'Login','/login',2,2,1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(3,2,'Resource and Quiz Management','Admins can manage content, quizzes, resources, FAQs, pricing, and messages from the control panel.',NULL,'Admin','/admin',3,3,1,'2026-06-21 16:18:36','2026-06-21 16:18:36');
/*!40000 ALTER TABLE `section_cards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_members`
--

DROP TABLE IF EXISTS `team_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `team_id` int NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `photo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `booking_link` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_team_members_team` (`team_id`),
  CONSTRAINT `fk_team_members_team` FOREIGN KEY (`team_id`) REFERENCES `home_buying_teams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_members`
--

LOCK TABLES `team_members` WRITE;
/*!40000 ALTER TABLE `team_members` DISABLE KEYS */;
INSERT INTO `team_members` VALUES (1,NULL,1,'Sarah Mortgage','Mortgage Advisor','sarah@homeboost.ca','613-555-0111','https://images.unsplash.com/photo-1494790108377-be9c29b29330','https://calendly.com/homeboost/sarah','Helps employees understand affordability, pre-approval, and financing options.',1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(2,NULL,1,'Michael Realtor','Realtor Partner','michael@homeboost.ca','613-555-0112','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d','https://calendly.com/homeboost/michael','Guides employees through property search strategy and offer preparation.',1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(3,NULL,2,'Priya Advisor','Home Buying Coach','priya@homeboost.ca','416-555-0122','https://images.unsplash.com/photo-1580489944761-15a19d654956','https://calendly.com/homeboost/priya','Supports employees with first-time buyer planning in the GTA.',1,'2026-06-21 16:18:36','2026-06-21 16:18:36'),(4,NULL,1,'Avadh Sureshbhai Patel','Lone Manager','pate1648@algonquinlive.com','6472832708','https://media.licdn.com/dms/image/v2/D4E03AQFxwTWwojop3A/profile-displayphoto-scale_200_200/B4EZpOpQlIGoAc-/0/1762256031429?e=1783555200&v=beta&t=vGT4vVoNwVD8xa5KzJTJ9GDDrGgFohRTcRBaaKDWk4Q','abac.com','Im loan advisor',1,'2026-06-21 16:21:52','2026-06-21 16:21:52');
/*!40000 ALTER TABLE `team_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('super_admin','admin','hbt_admin','hbt_member','employee') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'employee',
  `team_id` int DEFAULT NULL,
  `partnership_id` int DEFAULT NULL,
  `enrollment_batch_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_seen_at` datetime DEFAULT NULL,
  `is_online` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_team` (`team_id`),
  KEY `fk_users_partnership` (`partnership_id`),
  KEY `fk_users_enrollment_batch` (`enrollment_batch_id`),
  CONSTRAINT `fk_users_enrollment_batch` FOREIGN KEY (`enrollment_batch_id`) REFERENCES `enrollment_batches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_users_partnership` FOREIGN KEY (`partnership_id`) REFERENCES `partnerships` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_users_team` FOREIGN KEY (`team_id`) REFERENCES `home_buying_teams` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Super Admin','admin@test.com','$2b$10$koy0Qbl8R8Oww7G3Kt11E.9g67hUJiW7prTKfjGak86fLPwA56zN6','super_admin',NULL,NULL,NULL,1,'2026-06-21 16:18:36','2026-06-21 20:15:58','2026-06-21 16:15:58',1),(2,'HBT Admin','hbt@test.com','$2b$10$441zXWJYN9vAO9KmuAbxAul/1uJMC.pSkh5IGBTxWSsNzOBzzdz7u','hbt_admin',1,NULL,NULL,1,'2026-06-21 16:18:36','2026-06-21 20:15:17','2026-06-21 16:15:17',1),(3,'Demo Employee','employee@test.com','$2b$10$v70csULPkdwAgTtFIo2qgen0IuZ9Rkb7uxXqi8MzJb0LX4Zm7SDHW','employee',NULL,1,NULL,1,'2026-06-21 16:18:36','2026-06-21 20:09:22','2026-06-21 16:09:22',1),(4,'Avadh Patel','avadh.employee1@test.com','$2b$10$xnvvCrcdIgFS12DlDYALcOH11tS65xhLDUy4UL4tx8x8PqbQP7IIu','employee',NULL,3,1,1,'2026-06-21 16:20:36','2026-06-21 16:20:36',NULL,0),(5,'John Smith','john.employee2@test.com','$2b$10$xnvvCrcdIgFS12DlDYALcOH11tS65xhLDUy4UL4tx8x8PqbQP7IIu','employee',NULL,3,1,1,'2026-06-21 16:20:36','2026-06-21 16:20:36',NULL,0),(6,'Sarah Lee','sarah.employee3@test.com','$2b$10$xnvvCrcdIgFS12DlDYALcOH11tS65xhLDUy4UL4tx8x8PqbQP7IIu','employee',NULL,3,1,1,'2026-06-21 16:20:36','2026-06-21 16:20:36',NULL,0),(7,'Maria Garcia','maria.employee4@test.com','$2b$10$xnvvCrcdIgFS12DlDYALcOH11tS65xhLDUy4UL4tx8x8PqbQP7IIu','employee',NULL,3,1,1,'2026-06-21 16:20:36','2026-06-21 16:20:36',NULL,0),(8,'David Brown','david.employee5@test.com','$2b$10$xnvvCrcdIgFS12DlDYALcOH11tS65xhLDUy4UL4tx8x8PqbQP7IIu','employee',NULL,3,1,1,'2026-06-21 16:20:36','2026-06-21 16:20:36',NULL,0),(9,'Toronto HBT Admin','toronto.hbt@test.com','$2b$10$go.r8bxja23AaQLiJtPXhOkBFoXqLuwjDGkxp2/uIPMs6MhS4xoHm','hbt_admin',2,NULL,NULL,1,'2026-06-21 16:56:33','2026-06-21 20:05:07','2026-06-21 16:05:07',1),(20,'Priya Advisor','priya@homeboost.ca','$2b$10$fYJvI3gmpbGmvB7dplcdpealCJx3OB2FbyqcGEnanXez/ypTykZVi','hbt_member',2,NULL,NULL,1,'2026-06-21 18:30:20','2026-06-21 18:30:20',NULL,0),(21,'Maya Patel','maya.patel867@test.com','$2b$10$9/w8Z56k2/DqttmbqZgTYusOSaqNA8xkLckwRKGcg5QCWUoyQbos.','employee',NULL,4,7,1,'2026-06-21 20:03:35','2026-06-21 20:04:18','2026-06-21 16:04:18',1),(22,'Ethan Brown','ethan.brown780@test.com','$2b$10$Itl2JWx4wzTSIlW17irJhOWO5i9NPeTxN7NJZ7Dd.CXKcB3BvdZaW','employee',NULL,4,7,1,'2026-06-21 20:03:35','2026-06-21 20:03:35',NULL,0),(23,'Olivia Wilson','olivia.wilson657@test.com','$2b$10$y5/D1O6JgrKsEq9M9FerCew/zdDzCABhyKzNyM/badH8gDHuvHWVW','employee',NULL,4,7,1,'2026-06-21 20:03:35','2026-06-21 20:03:35',NULL,0),(24,'Noah Martin','noah.martin418@test.com','$2b$10$ZVzTG8e2J7tcQFHwGVXGseOF3GE963Tw/KrJwq.RXYvZ7Fg.BI26.','employee',NULL,4,7,1,'2026-06-21 20:03:35','2026-06-21 20:03:35',NULL,0),(25,'Sophia Singh','sophia.singh968@test.com','$2b$10$YSKAZj44xnuTCIdFZ7CGxeB2GZfh35nDnVTsJ2tB8avtAq705./nO','employee',NULL,4,7,1,'2026-06-21 20:03:35','2026-06-21 20:03:35',NULL,0);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-21 17:19:33
