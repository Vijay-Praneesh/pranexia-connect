-- =============================================================================
-- Seyyon Connect (Pranexia Connect) - Production Database Schema
-- Modules #1 to #16 (Complete Production Baseline)
-- Dialect: MySQL 8.0+ / InnoDB / utf8mb4
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Companies Table (Tenant entity)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `companies` (
  `id` CHAR(36) NOT NULL,
  `company_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `mobile` VARCHAR(20) NOT NULL,
  `plan` ENUM('STARTER', 'BUSINESS', 'PROFESSIONAL', 'ENTERPRISE') NOT NULL DEFAULT 'STARTER',
  `custom_limits` JSON NULL,
  `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `companies_email_unique` (`email`),
  UNIQUE KEY `companies_mobile_unique` (`mobile`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Users Table (Multi-tenant users + SUPER_ADMIN)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NULL,
  `first_name` VARCHAR(255) NOT NULL,
  `last_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `mobile` VARCHAR(20) NOT NULL,
  `password` VARCHAR(255) NULL,
  `auth_provider` ENUM('LOCAL', 'GOOGLE') NOT NULL DEFAULT 'LOCAL',
  `google_id` VARCHAR(255) NULL,
  `email_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `role` ENUM('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE') NOT NULL DEFAULT 'EMPLOYEE',
  `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_mobile_unique` (`mobile`),
  UNIQUE KEY `users_google_id_unique` (`google_id`),
  KEY `users_company_id_fk` (`company_id`),
  CONSTRAINT `users_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. WhatsApp Connections Table (Tenant WABA + Phone Mapping)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `whatsapp_connections` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `waba_id` VARCHAR(255) NOT NULL,
  `phone_number_id` VARCHAR(255) NOT NULL,
  `display_phone_number` VARCHAR(50) NULL,
  `verified_name` VARCHAR(255) NULL,
  `access_token_encrypted` TEXT NOT NULL,
  `status` ENUM('CONNECTED', 'DISCONNECTED', 'ERROR') NOT NULL DEFAULT 'DISCONNECTED',
  `connected_at` DATETIME NULL,
  `disconnected_at` DATETIME NULL,
  `last_error` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `whatsapp_connections_company_id_unique` (`company_id`),
  UNIQUE KEY `whatsapp_connections_phone_number_id_unique` (`phone_number_id`),
  KEY `whatsapp_connections_waba_id_idx` (`waba_id`),
  CONSTRAINT `whatsapp_connections_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Customers Table (Tenant Contacts)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customers` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `phone_number` VARCHAR(20) NOT NULL,
  `country_code` VARCHAR(5) NOT NULL,
  `email` VARCHAR(255) NULL,
  `status` ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `tags` JSON NULL,
  `custom_fields` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `customers_company_id_fk` (`company_id`),
  KEY `customers_phone_number_idx` (`phone_number`),
  CONSTRAINT `customers_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Media Table (Tenant Uploaded Files)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `media` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `stored_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `media_type` ENUM('IMAGE', 'VIDEO', 'DOCUMENT') NOT NULL,
  `size` BIGINT NOT NULL,
  `storage_key` VARCHAR(500) NOT NULL,
  `status` ENUM('READY', 'PROCESSING', 'FAILED', 'DELETED') NOT NULL DEFAULT 'READY',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `media_company_id_fk` (`company_id`),
  CONSTRAINT `media_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Templates Table (Meta WhatsApp Templates)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `templates` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `meta_template_id` VARCHAR(255) NULL,
  `meta_template_name` VARCHAR(255) NOT NULL,
  `language` VARCHAR(20) NOT NULL DEFAULT 'en_US',
  `category` VARCHAR(50) NOT NULL,
  `status` ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED') NOT NULL DEFAULT 'DRAFT',
  `components` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `templates_company_id_fk` (`company_id`),
  KEY `templates_meta_template_id_idx` (`meta_template_id`),
  CONSTRAINT `templates_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Campaigns Table (Marketing / Notification Campaigns)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `campaigns` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `template_id` CHAR(36) NOT NULL,
  `media_id` CHAR(36) NULL,
  `name` VARCHAR(255) NOT NULL,
  `send_type` ENUM('IMMEDIATE', 'SCHEDULED') NOT NULL DEFAULT 'IMMEDIATE',
  `scheduled_at` DATETIME NULL,
  `status` ENUM('DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `total_recipients` INT DEFAULT 0,
  `sent_count` INT DEFAULT 0,
  `delivered_count` INT DEFAULT 0,
  `read_count` INT DEFAULT 0,
  `failed_count` INT DEFAULT 0,
  `claimed_at` DATETIME NULL,
  `completed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `campaigns_company_id_fk` (`company_id`),
  KEY `campaigns_template_id_fk` (`template_id`),
  KEY `campaigns_media_id_fk` (`media_id`),
  KEY `campaigns_status_scheduled_idx` (`status`, `scheduled_at`),
  CONSTRAINT `campaigns_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `campaigns_template_id_fk` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `campaigns_media_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Campaign Recipients Table (Per-message delivery & status)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `campaign_recipients` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `campaign_id` CHAR(36) NOT NULL,
  `customer_id` CHAR(36) NOT NULL,
  `whatsapp_message_id` VARCHAR(255) NULL,
  `status` ENUM('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `sent_at` DATETIME NULL,
  `delivered_at` DATETIME NULL,
  `read_at` DATETIME NULL,
  `failure_reason` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `campaign_recipients_wamid_unique` (`whatsapp_message_id`),
  KEY `campaign_recipients_company_id_fk` (`company_id`),
  KEY `campaign_recipients_campaign_id_fk` (`campaign_id`),
  KEY `campaign_recipients_customer_id_fk` (`customer_id`),
  CONSTRAINT `campaign_recipients_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `campaign_recipients_campaign_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `campaign_recipients_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Usages Table (Monthly Tenant Metering Summary)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `usages` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `billing_period` VARCHAR(7) NOT NULL,
  `messages_count` INT DEFAULT 0,
  `campaigns_count` INT DEFAULT 0,
  `media_uploads_count` INT DEFAULT 0,
  `media_storage_bytes` BIGINT DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `usages_company_period_unique` (`company_id`, `billing_period`),
  CONSTRAINT `usages_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Usage Events Table (Immutable Metering Event Log)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `usage_events` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `event_type` VARCHAR(50) NOT NULL,
  `event_data` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `usage_events_company_id_fk` (`company_id`),
  KEY `usage_events_created_at_idx` (`created_at`),
  CONSTRAINT `usage_events_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. Meta Usages Table (WhatsApp Category Analytics)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `meta_usages` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `billing_period` VARCHAR(7) NOT NULL,
  `conversation_category` VARCHAR(50) NOT NULL,
  `conversation_count` INT DEFAULT 0,
  `cost` DECIMAL(10, 4) DEFAULT 0.0000,
  `currency` VARCHAR(3) DEFAULT 'INR',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `meta_usages_company_id_fk` (`company_id`),
  CONSTRAINT `meta_usages_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. Subscriptions Table (Authoritative Plan State)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `plan` ENUM('STARTER', 'BUSINESS', 'PROFESSIONAL', 'ENTERPRISE') NOT NULL DEFAULT 'STARTER',
  `status` ENUM('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'TRIALING',
  `start_date` DATETIME NOT NULL,
  `trial_ends_at` DATETIME NULL,
  `current_period_start` DATETIME NOT NULL,
  `current_period_end` DATETIME NOT NULL,
  `cancel_at_period_end` TINYINT(1) DEFAULT 0,
  `ended_at` DATETIME NULL,
  `pending_plan` ENUM('STARTER', 'BUSINESS', 'PROFESSIONAL', 'ENTERPRISE') NULL,
  `pending_plan_effective_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `subscriptions_company_id_fk` (`company_id`),
  KEY `subscriptions_status_period_idx` (`status`, `current_period_end`),
  CONSTRAINT `subscriptions_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 13. Subscription Histories Table (Audit Log for Transitions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subscription_histories` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `subscription_id` CHAR(36) NULL,
  `previous_plan` VARCHAR(50) NULL,
  `new_plan` VARCHAR(50) NULL,
  `previous_status` VARCHAR(50) NULL,
  `new_status` VARCHAR(50) NULL,
  `action` VARCHAR(50) NOT NULL,
  `source` VARCHAR(50) NOT NULL,
  `reason` TEXT NULL,
  `performed_by` CHAR(36) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `subscription_histories_company_id_fk` (`company_id`),
  KEY `subscription_histories_subscription_id_fk` (`subscription_id`),
  CONSTRAINT `subscription_histories_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `subscription_histories_subscription_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 14. Payments Table (Razorpay Orders & Captures)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
  `id` CHAR(36) NOT NULL,
  `company_id` CHAR(36) NOT NULL,
  `subscription_id` CHAR(36) NULL,
  `provider` ENUM('RAZORPAY', 'STRIPE', 'MOCK') NOT NULL DEFAULT 'RAZORPAY',
  `provider_order_id` VARCHAR(255) NULL,
  `provider_payment_id` VARCHAR(255) NULL,
  `amount` INT NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
  `status` ENUM('CREATED', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'CREATED',
  `payment_type` ENUM('INITIAL_SUBSCRIPTION', 'RENEWAL', 'PLAN_CHANGE') NOT NULL DEFAULT 'INITIAL_SUBSCRIPTION',
  `plan` ENUM('STARTER', 'BUSINESS', 'PROFESSIONAL', 'ENTERPRISE') NOT NULL,
  `billing_interval` ENUM('MONTHLY', 'YEARLY') NOT NULL DEFAULT 'MONTHLY',
  `metadata` JSON NULL,
  `paid_at` DATETIME NULL,
  `failure_reason` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `payments_company_id_fk` (`company_id`),
  KEY `payments_subscription_id_fk` (`subscription_id`),
  KEY `payments_provider_order_id_idx` (`provider_order_id`),
  CONSTRAINT `payments_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `payments_subscription_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 15. Payment Webhook Events Table (Idempotency & Gateway Audit)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_webhook_events` (
  `id` CHAR(36) NOT NULL,
  `payment_id` CHAR(36) NULL,
  `provider` VARCHAR(50) NOT NULL,
  `event_id` VARCHAR(255) NOT NULL,
  `event_type` VARCHAR(100) NOT NULL,
  `payload` JSON NOT NULL,
  `status` ENUM('PENDING', 'PROCESSED', 'FAILED', 'IGNORED') NOT NULL DEFAULT 'PENDING',
  `processed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_webhook_events_event_id_unique` (`event_id`),
  KEY `payment_webhook_events_payment_id_fk` (`payment_id`),
  CONSTRAINT `payment_webhook_events_payment_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
