-- =====================================================================
--  ParkSmart: Smart Parking Management System (DBMS PBL)
--  schema.sql : tables, indexes, function, triggers, procedures, views
--  Requires MySQL 8.0.16+ (CHECK constraints are enforced)
-- =====================================================================

DROP DATABASE IF EXISTS parksmart;
CREATE DATABASE parksmart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE parksmart;

-- ---------------------------------------------------------------------
--  1. TABLES
-- ---------------------------------------------------------------------

CREATE TABLE users (
    User_ID   INT AUTO_INCREMENT PRIMARY KEY,
    Name      VARCHAR(100)  NOT NULL,
    Email     VARCHAR(120)  NOT NULL UNIQUE,
    Phone     VARCHAR(10)   NOT NULL,
    Password  VARCHAR(255)  NOT NULL,                 -- bcrypt hash
    Role      ENUM('User','Admin') NOT NULL DEFAULT 'User',
    CONSTRAINT chk_user_phone CHECK (Phone REGEXP '^[0-9]{10}$')
) ENGINE=InnoDB;

CREATE TABLE vehicle (
    Vehicle_ID     INT AUTO_INCREMENT PRIMARY KEY,
    Vehicle_Number VARCHAR(15) NOT NULL UNIQUE,
    RFID_Tag       VARCHAR(30) NOT NULL UNIQUE,
    Brand          VARCHAR(50) NOT NULL,
    Color          VARCHAR(30) NOT NULL,
    User_ID        INT NOT NULL,
    CONSTRAINT fk_vehicle_user FOREIGN KEY (User_ID)
        REFERENCES users(User_ID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE parking_lot (
    Lot_ID     INT AUTO_INCREMENT PRIMARY KEY,
    Lot_Name   VARCHAR(100) NOT NULL UNIQUE,
    Location   VARCHAR(200) NOT NULL,
    Total_Bays INT NOT NULL,
    Open_Time  TIME NOT NULL,
    Close_Time TIME NOT NULL,
    CONSTRAINT chk_lot_bays  CHECK (Total_Bays > 0),
    CONSTRAINT chk_lot_hours CHECK (Open_Time < Close_Time)
) ENGINE=InnoDB;

CREATE TABLE parking_bay (
    Bay_ID     INT AUTO_INCREMENT PRIMARY KEY,
    Bay_Number VARCHAR(10) NOT NULL,
    Floor      INT NOT NULL,
    Bay_Type   ENUM('Regular','EV','Disabled','Compact') NOT NULL DEFAULT 'Regular',
    Status     ENUM('Available','Occupied','Reserved')   NOT NULL DEFAULT 'Available',
    Lot_ID     INT NOT NULL,
    CONSTRAINT uq_bay UNIQUE (Lot_ID, Floor, Bay_Number),
    CONSTRAINT chk_bay_floor CHECK (Floor >= 0),
    CONSTRAINT fk_bay_lot FOREIGN KEY (Lot_ID)
        REFERENCES parking_lot(Lot_ID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE admin (
    Admin_ID INT AUTO_INCREMENT PRIMARY KEY,
    Name     VARCHAR(100) NOT NULL,
    Email    VARCHAR(120) NOT NULL UNIQUE,
    Password VARCHAR(255) NOT NULL,                   -- bcrypt hash
    Lot_ID   INT NULL,                                -- lot this admin manages
    CONSTRAINT fk_admin_lot FOREIGN KEY (Lot_ID)
        REFERENCES parking_lot(Lot_ID) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE reservation (
    Reservation_ID INT AUTO_INCREMENT PRIMARY KEY,
    Booking_Date   DATE NOT NULL,
    Start_Time     TIME NOT NULL,
    End_Time       TIME NOT NULL,
    Status         ENUM('Upcoming','Active','Completed','Cancelled') NOT NULL DEFAULT 'Upcoming',
    Vehicle_ID     INT NOT NULL,
    Bay_ID         INT NOT NULL,
    CONSTRAINT chk_res_time CHECK (End_Time > Start_Time),
    CONSTRAINT fk_res_vehicle FOREIGN KEY (Vehicle_ID)
        REFERENCES vehicle(Vehicle_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_res_bay FOREIGN KEY (Bay_ID)
        REFERENCES parking_bay(Bay_ID) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE parking_session (
    Session_ID      INT AUTO_INCREMENT PRIMARY KEY,
    Entry_Time      DATETIME NOT NULL,
    Exit_Time       DATETIME NULL,
    Reservation_ID  INT NOT NULL UNIQUE,              -- one session per reservation
    Vehicle_ID      INT NOT NULL,
    Bay_ID          INT NOT NULL,
    Overstay_Minutes INT NOT NULL DEFAULT 0,          -- derived, set on exit
    Penalty_Amount  DECIMAL(10,2) NOT NULL DEFAULT 0, -- derived, set on exit
    Duration_Minutes INT GENERATED ALWAYS AS
        (TIMESTAMPDIFF(MINUTE, Entry_Time, Exit_Time)) VIRTUAL,   -- derived
    CONSTRAINT chk_sess_time CHECK (Exit_Time IS NULL OR Exit_Time > Entry_Time),
    CONSTRAINT chk_sess_pen  CHECK (Overstay_Minutes >= 0 AND Penalty_Amount >= 0),
    CONSTRAINT fk_sess_res FOREIGN KEY (Reservation_ID)
        REFERENCES reservation(Reservation_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sess_vehicle FOREIGN KEY (Vehicle_ID)
        REFERENCES vehicle(Vehicle_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sess_bay FOREIGN KEY (Bay_ID)
        REFERENCES parking_bay(Bay_ID) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- A reservation can have a reservation-fee payment AND a penalty payment,
-- so Reservation_ID is NOT unique here.
CREATE TABLE payment (
    Payment_ID     INT AUTO_INCREMENT PRIMARY KEY,
    Amount         DECIMAL(10,2) NOT NULL,
    Payment_Type   ENUM('Reservation Fee','Penalty') NOT NULL,
    Payment_Mode   ENUM('UPI','Card','Net Banking','Cash') NULL,  -- chosen when paying
    Transaction_ID VARCHAR(20) NULL UNIQUE,
    Payment_Status ENUM('Paid','Pending','Failed') NOT NULL DEFAULT 'Pending',
    Payment_Date   DATETIME NULL,
    Reservation_ID INT NOT NULL,
    CONSTRAINT chk_pay_amount CHECK (Amount >= 0),
    CONSTRAINT fk_pay_res FOREIGN KEY (Reservation_ID)
        REFERENCES reservation(Reservation_ID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
--  2. INDEXES (foreign keys are indexed automatically by InnoDB)
-- ---------------------------------------------------------------------
CREATE INDEX idx_res_bay_date   ON reservation (Bay_ID, Booking_Date, Start_Time, End_Time);
CREATE INDEX idx_res_status     ON reservation (Status);
CREATE INDEX idx_sess_entry     ON parking_session (Entry_Time);
CREATE INDEX idx_pay_status     ON payment (Payment_Status);
CREATE INDEX idx_bay_status     ON parking_bay (Lot_ID, Status);

DELIMITER $$

-- ---------------------------------------------------------------------
--  3. FUNCTION: hourly rate by bay type (INR)
-- ---------------------------------------------------------------------
CREATE FUNCTION fn_bay_rate(p_type VARCHAR(20))
RETURNS DECIMAL(8,2)
DETERMINISTIC
BEGIN
    RETURN CASE p_type
        WHEN 'EV'       THEN 60.00
        WHEN 'Compact'  THEN 30.00
        WHEN 'Disabled' THEN 20.00
        ELSE 40.00
    END;
END$$

-- ---------------------------------------------------------------------
--  4. TRIGGERS
-- ---------------------------------------------------------------------

-- 4.1 Block overlapping reservations on the same bay and date
CREATE TRIGGER trg_res_before_insert
BEFORE INSERT ON reservation
FOR EACH ROW
BEGIN
    IF NEW.Status IN ('Upcoming','Active') AND EXISTS (
        SELECT 1 FROM reservation r
        WHERE r.Bay_ID = NEW.Bay_ID
          AND r.Booking_Date = NEW.Booking_Date
          AND r.Status IN ('Upcoming','Active')
          AND NEW.Start_Time < r.End_Time
          AND NEW.End_Time   > r.Start_Time
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Bay is already reserved for the selected time slot';
    END IF;
END$$

-- 4.2 New upcoming reservation marks the bay as Reserved
CREATE TRIGGER trg_res_after_insert
AFTER INSERT ON reservation
FOR EACH ROW
BEGIN
    IF NEW.Status = 'Upcoming' THEN
        UPDATE parking_bay SET Status = 'Reserved'
        WHERE Bay_ID = NEW.Bay_ID AND Status = 'Available';
    END IF;
END$$

-- 4.3 Cancelled or completed reservation frees the bay (if nothing else is pending on it)
CREATE TRIGGER trg_res_after_update
AFTER UPDATE ON reservation
FOR EACH ROW
BEGIN
    IF NEW.Status IN ('Cancelled','Completed') AND OLD.Status <> NEW.Status THEN
        IF EXISTS (SELECT 1 FROM reservation
                   WHERE Bay_ID = NEW.Bay_ID
                     AND Reservation_ID <> NEW.Reservation_ID
                     AND Status IN ('Upcoming','Active')) THEN
            UPDATE parking_bay SET Status = 'Reserved'  WHERE Bay_ID = NEW.Bay_ID;
        ELSE
            UPDATE parking_bay SET Status = 'Available' WHERE Bay_ID = NEW.Bay_ID;
        END IF;
    END IF;
END$$

-- 4.4 Vehicle entry (session without exit) occupies the bay and activates the reservation
CREATE TRIGGER trg_session_after_insert
AFTER INSERT ON parking_session
FOR EACH ROW
BEGIN
    IF NEW.Exit_Time IS NULL THEN
        UPDATE reservation  SET Status = 'Active'   WHERE Reservation_ID = NEW.Reservation_ID;
        UPDATE parking_bay  SET Status = 'Occupied' WHERE Bay_ID = NEW.Bay_ID;
    END IF;
END$$

-- 4.5 Session bay/vehicle must match its reservation
CREATE TRIGGER trg_session_before_insert
BEFORE INSERT ON parking_session
FOR EACH ROW
BEGIN
    IF NOT EXISTS (SELECT 1 FROM reservation
                   WHERE Reservation_ID = NEW.Reservation_ID
                     AND Vehicle_ID = NEW.Vehicle_ID
                     AND Bay_ID = NEW.Bay_ID) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Session vehicle/bay does not match the reservation';
    END IF;
END$$

-- ---------------------------------------------------------------------
--  5. STORED PROCEDURES
-- ---------------------------------------------------------------------

-- 5.1 Create a reservation + its pending fee payment in one transaction
CREATE PROCEDURE sp_create_reservation(
    IN  p_vehicle INT,
    IN  p_bay     INT,
    IN  p_date    DATE,
    IN  p_start   TIME,
    IN  p_end     TIME,
    OUT p_res_id  INT
)
BEGIN
    DECLARE v_type VARCHAR(20);
    DECLARE v_fee  DECIMAL(10,2);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_date < CURDATE() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Booking date cannot be in the past';
    END IF;

    START TRANSACTION;

    SELECT Bay_Type INTO v_type FROM parking_bay WHERE Bay_ID = p_bay FOR UPDATE;
    IF v_type IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bay does not exist';
    END IF;

    SET v_fee = ROUND(fn_bay_rate(v_type) * TIME_TO_SEC(TIMEDIFF(p_end, p_start)) / 3600, 2);

    INSERT INTO reservation (Booking_Date, Start_Time, End_Time, Status, Vehicle_ID, Bay_ID)
    VALUES (p_date, p_start, p_end, 'Upcoming', p_vehicle, p_bay);
    SET p_res_id = LAST_INSERT_ID();

    INSERT INTO payment (Amount, Payment_Type, Payment_Status, Reservation_ID)
    VALUES (v_fee, 'Reservation Fee', 'Pending', p_res_id);

    COMMIT;
END$$

-- 5.2 RFID entry: find today's upcoming reservation for the tag and start a session
CREATE PROCEDURE sp_record_entry_by_rfid(IN p_rfid VARCHAR(30), OUT p_session_id INT)
BEGIN
    DECLARE v_vehicle INT;
    DECLARE v_res     INT;
    DECLARE v_bay     INT;

    SELECT Vehicle_ID INTO v_vehicle FROM vehicle WHERE RFID_Tag = p_rfid;
    IF v_vehicle IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown RFID tag';
    END IF;

    SELECT Reservation_ID, Bay_ID INTO v_res, v_bay
    FROM reservation
    WHERE Vehicle_ID = v_vehicle AND Booking_Date = CURDATE() AND Status = 'Upcoming'
    ORDER BY Start_Time LIMIT 1;
    IF v_res IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No valid reservation for this vehicle today';
    END IF;

    INSERT INTO parking_session (Entry_Time, Reservation_ID, Vehicle_ID, Bay_ID)
    VALUES (NOW(), v_res, v_vehicle, v_bay);
    SET p_session_id = LAST_INSERT_ID();
END$$

-- 5.3 Exit: compute overstay and penalty (Rs 2/min), free the bay, raise penalty payment
CREATE PROCEDURE sp_mark_exit(IN p_session INT, IN p_exit DATETIME)
BEGIN
    DECLARE v_res      INT;
    DECLARE v_exit     DATETIME;
    DECLARE v_end_dt   DATETIME;
    DECLARE v_overstay INT;
    DECLARE v_penalty  DECIMAL(10,2);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT s.Reservation_ID, s.Exit_Time, TIMESTAMP(r.Booking_Date, r.End_Time)
      INTO v_res, v_exit, v_end_dt
    FROM parking_session s
    JOIN reservation r ON r.Reservation_ID = s.Reservation_ID
    WHERE s.Session_ID = p_session FOR UPDATE;

    IF v_res IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Session not found';
    END IF;
    IF v_exit IS NOT NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Session already closed';
    END IF;

    SET v_overstay = GREATEST(0, TIMESTAMPDIFF(MINUTE, v_end_dt, p_exit));
    SET v_penalty  = v_overstay * 2;

    UPDATE parking_session
       SET Exit_Time = p_exit, Overstay_Minutes = v_overstay, Penalty_Amount = v_penalty
     WHERE Session_ID = p_session;

    UPDATE reservation SET Status = 'Completed' WHERE Reservation_ID = v_res;  -- trigger frees bay

    IF v_penalty > 0 THEN
        INSERT INTO payment (Amount, Payment_Type, Payment_Status, Reservation_ID)
        VALUES (v_penalty, 'Penalty', 'Pending', v_res);
    END IF;

    COMMIT;
END$$

-- 5.4 Pay a pending payment
CREATE PROCEDURE sp_make_payment(IN p_payment INT, IN p_mode VARCHAR(20), OUT p_txn VARCHAR(20))
BEGIN
    DECLARE v_status VARCHAR(10);

    SELECT Payment_Status INTO v_status FROM payment WHERE Payment_ID = p_payment FOR UPDATE;
    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Payment not found';
    END IF;
    IF v_status = 'Paid' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Payment already completed';
    END IF;

    SET p_txn = CONCAT('TXN', LPAD(FLOOR(RAND() * 10000000000), 10, '0'));
    UPDATE payment
       SET Payment_Status = 'Paid', Payment_Mode = p_mode,
           Transaction_ID = p_txn, Payment_Date = NOW()
     WHERE Payment_ID = p_payment;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
--  6. VIEWS
-- ---------------------------------------------------------------------

-- Live availability per lot
CREATE VIEW v_lot_availability AS
SELECT l.Lot_ID, l.Lot_Name, l.Location, l.Open_Time, l.Close_Time,
       COUNT(b.Bay_ID)                          AS Total_Bays,
       SUM(b.Status = 'Available')              AS Available_Bays,
       SUM(b.Status = 'Reserved')               AS Reserved_Bays,
       SUM(b.Status = 'Occupied')               AS Occupied_Bays,
       ROUND(100 * SUM(b.Status <> 'Available') / COUNT(b.Bay_ID), 1) AS Occupancy_Percent
FROM parking_lot l
LEFT JOIN parking_bay b ON b.Lot_ID = l.Lot_ID
GROUP BY l.Lot_ID, l.Lot_Name, l.Location, l.Open_Time, l.Close_Time;

-- Full reservation details (used by user and admin reservation pages)
CREATE VIEW v_reservation_details AS
SELECT r.Reservation_ID, r.Booking_Date, r.Start_Time, r.End_Time, r.Status,
       u.User_ID, u.Name AS User_Name,
       v.Vehicle_ID, v.Vehicle_Number,
       b.Bay_ID, b.Bay_Number, b.Floor, b.Bay_Type,
       l.Lot_ID, l.Lot_Name
FROM reservation r
JOIN vehicle v      ON v.Vehicle_ID = r.Vehicle_ID
JOIN users u        ON u.User_ID    = v.User_ID
JOIN parking_bay b  ON b.Bay_ID     = r.Bay_ID
JOIN parking_lot l  ON l.Lot_ID     = b.Lot_ID;

-- Parking history with session details
CREATE VIEW v_session_history AS
SELECT s.Session_ID, s.Entry_Time, s.Exit_Time, s.Duration_Minutes,
       s.Overstay_Minutes, s.Penalty_Amount,
       v.Vehicle_Number, v.User_ID,
       b.Bay_Number, b.Floor, l.Lot_Name, s.Reservation_ID
FROM parking_session s
JOIN vehicle v      ON v.Vehicle_ID = s.Vehicle_ID
JOIN parking_bay b  ON b.Bay_ID     = s.Bay_ID
JOIN parking_lot l  ON l.Lot_ID     = b.Lot_ID;

-- Sessions currently inside the lot
CREATE VIEW v_active_sessions AS
SELECT * FROM v_session_history WHERE Exit_Time IS NULL;

-- Revenue per lot (paid payments only)
CREATE VIEW v_revenue_by_lot AS
SELECT l.Lot_ID, l.Lot_Name,
       COALESCE(SUM(p.Amount), 0) AS Total_Revenue
FROM parking_lot l
LEFT JOIN parking_bay b    ON b.Lot_ID = l.Lot_ID
LEFT JOIN reservation r    ON r.Bay_ID = b.Bay_ID
LEFT JOIN payment p        ON p.Reservation_ID = r.Reservation_ID AND p.Payment_Status = 'Paid'
GROUP BY l.Lot_ID, l.Lot_Name;
