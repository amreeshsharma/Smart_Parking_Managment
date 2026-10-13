/**
 * ParkSmart - Mock Data Source
 *
 * Fully normalized, relational dataset for DBMS project demonstration.
 * Contains Indian localized entities (plates, names, phone numbers, facilities).
 *
 * NOTE: Passwords here are stored in plain text purely for client-side mock simulation.
 * In production, the Node.js/Express backend will securely hash all passwords using bcrypt.
 */

export const INITIAL_MOCK_DATA = {
  // USER(User_ID, Name, Email, Phone, Password, Role['User'|'Admin'])
  users: [
    {
      User_ID: 1,
      Name: "Rahul Sharma",
      Email: "user@parksmart.com",
      Phone: "9876543210",
      Password: "123456",
      Role: "User"
    },
    {
      User_ID: 2,
      Name: "Priya Patel",
      Email: "priya.patel@gmail.com",
      Phone: "9823412345",
      Password: "123456",
      Role: "User"
    },
    {
      User_ID: 3,
      Name: "Amit Verma",
      Email: "amit.verma@outlook.com",
      Phone: "9898765432",
      Password: "123456",
      Role: "User"
    },
    {
      User_ID: 4,
      Name: "Sneha Kulkarni",
      Email: "sneha.k@yahoo.com",
      Phone: "9811223344",
      Password: "123456",
      Role: "User"
    },
    {
      User_ID: 5,
      Name: "Rohan Gupta",
      Email: "rohan.gupta@corp.in",
      Phone: "9844556677",
      Password: "123456",
      Role: "User"
    },
    {
      User_ID: 6,
      Name: "Ananya Iyer",
      Email: "ananya.iyer@gmail.com",
      Phone: "9866778899",
      Password: "123456",
      Role: "User"
    },
    {
      User_ID: 7,
      Name: "Vikram Malhotra",
      Email: "vikram.m@techmail.in",
      Phone: "9877889900",
      Password: "123456",
      Role: "User"
    },
    {
      User_ID: 8,
      Name: "Kavita Reddy",
      Email: "kavita.r@gmail.com",
      Phone: "9855667788",
      Password: "123456",
      Role: "User"
    },
    {
      User_ID: 9,
      Name: "Vikramaditya Rao",
      Email: "admin@parksmart.com",
      Phone: "9823456789",
      Password: "123456",
      Role: "Admin"
    },
    {
      User_ID: 10,
      Name: "Pooja Deshmukh",
      Email: "admin2@parksmart.com",
      Phone: "9834567890",
      Password: "123456",
      Role: "Admin"
    }
  ],

  // ADMIN(Admin_ID, Name, Email, Password, Lot_ID)
  admins: [
    {
      Admin_ID: 1,
      Name: "Vikramaditya Rao",
      Email: "admin@parksmart.com",
      Password: "123456",
      Lot_ID: 1
    },
    {
      Admin_ID: 2,
      Name: "Pooja Deshmukh",
      Email: "admin2@parksmart.com",
      Password: "123456",
      Lot_ID: 2
    }
  ],

  // PARKING_LOT(Lot_ID, Lot_Name, Location, Total_Bays, Open_Time, Close_Time)
  lots: [
    {
      Lot_ID: 1,
      Lot_Name: "City Center Mall Facility",
      Location: "MG Road, Central Commercial Zone, Indore",
      Total_Bays: 24,
      Open_Time: "06:00",
      Close_Time: "23:00"
    },
    {
      Lot_ID: 2,
      Lot_Name: "Railway Station Multilevel",
      Location: "Platform 1 Access Rd, Station Square, Indore",
      Total_Bays: 24,
      Open_Time: "00:00",
      Close_Time: "23:59"
    },
    {
      Lot_ID: 3,
      Lot_Name: "Crystal IT Park Deck",
      Location: "Ring Road, Super Corridor SEZ, Indore",
      Total_Bays: 24,
      Open_Time: "07:00",
      Close_Time: "22:00"
    }
  ],

  // VEHICLE(Vehicle_ID, Vehicle_Number, RFID_Tag, Brand, Color, User_ID)
  vehicles: [
    {
      Vehicle_ID: 1,
      Vehicle_Number: "MP09 CA 1234",
      RFID_Tag: "RFID-IND-9011",
      Brand: "Tata Nexon EV",
      Color: "#1E3A8A", // Deep Blue
      User_ID: 1
    },
    {
      Vehicle_ID: 2,
      Vehicle_Number: "MP09 ZB 9876",
      RFID_Tag: "RFID-IND-9012",
      Brand: "Hyundai Creta",
      Color: "#FFFFFF", // White
      User_ID: 1
    },
    {
      Vehicle_ID: 3,
      Vehicle_Number: "MP04 AB 4567",
      RFID_Tag: "RFID-IND-9021",
      Brand: "Maruti Suzuki Swift",
      Color: "#DC2626", // Red
      User_ID: 2
    },
    {
      Vehicle_ID: 4,
      Vehicle_Number: "DL01 CA 8899",
      RFID_Tag: "RFID-IND-9031",
      Brand: "Kia Seltos",
      Color: "#475569", // Gray
      User_ID: 3
    },
    {
      Vehicle_ID: 5,
      Vehicle_Number: "MH12 PQ 2233",
      RFID_Tag: "RFID-IND-9041",
      Brand: "MG ZS EV",
      Color: "#059669", // Emerald Green
      User_ID: 4
    },
    {
      Vehicle_ID: 6,
      Vehicle_Number: "KA05 MJ 7711",
      RFID_Tag: "RFID-IND-9051",
      Brand: "Mahindra XUV700",
      Color: "#0F172A", // Midnight Black
      User_ID: 5
    },
    {
      Vehicle_ID: 7,
      Vehicle_Number: "MP20 BC 3344",
      RFID_Tag: "RFID-IND-9061",
      Brand: "Honda City",
      Color: "#E2E8F0", // Silver
      User_ID: 6
    },
    {
      Vehicle_ID: 8,
      Vehicle_Number: "TS09 EF 5566",
      RFID_Tag: "RFID-IND-9071",
      Brand: "Toyota Fortuner",
      Color: "#FFFFFF",
      User_ID: 7
    },
    {
      Vehicle_ID: 9,
      Vehicle_Number: "GJ01 GH 6677",
      RFID_Tag: "RFID-IND-9081",
      Brand: "Skoda Kushaq",
      Color: "#D97706", // Amber Orange
      User_ID: 8
    },
    {
      Vehicle_ID: 10,
      Vehicle_Number: "MP09 JK 9900",
      RFID_Tag: "RFID-IND-9091",
      Brand: "Volkswagen Taigun",
      Color: "#4F46E5", // Indigo
      User_ID: 1
    },
    {
      Vehicle_ID: 11,
      Vehicle_Number: "MP09 RT 1122",
      RFID_Tag: "RFID-IND-9101",
      Brand: "Tata Punch EV",
      Color: "#0284C7", // Cyan
      User_ID: 2
    },
    {
      Vehicle_ID: 12,
      Vehicle_Number: "DL03 XY 3344",
      RFID_Tag: "RFID-IND-9111",
      Brand: "Hyundai i20",
      Color: "#B91C1C",
      User_ID: 3
    }
  ],

  // PARKING_BAY(Bay_ID, Bay_Number, Floor, Bay_Type['Regular'|'EV'|'Disabled'|'Compact'], Status['Available'|'Occupied'|'Reserved'], Lot_ID)
  // 24 bays for Lot 1 (Floor 1: B101-B108, Floor 2: B201-B208, Floor 3: B301-B308)
  // 24 bays for Lot 2 (Floor 1: R101-R108, Floor 2: R201-R208, Floor 3: R301-R308)
  // 24 bays for Lot 3 (Floor 1: T101-T108, Floor 2: T201-T208, Floor 3: T301-T308)
  bays: [
    // Lot 1 - City Center Mall (24 bays)
    { Bay_ID: 1,  Bay_Number: "B-101", Floor: "Floor 1", Bay_Type: "EV",       Status: "Occupied",  Lot_ID: 1 },
    { Bay_ID: 2,  Bay_Number: "B-102", Floor: "Floor 1", Bay_Type: "EV",       Status: "Reserved",  Lot_ID: 1 },
    { Bay_ID: 3,  Bay_Number: "B-103", Floor: "Floor 1", Bay_Type: "Disabled", Status: "Available", Lot_ID: 1 },
    { Bay_ID: 4,  Bay_Number: "B-104", Floor: "Floor 1", Bay_Type: "Disabled", Status: "Available", Lot_ID: 1 },
    { Bay_ID: 5,  Bay_Number: "B-105", Floor: "Floor 1", Bay_Type: "Compact",  Status: "Available", Lot_ID: 1 },
    { Bay_ID: 6,  Bay_Number: "B-106", Floor: "Floor 1", Bay_Type: "Compact",  Status: "Available", Lot_ID: 1 },
    { Bay_ID: 7,  Bay_Number: "B-107", Floor: "Floor 1", Bay_Type: "Regular",  Status: "Available", Lot_ID: 1 },
    { Bay_ID: 8,  Bay_Number: "B-108", Floor: "Floor 1", Bay_Type: "Regular",  Status: "Available", Lot_ID: 1 },

    { Bay_ID: 9,  Bay_Number: "B-201", Floor: "Floor 2", Bay_Type: "Regular",  Status: "Available", Lot_ID: 1 },
    { Bay_ID: 10, Bay_Number: "B-202", Floor: "Floor 2", Bay_Type: "Regular",  Status: "Occupied",  Lot_ID: 1 },
    { Bay_ID: 11, Bay_Number: "B-203", Floor: "Floor 2", Bay_Type: "Regular",  Status: "Available", Lot_ID: 1 },
    { Bay_ID: 12, Bay_Number: "B-204", Floor: "Floor 2", Bay_Type: "Regular",  Status: "Available", Lot_ID: 1 },
    { Bay_ID: 13, Bay_Number: "B-205", Floor: "Floor 2", Bay_Type: "EV",       Status: "Available", Lot_ID: 1 },
    { Bay_ID: 14, Bay_Number: "B-206", Floor: "Floor 2", Bay_Type: "Compact",  Status: "Available", Lot_ID: 1 },
    { Bay_ID: 15, Bay_Number: "B-207", Floor: "Floor 2", Bay_Type: "Regular",  Status: "Available", Lot_ID: 1 },
    { Bay_ID: 16, Bay_Number: "B-208", Floor: "Floor 2", Bay_Type: "Regular",  Status: "Available", Lot_ID: 1 },

    { Bay_ID: 17, Bay_Number: "B-301", Floor: "Floor 3", Bay_Type: "Regular",  Status: "Available", Lot_ID: 1 },
    { Bay_ID: 18, Bay_Number: "B-302", Floor: "Floor 3", Bay_Type: "Regular",  Status: "Available", Lot_ID: 1 },
    { Bay_ID: 19, Bay_Number: "B-303", Floor: "Floor 3", Bay_Type: "Compact",  Status: "Available", Lot_ID: 1 },
    { Bay_ID: 20, Bay_Number: "B-304", Floor: "Floor 3", Bay_Type: "Compact",  Status: "Available", Lot_ID: 1 },
    { Bay_ID: 21, Bay_Number: "B-305", Floor: "Floor 3", Bay_Type: "EV",       Status: "Available", Lot_ID: 1 },
    { Bay_ID: 22, Bay_Number: "B-306", Floor: "Floor 3", Bay_Type: "EV",       Status: "Available", Lot_ID: 1 },
    { Bay_ID: 23, Bay_Number: "B-307", Floor: "Floor 3", Bay_Type: "Disabled", Status: "Available", Lot_ID: 1 },
    { Bay_ID: 24, Bay_Number: "B-308", Floor: "Floor 3", Bay_Type: "Regular",  Status: "Available", Lot_ID: 1 },

    // Lot 2 - Railway Station Multilevel (24 bays)
    { Bay_ID: 25, Bay_Number: "R-101", Floor: "Floor 1", Bay_Type: "Disabled", Status: "Occupied",  Lot_ID: 2 },
    { Bay_ID: 26, Bay_Number: "R-102", Floor: "Floor 1", Bay_Type: "EV",       Status: "Occupied",  Lot_ID: 2 },
    { Bay_ID: 27, Bay_Number: "R-103", Floor: "Floor 1", Bay_Type: "Regular",  Status: "Reserved",  Lot_ID: 2 },
    { Bay_ID: 28, Bay_Number: "R-104", Floor: "Floor 1", Bay_Type: "Regular",  Status: "Available", Lot_ID: 2 },
    { Bay_ID: 29, Bay_Number: "R-105", Floor: "Floor 1", Bay_Type: "Compact",  Status: "Available", Lot_ID: 2 },
    { Bay_ID: 30, Bay_Number: "R-106", Floor: "Floor 1", Bay_Type: "Compact",  Status: "Available", Lot_ID: 2 },
    { Bay_ID: 31, Bay_Number: "R-107", Floor: "Floor 1", Bay_Type: "Regular",  Status: "Available", Lot_ID: 2 },
    { Bay_ID: 32, Bay_Number: "R-108", Floor: "Floor 1", Bay_Type: "Regular",  Status: "Available", Lot_ID: 2 },

    { Bay_ID: 33, Bay_Number: "R-201", Floor: "Floor 2", Bay_Type: "Regular",  Status: "Available", Lot_ID: 2 },
    { Bay_ID: 34, Bay_Number: "R-202", Floor: "Floor 2", Bay_Type: "Regular",  Status: "Available", Lot_ID: 2 },
    { Bay_ID: 35, Bay_Number: "R-203", Floor: "Floor 2", Bay_Type: "EV",       Status: "Available", Lot_ID: 2 },
    { Bay_ID: 36, Bay_Number: "R-204", Floor: "Floor 2", Bay_Type: "EV",       Status: "Available", Lot_ID: 2 },
    { Bay_ID: 37, Bay_Number: "R-205", Floor: "Floor 2", Bay_Type: "Compact",  Status: "Available", Lot_ID: 2 },
    { Bay_ID: 38, Bay_Number: "R-206", Floor: "Floor 2", Bay_Type: "Compact",  Status: "Available", Lot_ID: 2 },
    { Bay_ID: 39, Bay_Number: "R-207", Floor: "Floor 2", Bay_Type: "Disabled", Status: "Available", Lot_ID: 2 },
    { Bay_ID: 40, Bay_Number: "R-208", Floor: "Floor 2", Bay_Type: "Regular",  Status: "Available", Lot_ID: 2 },

    { Bay_ID: 41, Bay_Number: "R-301", Floor: "Floor 3", Bay_Type: "Regular",  Status: "Available", Lot_ID: 2 },
    { Bay_ID: 42, Bay_Number: "R-302", Floor: "Floor 3", Bay_Type: "Regular",  Status: "Available", Lot_ID: 2 },
    { Bay_ID: 43, Bay_Number: "R-303", Floor: "Floor 3", Bay_Type: "Regular",  Status: "Available", Lot_ID: 2 },
    { Bay_ID: 44, Bay_Number: "R-304", Floor: "Floor 3", Bay_Type: "Regular",  Status: "Available", Lot_ID: 2 },
    { Bay_ID: 45, Bay_Number: "R-305", Floor: "Floor 3", Bay_Type: "EV",       Status: "Available", Lot_ID: 2 },
    { Bay_ID: 46, Bay_Number: "R-306", Floor: "Floor 3", Bay_Type: "EV",       Status: "Available", Lot_ID: 2 },
    { Bay_ID: 47, Bay_Number: "R-307", Floor: "Floor 3", Bay_Type: "Disabled", Status: "Available", Lot_ID: 2 },
    { Bay_ID: 48, Bay_Number: "R-308", Floor: "Floor 3", Bay_Type: "Compact",  Status: "Available", Lot_ID: 2 },

    // Lot 3 - Crystal IT Park Deck (24 bays)
    { Bay_ID: 49, Bay_Number: "T-101", Floor: "Floor 1", Bay_Type: "EV",       Status: "Occupied",  Lot_ID: 3 },
    { Bay_ID: 50, Bay_Number: "T-102", Floor: "Floor 1", Bay_Type: "EV",       Status: "Available", Lot_ID: 3 },
    { Bay_ID: 51, Bay_Number: "T-103", Floor: "Floor 1", Bay_Type: "Disabled", Status: "Available", Lot_ID: 3 },
    { Bay_ID: 52, Bay_Number: "T-104", Floor: "Floor 1", Bay_Type: "Disabled", Status: "Available", Lot_ID: 3 },
    { Bay_ID: 53, Bay_Number: "T-105", Floor: "Floor 1", Bay_Type: "Compact",  Status: "Available", Lot_ID: 3 },
    { Bay_ID: 54, Bay_Number: "T-106", Floor: "Floor 1", Bay_Type: "Compact",  Status: "Available", Lot_ID: 3 },
    { Bay_ID: 55, Bay_Number: "T-107", Floor: "Floor 1", Bay_Type: "Regular",  Status: "Reserved",  Lot_ID: 3 },
    { Bay_ID: 56, Bay_Number: "T-108", Floor: "Floor 1", Bay_Type: "Regular",  Status: "Available", Lot_ID: 3 },

    { Bay_ID: 57, Bay_Number: "T-201", Floor: "Floor 2", Bay_Type: "Regular",  Status: "Available", Lot_ID: 3 },
    { Bay_ID: 58, Bay_Number: "T-202", Floor: "Floor 2", Bay_Type: "Regular",  Status: "Available", Lot_ID: 3 },
    { Bay_ID: 59, Bay_Number: "T-203", Floor: "Floor 2", Bay_Type: "EV",       Status: "Available", Lot_ID: 3 },
    { Bay_ID: 60, Bay_Number: "T-204", Floor: "Floor 2", Bay_Type: "EV",       Status: "Available", Lot_ID: 3 },
    { Bay_ID: 61, Bay_Number: "T-205", Floor: "Floor 2", Bay_Type: "Compact",  Status: "Available", Lot_ID: 3 },
    { Bay_ID: 62, Bay_Number: "T-206", Floor: "Floor 2", Bay_Type: "Compact",  Status: "Available", Lot_ID: 3 },
    { Bay_ID: 63, Bay_Number: "T-207", Floor: "Floor 2", Bay_Type: "Regular",  Status: "Available", Lot_ID: 3 },
    { Bay_ID: 64, Bay_Number: "T-208", Floor: "Floor 2", Bay_Type: "Regular",  Status: "Available", Lot_ID: 3 },

    { Bay_ID: 65, Bay_Number: "T-301", Floor: "Floor 3", Bay_Type: "Regular",  Status: "Available", Lot_ID: 3 },
    { Bay_ID: 66, Bay_Number: "T-302", Floor: "Floor 3", Bay_Type: "Regular",  Status: "Available", Lot_ID: 3 },
    { Bay_ID: 67, Bay_Number: "T-303", Floor: "Floor 3", Bay_Type: "Regular",  Status: "Available", Lot_ID: 3 },
    { Bay_ID: 68, Bay_Number: "T-304", Floor: "Floor 3", Bay_Type: "Regular",  Status: "Available", Lot_ID: 3 },
    { Bay_ID: 69, Bay_Number: "T-305", Floor: "Floor 3", Bay_Type: "EV",       Status: "Available", Lot_ID: 3 },
    { Bay_ID: 70, Bay_Number: "T-306", Floor: "Floor 3", Bay_Type: "EV",       Status: "Available", Lot_ID: 3 },
    { Bay_ID: 71, Bay_Number: "T-307", Floor: "Floor 3", Bay_Type: "Disabled", Status: "Available", Lot_ID: 3 },
    { Bay_ID: 72, Bay_Number: "T-308", Floor: "Floor 3", Bay_Type: "Compact",  Status: "Available", Lot_ID: 3 }
  ],

  // RESERVATION(Reservation_ID, Booking_Date, Start_Time, End_Time, Status['Upcoming'|'Active'|'Completed'|'Cancelled'], Vehicle_ID, Bay_ID)
  // 20 realistic reservations across all statuses
  reservations: [
    // Active session for User 1 (Vehicle 1, Bay 1)
    {
      Reservation_ID: 101,
      Booking_Date: "2026-10-13",
      Start_Time: "08:30",
      End_Time: "12:30",
      Status: "Active",
      Vehicle_ID: 1,
      Bay_ID: 1
    },
    // Upcoming for User 1 (Vehicle 2, Bay 2)
    {
      Reservation_ID: 102,
      Booking_Date: "2026-10-14",
      Start_Time: "14:00",
      End_Time: "17:00",
      Status: "Upcoming",
      Vehicle_ID: 2,
      Bay_ID: 2
    },
    // Active session for User 2 (Vehicle 3, Bay 10)
    {
      Reservation_ID: 103,
      Booking_Date: "2026-10-13",
      Start_Time: "09:00",
      End_Time: "11:00",
      Status: "Active",
      Vehicle_ID: 3,
      Bay_ID: 10
    },
    // Active session for User 4 (Vehicle 5, Bay 25)
    {
      Reservation_ID: 104,
      Booking_Date: "2026-10-13",
      Start_Time: "07:30",
      End_Time: "10:30",
      Status: "Active",
      Vehicle_ID: 5,
      Bay_ID: 25
    },
    // Active session for User 5 (Vehicle 6, Bay 26)
    {
      Reservation_ID: 105,
      Booking_Date: "2026-10-13",
      Start_Time: "08:00",
      End_Time: "11:00",
      Status: "Active",
      Vehicle_ID: 6,
      Bay_ID: 26
    },
    // Upcoming for User 3 (Vehicle 4, Bay 27)
    {
      Reservation_ID: 106,
      Booking_Date: "2026-10-14",
      Start_Time: "16:00",
      End_Time: "19:00",
      Status: "Upcoming",
      Vehicle_ID: 4,
      Bay_ID: 27
    },
    // Active session for User 7 (Vehicle 8, Bay 49)
    {
      Reservation_ID: 107,
      Booking_Date: "2026-10-13",
      Start_Time: "09:30",
      End_Time: "13:30",
      Status: "Active",
      Vehicle_ID: 8,
      Bay_ID: 49
    },
    // Upcoming for User 8 (Vehicle 9, Bay 55)
    {
      Reservation_ID: 108,
      Booking_Date: "2026-10-15",
      Start_Time: "10:00",
      End_Time: "13:00",
      Status: "Upcoming",
      Vehicle_ID: 9,
      Bay_ID: 55
    },
    // Completed for User 1 (Vehicle 1, Bay 7)
    {
      Reservation_ID: 109,
      Booking_Date: "2026-10-12",
      Start_Time: "10:00",
      End_Time: "12:00",
      Status: "Completed",
      Vehicle_ID: 1,
      Bay_ID: 7
    },
    // Completed for User 1 (Vehicle 2, Bay 9)
    {
      Reservation_ID: 110,
      Booking_Date: "2026-10-11",
      Start_Time: "14:00",
      End_Time: "16:00",
      Status: "Completed",
      Vehicle_ID: 2,
      Bay_ID: 9
    },
    // Cancelled for User 1 (Vehicle 1, Bay 15)
    {
      Reservation_ID: 111,
      Booking_Date: "2026-10-10",
      Start_Time: "11:00",
      End_Time: "13:00",
      Status: "Cancelled",
      Vehicle_ID: 1,
      Bay_ID: 15
    },
    // Completed for User 2 (Vehicle 3, Bay 8)
    {
      Reservation_ID: 112,
      Booking_Date: "2026-10-11",
      Start_Time: "09:00",
      End_Time: "11:00",
      Status: "Completed",
      Vehicle_ID: 3,
      Bay_ID: 8
    },
    // Completed with Overstay for User 3 (Vehicle 4, Bay 11)
    {
      Reservation_ID: 113,
      Booking_Date: "2026-10-12",
      Start_Time: "13:00",
      End_Time: "15:00",
      Status: "Completed",
      Vehicle_ID: 4,
      Bay_ID: 11
    },
    // Completed for User 4 (Vehicle 5, Bay 13)
    {
      Reservation_ID: 114,
      Booking_Date: "2026-10-09",
      Start_Time: "15:00",
      End_Time: "18:00",
      Status: "Completed",
      Vehicle_ID: 5,
      Bay_ID: 13
    },
    // Completed with Overstay for User 6 (Vehicle 7, Bay 28)
    {
      Reservation_ID: 115,
      Booking_Date: "2026-10-10",
      Start_Time: "14:00",
      End_Time: "16:00",
      Status: "Completed",
      Vehicle_ID: 7,
      Bay_ID: 28
    },
    // Completed for User 7 (Vehicle 8, Bay 33)
    {
      Reservation_ID: 116,
      Booking_Date: "2026-10-08",
      Start_Time: "10:00",
      End_Time: "12:00",
      Status: "Completed",
      Vehicle_ID: 8,
      Bay_ID: 33
    },
    // Cancelled for User 5 (Vehicle 6, Bay 35)
    {
      Reservation_ID: 117,
      Booking_Date: "2026-10-07",
      Start_Time: "08:00",
      End_Time: "10:00",
      Status: "Cancelled",
      Vehicle_ID: 6,
      Bay_ID: 35
    },
    // Completed for User 8 (Vehicle 9, Bay 57)
    {
      Reservation_ID: 118,
      Booking_Date: "2026-10-06",
      Start_Time: "11:00",
      End_Time: "14:00",
      Status: "Completed",
      Vehicle_ID: 9,
      Bay_ID: 57
    },
    // Upcoming for User 2 (Vehicle 11, Bay 3)
    {
      Reservation_ID: 119,
      Booking_Date: "2026-10-16",
      Start_Time: "09:00",
      End_Time: "11:00",
      Status: "Upcoming",
      Vehicle_ID: 11,
      Bay_ID: 3
    },
    // Completed for User 1 (Vehicle 10, Bay 18)
    {
      Reservation_ID: 120,
      Booking_Date: "2026-10-05",
      Start_Time: "16:00",
      End_Time: "18:00",
      Status: "Completed",
      Vehicle_ID: 10,
      Bay_ID: 18
    }
  ],

  // PARKING_SESSION(Session_ID, Entry_Time, Exit_Time, Reservation_ID, Vehicle_ID, Bay_ID, Duration, Overstay_Minutes, Penalty_Amount)
  // 15 sessions (some live active without Exit_Time, some with Overstay)
  sessions: [
    // Live session for User 1 (Entry earlier today, currently active)
    {
      Session_ID: 201,
      Entry_Time: "2026-10-13T08:35:00",
      Exit_Time: null,
      Reservation_ID: 101,
      Vehicle_ID: 1,
      Bay_ID: 1,
      Duration: "Live",
      Overstay_Minutes: 0,
      Penalty_Amount: 0
    },
    // Live session for User 2
    {
      Session_ID: 202,
      Entry_Time: "2026-10-13T09:02:00",
      Exit_Time: null,
      Reservation_ID: 103,
      Vehicle_ID: 3,
      Bay_ID: 10,
      Duration: "Live",
      Overstay_Minutes: 0,
      Penalty_Amount: 0
    },
    // Live session for User 4 (OVERSTAYING! End time was 10:30, entry 07:30)
    {
      Session_ID: 203,
      Entry_Time: "2026-10-13T07:28:00",
      Exit_Time: null,
      Reservation_ID: 104,
      Vehicle_ID: 5,
      Bay_ID: 25,
      Duration: "Live",
      Overstay_Minutes: 45,
      Penalty_Amount: 90.00
    },
    // Live session for User 5
    {
      Session_ID: 204,
      Entry_Time: "2026-10-13T08:05:00",
      Exit_Time: null,
      Reservation_ID: 105,
      Vehicle_ID: 6,
      Bay_ID: 26,
      Duration: "Live",
      Overstay_Minutes: 0,
      Penalty_Amount: 0
    },
    // Live session for User 7
    {
      Session_ID: 205,
      Entry_Time: "2026-10-13T09:32:00",
      Exit_Time: null,
      Reservation_ID: 107,
      Vehicle_ID: 8,
      Bay_ID: 49,
      Duration: "Live",
      Overstay_Minutes: 0,
      Penalty_Amount: 0
    },
    // Past completed sessions
    {
      Session_ID: 206,
      Entry_Time: "2026-10-12T09:58:00",
      Exit_Time: "2026-10-12T11:55:00",
      Reservation_ID: 109,
      Vehicle_ID: 1,
      Bay_ID: 7,
      Duration: "1h 57m",
      Overstay_Minutes: 0,
      Penalty_Amount: 0.00
    },
    {
      Session_ID: 207,
      Entry_Time: "2026-10-11T14:02:00",
      Exit_Time: "2026-10-11T15:58:00",
      Reservation_ID: 110,
      Vehicle_ID: 2,
      Bay_ID: 9,
      Duration: "1h 56m",
      Overstay_Minutes: 0,
      Penalty_Amount: 0.00
    },
    {
      Session_ID: 208,
      Entry_Time: "2026-10-11T08:55:00",
      Exit_Time: "2026-10-11T10:50:00",
      Reservation_ID: 112,
      Vehicle_ID: 3,
      Bay_ID: 8,
      Duration: "1h 55m",
      Overstay_Minutes: 0,
      Penalty_Amount: 0.00
    },
    // Completed with 35m Overstay (Res 113 End: 15:00, Exit: 15:35) => Penalty 70 INR
    {
      Session_ID: 209,
      Entry_Time: "2026-10-12T13:00:00",
      Exit_Time: "2026-10-12T15:35:00",
      Reservation_ID: 113,
      Vehicle_ID: 4,
      Bay_ID: 11,
      Duration: "2h 35m",
      Overstay_Minutes: 35,
      Penalty_Amount: 70.00
    },
    {
      Session_ID: 210,
      Entry_Time: "2026-10-09T15:05:00",
      Exit_Time: "2026-10-09T17:58:00",
      Reservation_ID: 114,
      Vehicle_ID: 5,
      Bay_ID: 13,
      Duration: "2h 53m",
      Overstay_Minutes: 0,
      Penalty_Amount: 0.00
    },
    // Completed with 20m Overstay (Res 115 End: 16:00, Exit: 16:20) => Penalty 40 INR
    {
      Session_ID: 211,
      Entry_Time: "2026-10-10T14:02:00",
      Exit_Time: "2026-10-10T16:20:00",
      Reservation_ID: 115,
      Vehicle_ID: 7,
      Bay_ID: 28,
      Duration: "2h 18m",
      Overstay_Minutes: 20,
      Penalty_Amount: 40.00
    },
    {
      Session_ID: 212,
      Entry_Time: "2026-10-08T10:05:00",
      Exit_Time: "2026-10-08T11:50:00",
      Reservation_ID: 116,
      Vehicle_ID: 8,
      Bay_ID: 33,
      Duration: "1h 45m",
      Overstay_Minutes: 0,
      Penalty_Amount: 0.00
    },
    {
      Session_ID: 213,
      Entry_Time: "2026-10-06T11:04:00",
      Exit_Time: "2026-10-06T13:58:00",
      Reservation_ID: 118,
      Vehicle_ID: 9,
      Bay_ID: 57,
      Duration: "2h 54m",
      Overstay_Minutes: 0,
      Penalty_Amount: 0.00
    },
    {
      Session_ID: 214,
      Entry_Time: "2026-10-05T16:02:00",
      Exit_Time: "2026-10-05T17:55:00",
      Reservation_ID: 120,
      Vehicle_ID: 10,
      Bay_ID: 18,
      Duration: "1h 53m",
      Overstay_Minutes: 0,
      Penalty_Amount: 0.00
    },
    // Past completed session on 2026-10-04
    {
      Session_ID: 215,
      Entry_Time: "2026-10-04T12:00:00",
      Exit_Time: "2026-10-04T14:15:00",
      Reservation_ID: 109,
      Vehicle_ID: 1,
      Bay_ID: 7,
      Duration: "2h 15m",
      Overstay_Minutes: 15,
      Penalty_Amount: 30.00
    }
  ],

  // PAYMENT(Payment_ID, Amount, Payment_Type['Reservation Fee'|'Penalty'], Payment_Mode['UPI'|'Card'|'Net Banking'|'Cash'], Transaction_ID, Payment_Status['Paid'|'Pending'|'Failed'], Payment_Date, Reservation_ID)
  // 15 payments in all statuses
  payments: [
    {
      Payment_ID: 301,
      Amount: 240.00, // 4 hrs EV @ 60 = 240
      Payment_Type: "Reservation Fee",
      Payment_Mode: "UPI",
      Transaction_ID: "TXN8829104921",
      Payment_Status: "Paid",
      Payment_Date: "2026-10-13 08:25:00",
      Reservation_ID: 101
    },
    {
      Payment_ID: 302,
      Amount: 180.00, // 3 hrs EV @ 60 = 180
      Payment_Type: "Reservation Fee",
      Payment_Mode: "Card",
      Transaction_ID: "TXN7719203819",
      Payment_Status: "Pending",
      Payment_Date: "2026-10-13 10:15:00",
      Reservation_ID: 102
    },
    {
      Payment_ID: 303,
      Amount: 80.00, // 2 hrs Regular @ 40 = 80
      Payment_Type: "Reservation Fee",
      Payment_Mode: "UPI",
      Transaction_ID: "TXN6629104820",
      Payment_Status: "Paid",
      Payment_Date: "2026-10-13 08:50:00",
      Reservation_ID: 103
    },
    {
      Payment_ID: 304,
      Amount: 90.00, // Penalty for Session 203 (45 min @ 2 INR)
      Payment_Type: "Penalty",
      Payment_Mode: "UPI",
      Transaction_ID: "TXN5519203841",
      Payment_Status: "Pending",
      Payment_Date: "2026-10-13 11:15:00",
      Reservation_ID: 104
    },
    {
      Payment_ID: 305,
      Amount: 180.00, // 3 hrs EV @ 60 = 180
      Payment_Type: "Reservation Fee",
      Payment_Mode: "Net Banking",
      Transaction_ID: "TXN4419203852",
      Payment_Status: "Paid",
      Payment_Date: "2026-10-13 07:45:00",
      Reservation_ID: 105
    },
    {
      Payment_ID: 306,
      Amount: 120.00, // 3 hrs Regular @ 40 = 120
      Payment_Type: "Reservation Fee",
      Payment_Mode: "Card",
      Transaction_ID: "TXN3319203863",
      Payment_Status: "Failed",
      Payment_Date: "2026-10-13 09:10:00",
      Reservation_ID: 106
    },
    {
      Payment_ID: 307,
      Amount: 240.00, // 4 hrs EV @ 60 = 240
      Payment_Type: "Reservation Fee",
      Payment_Mode: "UPI",
      Transaction_ID: "TXN2219203874",
      Payment_Status: "Paid",
      Payment_Date: "2026-10-13 09:20:00",
      Reservation_ID: 107
    },
    {
      Payment_ID: 308,
      Amount: 80.00, // 2 hrs Regular @ 40 = 80
      Payment_Type: "Reservation Fee",
      Payment_Mode: "UPI",
      Transaction_ID: "TXN1119203885",
      Payment_Status: "Paid",
      Payment_Date: "2026-10-12 09:50:00",
      Reservation_ID: 109
    },
    {
      Payment_ID: 309,
      Amount: 80.00, // 2 hrs Regular @ 40 = 80
      Payment_Type: "Reservation Fee",
      Payment_Mode: "Card",
      Transaction_ID: "TXN9929104896",
      Payment_Status: "Paid",
      Payment_Date: "2026-10-11 13:50:00",
      Reservation_ID: 110
    },
    {
      Payment_ID: 310,
      Amount: 80.00,
      Payment_Type: "Reservation Fee",
      Payment_Mode: "Cash",
      Transaction_ID: "TXN8839104807",
      Payment_Status: "Paid",
      Payment_Date: "2026-10-11 08:45:00",
      Reservation_ID: 112
    },
    {
      Payment_ID: 311,
      Amount: 70.00, // Penalty for Session 209 (35 mins)
      Payment_Type: "Penalty",
      Payment_Mode: "UPI",
      Transaction_ID: "TXN7749104818",
      Payment_Status: "Paid",
      Payment_Date: "2026-10-12 15:40:00",
      Reservation_ID: 113
    },
    {
      Payment_ID: 312,
      Amount: 180.00, // 3 hrs EV @ 60
      Payment_Type: "Reservation Fee",
      Payment_Mode: "UPI",
      Transaction_ID: "TXN6659104829",
      Payment_Status: "Paid",
      Payment_Date: "2026-10-09 14:45:00",
      Reservation_ID: 114
    },
    {
      Payment_ID: 313,
      Amount: 40.00, // Penalty for Session 211 (20 mins)
      Payment_Type: "Penalty",
      Payment_Mode: "Cash",
      Transaction_ID: "TXN5569104830",
      Payment_Status: "Paid",
      Payment_Date: "2026-10-10 16:25:00",
      Reservation_ID: 115
    },
    {
      Payment_ID: 314,
      Amount: 80.00,
      Payment_Type: "Reservation Fee",
      Payment_Mode: "Card",
      Transaction_ID: "TXN4479104841",
      Payment_Status: "Paid",
      Payment_Date: "2026-10-08 09:50:00",
      Reservation_ID: 116
    },
    {
      Payment_ID: 315,
      Amount: 120.00, // 3 hrs Regular @ 40
      Payment_Type: "Reservation Fee",
      Payment_Mode: "Net Banking",
      Transaction_ID: "TXN3389104852",
      Payment_Status: "Paid",
      Payment_Date: "2026-10-06 10:45:00",
      Reservation_ID: 118
    }
  ]
};
