export interface User {
  id: string;
  username: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  status: number;
  createdAt: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  specification?: string;
  unit: string;
  price: number;
  costPrice?: number;
  stock?: number;
  status: number;
  description?: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  sort: number;
  status: number;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string;
  manager?: string;
  phone?: string;
  status: number;
}

export interface Inventory {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  availableQuantity: number;
  lockedQuantity: number;
  warningThreshold?: number;
}

export interface InventoryRecord {
  id: string;
  type: 'in' | 'out' | 'transfer' | 'adjust';
  productId: string;
  productName: string;
  productCode: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  relatedOrderNo?: string;
  remark?: string;
  operator: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  level?: string;
  status: number;
  creditLimit?: number;
  balance?: number;
}

export interface SaleOrder {
  id: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  status: 'draft' | 'confirmed' | 'shipped' | 'completed' | 'cancelled';
  totalAmount: number;
  paidAmount: number;
  items: SaleOrderItem[];
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface PurchaseOrder {
  id: string;
  orderNo: string;
  supplierId: string;
  supplierName: string;
  status: 'draft' | 'confirmed' | 'received' | 'completed' | 'cancelled';
  totalAmount: number;
  paidAmount: number;
  items: PurchaseOrderItem[];
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: number;
  balance?: number;
}
