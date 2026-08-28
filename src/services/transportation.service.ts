import "server-only";
import { prisma } from "@/lib/db";
import { assertTransportSelection, calculateShipmentWeight } from "@/services/business-rules";
import { nextDocumentNumber } from "@/services/number-sequence.service";
import type { z } from "zod";
import type { createShipmentSchema } from "@/validators/shipment.schema";

type ShipmentInput = z.infer<typeof createShipmentSchema> & { sellerId: string; userId: string };

// ────────────────────────────────────────────────────
// TRANSPORT COMPANIES
// ────────────────────────────────────────────────────
export async function listTransportCompanies(sellerId: string) {
  return prisma.transportCompany.findMany({
    where: { sellerId, status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: {
      drivers: { where: { status: "ACTIVE" }, orderBy: { name: "asc" } },
      vehicles: { where: { status: "ACTIVE" }, orderBy: { vehicleNumber: "asc" } },
    },
  });
}

export async function createTransportCompany(input: {
  sellerId: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  panNumber?: string;
  vatNumber?: string;
  notes?: string;
}) {
  const existing = await prisma.transportCompany.count({ where: { sellerId: input.sellerId } });
  const code = `TC-${String(existing + 1).padStart(4, "0")}`;
  return prisma.transportCompany.create({
    data: {
      sellerId: input.sellerId,
      code,
      name: input.name,
      contactName: input.contactName,
      phone: input.phone,
      email: input.email,
      address: input.address,
      panNumber: input.panNumber,
      vatNumber: input.vatNumber,
      notes: input.notes,
    },
  });
}

export async function updateTransportCompany(
  sellerId: string,
  id: string,
  data: { name?: string; contactName?: string; phone?: string; email?: string; address?: string; panNumber?: string; vatNumber?: string; status?: string; notes?: string }
) {
  return prisma.transportCompany.update({
    where: { id, sellerId },
    data,
  });
}

// ────────────────────────────────────────────────────
// DRIVERS
// ────────────────────────────────────────────────────
export async function listDrivers(sellerId: string, transportCompanyId?: string) {
  return prisma.transportDriver.findMany({
    where: { sellerId, status: "ACTIVE", ...(transportCompanyId ? { transportCompanyId } : {}) },
    orderBy: { name: "asc" },
    include: { transportCompany: { select: { name: true } } },
  });
}

export async function createDriver(input: {
  sellerId: string;
  transportCompanyId: string;
  name: string;
  phone?: string;
  licenseNumber?: string;
}) {
  return prisma.transportDriver.create({
    data: {
      sellerId: input.sellerId,
      transportCompanyId: input.transportCompanyId,
      name: input.name,
      phone: input.phone,
      licenseNumber: input.licenseNumber,
    },
  });
}

export async function updateDriver(
  sellerId: string,
  id: string,
  data: { name?: string; phone?: string; licenseNumber?: string; status?: string }
) {
  return prisma.transportDriver.update({
    where: { id, sellerId },
    data,
  });
}

// ────────────────────────────────────────────────────
// VEHICLES
// ────────────────────────────────────────────────────
export async function listVehicles(sellerId: string, transportCompanyId?: string) {
  return prisma.transportVehicle.findMany({
    where: { sellerId, status: "ACTIVE", ...(transportCompanyId ? { transportCompanyId } : {}) },
    orderBy: { vehicleNumber: "asc" },
    include: {
      transportCompany: { select: { name: true } },
      driver: { select: { name: true, phone: true } },
    },
  });
}

export async function createVehicle(input: {
  sellerId: string;
  transportCompanyId: string;
  vehicleNumber: string;
  vehicleType?: string;
  capacity?: number;
  driverId?: string;
}) {
  return prisma.transportVehicle.create({
    data: {
      sellerId: input.sellerId,
      transportCompanyId: input.transportCompanyId,
      vehicleNumber: input.vehicleNumber,
      vehicleType: input.vehicleType,
      capacity: input.capacity,
      driverId: input.driverId,
    },
  });
}

export async function updateVehicle(
  sellerId: string,
  id: string,
  data: { vehicleNumber?: string; vehicleType?: string; capacity?: number; driverId?: string; status?: string }
) {
  return prisma.transportVehicle.update({
    where: { id, sellerId },
    data,
  });
}

// ────────────────────────────────────────────────────
// SHIPMENT
// ────────────────────────────────────────────────────
export async function createShipment(input: ShipmentInput) {
  return prisma.$transaction(async (tx) => {
    const [order, driver, vehicle, packages] = await Promise.all([
      tx.order.findFirst({ where: { id: input.orderId, sellerId: input.sellerId }, select: { id: true, status: true } }),
      tx.transportDriver.findFirst({ where: { id: input.driverId, sellerId: input.sellerId, status: "ACTIVE" } }),
      tx.transportVehicle.findFirst({ where: { id: input.vehicleId, sellerId: input.sellerId, status: "ACTIVE" } }),
      tx.package.findMany({ where: { orderId: input.orderId, sellerId: input.sellerId }, select: { id: true, weight: true } }),
    ]);
    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (!["PACKED", "PACKED_AND_LABELLED"].includes(order.status)) throw new Error("ORDER_NOT_PACKED");
    if (!driver || !vehicle) throw new Error("TRANSPORT_RESOURCE_NOT_FOUND");
    const challanNumber = input.challanNumber || await nextDocumentNumber(tx, input.sellerId, "CHALLAN", "CHL");
    assertTransportSelection({ transportCompanyId: input.transportCompanyId, driverCompanyId: driver.transportCompanyId, vehicleCompanyId: vehicle.transportCompanyId, challanNumber });
    const shipmentNumber = await nextDocumentNumber(tx, input.sellerId, "SHIPMENT", "SHP");
    const totalWeight = calculateShipmentWeight(packages.map((item) => Number(item.weight ?? 0)));
    return tx.shipment.create({
      data: {
        sellerId: input.sellerId,
        orderId: input.orderId,
        finalInvoiceId: input.finalInvoiceId,
        shipmentNumber,
        status: "CREATED",
        transportCompanyId: input.transportCompanyId,
        driverId: input.driverId,
        vehicleId: input.vehicleId,
        challanNumber,
        trackingNumber: input.trackingNumber,
        expectedDelivery: input.expectedDeliveryDate,
        totalCartons: packages.length,
        totalWeight,
        createdById: input.userId,
        remarks: input.remarks,
        packages: { connect: packages.map((item) => ({ id: item.id })) },
      },
    });
  });
}

/**
 * Create a shipment from dispatch page (backward-compatible with inline form data).
 * Stores direct transporter/driver/vehicle text AND links to related records if IDs are provided.
 */
export async function createDispatchShipment(input: {
  sellerId: string;
  orderId: string;
  userId: string;
  transporter: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  totalWeight?: number;
  totalCartons?: number;
  transportCompanyId?: string;
  driverId?: string;
  vehicleId?: string;
  remarks?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: input.orderId, sellerId: input.sellerId },
      include: { packages: true },
    });
    if (!order) throw new Error("Order not found");

    const challanNumber = await nextDocumentNumber(tx, input.sellerId, "CHALLAN", "CHL");
    const shipmentNumber = await nextDocumentNumber(tx, input.sellerId, "SHIPMENT", "SHP");
    const totalCartons = input.totalCartons || order.packages.length || 1;
    const totalWeight = input.totalWeight || order.packages.reduce((sum, p) => sum + Number(p.weight || 0), 0) || 0;

    const shipment = await tx.shipment.create({
      data: {
        sellerId: input.sellerId,
        orderId: order.id,
        shipmentNumber,
        challanNumber,
        status: "DISPATCHED",
        transporter: input.transporter,
        driverName: input.driverName || undefined,
        driverPhone: input.driverPhone || undefined,
        vehicleNumber: input.vehicleNumber || undefined,
        totalCartons,
        totalWeight,
        dispatchDate: new Date(),
        createdById: input.userId,
        remarks: input.remarks || undefined,
        ...(input.transportCompanyId ? { transportCompanyId: input.transportCompanyId } : {}),
        ...(input.driverId ? { driverId: input.driverId } : {}),
        ...(input.vehicleId ? { vehicleId: input.vehicleId } : {}),
      },
    });

    return shipment;
  });
}
