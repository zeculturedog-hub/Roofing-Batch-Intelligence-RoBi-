/**
 * RoBI Enterprise Authentication Service
 * Designed for Company Intranet deployment with Role-Based Access Control (RBAC).
 */

export const ENTERPRISE_USERS = [
  {
    id: 'usr-001',
    email: 'alex.m@alaf.co.tz',
    name: 'Alex M.',
    role: 'Sales & Order Planner',
    roleCode: 'sales_planner',
    department: 'Commercial & Sales Planning',
    plant: 'DA01 - Dar es Salaam',
    avatar: 'AM'
  },
  {
    id: 'usr-002',
    email: 'david.k@alaf.co.tz',
    name: 'David K.',
    role: 'Stock & Warehouse Manager',
    roleCode: 'stock_manager',
    department: 'Logistics & Raw Materials',
    plant: 'DA02 - Dar es Salaam',
    avatar: 'DK'
  },
  {
    id: 'usr-003',
    email: 'sarah.t@alaf.co.tz',
    name: 'Sarah T.',
    role: 'Quality Assurance Lead',
    roleCode: 'quality_admin',
    department: 'Coil Quality & Technical Services',
    plant: 'All Plants',
    avatar: 'ST'
  },
  {
    id: 'usr-004',
    email: 'admin@alaf.co.tz',
    name: 'System Admin',
    role: 'Intranet Administrator',
    roleCode: 'admin',
    department: 'IT & Enterprise Systems',
    plant: 'Head Office',
    avatar: 'AD'
  }
];

const STORAGE_KEY = 'robi_auth_session';

export class AuthService {
  static getCurrentUser() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  static isAuthenticated() {
    return Boolean(this.getCurrentUser());
  }

  static login(email, password = '') {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const user = ENTERPRISE_USERS.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      throw new Error('Invalid company email. Please select or enter an authorized intranet account.');
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  }

  static logout() {
    localStorage.removeItem(STORAGE_KEY);
  }
}
