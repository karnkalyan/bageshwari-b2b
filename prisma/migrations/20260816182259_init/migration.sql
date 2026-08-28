-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(50) NOT NULL,
    `emailVerified` DATETIME(3) NULL,
    `passwordHash` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `image` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED', 'PENDING_VERIFICATION') NOT NULL DEFAULT 'PENDING_VERIFICATION',
    `preferredLanguage` VARCHAR(191) NOT NULL DEFAULT 'en',
    `preferredTheme` ENUM('LIGHT', 'DARK', 'SYSTEM') NOT NULL DEFAULT 'SYSTEM',
    `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    `lastLoginAt` DATETIME(3) NULL,
    `loginAttempts` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_email_idx`(`email`),
    INDEX `User_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(50) NOT NULL,
    `userId` VARCHAR(50) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `providerAccountId` VARCHAR(50) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(191) NULL,

    INDEX `Account_userId_idx`(`userId`),
    UNIQUE INDEX `Account_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(50) NOT NULL,
    `sessionToken` VARCHAR(50) NOT NULL,
    `userId` VARCHAR(50) NOT NULL,
    `expires` DATETIME(3) NOT NULL,
    `userAgent` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `sellerId` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Session_sessionToken_key`(`sessionToken`),
    INDEX `Session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationToken` (
    `identifier` VARCHAR(50) NOT NULL,
    `token` VARCHAR(50) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VerificationToken_token_key`(`token`),
    UNIQUE INDEX `VerificationToken_identifier_token_key`(`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordResetToken` (
    `id` VARCHAR(50) NOT NULL,
    `userId` VARCHAR(50) NOT NULL,
    `tokenHash` VARCHAR(50) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PasswordResetToken_tokenHash_key`(`tokenHash`),
    INDEX `PasswordResetToken_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TwoFactorToken` (
    `id` VARCHAR(50) NOT NULL,
    `userId` VARCHAR(50) NOT NULL,
    `secretEncrypted` TEXT NOT NULL,
    `recoveryCodesEncrypted` TEXT NULL,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TwoFactorToken_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoginHistory` (
    `id` VARCHAR(50) NOT NULL,
    `userId` VARCHAR(50) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `success` BOOLEAN NOT NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LoginHistory_userId_idx`(`userId`),
    INDEX `LoginHistory_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Seller` (
    `id` VARCHAR(50) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `slug` VARCHAR(50) NOT NULL,
    `legalName` VARCHAR(191) NOT NULL,
    `tradingName` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `industry` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `countryCode` VARCHAR(191) NOT NULL DEFAULT '+977',
    `country` VARCHAR(191) NOT NULL DEFAULT 'Nepal',
    `province` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `addressLine1` VARCHAR(191) NULL,
    `addressLine2` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'NPR',
    `timeZone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Kathmandu',
    `defaultLanguage` VARCHAR(191) NOT NULL DEFAULT 'en',
    `taxNumber` VARCHAR(191) NULL,
    `registrationNumber` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'TRIAL', 'SUSPENDED', 'ARCHIVED', 'PENDING_SETUP') NOT NULL DEFAULT 'PENDING_SETUP',
    `subscriptionPlanId` VARCHAR(50) NULL,
    `trialEndsAt` DATETIME(3) NULL,
    `activeFrom` DATETIME(3) NULL,
    `activeUntil` DATETIME(3) NULL,
    `createdById` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Seller_code_key`(`code`),
    UNIQUE INDEX `Seller_slug_key`(`slug`),
    INDEX `Seller_status_idx`(`status`),
    INDEX `Seller_slug_idx`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyProfile` (
    `id` VARCHAR(50) NOT NULL DEFAULT 'bageshwari-tractors',
    `sellerId` VARCHAR(50) NOT NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `tradingName` VARCHAR(191) NOT NULL,
    `contactPerson` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'Nepal',
    `province` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `panNumber` VARCHAR(191) NULL,
    `vatNumber` VARCHAR(191) NULL,
    `registrationNumber` VARCHAR(191) NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'NPR',
    `timeZone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Kathmandu',
    `businessHours` VARCHAR(191) NULL,
    `footerText` TEXT NULL,
    `terms` LONGTEXT NULL,
    `privacyPolicy` LONGTEXT NULL,
    `shippingPolicy` LONGTEXT NULL,
    `returnPolicy` LONGTEXT NULL,
    `socialLinksJson` TEXT NULL,
    `logoUrl` VARCHAR(191) NULL,
    `compactLogoUrl` VARCHAR(191) NULL,
    `faviconUrl` VARCHAR(191) NULL,
    `emailLogoUrl` VARCHAR(191) NULL,
    `invoiceLogoUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CompanyProfile_sellerId_key`(`sellerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SellerDomain` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `hostname` VARCHAR(100) NOT NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `verificationToken` VARCHAR(191) NULL,
    `verificationStatus` ENUM('PENDING_VERIFICATION', 'VERIFIED', 'FAILED', 'SUSPENDED', 'ACTIVE') NOT NULL DEFAULT 'PENDING_VERIFICATION',
    `verifiedAt` DATETIME(3) NULL,
    `sslStatus` VARCHAR(191) NULL DEFAULT 'pending',
    `status` ENUM('PENDING_VERIFICATION', 'VERIFIED', 'FAILED', 'SUSPENDED', 'ACTIVE') NOT NULL DEFAULT 'PENDING_VERIFICATION',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SellerDomain_hostname_key`(`hostname`),
    INDEX `SellerDomain_sellerId_idx`(`sellerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SellerSubscription` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `planId` VARCHAR(50) NOT NULL,
    `status` ENUM('ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'PENDING') NOT NULL DEFAULT 'PENDING',
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `trialEndDate` DATETIME(3) NULL,
    `billingCycle` VARCHAR(191) NULL DEFAULT 'monthly',
    `amount` DECIMAL(18, 2) NOT NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'NPR',
    `autoRenew` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SellerSubscription_sellerId_key`(`sellerId`),
    INDEX `SellerSubscription_planId_idx`(`planId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubscriptionPlan` (
    `id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `monthlyPrice` DECIMAL(18, 2) NOT NULL,
    `annualPrice` DECIMAL(18, 2) NOT NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'NPR',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `limitsJson` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SubscriptionPlan_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlanFeature` (
    `id` VARCHAR(50) NOT NULL,
    `planId` VARCHAR(50) NOT NULL,
    `featureKey` VARCHAR(50) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `limitValue` INTEGER NULL,

    UNIQUE INDEX `PlanFeature_planId_featureKey_key`(`planId`, `featureKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SellerFeature` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `featureKey` VARCHAR(50) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `limitValue` INTEGER NULL,
    `overrideReason` VARCHAR(191) NULL,
    `overriddenById` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SellerFeature_sellerId_featureKey_key`(`sellerId`, `featureKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SellerBranch` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `addressLine1` VARCHAR(191) NULL,
    `addressLine2` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `province` VARCHAR(191) NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'Nepal',
    `timeZone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Kathmandu',
    `isHeadOffice` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `SellerBranch_sellerId_idx`(`sellerId`),
    UNIQUE INDEX `SellerBranch_sellerId_code_key`(`sellerId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Warehouse` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `branchId` VARCHAR(50) NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `addressLine1` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `contactName` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Warehouse_sellerId_idx`(`sellerId`),
    UNIQUE INDEX `Warehouse_sellerId_code_key`(`sellerId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SellerTheme` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `version` INTEGER NOT NULL DEFAULT 1,
    `logoUrl` VARCHAR(191) NULL,
    `compactLogoUrl` VARCHAR(191) NULL,
    `darkLogoUrl` VARCHAR(191) NULL,
    `faviconUrl` VARCHAR(191) NULL,
    `emailLogoUrl` VARCHAR(191) NULL,
    `invoiceLogoUrl` VARCHAR(191) NULL,
    `loginLogoUrl` VARCHAR(191) NULL,
    `tokensJson` TEXT NULL,
    `lightTokensJson` TEXT NULL,
    `darkTokensJson` TEXT NULL,
    `homepageLayoutJson` TEXT NULL,
    `publishedAt` DATETIME(3) NULL,
    `scheduledAt` DATETIME(3) NULL,
    `createdById` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SellerTheme_sellerId_idx`(`sellerId`),
    INDEX `SellerTheme_sellerId_status_idx`(`sellerId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ThemeVersion` (
    `id` VARCHAR(50) NOT NULL,
    `sellerThemeId` VARCHAR(50) NOT NULL,
    `version` INTEGER NOT NULL,
    `tokensJson` TEXT NULL,
    `layoutJson` TEXT NULL,
    `createdById` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ThemeVersion_sellerThemeId_idx`(`sellerThemeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserAppearancePreference` (
    `id` VARCHAR(50) NOT NULL,
    `userId` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NULL,
    `appearance` ENUM('LIGHT', 'DARK', 'SYSTEM') NOT NULL DEFAULT 'SYSTEM',
    `sidebarCollapsed` BOOLEAN NOT NULL DEFAULT false,
    `tableDensity` ENUM('COMPACT', 'COMFORTABLE') NOT NULL DEFAULT 'COMFORTABLE',
    `accentPreset` VARCHAR(191) NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'en',
    `defaultWarehouseId` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserAppearancePreference_userId_sellerId_key`(`userId`, `sellerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SellerHomepageSection` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `sectionType` ENUM('HERO', 'UTILITY_BAR', 'FEATURED_CATEGORIES', 'FEATURED_PRODUCTS', 'POPULAR_MODELS', 'SPARE_PARTS', 'IMPLEMENTS', 'ACCESSORIES', 'LUBRICANTS_TOOLS', 'NEW_ARRIVALS', 'BEST_SELLERS', 'OFFERS', 'DEALER_BENEFITS', 'DEALER_RECOMMENDATIONS', 'HOW_IT_WORKS', 'PLATFORM_FEATURES', 'DEALER_CTA', 'BUSINESS_STATS', 'TRUSTED_PARTNERS', 'TESTIMONIALS', 'SERVICE_CONTACT', 'CUSTOM_CONTENT') NOT NULL,
    `title` VARCHAR(191) NULL,
    `subtitle` TEXT NULL,
    `layout` VARCHAR(191) NULL DEFAULT 'default',
    `contentJson` LONGTEXT NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `audience` ENUM('PUBLIC', 'DEALER_ONLY', 'ALL') NOT NULL DEFAULT 'PUBLIC',
    `bgStyle` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `ctaLabel` VARCHAR(191) NULL,
    `ctaLink` VARCHAR(191) NULL,
    `maxItems` INTEGER NULL,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdById` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SellerHomepageSection_sellerId_idx`(`sellerId`),
    INDEX `SellerHomepageSection_sellerId_sectionType_idx`(`sellerId`, `sectionType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `scope` ENUM('PLATFORM', 'SELLER', 'DEALER') NOT NULL DEFAULT 'SELLER',
    `systemRole` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Role_scope_idx`(`scope`),
    UNIQUE INDEX `Role_sellerId_code_key`(`sellerId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permission` (
    `id` VARCHAR(50) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `module` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Permission_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePermission` (
    `id` VARCHAR(50) NOT NULL,
    `roleId` VARCHAR(50) NOT NULL,
    `permissionId` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `RolePermission_roleId_permissionId_key`(`roleId`, `permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserSellerMembership` (
    `id` VARCHAR(50) NOT NULL,
    `userId` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `branchId` VARCHAR(50) NULL,
    `dealerId` VARCHAR(50) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UserSellerMembership_sellerId_idx`(`sellerId`),
    UNIQUE INDEX `UserSellerMembership_userId_sellerId_key`(`userId`, `sellerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserRole` (
    `id` VARCHAR(50) NOT NULL,
    `userId` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NULL,
    `roleId` VARCHAR(50) NOT NULL,
    `membershipId` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserRole_userId_idx`(`userId`),
    INDEX `UserRole_sellerId_idx`(`sellerId`),
    UNIQUE INDEX `UserRole_userId_roleId_sellerId_key`(`userId`, `roleId`, `sellerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Dealer` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `legalName` VARCHAR(191) NOT NULL,
    `tradingName` VARCHAR(191) NULL,
    `contactName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `taxNumber` VARCHAR(191) NULL,
    `registrationNumber` VARCHAR(191) NULL,
    `dealerGroupId` VARCHAR(50) NULL,
    `pricingGroupId` VARCHAR(50) NULL,
    `assignedSalespersonId` VARCHAR(50) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_APPROVAL', 'BLOCKED') NOT NULL DEFAULT 'PENDING_APPROVAL',
    `creditEligible` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `approvedAt` DATETIME(3) NULL,
    `approvedById` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Dealer_sellerId_idx`(`sellerId`),
    INDEX `Dealer_sellerId_status_idx`(`sellerId`, `status`),
    UNIQUE INDEX `Dealer_sellerId_code_key`(`sellerId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DealerApplication` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `businessName` VARCHAR(191) NOT NULL,
    `contactName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `addressLine1` VARCHAR(191) NULL,
    `addressLine2` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `municipality` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `province` VARCHAR(191) NULL,
    `territory` VARCHAR(191) NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'Nepal',
    `taxNumber` VARCHAR(191) NULL,
    `registrationNumber` VARCHAR(191) NULL,
    `productInterestsJson` TEXT NULL,
    `monthlyOrderEstimate` DECIMAL(18, 2) NULL,
    `creditRequested` BOOLEAN NOT NULL DEFAULT false,
    `existingBusinessInfo` TEXT NULL,
    `documentsJson` TEXT NULL,
    `remarks` TEXT NULL,
    `status` ENUM('SUBMITTED', 'REVIEW_PENDING', 'DOCUMENT_VERIFICATION', 'APPROVED', 'REJECTED', 'CONVERTED') NOT NULL DEFAULT 'SUBMITTED',
    `reviewedById` VARCHAR(50) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DealerApplication_sellerId_idx`(`sellerId`),
    INDEX `DealerApplication_sellerId_status_idx`(`sellerId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DealerEmployee` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `dealerId` VARCHAR(50) NOT NULL,
    `userId` VARCHAR(50) NOT NULL,
    `designation` VARCHAR(191) NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DealerEmployee_sellerId_idx`(`sellerId`),
    UNIQUE INDEX `DealerEmployee_sellerId_dealerId_userId_key`(`sellerId`, `dealerId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DealerAddress` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `dealerId` VARCHAR(50) NOT NULL,
    `type` ENUM('BILLING', 'SHIPPING', 'BOTH') NOT NULL DEFAULT 'BOTH',
    `label` VARCHAR(191) NULL,
    `contactName` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `addressLine1` VARCHAR(191) NOT NULL,
    `addressLine2` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `province` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'Nepal',
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DealerAddress_sellerId_dealerId_idx`(`sellerId`, `dealerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DealerDocument` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `dealerId` VARCHAR(50) NOT NULL,
    `fileAssetId` VARCHAR(50) NULL,
    `documentType` VARCHAR(191) NOT NULL,
    `documentNumber` VARCHAR(191) NULL,
    `issueDate` DATETIME(3) NULL,
    `expiryDate` DATETIME(3) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `verifiedById` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DealerDocument_sellerId_dealerId_idx`(`sellerId`, `dealerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DealerGroup` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DealerGroup_sellerId_idx`(`sellerId`),
    UNIQUE INDEX `DealerGroup_sellerId_code_key`(`sellerId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PricingGroup` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PricingGroup_sellerId_idx`(`sellerId`),
    UNIQUE INDEX `PricingGroup_sellerId_code_key`(`sellerId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DealerCreditProfile` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `dealerId` VARCHAR(50) NOT NULL,
    `creditEligible` BOOLEAN NOT NULL DEFAULT false,
    `creditLimit` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `currentOutstanding` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `availableCredit` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `creditPeriodDays` INTEGER NOT NULL DEFAULT 30,
    `holdStatus` BOOLEAN NOT NULL DEFAULT false,
    `holdReason` VARCHAR(191) NULL,
    `approvedById` VARCHAR(50) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DealerCreditProfile_dealerId_key`(`dealerId`),
    INDEX `DealerCreditProfile_sellerId_idx`(`sellerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalespersonDealerAssignment` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `salespersonId` VARCHAR(50) NOT NULL,
    `dealerId` VARCHAR(50) NOT NULL,
    `activeFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `activeUntil` DATETIME(3) NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SalespersonDealerAssignment_sellerId_idx`(`sellerId`),
    UNIQUE INDEX `SalespersonDealerAssignment_sellerId_salespersonId_dealerId_key`(`sellerId`, `salespersonId`, `dealerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductCategory` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `parentId` VARCHAR(50) NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(50) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `imageUrl` VARCHAR(191) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'INACTIVE', 'DISCONTINUED', 'OUT_OF_STOCK') NOT NULL DEFAULT 'ACTIVE',
    `seoTitle` VARCHAR(191) NULL,
    `seoDescription` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `ProductCategory_sellerId_idx`(`sellerId`),
    UNIQUE INDEX `ProductCategory_sellerId_slug_key`(`sellerId`, `slug`),
    UNIQUE INDEX `ProductCategory_sellerId_code_key`(`sellerId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductBrand` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `logoUrl` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'DISCONTINUED', 'OUT_OF_STOCK') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `ProductBrand_sellerId_idx`(`sellerId`),
    UNIQUE INDEX `ProductBrand_sellerId_slug_key`(`sellerId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `categoryId` VARCHAR(50) NULL,
    `brandId` VARCHAR(50) NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(50) NOT NULL,
    `sku` VARCHAR(50) NOT NULL,
    `shortDescription` TEXT NULL,
    `description` LONGTEXT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'DISCONTINUED', 'OUT_OF_STOCK') NOT NULL DEFAULT 'ACTIVE',
    `publishStatus` ENUM('DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `newArrival` BOOLEAN NOT NULL DEFAULT false,
    `bestSeller` BOOLEAN NOT NULL DEFAULT false,
    `onOffer` BOOLEAN NOT NULL DEFAULT false,
    `minimumOrderQuantity` DECIMAL(18, 3) NOT NULL DEFAULT 1,
    `maximumOrderQuantity` DECIMAL(18, 3) NULL,
    `quantityIncrement` DECIMAL(18, 3) NOT NULL DEFAULT 1,
    `unitCode` VARCHAR(191) NOT NULL DEFAULT 'PCS',
    `alternateUnit` VARCHAR(191) NULL,
    `taxPercent` DECIMAL(5, 2) NULL,
    `hsnCode` VARCHAR(191) NULL,
    `warrantyText` TEXT NULL,
    `packagingText` VARCHAR(191) NULL,
    `shippingText` VARCHAR(191) NULL,
    `seoTitle` VARCHAR(191) NULL,
    `seoDescription` TEXT NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdById` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Product_sellerId_idx`(`sellerId`),
    INDEX `Product_sellerId_categoryId_idx`(`sellerId`, `categoryId`),
    INDEX `Product_sellerId_brandId_idx`(`sellerId`, `brandId`),
    INDEX `Product_sellerId_status_publishStatus_idx`(`sellerId`, `status`, `publishStatus`),
    UNIQUE INDEX `Product_sellerId_sku_key`(`sellerId`, `sku`),
    UNIQUE INDEX `Product_sellerId_slug_key`(`sellerId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductVariant` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `productId` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(50) NOT NULL,
    `barcode` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'DISCONTINUED', 'OUT_OF_STOCK') NOT NULL DEFAULT 'ACTIVE',
    `mrp` DECIMAL(18, 2) NOT NULL,
    `costPrice` DECIMAL(18, 2) NULL,
    `weight` DECIMAL(10, 3) NULL,
    `length` DECIMAL(10, 2) NULL,
    `width` DECIMAL(10, 2) NULL,
    `height` DECIMAL(10, 2) NULL,
    `minimumOrderQuantity` DECIMAL(18, 3) NULL,
    `maximumOrderQuantity` DECIMAL(18, 3) NULL,
    `quantityIncrement` DECIMAL(18, 3) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `ProductVariant_sellerId_idx`(`sellerId`),
    INDEX `ProductVariant_sellerId_productId_idx`(`sellerId`, `productId`),
    UNIQUE INDEX `ProductVariant_sellerId_sku_key`(`sellerId`, `sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductImage` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `productId` VARCHAR(50) NOT NULL,
    `variantId` VARCHAR(50) NULL,
    `fileAssetId` VARCHAR(50) NULL,
    `url` VARCHAR(191) NULL,
    `altText` VARCHAR(191) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductImage_sellerId_productId_idx`(`sellerId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductDocument` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `productId` VARCHAR(50) NOT NULL,
    `variantId` VARCHAR(50) NULL,
    `fileAssetId` VARCHAR(50) NULL,
    `documentType` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductDocument_sellerId_productId_idx`(`sellerId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductAttribute` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'text',
    `filterable` BOOLEAN NOT NULL DEFAULT false,
    `variantDefining` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProductAttribute_sellerId_idx`(`sellerId`),
    UNIQUE INDEX `ProductAttribute_sellerId_code_key`(`sellerId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductAttributeValue` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `attributeId` VARCHAR(50) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `displayValue` VARCHAR(191) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductAttributeValue_sellerId_attributeId_idx`(`sellerId`, `attributeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductVariantAttribute` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `variantId` VARCHAR(50) NOT NULL,
    `attributeId` VARCHAR(50) NOT NULL,
    `attributeValueId` VARCHAR(50) NOT NULL,

    INDEX `ProductVariantAttribute_sellerId_idx`(`sellerId`),
    UNIQUE INDEX `ProductVariantAttribute_sellerId_variantId_attributeId_key`(`sellerId`, `variantId`, `attributeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductPrice` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `productId` VARCHAR(50) NOT NULL,
    `variantId` VARCHAR(50) NULL,
    `priceType` ENUM('DEFAULT_DEALER', 'DEALER_GROUP', 'PRICING_GROUP', 'DEALER_SPECIFIC', 'QUANTITY_BASED', 'PROMOTIONAL') NOT NULL,
    `dealerId` VARCHAR(50) NULL,
    `dealerGroupId` VARCHAR(50) NULL,
    `pricingGroupId` VARCHAR(50) NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'NPR',
    `minimumQuantity` DECIMAL(18, 3) NULL,
    `maximumQuantity` DECIMAL(18, 3) NULL,
    `validFrom` DATETIME(3) NULL,
    `validUntil` DATETIME(3) NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProductPrice_sellerId_variantId_idx`(`sellerId`, `variantId`),
    INDEX `ProductPrice_sellerId_dealerId_idx`(`sellerId`, `dealerId`),
    INDEX `ProductPrice_sellerId_pricingGroupId_idx`(`sellerId`, `pricingGroupId`),
    INDEX `ProductPrice_sellerId_productId_idx`(`sellerId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inventory` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `warehouseId` VARCHAR(50) NOT NULL,
    `productId` VARCHAR(50) NOT NULL,
    `variantId` VARCHAR(50) NOT NULL,
    `availableQuantity` DECIMAL(18, 3) NOT NULL DEFAULT 0,
    `reservedQuantity` DECIMAL(18, 3) NOT NULL DEFAULT 0,
    `pickedQuantity` DECIMAL(18, 3) NOT NULL DEFAULT 0,
    `damagedQuantity` DECIMAL(18, 3) NOT NULL DEFAULT 0,
    `inTransitQuantity` DECIMAL(18, 3) NOT NULL DEFAULT 0,
    `reorderLevel` DECIMAL(18, 3) NOT NULL DEFAULT 0,
    `lowStockThreshold` DECIMAL(18, 3) NOT NULL DEFAULT 0,
    `binLocation` VARCHAR(191) NULL,
    `rackLocation` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Inventory_sellerId_idx`(`sellerId`),
    INDEX `Inventory_sellerId_warehouseId_idx`(`sellerId`, `warehouseId`),
    UNIQUE INDEX `Inventory_sellerId_warehouseId_variantId_key`(`sellerId`, `warehouseId`, `variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryTransaction` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `warehouseId` VARCHAR(50) NOT NULL,
    `productId` VARCHAR(50) NOT NULL,
    `variantId` VARCHAR(50) NOT NULL,
    `transactionType` ENUM('INITIAL_STOCK', 'PURCHASE', 'SALE', 'ADJUSTMENT_ADD', 'ADJUSTMENT_REMOVE', 'TRANSFER_IN', 'TRANSFER_OUT', 'RESERVATION', 'RESERVATION_RELEASE', 'PICK', 'DAMAGE', 'RETURN', 'CORRECTION') NOT NULL,
    `quantity` DECIMAL(18, 3) NOT NULL,
    `beforeQuantity` DECIMAL(18, 3) NOT NULL,
    `afterQuantity` DECIMAL(18, 3) NOT NULL,
    `referenceType` VARCHAR(191) NULL,
    `referenceId` VARCHAR(50) NULL,
    `reason` VARCHAR(191) NULL,
    `performedById` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InventoryTransaction_sellerId_idx`(`sellerId`),
    INDEX `InventoryTransaction_sellerId_warehouseId_variantId_idx`(`sellerId`, `warehouseId`, `variantId`),
    INDEX `InventoryTransaction_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockReservation` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `warehouseId` VARCHAR(50) NOT NULL,
    `orderId` VARCHAR(50) NOT NULL,
    `orderItemId` VARCHAR(50) NOT NULL,
    `variantId` VARCHAR(50) NOT NULL,
    `quantity` DECIMAL(18, 3) NOT NULL,
    `status` ENUM('RESERVED', 'PARTIALLY_CONSUMED', 'CONSUMED', 'RELEASED', 'CANCELLED') NOT NULL DEFAULT 'RESERVED',
    `reservedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `releasedAt` DATETIME(3) NULL,
    `consumedAt` DATETIME(3) NULL,

    INDEX `StockReservation_sellerId_idx`(`sellerId`),
    INDEX `StockReservation_sellerId_orderId_idx`(`sellerId`, `orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockAdjustment` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `warehouseId` VARCHAR(50) NOT NULL,
    `variantId` VARCHAR(50) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(18, 3) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `performedById` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StockAdjustment_sellerId_idx`(`sellerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `orderNumber` VARCHAR(50) NOT NULL,
    `dealerId` VARCHAR(50) NOT NULL,
    `salespersonId` VARCHAR(50) NULL,
    `source` ENUM('DEALER_PORTAL', 'SALESPERSON_PORTAL', 'ADMIN_PANEL', 'IMPORT') NOT NULL DEFAULT 'DEALER_PORTAL',
    `status` ENUM('DRAFT', 'PENDING_ACCOUNTS_REVIEW', 'ACCOUNTS_REVIEW_IN_PROGRESS', 'WAITING_FOR_DEALER_CONFIRMATION', 'DEALER_CHANGE_REQUESTED', 'FINAL_ORDER_CONFIRMED', 'PROFORMA_INVOICE_GENERATED', 'PROFORMA_INVOICE_CONFIRMED', 'READY_FOR_WAREHOUSE', 'PICK_LIST_GENERATED', 'PICKING_IN_PROGRESS', 'PARTIALLY_PICKED', 'PICKING_COMPLETED', 'PICKING_EXCEPTION', 'PICK_LIST_COMPLETED', 'FINAL_INVOICE_ISSUED', 'PAYMENT_PENDING', 'PARTIALLY_PAID', 'PAID', 'CREDIT_PENDING', 'CREDIT_APPROVED', 'PAYMENT_ON_HOLD', 'PAYMENT_OVERDUE', 'PACKING_IN_PROGRESS', 'PACKED', 'PACKED_AND_LABELLED', 'SHIPPED', 'IN_TRANSIT', 'PARTIALLY_DELIVERED', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'NPR',
    `billingAddressJson` TEXT NULL,
    `shippingAddressJson` TEXT NULL,
    `purchaseOrderNumber` VARCHAR(191) NULL,
    `purchaseOrderDocUrl` VARCHAR(191) NULL,
    `requestedDeliveryDate` DATETIME(3) NULL,
    `subtotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `discountTotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `taxTotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `freightTotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `additionalChargeTotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `grandTotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `dealerNotes` TEXT NULL,
    `salespersonNotes` TEXT NULL,
    `accountsNotes` TEXT NULL,
    `currentDepartment` VARCHAR(191) NULL,
    `submittedAt` DATETIME(3) NULL,
    `finalConfirmedAt` DATETIME(3) NULL,
    `finalConfirmedById` VARCHAR(50) NULL,
    `lockedAt` DATETIME(3) NULL,
    `createdById` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Order_sellerId_idx`(`sellerId`),
    INDEX `Order_sellerId_dealerId_idx`(`sellerId`, `dealerId`),
    INDEX `Order_sellerId_status_idx`(`sellerId`, `status`),
    INDEX `Order_sellerId_createdAt_idx`(`sellerId`, `createdAt`),
    UNIQUE INDEX `Order_sellerId_orderNumber_key`(`sellerId`, `orderNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `orderId` VARCHAR(50) NOT NULL,
    `productId` VARCHAR(50) NOT NULL,
    `variantId` VARCHAR(50) NOT NULL,
    `sku` VARCHAR(50) NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `variantName` VARCHAR(191) NULL,
    `originalQuantity` DECIMAL(18, 3) NOT NULL,
    `approvedQuantity` DECIMAL(18, 3) NULL,
    `pickedQuantity` DECIMAL(18, 3) NULL,
    `mrp` DECIMAL(18, 2) NOT NULL,
    `dealerPrice` DECIMAL(18, 2) NOT NULL,
    `discountAmount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `lineTotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'REVISED', 'REMOVED', 'SUBSTITUTED', 'PARTIALLY_PICKED', 'PICKED', 'PICK_EXCEPTION', 'PACKED', 'SHIPPED', 'DELIVERED', 'RETURNED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `dealerNotes` VARCHAR(191) NULL,
    `accountsRemarks` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OrderItem_sellerId_orderId_idx`(`sellerId`, `orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderRevision` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `orderId` VARCHAR(50) NOT NULL,
    `version` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'SENT_TO_DEALER', 'DEALER_CONFIRMED', 'DEALER_REJECTED', 'DEALER_CHANGE_REQUESTED', 'SUPERSEDED') NOT NULL DEFAULT 'PENDING',
    `previousSubtotal` DECIMAL(18, 2) NULL,
    `revisedSubtotal` DECIMAL(18, 2) NULL,
    `previousGrandTotal` DECIMAL(18, 2) NULL,
    `revisedGrandTotal` DECIMAL(18, 2) NULL,
    `generalRemarks` TEXT NULL,
    `createdById` VARCHAR(50) NULL,
    `sentToDealerAt` DATETIME(3) NULL,
    `dealerRespondedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OrderRevision_sellerId_orderId_idx`(`sellerId`, `orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderRevisionItem` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `orderRevisionId` VARCHAR(50) NOT NULL,
    `orderItemId` VARCHAR(50) NOT NULL,
    `previousQuantity` DECIMAL(18, 3) NULL,
    `revisedQuantity` DECIMAL(18, 3) NULL,
    `previousPrice` DECIMAL(18, 2) NULL,
    `revisedPrice` DECIMAL(18, 2) NULL,
    `changeType` VARCHAR(191) NOT NULL,
    `reason` TEXT NULL,

    INDEX `OrderRevisionItem_sellerId_orderRevisionId_idx`(`sellerId`, `orderRevisionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderRemark` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `orderId` VARCHAR(50) NOT NULL,
    `orderItemId` VARCHAR(50) NULL,
    `userId` VARCHAR(50) NOT NULL,
    `department` VARCHAR(191) NULL,
    `message` TEXT NOT NULL,
    `internalOnly` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrderRemark_sellerId_orderId_idx`(`sellerId`, `orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderStatusHistory` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `orderId` VARCHAR(50) NOT NULL,
    `fromStatus` ENUM('DRAFT', 'PENDING_ACCOUNTS_REVIEW', 'ACCOUNTS_REVIEW_IN_PROGRESS', 'WAITING_FOR_DEALER_CONFIRMATION', 'DEALER_CHANGE_REQUESTED', 'FINAL_ORDER_CONFIRMED', 'PROFORMA_INVOICE_GENERATED', 'PROFORMA_INVOICE_CONFIRMED', 'READY_FOR_WAREHOUSE', 'PICK_LIST_GENERATED', 'PICKING_IN_PROGRESS', 'PARTIALLY_PICKED', 'PICKING_COMPLETED', 'PICKING_EXCEPTION', 'PICK_LIST_COMPLETED', 'FINAL_INVOICE_ISSUED', 'PAYMENT_PENDING', 'PARTIALLY_PAID', 'PAID', 'CREDIT_PENDING', 'CREDIT_APPROVED', 'PAYMENT_ON_HOLD', 'PAYMENT_OVERDUE', 'PACKING_IN_PROGRESS', 'PACKED', 'PACKED_AND_LABELLED', 'SHIPPED', 'IN_TRANSIT', 'PARTIALLY_DELIVERED', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNED', 'COMPLETED', 'CANCELLED') NULL,
    `toStatus` ENUM('DRAFT', 'PENDING_ACCOUNTS_REVIEW', 'ACCOUNTS_REVIEW_IN_PROGRESS', 'WAITING_FOR_DEALER_CONFIRMATION', 'DEALER_CHANGE_REQUESTED', 'FINAL_ORDER_CONFIRMED', 'PROFORMA_INVOICE_GENERATED', 'PROFORMA_INVOICE_CONFIRMED', 'READY_FOR_WAREHOUSE', 'PICK_LIST_GENERATED', 'PICKING_IN_PROGRESS', 'PARTIALLY_PICKED', 'PICKING_COMPLETED', 'PICKING_EXCEPTION', 'PICK_LIST_COMPLETED', 'FINAL_INVOICE_ISSUED', 'PAYMENT_PENDING', 'PARTIALLY_PAID', 'PAID', 'CREDIT_PENDING', 'CREDIT_APPROVED', 'PAYMENT_ON_HOLD', 'PAYMENT_OVERDUE', 'PACKING_IN_PROGRESS', 'PACKED', 'PACKED_AND_LABELLED', 'SHIPPED', 'IN_TRANSIT', 'PARTIALLY_DELIVERED', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNED', 'COMPLETED', 'CANCELLED') NOT NULL,
    `changedById` VARCHAR(50) NULL,
    `remarks` TEXT NULL,
    `metadataJson` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrderStatusHistory_sellerId_orderId_idx`(`sellerId`, `orderId`),
    INDEX `OrderStatusHistory_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DealerConfirmation` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `orderId` VARCHAR(50) NOT NULL,
    `revisionId` VARCHAR(50) NULL,
    `dealerId` VARCHAR(50) NOT NULL,
    `decision` ENUM('CONFIRMED', 'REJECTED', 'CHANGE_REQUESTED', 'PARTIALLY_CONFIRMED') NOT NULL,
    `remarks` TEXT NULL,
    `confirmedById` VARCHAR(50) NULL,
    `confirmedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ipAddress` VARCHAR(191) NULL,

    INDEX `DealerConfirmation_sellerId_orderId_idx`(`sellerId`, `orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProformaInvoice` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `orderId` VARCHAR(50) NOT NULL,
    `proformaNumber` VARCHAR(50) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('DRAFT', 'GENERATED', 'SENT', 'CONFIRMED', 'REJECTED', 'REVISED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
    `issueDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validUntil` DATETIME(3) NULL,
    `subtotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `discountTotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `taxTotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `freightTotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `grandTotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `paymentTerms` TEXT NULL,
    `creditTerms` TEXT NULL,
    `remarks` TEXT NULL,
    `generatedById` VARCHAR(50) NULL,
    `confirmedById` VARCHAR(50) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProformaInvoice_sellerId_idx`(`sellerId`),
    INDEX `ProformaInvoice_sellerId_orderId_idx`(`sellerId`, `orderId`),
    UNIQUE INDEX `ProformaInvoice_sellerId_proformaNumber_key`(`sellerId`, `proformaNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProformaInvoiceItem` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `proformaInvoiceId` VARCHAR(50) NOT NULL,
    `orderItemId` VARCHAR(50) NULL,
    `productId` VARCHAR(50) NOT NULL,
    `variantId` VARCHAR(50) NOT NULL,
    `sku` VARCHAR(50) NOT NULL,
    `description` VARCHAR(191) NULL,
    `quantity` DECIMAL(18, 3) NOT NULL,
    `unitPrice` DECIMAL(18, 2) NOT NULL,
    `discountAmount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `lineTotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,

    INDEX `ProformaInvoiceItem_sellerId_proformaInvoiceId_idx`(`sellerId`, `proformaInvoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProformaInvoiceRevision` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `proformaInvoiceId` VARCHAR(50) NOT NULL,
    `version` INTEGER NOT NULL,
    `snapshotJson` LONGTEXT NULL,
    `reason` TEXT NULL,
    `createdById` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProformaInvoiceRevision_sellerId_proformaInvoiceId_idx`(`sellerId`, `proformaInvoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PickList` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `orderId` VARCHAR(50) NOT NULL,
    `warehouseId` VARCHAR(50) NOT NULL,
    `pickListNumber` VARCHAR(50) NOT NULL,
    `status` ENUM('GENERATED', 'ASSIGNED', 'PICKING_IN_PROGRESS', 'PARTIALLY_PICKED', 'COMPLETED', 'EXCEPTION', 'CANCELLED') NOT NULL DEFAULT 'GENERATED',
    `assignedToId` VARCHAR(50) NULL,
    `pickerId` VARCHAR(50) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `completedById` VARCHAR(50) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PickList_sellerId_idx`(`sellerId`),
    INDEX `PickList_sellerId_orderId_idx`(`sellerId`, `orderId`),
    INDEX `PickList_sellerId_status_idx`(`sellerId`, `status`),
    UNIQUE INDEX `PickList_sellerId_pickListNumber_key`(`sellerId`, `pickListNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PickListItem` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `pickListId` VARCHAR(50) NOT NULL,
    `productId` VARCHAR(50) NOT NULL,
    `variantId` VARCHAR(50) NOT NULL,
    `sku` VARCHAR(50) NOT NULL,
    `rackLocation` VARCHAR(191) NULL,
    `binLocation` VARCHAR(191) NULL,
    `approvedQuantity` DECIMAL(18, 3) NOT NULL,
    `pickedQuantity` DECIMAL(18, 3) NOT NULL DEFAULT 0,
    `batchNumber` VARCHAR(191) NULL,
    `serialNumber` VARCHAR(191) NULL,
    `remarks` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PickListItem_sellerId_pickListId_idx`(`sellerId`, `pickListId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PickListException` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `pickListId` VARCHAR(50) NOT NULL,
    `variantId` VARCHAR(50) NOT NULL,
    `expectedQty` DECIMAL(18, 3) NOT NULL,
    `availableQty` DECIMAL(18, 3) NOT NULL,
    `shortageQty` DECIMAL(18, 3) NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('REPORTED', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED') NOT NULL DEFAULT 'REPORTED',
    `reportedById` VARCHAR(50) NULL,
    `resolvedById` VARCHAR(50) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `resolution` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PickListException_sellerId_pickListId_idx`(`sellerId`, `pickListId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinalInvoice` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `orderId` VARCHAR(50) NOT NULL,
    `invoiceNumber` VARCHAR(50) NOT NULL,
    `status` ENUM('DRAFT', 'ISSUED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'CREDIT_NOTE_ISSUED') NOT NULL DEFAULT 'DRAFT',
    `issueDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dueDate` DATETIME(3) NULL,
    `subtotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `discountTotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `taxTotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `freightTotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `grandTotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `paidAmount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `outstandingAmount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `paymentTerms` TEXT NULL,
    `remarks` TEXT NULL,
    `generatedById` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FinalInvoice_sellerId_idx`(`sellerId`),
    INDEX `FinalInvoice_sellerId_orderId_idx`(`sellerId`, `orderId`),
    INDEX `FinalInvoice_sellerId_status_idx`(`sellerId`, `status`),
    UNIQUE INDEX `FinalInvoice_sellerId_invoiceNumber_key`(`sellerId`, `invoiceNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinalInvoiceItem` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `finalInvoiceId` VARCHAR(50) NOT NULL,
    `orderItemId` VARCHAR(50) NULL,
    `productId` VARCHAR(50) NOT NULL,
    `variantId` VARCHAR(50) NOT NULL,
    `sku` VARCHAR(50) NOT NULL,
    `description` VARCHAR(191) NULL,
    `quantity` DECIMAL(18, 3) NOT NULL,
    `unitPrice` DECIMAL(18, 2) NOT NULL,
    `discountAmount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `lineTotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,

    INDEX `FinalInvoiceItem_sellerId_finalInvoiceId_idx`(`sellerId`, `finalInvoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `orderId` VARCHAR(50) NOT NULL,
    `finalInvoiceId` VARCHAR(50) NULL,
    `paymentNumber` VARCHAR(50) NOT NULL,
    `method` ENUM('BANK_TRANSFER', 'CHEQUE', 'CASH', 'CREDIT', 'ONLINE', 'MOBILE_PAYMENT', 'OTHER') NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'REJECTED', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PENDING',
    `amount` DECIMAL(18, 2) NOT NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'NPR',
    `transactionRef` VARCHAR(191) NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `receiptUrl` VARCHAR(191) NULL,
    `remarks` TEXT NULL,
    `recordedById` VARCHAR(50) NULL,
    `verifiedById` VARCHAR(50) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Payment_sellerId_idx`(`sellerId`),
    INDEX `Payment_sellerId_orderId_idx`(`sellerId`, `orderId`),
    UNIQUE INDEX `Payment_sellerId_paymentNumber_key`(`sellerId`, `paymentNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditApproval` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `orderId` VARCHAR(50) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'ON_HOLD', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `requestedAmount` DECIMAL(18, 2) NOT NULL,
    `approvedAmount` DECIMAL(18, 2) NULL,
    `creditPeriodDays` INTEGER NULL,
    `dueDate` DATETIME(3) NULL,
    `remarks` TEXT NULL,
    `approvedById` VARCHAR(50) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CreditApproval_sellerId_orderId_idx`(`sellerId`, `orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Package` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `orderId` VARCHAR(50) NOT NULL,
    `shipmentId` VARCHAR(50) NULL,
    `packageNumber` VARCHAR(50) NOT NULL,
    `packageType` VARCHAR(191) NULL,
    `length` DECIMAL(10, 2) NULL,
    `width` DECIMAL(10, 2) NULL,
    `height` DECIMAL(10, 2) NULL,
    `weight` DECIMAL(10, 3) NULL,
    `status` ENUM('CREATED', 'PACKING', 'PACKED', 'LABELLED', 'READY_FOR_DISPATCH', 'DISPATCHED', 'DELIVERED', 'DAMAGED') NOT NULL DEFAULT 'CREATED',
    `packedById` VARCHAR(50) NULL,
    `packingDate` DATETIME(3) NULL,
    `barcodeData` VARCHAR(191) NULL,
    `qrCodeData` VARCHAR(191) NULL,
    `handlingInstructions` TEXT NULL,
    `itemsJson` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Package_sellerId_orderId_idx`(`sellerId`, `orderId`),
    UNIQUE INDEX `Package_sellerId_packageNumber_key`(`sellerId`, `packageNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Shipment` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `orderId` VARCHAR(50) NOT NULL,
    `shipmentNumber` VARCHAR(50) NOT NULL,
    `status` ENUM('CREATED', 'DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PARTIALLY_DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED') NOT NULL DEFAULT 'CREATED',
    `transporter` VARCHAR(191) NULL,
    `courier` VARCHAR(191) NULL,
    `driverName` VARCHAR(191) NULL,
    `driverPhone` VARCHAR(191) NULL,
    `vehicleNumber` VARCHAR(191) NULL,
    `trackingNumber` VARCHAR(191) NULL,
    `challanNumber` VARCHAR(191) NULL,
    `dispatchDate` DATETIME(3) NULL,
    `expectedDelivery` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `totalCartons` INTEGER NOT NULL DEFAULT 0,
    `totalWeight` DECIMAL(12, 3) NOT NULL DEFAULT 0,
    `transportCompanyId` VARCHAR(50) NULL,
    `driverId` VARCHAR(50) NULL,
    `vehicleId` VARCHAR(50) NULL,
    `transportReceipt` VARCHAR(191) NULL,
    `dispatchDocUrl` VARCHAR(191) NULL,
    `remarks` TEXT NULL,
    `createdById` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Shipment_sellerId_idx`(`sellerId`),
    INDEX `Shipment_sellerId_orderId_idx`(`sellerId`, `orderId`),
    INDEX `Shipment_transportCompanyId_idx`(`transportCompanyId`),
    UNIQUE INDEX `Shipment_sellerId_shipmentNumber_key`(`sellerId`, `shipmentNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TransportCompany` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `contactName` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `panNumber` VARCHAR(191) NULL,
    `vatNumber` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TransportCompany_sellerId_status_idx`(`sellerId`, `status`),
    UNIQUE INDEX `TransportCompany_sellerId_code_key`(`sellerId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TransportDriver` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `transportCompanyId` VARCHAR(50) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `licenseNumber` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TransportDriver_sellerId_transportCompanyId_idx`(`sellerId`, `transportCompanyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TransportVehicle` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `transportCompanyId` VARCHAR(50) NOT NULL,
    `driverId` VARCHAR(50) NULL,
    `vehicleNumber` VARCHAR(50) NOT NULL,
    `vehicleType` VARCHAR(191) NULL,
    `capacity` DECIMAL(12, 3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TransportVehicle_sellerId_transportCompanyId_idx`(`sellerId`, `transportCompanyId`),
    UNIQUE INDEX `TransportVehicle_sellerId_vehicleNumber_key`(`sellerId`, `vehicleNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliveryEvent` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `shipmentId` VARCHAR(50) NOT NULL,
    `status` ENUM('PENDING', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PARTIALLY_DELIVERED', 'FAILED', 'RETURNED', 'REFUSED') NOT NULL,
    `location` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `proofUrl` VARCHAR(191) NULL,
    `updatedById` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DeliveryEvent_sellerId_shipmentId_idx`(`sellerId`, `shipmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inquiry` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `contactName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `companyName` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `message` TEXT NULL,
    `productsJson` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'submitted',
    `assignedToId` VARCHAR(50) NULL,
    `convertedToOrderId` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Inquiry_sellerId_idx`(`sellerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InquiryFollowUp` (
    `id` VARCHAR(50) NOT NULL,
    `inquiryId` VARCHAR(50) NOT NULL,
    `userId` VARCHAR(50) NOT NULL,
    `message` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InquiryFollowUp_inquiryId_idx`(`inquiryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NULL,
    `userId` VARCHAR(50) NOT NULL,
    `channel` ENUM('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP') NOT NULL DEFAULT 'IN_APP',
    `status` ENUM('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `linkUrl` VARCHAR(191) NULL,
    `readAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_idx`(`userId`),
    INDEX `Notification_userId_status_idx`(`userId`, `status`),
    INDEX `Notification_sellerId_idx`(`sellerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FileAsset` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NULL,
    `mimeType` VARCHAR(191) NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NULL,
    `visibility` ENUM('PUBLIC', 'PRIVATE', 'SELLER_ONLY', 'DEALER_ONLY') NOT NULL DEFAULT 'PRIVATE',
    `uploadedById` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FileAsset_sellerId_idx`(`sellerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NULL,
    `userId` VARCHAR(50) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(50) NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'LOW',
    `oldValue` LONGTEXT NULL,
    `newValue` LONGTEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `metadata` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_sellerId_idx`(`sellerId`),
    INDEX `AuditLog_userId_idx`(`userId`),
    INDEX `AuditLog_entity_entityId_idx`(`entity`, `entityId`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NumberSequence` (
    `id` VARCHAR(50) NOT NULL,
    `sellerId` VARCHAR(50) NOT NULL,
    `entityType` VARCHAR(50) NOT NULL,
    `prefix` VARCHAR(191) NOT NULL,
    `lastNumber` INTEGER NOT NULL DEFAULT 0,
    `padLength` INTEGER NOT NULL DEFAULT 5,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NumberSequence_sellerId_entityType_key`(`sellerId`, `entityType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PasswordResetToken` ADD CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TwoFactorToken` ADD CONSTRAINT `TwoFactorToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoginHistory` ADD CONSTRAINT `LoginHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Seller` ADD CONSTRAINT `Seller_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Seller` ADD CONSTRAINT `Seller_subscriptionPlanId_fkey` FOREIGN KEY (`subscriptionPlanId`) REFERENCES `SubscriptionPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyProfile` ADD CONSTRAINT `CompanyProfile_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SellerDomain` ADD CONSTRAINT `SellerDomain_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SellerSubscription` ADD CONSTRAINT `SellerSubscription_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SellerSubscription` ADD CONSTRAINT `SellerSubscription_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `SubscriptionPlan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlanFeature` ADD CONSTRAINT `PlanFeature_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `SubscriptionPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SellerFeature` ADD CONSTRAINT `SellerFeature_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SellerFeature` ADD CONSTRAINT `SellerFeature_overriddenById_fkey` FOREIGN KEY (`overriddenById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SellerBranch` ADD CONSTRAINT `SellerBranch_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Warehouse` ADD CONSTRAINT `Warehouse_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Warehouse` ADD CONSTRAINT `Warehouse_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `SellerBranch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SellerTheme` ADD CONSTRAINT `SellerTheme_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SellerTheme` ADD CONSTRAINT `SellerTheme_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ThemeVersion` ADD CONSTRAINT `ThemeVersion_sellerThemeId_fkey` FOREIGN KEY (`sellerThemeId`) REFERENCES `SellerTheme`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ThemeVersion` ADD CONSTRAINT `ThemeVersion_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserAppearancePreference` ADD CONSTRAINT `UserAppearancePreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserAppearancePreference` ADD CONSTRAINT `UserAppearancePreference_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SellerHomepageSection` ADD CONSTRAINT `SellerHomepageSection_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SellerHomepageSection` ADD CONSTRAINT `SellerHomepageSection_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Role` ADD CONSTRAINT `Role_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSellerMembership` ADD CONSTRAINT `UserSellerMembership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSellerMembership` ADD CONSTRAINT `UserSellerMembership_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSellerMembership` ADD CONSTRAINT `UserSellerMembership_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `SellerBranch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSellerMembership` ADD CONSTRAINT `UserSellerMembership_dealerId_fkey` FOREIGN KEY (`dealerId`) REFERENCES `Dealer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `UserSellerMembership`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dealer` ADD CONSTRAINT `Dealer_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dealer` ADD CONSTRAINT `Dealer_dealerGroupId_fkey` FOREIGN KEY (`dealerGroupId`) REFERENCES `DealerGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dealer` ADD CONSTRAINT `Dealer_pricingGroupId_fkey` FOREIGN KEY (`pricingGroupId`) REFERENCES `PricingGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dealer` ADD CONSTRAINT `Dealer_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerApplication` ADD CONSTRAINT `DealerApplication_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerApplication` ADD CONSTRAINT `DealerApplication_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerEmployee` ADD CONSTRAINT `DealerEmployee_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerEmployee` ADD CONSTRAINT `DealerEmployee_dealerId_fkey` FOREIGN KEY (`dealerId`) REFERENCES `Dealer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerEmployee` ADD CONSTRAINT `DealerEmployee_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerAddress` ADD CONSTRAINT `DealerAddress_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerAddress` ADD CONSTRAINT `DealerAddress_dealerId_fkey` FOREIGN KEY (`dealerId`) REFERENCES `Dealer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerDocument` ADD CONSTRAINT `DealerDocument_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerDocument` ADD CONSTRAINT `DealerDocument_dealerId_fkey` FOREIGN KEY (`dealerId`) REFERENCES `Dealer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerDocument` ADD CONSTRAINT `DealerDocument_verifiedById_fkey` FOREIGN KEY (`verifiedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerDocument` ADD CONSTRAINT `DealerDocument_fileAssetId_fkey` FOREIGN KEY (`fileAssetId`) REFERENCES `FileAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerGroup` ADD CONSTRAINT `DealerGroup_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PricingGroup` ADD CONSTRAINT `PricingGroup_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerCreditProfile` ADD CONSTRAINT `DealerCreditProfile_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerCreditProfile` ADD CONSTRAINT `DealerCreditProfile_dealerId_fkey` FOREIGN KEY (`dealerId`) REFERENCES `Dealer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerCreditProfile` ADD CONSTRAINT `DealerCreditProfile_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalespersonDealerAssignment` ADD CONSTRAINT `SalespersonDealerAssignment_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalespersonDealerAssignment` ADD CONSTRAINT `SalespersonDealerAssignment_dealerId_fkey` FOREIGN KEY (`dealerId`) REFERENCES `Dealer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductCategory` ADD CONSTRAINT `ProductCategory_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductCategory` ADD CONSTRAINT `ProductCategory_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `ProductCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductBrand` ADD CONSTRAINT `ProductBrand_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ProductCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `ProductBrand`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductImage` ADD CONSTRAINT `ProductImage_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductImage` ADD CONSTRAINT `ProductImage_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductImage` ADD CONSTRAINT `ProductImage_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductImage` ADD CONSTRAINT `ProductImage_fileAssetId_fkey` FOREIGN KEY (`fileAssetId`) REFERENCES `FileAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductDocument` ADD CONSTRAINT `ProductDocument_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductDocument` ADD CONSTRAINT `ProductDocument_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductDocument` ADD CONSTRAINT `ProductDocument_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductDocument` ADD CONSTRAINT `ProductDocument_fileAssetId_fkey` FOREIGN KEY (`fileAssetId`) REFERENCES `FileAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductAttribute` ADD CONSTRAINT `ProductAttribute_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductAttributeValue` ADD CONSTRAINT `ProductAttributeValue_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductAttributeValue` ADD CONSTRAINT `ProductAttributeValue_attributeId_fkey` FOREIGN KEY (`attributeId`) REFERENCES `ProductAttribute`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVariantAttribute` ADD CONSTRAINT `ProductVariantAttribute_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVariantAttribute` ADD CONSTRAINT `ProductVariantAttribute_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVariantAttribute` ADD CONSTRAINT `ProductVariantAttribute_attributeId_fkey` FOREIGN KEY (`attributeId`) REFERENCES `ProductAttribute`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVariantAttribute` ADD CONSTRAINT `ProductVariantAttribute_attributeValueId_fkey` FOREIGN KEY (`attributeValueId`) REFERENCES `ProductAttributeValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductPrice` ADD CONSTRAINT `ProductPrice_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductPrice` ADD CONSTRAINT `ProductPrice_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductPrice` ADD CONSTRAINT `ProductPrice_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductPrice` ADD CONSTRAINT `ProductPrice_dealerId_fkey` FOREIGN KEY (`dealerId`) REFERENCES `Dealer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductPrice` ADD CONSTRAINT `ProductPrice_dealerGroupId_fkey` FOREIGN KEY (`dealerGroupId`) REFERENCES `DealerGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductPrice` ADD CONSTRAINT `ProductPrice_pricingGroupId_fkey` FOREIGN KEY (`pricingGroupId`) REFERENCES `PricingGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductPrice` ADD CONSTRAINT `ProductPrice_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inventory` ADD CONSTRAINT `Inventory_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inventory` ADD CONSTRAINT `Inventory_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inventory` ADD CONSTRAINT `Inventory_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inventory` ADD CONSTRAINT `Inventory_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryTransaction` ADD CONSTRAINT `InventoryTransaction_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryTransaction` ADD CONSTRAINT `InventoryTransaction_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryTransaction` ADD CONSTRAINT `InventoryTransaction_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryTransaction` ADD CONSTRAINT `InventoryTransaction_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockReservation` ADD CONSTRAINT `StockReservation_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockReservation` ADD CONSTRAINT `StockReservation_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockReservation` ADD CONSTRAINT `StockReservation_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockReservation` ADD CONSTRAINT `StockReservation_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `OrderItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockReservation` ADD CONSTRAINT `StockReservation_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockAdjustment` ADD CONSTRAINT `StockAdjustment_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockAdjustment` ADD CONSTRAINT `StockAdjustment_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockAdjustment` ADD CONSTRAINT `StockAdjustment_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_dealerId_fkey` FOREIGN KEY (`dealerId`) REFERENCES `Dealer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_finalConfirmedById_fkey` FOREIGN KEY (`finalConfirmedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderRevision` ADD CONSTRAINT `OrderRevision_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderRevision` ADD CONSTRAINT `OrderRevision_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderRevision` ADD CONSTRAINT `OrderRevision_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderRevisionItem` ADD CONSTRAINT `OrderRevisionItem_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderRevisionItem` ADD CONSTRAINT `OrderRevisionItem_orderRevisionId_fkey` FOREIGN KEY (`orderRevisionId`) REFERENCES `OrderRevision`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderRevisionItem` ADD CONSTRAINT `OrderRevisionItem_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `OrderItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderRemark` ADD CONSTRAINT `OrderRemark_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderRemark` ADD CONSTRAINT `OrderRemark_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderRemark` ADD CONSTRAINT `OrderRemark_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderStatusHistory` ADD CONSTRAINT `OrderStatusHistory_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderStatusHistory` ADD CONSTRAINT `OrderStatusHistory_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderStatusHistory` ADD CONSTRAINT `OrderStatusHistory_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerConfirmation` ADD CONSTRAINT `DealerConfirmation_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerConfirmation` ADD CONSTRAINT `DealerConfirmation_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerConfirmation` ADD CONSTRAINT `DealerConfirmation_revisionId_fkey` FOREIGN KEY (`revisionId`) REFERENCES `OrderRevision`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerConfirmation` ADD CONSTRAINT `DealerConfirmation_dealerId_fkey` FOREIGN KEY (`dealerId`) REFERENCES `Dealer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DealerConfirmation` ADD CONSTRAINT `DealerConfirmation_confirmedById_fkey` FOREIGN KEY (`confirmedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProformaInvoice` ADD CONSTRAINT `ProformaInvoice_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProformaInvoice` ADD CONSTRAINT `ProformaInvoice_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProformaInvoice` ADD CONSTRAINT `ProformaInvoice_generatedById_fkey` FOREIGN KEY (`generatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProformaInvoice` ADD CONSTRAINT `ProformaInvoice_confirmedById_fkey` FOREIGN KEY (`confirmedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProformaInvoiceItem` ADD CONSTRAINT `ProformaInvoiceItem_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProformaInvoiceItem` ADD CONSTRAINT `ProformaInvoiceItem_proformaInvoiceId_fkey` FOREIGN KEY (`proformaInvoiceId`) REFERENCES `ProformaInvoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProformaInvoiceRevision` ADD CONSTRAINT `ProformaInvoiceRevision_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProformaInvoiceRevision` ADD CONSTRAINT `ProformaInvoiceRevision_proformaInvoiceId_fkey` FOREIGN KEY (`proformaInvoiceId`) REFERENCES `ProformaInvoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProformaInvoiceRevision` ADD CONSTRAINT `ProformaInvoiceRevision_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PickList` ADD CONSTRAINT `PickList_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PickList` ADD CONSTRAINT `PickList_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PickList` ADD CONSTRAINT `PickList_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PickList` ADD CONSTRAINT `PickList_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PickList` ADD CONSTRAINT `PickList_pickerId_fkey` FOREIGN KEY (`pickerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PickList` ADD CONSTRAINT `PickList_completedById_fkey` FOREIGN KEY (`completedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PickListItem` ADD CONSTRAINT `PickListItem_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PickListItem` ADD CONSTRAINT `PickListItem_pickListId_fkey` FOREIGN KEY (`pickListId`) REFERENCES `PickList`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PickListItem` ADD CONSTRAINT `PickListItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PickListException` ADD CONSTRAINT `PickListException_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PickListException` ADD CONSTRAINT `PickListException_pickListId_fkey` FOREIGN KEY (`pickListId`) REFERENCES `PickList`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PickListException` ADD CONSTRAINT `PickListException_reportedById_fkey` FOREIGN KEY (`reportedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PickListException` ADD CONSTRAINT `PickListException_resolvedById_fkey` FOREIGN KEY (`resolvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinalInvoice` ADD CONSTRAINT `FinalInvoice_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinalInvoice` ADD CONSTRAINT `FinalInvoice_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinalInvoice` ADD CONSTRAINT `FinalInvoice_generatedById_fkey` FOREIGN KEY (`generatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinalInvoiceItem` ADD CONSTRAINT `FinalInvoiceItem_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinalInvoiceItem` ADD CONSTRAINT `FinalInvoiceItem_finalInvoiceId_fkey` FOREIGN KEY (`finalInvoiceId`) REFERENCES `FinalInvoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_finalInvoiceId_fkey` FOREIGN KEY (`finalInvoiceId`) REFERENCES `FinalInvoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_verifiedById_fkey` FOREIGN KEY (`verifiedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditApproval` ADD CONSTRAINT `CreditApproval_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditApproval` ADD CONSTRAINT `CreditApproval_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditApproval` ADD CONSTRAINT `CreditApproval_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Package` ADD CONSTRAINT `Package_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Package` ADD CONSTRAINT `Package_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Package` ADD CONSTRAINT `Package_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `Shipment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Package` ADD CONSTRAINT `Package_packedById_fkey` FOREIGN KEY (`packedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_transportCompanyId_fkey` FOREIGN KEY (`transportCompanyId`) REFERENCES `TransportCompany`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `TransportDriver`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `TransportVehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransportCompany` ADD CONSTRAINT `TransportCompany_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransportDriver` ADD CONSTRAINT `TransportDriver_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransportDriver` ADD CONSTRAINT `TransportDriver_transportCompanyId_fkey` FOREIGN KEY (`transportCompanyId`) REFERENCES `TransportCompany`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransportVehicle` ADD CONSTRAINT `TransportVehicle_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransportVehicle` ADD CONSTRAINT `TransportVehicle_transportCompanyId_fkey` FOREIGN KEY (`transportCompanyId`) REFERENCES `TransportCompany`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransportVehicle` ADD CONSTRAINT `TransportVehicle_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `TransportDriver`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryEvent` ADD CONSTRAINT `DeliveryEvent_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryEvent` ADD CONSTRAINT `DeliveryEvent_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `Shipment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryEvent` ADD CONSTRAINT `DeliveryEvent_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inquiry` ADD CONSTRAINT `Inquiry_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inquiry` ADD CONSTRAINT `Inquiry_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InquiryFollowUp` ADD CONSTRAINT `InquiryFollowUp_inquiryId_fkey` FOREIGN KEY (`inquiryId`) REFERENCES `Inquiry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InquiryFollowUp` ADD CONSTRAINT `InquiryFollowUp_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FileAsset` ADD CONSTRAINT `FileAsset_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NumberSequence` ADD CONSTRAINT `NumberSequence_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `Seller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
