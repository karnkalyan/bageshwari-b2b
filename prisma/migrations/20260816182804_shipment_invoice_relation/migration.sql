-- DropIndex
DROP INDEX `CreditApproval_approvedById_fkey` ON `creditapproval`;

-- DropIndex
DROP INDEX `CreditApproval_orderId_fkey` ON `creditapproval`;

-- DropIndex
DROP INDEX `Dealer_approvedById_fkey` ON `dealer`;

-- DropIndex
DROP INDEX `Dealer_dealerGroupId_fkey` ON `dealer`;

-- DropIndex
DROP INDEX `Dealer_pricingGroupId_fkey` ON `dealer`;

-- DropIndex
DROP INDEX `DealerAddress_dealerId_fkey` ON `dealeraddress`;

-- DropIndex
DROP INDEX `DealerApplication_reviewedById_fkey` ON `dealerapplication`;

-- DropIndex
DROP INDEX `DealerConfirmation_confirmedById_fkey` ON `dealerconfirmation`;

-- DropIndex
DROP INDEX `DealerConfirmation_dealerId_fkey` ON `dealerconfirmation`;

-- DropIndex
DROP INDEX `DealerConfirmation_orderId_fkey` ON `dealerconfirmation`;

-- DropIndex
DROP INDEX `DealerConfirmation_revisionId_fkey` ON `dealerconfirmation`;

-- DropIndex
DROP INDEX `DealerCreditProfile_approvedById_fkey` ON `dealercreditprofile`;

-- DropIndex
DROP INDEX `DealerDocument_dealerId_fkey` ON `dealerdocument`;

-- DropIndex
DROP INDEX `DealerDocument_fileAssetId_fkey` ON `dealerdocument`;

-- DropIndex
DROP INDEX `DealerDocument_verifiedById_fkey` ON `dealerdocument`;

-- DropIndex
DROP INDEX `DealerEmployee_dealerId_fkey` ON `dealeremployee`;

-- DropIndex
DROP INDEX `DealerEmployee_userId_fkey` ON `dealeremployee`;

-- DropIndex
DROP INDEX `DeliveryEvent_shipmentId_fkey` ON `deliveryevent`;

-- DropIndex
DROP INDEX `DeliveryEvent_updatedById_fkey` ON `deliveryevent`;

-- DropIndex
DROP INDEX `FinalInvoice_generatedById_fkey` ON `finalinvoice`;

-- DropIndex
DROP INDEX `FinalInvoice_orderId_fkey` ON `finalinvoice`;

-- DropIndex
DROP INDEX `FinalInvoiceItem_finalInvoiceId_fkey` ON `finalinvoiceitem`;

-- DropIndex
DROP INDEX `Inquiry_assignedToId_fkey` ON `inquiry`;

-- DropIndex
DROP INDEX `InquiryFollowUp_userId_fkey` ON `inquiryfollowup`;

-- DropIndex
DROP INDEX `Inventory_productId_fkey` ON `inventory`;

-- DropIndex
DROP INDEX `Inventory_variantId_fkey` ON `inventory`;

-- DropIndex
DROP INDEX `Inventory_warehouseId_fkey` ON `inventory`;

-- DropIndex
DROP INDEX `InventoryTransaction_performedById_fkey` ON `inventorytransaction`;

-- DropIndex
DROP INDEX `InventoryTransaction_variantId_fkey` ON `inventorytransaction`;

-- DropIndex
DROP INDEX `InventoryTransaction_warehouseId_fkey` ON `inventorytransaction`;

-- DropIndex
DROP INDEX `Order_createdById_fkey` ON `order`;

-- DropIndex
DROP INDEX `Order_dealerId_fkey` ON `order`;

-- DropIndex
DROP INDEX `Order_finalConfirmedById_fkey` ON `order`;

-- DropIndex
DROP INDEX `OrderItem_orderId_fkey` ON `orderitem`;

-- DropIndex
DROP INDEX `OrderItem_productId_fkey` ON `orderitem`;

-- DropIndex
DROP INDEX `OrderItem_variantId_fkey` ON `orderitem`;

-- DropIndex
DROP INDEX `OrderRemark_orderId_fkey` ON `orderremark`;

-- DropIndex
DROP INDEX `OrderRemark_userId_fkey` ON `orderremark`;

-- DropIndex
DROP INDEX `OrderRevision_createdById_fkey` ON `orderrevision`;

-- DropIndex
DROP INDEX `OrderRevision_orderId_fkey` ON `orderrevision`;

-- DropIndex
DROP INDEX `OrderRevisionItem_orderItemId_fkey` ON `orderrevisionitem`;

-- DropIndex
DROP INDEX `OrderRevisionItem_orderRevisionId_fkey` ON `orderrevisionitem`;

-- DropIndex
DROP INDEX `OrderStatusHistory_changedById_fkey` ON `orderstatushistory`;

-- DropIndex
DROP INDEX `OrderStatusHistory_orderId_fkey` ON `orderstatushistory`;

-- DropIndex
DROP INDEX `Package_orderId_fkey` ON `package`;

-- DropIndex
DROP INDEX `Package_packedById_fkey` ON `package`;

-- DropIndex
DROP INDEX `Package_shipmentId_fkey` ON `package`;

-- DropIndex
DROP INDEX `Payment_finalInvoiceId_fkey` ON `payment`;

-- DropIndex
DROP INDEX `Payment_orderId_fkey` ON `payment`;

-- DropIndex
DROP INDEX `Payment_recordedById_fkey` ON `payment`;

-- DropIndex
DROP INDEX `Payment_verifiedById_fkey` ON `payment`;

-- DropIndex
DROP INDEX `PickList_assignedToId_fkey` ON `picklist`;

-- DropIndex
DROP INDEX `PickList_completedById_fkey` ON `picklist`;

-- DropIndex
DROP INDEX `PickList_orderId_fkey` ON `picklist`;

-- DropIndex
DROP INDEX `PickList_pickerId_fkey` ON `picklist`;

-- DropIndex
DROP INDEX `PickList_warehouseId_fkey` ON `picklist`;

-- DropIndex
DROP INDEX `PickListException_pickListId_fkey` ON `picklistexception`;

-- DropIndex
DROP INDEX `PickListException_reportedById_fkey` ON `picklistexception`;

-- DropIndex
DROP INDEX `PickListException_resolvedById_fkey` ON `picklistexception`;

-- DropIndex
DROP INDEX `PickListItem_pickListId_fkey` ON `picklistitem`;

-- DropIndex
DROP INDEX `PickListItem_variantId_fkey` ON `picklistitem`;

-- DropIndex
DROP INDEX `Product_brandId_fkey` ON `product`;

-- DropIndex
DROP INDEX `Product_categoryId_fkey` ON `product`;

-- DropIndex
DROP INDEX `Product_createdById_fkey` ON `product`;

-- DropIndex
DROP INDEX `ProductAttributeValue_attributeId_fkey` ON `productattributevalue`;

-- DropIndex
DROP INDEX `ProductCategory_parentId_fkey` ON `productcategory`;

-- DropIndex
DROP INDEX `ProductDocument_fileAssetId_fkey` ON `productdocument`;

-- DropIndex
DROP INDEX `ProductDocument_productId_fkey` ON `productdocument`;

-- DropIndex
DROP INDEX `ProductDocument_variantId_fkey` ON `productdocument`;

-- DropIndex
DROP INDEX `ProductImage_fileAssetId_fkey` ON `productimage`;

-- DropIndex
DROP INDEX `ProductImage_productId_fkey` ON `productimage`;

-- DropIndex
DROP INDEX `ProductImage_variantId_fkey` ON `productimage`;

-- DropIndex
DROP INDEX `ProductPrice_createdById_fkey` ON `productprice`;

-- DropIndex
DROP INDEX `ProductPrice_dealerGroupId_fkey` ON `productprice`;

-- DropIndex
DROP INDEX `ProductPrice_dealerId_fkey` ON `productprice`;

-- DropIndex
DROP INDEX `ProductPrice_pricingGroupId_fkey` ON `productprice`;

-- DropIndex
DROP INDEX `ProductPrice_productId_fkey` ON `productprice`;

-- DropIndex
DROP INDEX `ProductPrice_variantId_fkey` ON `productprice`;

-- DropIndex
DROP INDEX `ProductVariant_productId_fkey` ON `productvariant`;

-- DropIndex
DROP INDEX `ProductVariantAttribute_attributeId_fkey` ON `productvariantattribute`;

-- DropIndex
DROP INDEX `ProductVariantAttribute_attributeValueId_fkey` ON `productvariantattribute`;

-- DropIndex
DROP INDEX `ProductVariantAttribute_variantId_fkey` ON `productvariantattribute`;

-- DropIndex
DROP INDEX `ProformaInvoice_confirmedById_fkey` ON `proformainvoice`;

-- DropIndex
DROP INDEX `ProformaInvoice_generatedById_fkey` ON `proformainvoice`;

-- DropIndex
DROP INDEX `ProformaInvoice_orderId_fkey` ON `proformainvoice`;

-- DropIndex
DROP INDEX `ProformaInvoiceItem_proformaInvoiceId_fkey` ON `proformainvoiceitem`;

-- DropIndex
DROP INDEX `ProformaInvoiceRevision_createdById_fkey` ON `proformainvoicerevision`;

-- DropIndex
DROP INDEX `ProformaInvoiceRevision_proformaInvoiceId_fkey` ON `proformainvoicerevision`;

-- DropIndex
DROP INDEX `RolePermission_permissionId_fkey` ON `rolepermission`;

-- DropIndex
DROP INDEX `SalespersonDealerAssignment_dealerId_fkey` ON `salespersondealerassignment`;

-- DropIndex
DROP INDEX `Seller_createdById_fkey` ON `seller`;

-- DropIndex
DROP INDEX `Seller_subscriptionPlanId_fkey` ON `seller`;

-- DropIndex
DROP INDEX `SellerFeature_overriddenById_fkey` ON `sellerfeature`;

-- DropIndex
DROP INDEX `SellerHomepageSection_createdById_fkey` ON `sellerhomepagesection`;

-- DropIndex
DROP INDEX `SellerTheme_createdById_fkey` ON `sellertheme`;

-- DropIndex
DROP INDEX `Shipment_createdById_fkey` ON `shipment`;

-- DropIndex
DROP INDEX `Shipment_driverId_fkey` ON `shipment`;

-- DropIndex
DROP INDEX `Shipment_orderId_fkey` ON `shipment`;

-- DropIndex
DROP INDEX `Shipment_vehicleId_fkey` ON `shipment`;

-- DropIndex
DROP INDEX `StockAdjustment_performedById_fkey` ON `stockadjustment`;

-- DropIndex
DROP INDEX `StockAdjustment_warehouseId_fkey` ON `stockadjustment`;

-- DropIndex
DROP INDEX `StockReservation_orderId_fkey` ON `stockreservation`;

-- DropIndex
DROP INDEX `StockReservation_orderItemId_fkey` ON `stockreservation`;

-- DropIndex
DROP INDEX `StockReservation_variantId_fkey` ON `stockreservation`;

-- DropIndex
DROP INDEX `StockReservation_warehouseId_fkey` ON `stockreservation`;

-- DropIndex
DROP INDEX `ThemeVersion_createdById_fkey` ON `themeversion`;

-- DropIndex
DROP INDEX `TransportDriver_transportCompanyId_fkey` ON `transportdriver`;

-- DropIndex
DROP INDEX `TransportVehicle_driverId_fkey` ON `transportvehicle`;

-- DropIndex
DROP INDEX `TransportVehicle_transportCompanyId_fkey` ON `transportvehicle`;

-- DropIndex
DROP INDEX `UserAppearancePreference_sellerId_fkey` ON `userappearancepreference`;

-- DropIndex
DROP INDEX `UserRole_membershipId_fkey` ON `userrole`;

-- DropIndex
DROP INDEX `UserRole_roleId_fkey` ON `userrole`;

-- DropIndex
DROP INDEX `UserSellerMembership_branchId_fkey` ON `usersellermembership`;

-- DropIndex
DROP INDEX `UserSellerMembership_dealerId_fkey` ON `usersellermembership`;

-- DropIndex
DROP INDEX `Warehouse_branchId_fkey` ON `warehouse`;

-- AlterTable
ALTER TABLE `shipment` ADD COLUMN `finalInvoiceId` VARCHAR(50) NULL;

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
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_finalInvoiceId_fkey` FOREIGN KEY (`finalInvoiceId`) REFERENCES `FinalInvoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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
