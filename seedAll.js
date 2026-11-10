const bcryptjs = require('bcryptjs');
const colors = require('colors');
const dotenv = require('dotenv');
dotenv.config();

const { connectDB, getDb } = require('./config/db.js');
connectDB();

const userModel = require('./models/userModel.js');
const inventoryModel = require('./models/inventoryModel.js');

// Helper: date N days ago
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};
//async
async function seedAll() {
  try {
    const salt = await bcryptjs.genSalt(10);
    const hash = async (pw) => bcryptjs.hash(pw, salt);

    // ============ USERS ============

    // Admin
    const admin = new userModel({
      role: "admin", name: "Admin Prapti", email: "admin@raktsetu.com",
      password: await hash("admin123"), address: "Rakt Setu HQ, Connaught Place, New Delhi", phone: "9999900001"
    });
    admin.save();

    // Organisations
    const orgs = [];
    const orgData = [
      { organisationName: "Red Cross Delhi", email: "redcross@raktsetu.com", password: "org123", website: "www.redcrossdelhi.org", address: "Red Cross Bhawan, Connaught Place, New Delhi", phone: "9888800001" },
      { organisationName: "Blood Connect Foundation", email: "bloodconnect@raktsetu.com", password: "org123", website: "www.bloodconnect.org", address: "IIT Delhi Campus, Hauz Khas, New Delhi", phone: "9888800002" },
      { organisationName: "Rotary Blood Bank", email: "rotary@raktsetu.com", password: "org123", website: "www.rotarybloodbank.org", address: "56-57 Tughlakabad Institutional Area, New Delhi", phone: "9888800003" },
    ];
    for (const o of orgData) {
      const org = new userModel({ role: "organisation", ...o, password: await hash(o.password) });
      org.save();
      orgs.push(org);
    }

    // Hospitals
    const hospitals = [];
    const hospData = [
      { hospitalName: "AIIMS Delhi", email: "aiims@raktsetu.com", password: "hospital123", website: "www.aiims.edu", address: "AIIMS, Ansari Nagar East, New Delhi 110029", phone: "9777700001" },
      { hospitalName: "Safdarjung Hospital", email: "safdarjung@raktsetu.com", password: "hospital123", website: "www.vmmc-sjh.nic.in", address: "Ansari Nagar West, New Delhi 110029", phone: "9777700002" },
      { hospitalName: "Max Super Speciality", email: "max@raktsetu.com", password: "hospital123", website: "www.maxhealthcare.in", address: "1, Press Enclave Road, Saket, New Delhi", phone: "9777700003" },
      { hospitalName: "Apollo Hospital", email: "apollo@raktsetu.com", password: "hospital123", website: "www.apollohospitals.com", address: "Mathura Road, Sarita Vihar, New Delhi 110076", phone: "9777700004" },
      { hospitalName: "Fortis Hospital", email: "fortis@raktsetu.com", password: "hospital123", website: "www.fortishealthcare.com", address: "Sector B, Pocket 1, Vasant Kunj, New Delhi", phone: "9777700005" },
    ];
    for (const h of hospData) {
      const hosp = new userModel({ role: "hospital", ...h, password: await hash(h.password) });
      hosp.save();
      hospitals.push(hosp);
    }

    // Donors
    const donors = [];
    const donorData = [
      { name: "Rahul Sharma", email: "rahul@raktsetu.com", password: "donor123", address: "B-45, Rohini Sector 7, New Delhi", phone: "9666600001", bloodGroup: "A+" },
      { name: "Priya Verma", email: "priya@raktsetu.com", password: "donor123", address: "D-12, Vasant Vihar, New Delhi", phone: "9666600002", bloodGroup: "O+" },
      { name: "Amit Kumar", email: "amit@raktsetu.com", password: "donor123", address: "H-23, Dwarka Sector 12, New Delhi", phone: "9666600003", bloodGroup: "B+" },
      { name: "Sneha Gupta", email: "sneha@raktsetu.com", password: "donor123", address: "F-78, Lajpat Nagar, New Delhi", phone: "9666600004", bloodGroup: "AB+" },
      { name: "Vikram Singh", email: "vikram@raktsetu.com", password: "donor123", address: "A-15, Janakpuri, New Delhi", phone: "9666600005", bloodGroup: "O-" },
      { name: "Ananya Patel", email: "ananya@raktsetu.com", password: "donor123", address: "C-34, Greater Kailash, New Delhi", phone: "9666600006", bloodGroup: "A-" },
      { name: "Rohan Mehta", email: "rohan@raktsetu.com", password: "donor123", address: "G-56, Pitampura, New Delhi", phone: "9666600007", bloodGroup: "B-" },
      { name: "Kavya Nair", email: "kavya@raktsetu.com", password: "donor123", address: "E-89, Saket, New Delhi", phone: "9666600008", bloodGroup: "AB-" },
      { name: "Arjun Reddy", email: "arjun@raktsetu.com", password: "donor123", address: "K-12, Karol Bagh, New Delhi", phone: "9666600009", bloodGroup: "O+" },
      { name: "Meera Joshi", email: "meera@raktsetu.com", password: "donor123", address: "L-45, Malviya Nagar, New Delhi", phone: "9666600010", bloodGroup: "A+" },
      { name: "Karan Chopra", email: "karan@raktsetu.com", password: "donor123", address: "P-23, Patel Nagar, New Delhi", phone: "9666600011", bloodGroup: "B+" },
      { name: "Divya Iyer", email: "divya@raktsetu.com", password: "donor123", address: "N-67, Nehru Place, New Delhi", phone: "9666600012", bloodGroup: "O-" },
    ];
    for (const d of donorData) {
      const donor = new userModel({ role: "donar", ...d, password: await hash(d.password) });
      donor.save();
      donors.push(donor);
    }

    console.log(`Created: 1 admin, ${orgs.length} orgs, ${hospitals.length} hospitals, ${donors.length} donors`.green);

    // ============ INVENTORY ============
    // Lots of donation records spread across organisations and time

    const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    let inCount = 0, outCount = 0;

    // Generate donations (IN) - spread across last 60 days
    const donations = [
      // Red Cross - heavy activity
      { org: 0, donor: 0, bg: "A+", qty: 5, days: 55 },
      { org: 0, donor: 1, bg: "O+", qty: 8, days: 50 },
      { org: 0, donor: 2, bg: "B+", qty: 4, days: 48 },
      { org: 0, donor: 3, bg: "AB+", qty: 3, days: 45 },
      { org: 0, donor: 4, bg: "O-", qty: 6, days: 42 },
      { org: 0, donor: 5, bg: "A-", qty: 2, days: 40 },
      { org: 0, donor: 6, bg: "B-", qty: 3, days: 38 },
      { org: 0, donor: 7, bg: "AB-", qty: 2, days: 35 },
      { org: 0, donor: 0, bg: "A+", qty: 3, days: 30 },
      { org: 0, donor: 1, bg: "O+", qty: 5, days: 28 },
      { org: 0, donor: 8, bg: "O+", qty: 4, days: 25 },
      { org: 0, donor: 9, bg: "A+", qty: 6, days: 22 },
      { org: 0, donor: 10, bg: "B+", qty: 3, days: 20 },
      { org: 0, donor: 11, bg: "O-", qty: 4, days: 18 },
      { org: 0, donor: 0, bg: "A+", qty: 2, days: 15 },
      { org: 0, donor: 2, bg: "B+", qty: 5, days: 12 },
      { org: 0, donor: 4, bg: "O-", qty: 3, days: 10 },
      { org: 0, donor: 1, bg: "O+", qty: 6, days: 7 },
      { org: 0, donor: 3, bg: "AB+", qty: 4, days: 5 },
      { org: 0, donor: 9, bg: "A+", qty: 3, days: 3 },
      { org: 0, donor: 8, bg: "O+", qty: 5, days: 1 },

      // Blood Connect
      { org: 1, donor: 0, bg: "A+", qty: 4, days: 52 },
      { org: 1, donor: 2, bg: "B+", qty: 3, days: 46 },
      { org: 1, donor: 4, bg: "O-", qty: 5, days: 40 },
      { org: 1, donor: 6, bg: "B-", qty: 2, days: 35 },
      { org: 1, donor: 8, bg: "O+", qty: 7, days: 30 },
      { org: 1, donor: 10, bg: "B+", qty: 4, days: 25 },
      { org: 1, donor: 1, bg: "O+", qty: 3, days: 20 },
      { org: 1, donor: 5, bg: "A-", qty: 3, days: 15 },
      { org: 1, donor: 11, bg: "O-", qty: 2, days: 10 },
      { org: 1, donor: 9, bg: "A+", qty: 5, days: 5 },

      // Rotary Blood Bank
      { org: 2, donor: 1, bg: "O+", qty: 6, days: 50 },
      { org: 2, donor: 3, bg: "AB+", qty: 3, days: 44 },
      { org: 2, donor: 5, bg: "A-", qty: 2, days: 38 },
      { org: 2, donor: 7, bg: "AB-", qty: 4, days: 32 },
      { org: 2, donor: 9, bg: "A+", qty: 3, days: 26 },
      { org: 2, donor: 11, bg: "O-", qty: 5, days: 20 },
      { org: 2, donor: 0, bg: "A+", qty: 4, days: 14 },
      { org: 2, donor: 2, bg: "B+", qty: 3, days: 8 },
      { org: 2, donor: 4, bg: "O-", qty: 2, days: 3 },
    ];

    for (const d of donations) {
      const inv = new inventoryModel({
        inventoryType: "in",
        bloodGroup: d.bg,
        quantity: d.qty,
        email: donors[d.donor].email,
        organisation: orgs[d.org]._id,
        donar: donors[d.donor]._id,
      });
      inv.createdAt = daysAgo(d.days);
      inv.updatedAt = daysAgo(d.days);
      inv.save();
      inCount++;
    }

    // Generate requests (OUT) - hospitals requesting blood
    const requests = [
      // AIIMS - highest demand
      { org: 0, hosp: 0, bg: "A+", qty: 3, days: 44 },
      { org: 0, hosp: 0, bg: "O+", qty: 4, days: 40 },
      { org: 0, hosp: 0, bg: "B+", qty: 2, days: 36 },
      { org: 0, hosp: 0, bg: "O-", qty: 2, days: 30 },
      { org: 0, hosp: 0, bg: "AB+", qty: 1, days: 24 },
      { org: 0, hosp: 0, bg: "A+", qty: 2, days: 18 },
      { org: 0, hosp: 0, bg: "O+", qty: 3, days: 12 },
      { org: 0, hosp: 0, bg: "B+", qty: 1, days: 6 },
      { org: 0, hosp: 0, bg: "O+", qty: 2, days: 2 },

      // Safdarjung
      { org: 0, hosp: 1, bg: "O+", qty: 3, days: 38 },
      { org: 0, hosp: 1, bg: "A+", qty: 2, days: 28 },
      { org: 0, hosp: 1, bg: "B-", qty: 1, days: 16 },
      { org: 0, hosp: 1, bg: "O-", qty: 2, days: 8 },

      // Max Hospital
      { org: 1, hosp: 2, bg: "A+", qty: 2, days: 42 },
      { org: 1, hosp: 2, bg: "O+", qty: 3, days: 32 },
      { org: 1, hosp: 2, bg: "B+", qty: 2, days: 22 },
      { org: 1, hosp: 2, bg: "AB+", qty: 1, days: 14 },

      // Apollo
      { org: 2, hosp: 3, bg: "O+", qty: 2, days: 46 },
      { org: 2, hosp: 3, bg: "A+", qty: 3, days: 34 },
      { org: 2, hosp: 3, bg: "O-", qty: 2, days: 22 },
      { org: 2, hosp: 3, bg: "AB-", qty: 1, days: 10 },

      // Fortis
      { org: 2, hosp: 4, bg: "B+", qty: 1, days: 40 },
      { org: 2, hosp: 4, bg: "A-", qty: 1, days: 28 },
      { org: 2, hosp: 4, bg: "O+", qty: 2, days: 16 },
    ];

    for (const r of requests) {
      const inv = new inventoryModel({
        inventoryType: "out",
        bloodGroup: r.bg,
        quantity: r.qty,
        email: hospitals[r.hosp].email,
        organisation: orgs[r.org]._id,
        hospital: hospitals[r.hosp]._id,
      });
      inv.createdAt = daysAgo(r.days);
      inv.updatedAt = daysAgo(r.days);
      inv.save();
      outCount++;
    }

    console.log(`Created: ${inCount} donations (IN), ${outCount} requests (OUT)`.green);

    // Summary
    const db = getDb();
    console.log('\n=== Blood Inventory Summary (Red Cross) ==='.yellow);
    for (const bg of bloodGroups) {
      const inRow = db.prepare(`SELECT COALESCE(SUM(quantity),0) as t FROM inventory WHERE bloodGroup=? AND inventoryType='in' AND organisation=?`).get(bg, orgs[0]._id);
      const outRow = db.prepare(`SELECT COALESCE(SUM(quantity),0) as t FROM inventory WHERE bloodGroup=? AND inventoryType='out' AND organisation=?`).get(bg, orgs[0]._id);
      console.log(`  ${bg}: ${inRow.t - outRow.t} available (${inRow.t} in / ${outRow.t} out)`);
    }

    console.log('\nAll done! Ready for presentation.'.bgGreen.white);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

seedAll();
