-- Green Gold Seeds Database Setup
-- Complete SQL file to drop, create tables and insert sample data

-- =============================================
-- DROP EXISTING TABLES (IF EXISTS)
-- =============================================

-- Drop tables in correct order (child first, then parent)
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================
-- CREATE TABLES
-- =============================================

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL, -- 'operator' or 'admin'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_id TEXT NOT NULL UNIQUE,
    company TEXT NOT NULL,
    brand TEXT NOT NULL,
    product TEXT NOT NULL,
    description TEXT NOT NULL,
    mrp DECIMAL(10,2) NOT NULL,
    net_qty TEXT NOT NULL,
    lot_batch TEXT NOT NULL,
    mfg_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    customer_care TEXT NOT NULL,
    email TEXT NOT NULL,
    company_address TEXT NOT NULL,
    marketed_by TEXT NOT NULL,
    brochure_url TEXT,
    brochure_filename TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    submission_date TIMESTAMP DEFAULT NOW(),
    approval_date TIMESTAMP,
    submitted_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    rejection_reason TEXT
);

-- =============================================
-- INSERT SAMPLE DATA
-- =============================================

-- Insert demo users
INSERT INTO users (id, username, email, password, role, created_at) VALUES 
('4342d582-a190-48d1-846e-0527da6e0c28', 'admin', 'admin@greengoldseeds.com', '44d9142eec52adfbebf4098d14b00549ab0344e99e27aecc29d7b908755d749e1e23c30e39b75ded7d90cd69be1dfdf27932dd12383ac6c2da45ed7901df2ab9.49c2c64c4e3ef458aa459f1d03c3aa80', 'admin', '2025-09-10 02:44:26.979716'),
('35f056d0-b1fb-4ec9-be21-d4b96e5c8e41', 'operator', '1@test.com', '4f702177cb55d4461c83aeabc3f5acaa3bccdbb8d04e268f2bb7def2c2db9ee01673a71cbfa2004f9a4856e6c573109a0258586a3026604e977b79f10d1e466a.d6e352a2c51ebcffed2db16b1a8ec0fb', 'operator', '2025-09-10 02:47:08.074341'),
('2fb89cba-b9a8-4031-b3e5-20682ba3048b', 'op2', 'op@test.com', '19920407cffb5a57b1801e19b11d14230d6d15703877c15d732b284a046c0f6b0a72cf6b2dae4297ce394a0ed4435379b75c25c973c1c9d8545c0b11655309bd.0a8d51cc121ffd150a920bd1e470bfeb', 'operator', '2025-09-10 02:49:18.729229');

-- Insert sample products with Green Gold Seeds information
INSERT INTO products (id, unique_id, company, brand, product, description, mrp, net_qty, lot_batch, mfg_date, expiry_date, customer_care, email, company_address, marketed_by, brochure_url, brochure_filename, status, submission_date, approval_date, submitted_by, approved_by, rejection_reason) VALUES 
('e1f9d80d-f3ce-4f24-b99e-f717fb8dd871', 'GGS-2024-001001', 'NIRMAL SEEDS PRIVATE LIMITED', 'Mustard NML-64', 'Mustard NML-64', 'High yielding mustard variety suitable for all agro-climatic conditions. Disease resistant and early maturing.', 650.00, '1.000 kg', 'T341746', '2024-08-29', '2026-04-28', '+91 88888 66031', 'greengoldseeds@rediffmail.com', 'Gut No. 65, Narayanpur Shivar, Waluj, Gangapur, Dist: Chh. Sambhajinagar-431001.', 'Green Gold Seeds Pvt.Ltd.', NULL, NULL, 'approved', '2025-09-10 02:51:51.47446', '2025-09-10 02:51:51.463', '2fb89cba-b9a8-4031-b3e5-20682ba3048b', NULL, NULL),

('2d627aee-480b-4944-bf48-676f484572ba', 'GGS-2024-001002', 'GREEN GOLD SEEDS PVT LTD', 'Golden Wheat', 'Golden Wheat GW-2024', 'Premium quality wheat seeds with high protein content and excellent germination rate. Suitable for Rabi season.', 580.00, '2.000 kg', 'GW240915', '2024-09-01', '2026-03-01', '+91 88888 66031', 'greengoldseeds@rediffmail.com', 'Gut No. 65, Narayanpur Shivar, Waluj, Gangapur, Dist: Chh. Sambhajinagar-431001.', 'Green Gold Seeds Pvt.Ltd.', NULL, NULL, 'approved', '2025-09-10 02:51:51.515488', '2025-09-10 02:51:51.463', '2fb89cba-b9a8-4031-b3e5-20682ba3048b', NULL, NULL),

('587c9750-9011-43ce-b564-8fa394d17643', 'GGS-2024-001004', 'SUPREME SEEDS CORPORATION', 'Royal Rice', 'Royal Basmati Rice Seeds', 'Premium Basmati rice variety with excellent aroma and long grain characteristics. High market value.', 890.00, '5.000 kg', 'RR240725', '2024-07-25', '2026-01-25', '+91 88888 66031', 'greengoldseeds@rediffmail.com', 'Gut No. 65, Narayanpur Shivar, Waluj, Gangapur, Dist: Chh. Sambhajinagar-431001.', 'Green Gold Seeds Pvt.Ltd.', NULL, NULL, 'approved', '2025-09-10 02:51:51.556478', '2025-09-10 02:51:51.463', '2fb89cba-b9a8-4031-b3e5-20682ba3048b', NULL, NULL),

('ed322545-3d60-4b51-8560-55f09a79c899', 'GGS-2024-001005', 'AGRO TECH SEEDS LTD', 'Power Cotton', 'Power Cotton BT Hybrid', 'BT Cotton hybrid with superior bollworm resistance and high fiber quality. Suitable for irrigated conditions.', 2150.00, '450 grams', 'PC240810', '2024-08-10', '2026-02-10', '+91 88888 66031', 'greengoldseeds@rediffmail.com', 'Gut No. 65, Narayanpur Shivar, Waluj, Gangapur, Dist: Chh. Sambhajinagar-431001.', 'Green Gold Seeds Pvt.Ltd.', NULL, NULL, 'rejected', '2025-09-10 02:51:51.573639', NULL, '2fb89cba-b9a8-4031-b3e5-20682ba3048b', NULL, 'Documentation incomplete - missing test certificate'),

('281da499-324c-4032-83d2-a23ce1b889d3', 'GGS-2024-001003', 'GREEN GOLD SEEDS PVT LTD', 'Superstar Tomato', 'Superstar Tomato Hybrid Seeds', 'High yielding hybrid tomato variety with excellent disease resistance. Perfect for greenhouse and open field cultivation.', 1250.00, '10 grams', 'ST240820', '2024-08-20', '2026-02-20', '+91 88888 66031', 'greengoldseeds@rediffmail.com', 'Gut No. 65, Narayanpur Shivar, Waluj, Gangapur, Dist: Chh. Sambhajinagar-431001.', 'Green Gold Seeds Pvt.Ltd.', NULL, NULL, 'approved', '2025-09-10 02:51:51.538408', '2025-09-10 04:09:41.24', '2fb89cba-b9a8-4031-b3e5-20682ba3048b', '4342d582-a190-48d1-846e-0527da6e0c28', NULL);

-- =============================================
-- VERIFY DATA
-- =============================================

-- Check users
SELECT 'Users created:' as info, count(*) as count FROM users;

-- Check products  
SELECT 'Products created:' as info, count(*) as count FROM products;

-- Show demo credentials
SELECT 
    'Demo Credentials' as info,
    username,
    CASE 
        WHEN username = 'admin' THEN 'admin123'
        WHEN username = 'op2' THEN 'test123'
        ELSE 'contact admin'
    END as password,
    email,
    role
FROM users 
WHERE username IN ('admin', 'op2')
ORDER BY role DESC;