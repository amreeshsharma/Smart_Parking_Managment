-- =====================================================================
--  ParkSmart sample data. Run AFTER schema.sql
--  Demo login: user@parksmart.com / admin@parksmart.com, password 123456
--  (the Password column holds a bcrypt hash of "123456")
-- =====================================================================
USE parksmart;

-- ---------------------------------------------------------------------
--  Users (8)
-- ---------------------------------------------------------------------
INSERT INTO users (User_ID, Name, Email, Phone, Password, Role) VALUES
(1, 'Rahul Sharma',  'user@parksmart.com',  '9876543210', '$2b$10$hyISaYsOnHYpx2sRKdhEf.Y0lYnStOv0fPu/KitADqnYZ/yhWHPkq', 'User'),
(2, 'Priya Verma',   'priya@example.com',   '9876501234', '$2b$10$hyISaYsOnHYpx2sRKdhEf.Y0lYnStOv0fPu/KitADqnYZ/yhWHPkq', 'User'),
(3, 'Amit Singh',    'amit@example.com',    '9812345678', '$2b$10$hyISaYsOnHYpx2sRKdhEf.Y0lYnStOv0fPu/KitADqnYZ/yhWHPkq', 'User'),
(4, 'Neha Gupta',    'neha@example.com',    '9823456789', '$2b$10$hyISaYsOnHYpx2sRKdhEf.Y0lYnStOv0fPu/KitADqnYZ/yhWHPkq', 'User'),
(5, 'Vikram Patel',  'vikram@example.com',  '9834567890', '$2b$10$hyISaYsOnHYpx2sRKdhEf.Y0lYnStOv0fPu/KitADqnYZ/yhWHPkq', 'User'),
(6, 'Anjali Mishra', 'anjali@example.com',  '9845678901', '$2b$10$hyISaYsOnHYpx2sRKdhEf.Y0lYnStOv0fPu/KitADqnYZ/yhWHPkq', 'User'),
(7, 'Rohan Yadav',   'rohan@example.com',   '9856789012', '$2b$10$hyISaYsOnHYpx2sRKdhEf.Y0lYnStOv0fPu/KitADqnYZ/yhWHPkq', 'User'),
(8, 'Sneha Joshi',   'sneha@example.com',   '9867890123', '$2b$10$hyISaYsOnHYpx2sRKdhEf.Y0lYnStOv0fPu/KitADqnYZ/yhWHPkq', 'User');

-- ---------------------------------------------------------------------
--  Parking lots (3)
-- ---------------------------------------------------------------------
INSERT INTO parking_lot (Lot_ID, Lot_Name, Location, Total_Bays, Open_Time, Close_Time) VALUES
(1, 'City Center Mall', 'MG Road, Gwalior',        24, '06:00:00', '23:00:00'),
(2, 'Railway Station',  'Station Road, Gwalior',   24, '00:00:00', '23:59:59'),
(3, 'Tech Park',        'Sector 5, Gwalior',       24, '07:00:00', '22:00:00');

-- ---------------------------------------------------------------------
--  Admins (2)
-- ---------------------------------------------------------------------
INSERT INTO admin (Admin_ID, Name, Email, Password, Lot_ID) VALUES
(1, 'Admin One', 'admin@parksmart.com',  '$2b$10$hyISaYsOnHYpx2sRKdhEf.Y0lYnStOv0fPu/KitADqnYZ/yhWHPkq', 1),
(2, 'Admin Two', 'admin2@parksmart.com', '$2b$10$hyISaYsOnHYpx2sRKdhEf.Y0lYnStOv0fPu/KitADqnYZ/yhWHPkq', 2);

-- ---------------------------------------------------------------------
--  Parking bays: 3 lots x 3 floors x 8 bays = 72
--  Bay_ID = (lot-1)*24 + (floor-1)*8 + n   (n 1-5 Regular, 6 EV, 7 Compact, 8 Disabled)
-- ---------------------------------------------------------------------
INSERT INTO parking_bay (Bay_Number, Floor, Bay_Type, Status, Lot_ID)
SELECT CONCAT('F', f.n, '-', LPAD(b.n, 2, '0')),
       f.n,
       CASE WHEN b.n = 6 THEN 'EV' WHEN b.n = 7 THEN 'Compact' WHEN b.n = 8 THEN 'Disabled' ELSE 'Regular' END,
       'Available',
       l.n
FROM (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3) l
CROSS JOIN (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3) f
CROSS JOIN (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
            UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8) b
ORDER BY l.n, f.n, b.n;

-- ---------------------------------------------------------------------
--  Vehicles (12)
-- ---------------------------------------------------------------------
INSERT INTO vehicle (Vehicle_ID, Vehicle_Number, RFID_Tag, Brand, Color, User_ID) VALUES
(1,  'MP07 AB 1234', 'RFID-A1001', 'Maruti Swift',    'White',  1),
(2,  'MP07 CD 5678', 'RFID-A1002', 'Hyundai Creta',   'Black',  1),
(3,  'MP04 EF 9012', 'RFID-A1003', 'Tata Nexon',      'Blue',   2),
(4,  'MP07 GH 3456', 'RFID-A1004', 'Honda City',      'Silver', 3),
(5,  'DL01 JK 7890', 'RFID-A1005', 'Kia Seltos',      'Red',    4),
(6,  'MP07 LM 2345', 'RFID-A1006', 'Mahindra Thar',   'Grey',   5),
(7,  'UP80 NP 6789', 'RFID-A1007', 'Toyota Innova',   'White',  6),
(8,  'MP07 QR 1122', 'RFID-A1008', 'Tata Tiago EV',   'Green',  7),
(9,  'MP20 ST 3344', 'RFID-A1009', 'Hyundai i20',     'Orange', 8),
(10, 'MP04 UV 5566', 'RFID-A1010', 'Maruti Baleno',   'Blue',   2),
(11, 'MP07 WX 7788', 'RFID-A1011', 'Skoda Slavia',    'Black',  3),
(12, 'DL01 YZ 9900', 'RFID-A1012', 'MG Hector',       'White',  4);

-- ---------------------------------------------------------------------
--  Reservations (15): 6 completed, 2 active, 5 upcoming, 2 cancelled
--  (triggers keep bay Status in sync)
-- ---------------------------------------------------------------------
INSERT INTO reservation (Reservation_ID, Booking_Date, Start_Time, End_Time, Status, Vehicle_ID, Bay_ID) VALUES
(1,  DATE_SUB(CURDATE(), INTERVAL 6 DAY), '09:00:00', '11:00:00', 'Completed', 1,  1),
(2,  DATE_SUB(CURDATE(), INTERVAL 5 DAY), '10:00:00', '12:00:00', 'Completed', 2,  2),
(3,  DATE_SUB(CURDATE(), INTERVAL 4 DAY), '14:00:00', '17:00:00', 'Completed', 3,  25),
(4,  DATE_SUB(CURDATE(), INTERVAL 3 DAY), '08:00:00', '10:00:00', 'Completed', 4,  26),
(5,  DATE_SUB(CURDATE(), INTERVAL 2 DAY), '18:00:00', '20:00:00', 'Completed', 5,  49),
(6,  DATE_SUB(CURDATE(), INTERVAL 1 DAY), '12:00:00', '13:00:00', 'Completed', 6,  3),
(7,  CURDATE(),                           '00:00:00', '23:00:00', 'Active',    1,  9),
(8,  CURDATE(),                           '00:00:00', '23:00:00', 'Active',    7,  27),
(9,  DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00', '12:00:00', 'Upcoming',  2,  4),
(10, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '15:00:00', '17:00:00', 'Upcoming',  8,  6),
(11, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00:00', '11:30:00', 'Upcoming',  9,  28),
(12, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '08:00:00', '12:00:00', 'Upcoming',  10, 50),
(13, DATE_ADD(CURDATE(), INTERVAL 4 DAY), '13:00:00', '15:00:00', 'Upcoming',  11, 15),
(14, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00', '10:00:00', 'Cancelled', 3,  5),
(15, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '16:00:00', '18:00:00', 'Cancelled', 12, 29);

-- ---------------------------------------------------------------------
--  Parking sessions (8): 6 finished (2 with overstay), 2 live
--  Overstay = minutes past reservation End_Time; penalty = Rs 2 per minute
-- ---------------------------------------------------------------------
INSERT INTO parking_session (Session_ID, Entry_Time, Exit_Time, Reservation_ID, Vehicle_ID, Bay_ID, Overstay_Minutes, Penalty_Amount) VALUES
(1, TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 6 DAY), '09:05:00'), TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 6 DAY), '10:55:00'), 1, 1, 1,  0,   0),
(2, TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 5 DAY), '10:00:00'), TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 5 DAY), '12:25:00'), 2, 2, 2,  25,  50),
(3, TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 4 DAY), '14:00:00'), TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 4 DAY), '16:50:00'), 3, 3, 25, 0,   0),
(4, TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 3 DAY), '08:10:00'), TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 3 DAY), '10:00:00'), 4, 4, 26, 0,   0),
(5, TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 2 DAY), '18:00:00'), TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 2 DAY), '21:10:00'), 5, 5, 49, 70,  140),
(6, TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '12:00:00'), TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '12:55:00'), 6, 6, 3,  0,   0);

INSERT INTO parking_session (Session_ID, Entry_Time, Exit_Time, Reservation_ID, Vehicle_ID, Bay_ID) VALUES
(7, DATE_SUB(NOW(), INTERVAL 3 HOUR),    NULL, 7, 1, 9),    -- live sessions: trigger marks bay Occupied
(8, DATE_SUB(NOW(), INTERVAL 90 MINUTE), NULL, 8, 7, 27);

-- ---------------------------------------------------------------------
--  Payments (16)
-- ---------------------------------------------------------------------
INSERT INTO payment (Payment_ID, Amount, Payment_Type, Payment_Mode, Transaction_ID, Payment_Status, Payment_Date, Reservation_ID) VALUES
(1,  80.00,  'Reservation Fee', 'UPI',         'TXN1000000001', 'Paid',    DATE_SUB(NOW(), INTERVAL 7 DAY), 1),
(2,  80.00,  'Reservation Fee', 'Card',        'TXN1000000002', 'Paid',    DATE_SUB(NOW(), INTERVAL 6 DAY), 2),
(3,  120.00, 'Reservation Fee', 'UPI',         'TXN1000000003', 'Paid',    DATE_SUB(NOW(), INTERVAL 5 DAY), 3),
(4,  80.00,  'Reservation Fee', 'Cash',        'TXN1000000004', 'Paid',    DATE_SUB(NOW(), INTERVAL 4 DAY), 4),
(5,  80.00,  'Reservation Fee', 'Net Banking', 'TXN1000000005', 'Paid',    DATE_SUB(NOW(), INTERVAL 3 DAY), 5),
(6,  40.00,  'Reservation Fee', 'UPI',         'TXN1000000006', 'Paid',    DATE_SUB(NOW(), INTERVAL 2 DAY), 6),
(7,  920.00, 'Reservation Fee', 'Card',        'TXN1000000007', 'Paid',    DATE_SUB(NOW(), INTERVAL 1 DAY), 7),
(8,  920.00, 'Reservation Fee', NULL,          NULL,            'Pending', NULL,                            8),
(9,  120.00, 'Reservation Fee', 'UPI',         'TXN1000000009', 'Paid',    NOW(),                           9),
(10, 120.00, 'Reservation Fee', NULL,          NULL,            'Pending', NULL,                            10),
(11, 60.00,  'Reservation Fee', NULL,          NULL,            'Pending', NULL,                            11),
(12, 160.00, 'Reservation Fee', 'Card',        'TXN1000000012', 'Paid',    NOW(),                           12),
(13, 60.00,  'Reservation Fee', NULL,          NULL,            'Pending', NULL,                            13),
(14, 40.00,  'Reservation Fee', 'Card',        NULL,            'Failed',  DATE_SUB(NOW(), INTERVAL 1 DAY), 14),
(15, 50.00,  'Penalty',         'UPI',         'TXN1000000015', 'Paid',    DATE_SUB(NOW(), INTERVAL 5 DAY), 2),
(16, 140.00, 'Penalty',         NULL,          NULL,            'Pending', NULL,                            5);
