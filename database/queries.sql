-- =====================================================================
--  ParkSmart: demonstration queries for viva / report
--  Run AFTER schema.sql and sample_data.sql
-- =====================================================================
USE parksmart;

-- Q1. Available bays in every lot (view)
SELECT Lot_Name, Total_Bays, Available_Bays, Reserved_Bays, Occupied_Bays, Occupancy_Percent
FROM v_lot_availability;

-- Q2. Bay grid for one lot and floor (Find Parking page)
SELECT Bay_ID, Bay_Number, Bay_Type, Status
FROM parking_bay
WHERE Lot_ID = 1 AND Floor = 1
ORDER BY Bay_Number;

-- Q3. All vehicles of a user (INNER JOIN)
SELECT u.Name, v.Vehicle_Number, v.Brand, v.Color, v.RFID_Tag
FROM users u
JOIN vehicle v ON v.User_ID = u.User_ID
WHERE u.User_ID = 1;

-- Q4. Upcoming reservations of a user with lot and bay details (4-table JOIN)
SELECT r.Reservation_ID, l.Lot_Name, b.Bay_Number, b.Floor, r.Booking_Date, r.Start_Time, r.End_Time, r.Status
FROM reservation r
JOIN vehicle v     ON v.Vehicle_ID = r.Vehicle_ID
JOIN parking_bay b ON b.Bay_ID = r.Bay_ID
JOIN parking_lot l ON l.Lot_ID = b.Lot_ID
WHERE v.User_ID = 1 AND r.Status = 'Upcoming'
ORDER BY r.Booking_Date, r.Start_Time;

-- Q5. Users who have no vehicle registered (LEFT JOIN + IS NULL)
SELECT u.User_ID, u.Name
FROM users u
LEFT JOIN vehicle v ON v.User_ID = u.User_ID
WHERE v.Vehicle_ID IS NULL;

-- Q6. Total revenue (paid only) per lot (view)
SELECT * FROM v_revenue_by_lot ORDER BY Total_Revenue DESC;

-- Q7. Monthly revenue by payment type (GROUP BY)
SELECT DATE_FORMAT(Payment_Date, '%Y-%m') AS Month, Payment_Type, SUM(Amount) AS Revenue
FROM payment
WHERE Payment_Status = 'Paid'
GROUP BY Month, Payment_Type
ORDER BY Month, Payment_Type;

-- Q8. Users who spent more than Rs 100 in total (GROUP BY + HAVING)
SELECT u.Name, SUM(p.Amount) AS Total_Spent
FROM users u
JOIN vehicle v      ON v.User_ID = u.User_ID
JOIN reservation r  ON r.Vehicle_ID = v.Vehicle_ID
JOIN payment p      ON p.Reservation_ID = r.Reservation_ID
WHERE p.Payment_Status = 'Paid'
GROUP BY u.User_ID, u.Name
HAVING SUM(p.Amount) > 100
ORDER BY Total_Spent DESC;

-- Q9. Sessions with overstay and their penalty (Recent Overstays on admin dashboard)
SELECT Session_ID, Vehicle_Number, Lot_Name, Bay_Number, Overstay_Minutes, Penalty_Amount
FROM v_session_history
WHERE Overstay_Minutes > 0
ORDER BY Entry_Time DESC;

-- Q10. Sessions currently inside the lot (live sessions page)
SELECT Session_ID, Vehicle_Number, Lot_Name, Bay_Number, Entry_Time,
       TIMESTAMPDIFF(MINUTE, Entry_Time, NOW()) AS Minutes_So_Far
FROM v_active_sessions;

-- Q11. Most frequently booked bays (aggregate + LIMIT)
SELECT l.Lot_Name, b.Bay_Number, COUNT(*) AS Bookings
FROM reservation r
JOIN parking_bay b ON b.Bay_ID = r.Bay_ID
JOIN parking_lot l ON l.Lot_ID = b.Lot_ID
WHERE r.Status <> 'Cancelled'
GROUP BY b.Bay_ID, l.Lot_Name, b.Bay_Number
ORDER BY Bookings DESC
LIMIT 5;

-- Q12. Bays that were never reserved (subquery with NOT IN)
SELECT Bay_ID, Bay_Number, Floor, Lot_ID
FROM parking_bay
WHERE Bay_ID NOT IN (SELECT DISTINCT Bay_ID FROM reservation)
LIMIT 10;

-- Q13. Vehicles whose overstay penalty is higher than the average penalty (subquery)
SELECT v.Vehicle_Number, s.Penalty_Amount
FROM parking_session s
JOIN vehicle v ON v.Vehicle_ID = s.Vehicle_ID
WHERE s.Penalty_Amount > (SELECT AVG(Penalty_Amount) FROM parking_session WHERE Penalty_Amount > 0);

-- Q14. Pending payments with the owner of the vehicle (admin: pending payments)
SELECT p.Payment_ID, u.Name, v.Vehicle_Number, p.Payment_Type, p.Amount
FROM payment p
JOIN reservation r ON r.Reservation_ID = p.Reservation_ID
JOIN vehicle v     ON v.Vehicle_ID = r.Vehicle_ID
JOIN users u       ON u.User_ID = v.User_ID
WHERE p.Payment_Status = 'Pending'
ORDER BY p.Amount DESC;

-- Q15. Lots that currently have more than 10% of bays unavailable (HAVING on view)
SELECT Lot_Name, Occupancy_Percent FROM v_lot_availability WHERE Occupancy_Percent > 10;

-- ---------------------------------------------------------------------
--  Procedure / trigger demonstrations
-- ---------------------------------------------------------------------

-- D1. Create a reservation through the stored procedure (transaction + fee)
--     Bay 7 is Compact: 2 hours x Rs 30 = Rs 60 fee
CALL sp_create_reservation(1, 7, DATE_ADD(CURDATE(), INTERVAL 5 DAY), '10:00:00', '12:00:00', @new_res);
SELECT @new_res AS New_Reservation_ID;
SELECT * FROM payment WHERE Reservation_ID = @new_res;
SELECT Bay_ID, Status FROM parking_bay WHERE Bay_ID = 7;          -- now Reserved

-- D2. Overlap trigger blocks a double booking (expect error 1644: Bay is already reserved ...)
-- CALL sp_create_reservation(2, 7, DATE_ADD(CURDATE(), INTERVAL 5 DAY), '11:00:00', '13:00:00', @x);

-- D3. Close live session 8 two hours late: penalty = overstay minutes x Rs 2
--     (reservation 8 ends 23:00 today, so use a time after that to see a penalty)
CALL sp_mark_exit(8, TIMESTAMP(CURDATE(), '23:30:00'));
SELECT Session_ID, Exit_Time, Duration_Minutes, Overstay_Minutes, Penalty_Amount FROM parking_session WHERE Session_ID = 8;
SELECT Bay_ID, Status FROM parking_bay WHERE Bay_ID = 27;         -- Available again
SELECT * FROM payment WHERE Reservation_ID = 8 AND Payment_Type = 'Penalty';

-- D4. Pay a pending payment
CALL sp_make_payment(10, 'UPI', @txn);
SELECT @txn AS Transaction_ID;

-- D5. Cancelling a reservation frees the bay via trigger
UPDATE reservation SET Status = 'Cancelled' WHERE Reservation_ID = 10;
SELECT Bay_ID, Status FROM parking_bay WHERE Bay_ID = 6;          -- Available again
