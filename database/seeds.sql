-- Seed Data

-- Users
INSERT INTO users (name, email, password, role) VALUES
('Super Admin', 'super@example.com', '$2b$10$hashedpassword', 'super_admin'),
('Admin User', 'admin@example.com', '$2b$10$hashedpassword', 'admin'),
('Tenant User', 'tenant@example.com', '$2b$10$hashedpassword', 'tenant');

-- Properties
INSERT INTO properties (name, address, units, rent, admin_id) VALUES
('Sunset Apartments', '123 Sunset Blvd', 10, 1200.00, 2),
('Downtown Lofts', '456 Main St', 5, 1500.00, 2);

-- Tenants
INSERT INTO tenants (name, email, property_id, unit_number, lease_start, lease_end, rent_amount) VALUES
('John Doe', 'tenant@example.com', 1, '101', '2024-01-01', '2024-12-31', 1200.00);

-- Payments
INSERT INTO payments (tenant_id, amount, date, type, method, status) VALUES
(1, 1200.00, '2024-01-05', 'rent', 'card', 'completed'),
(1, 1200.00, '2024-02-05', 'rent', 'card', 'completed');
