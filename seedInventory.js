const colors = require('colors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize SQ Lite
const { connectDB, getDb } = require('./config/db.js');
connectDB();

const userModel = require('./models/userModel.js');
const inventoryModel = require('./models/inventoryModel.js');

async function seedInventory() {
  try {
    console.log('Connected to SQLite'.bgCyan.white);

    // Get users from database
    const organization = await userModel.findOne({ role: "organisation", email: "redcross@raktsetu.com" });
    const hospital = await userModel.findOne({ role: "hospital", email: "aiims@raktsetu.com" });
    const donor1 = await userModel.findOne({ role: "donar", email: "john@raktsetu.com" });

    if (!organization || !hospital || !donor1) {
      console.log('Required users not found. Please run seedData.js first');
      process.exit(1);
    }

    console.log('Found users:');
    console.log(`Organization: ${organization.organisationName}`);
    console.log(`Hospital: ${hospital.hospitalName}`);
    console.log(`Donor 1: ${donor1.name}`);

    // Sample Blood Donations (IN records)
    const bloodDonations = [
      { inventoryType: "in", bloodGroup: "A+", quantity: 3, email: donor1.email, organisation: organization._id, donar: donor1._id },
      { inventoryType: "in", bloodGroup: "B+", quantity: 2, email: donor1.email, organisation: organization._id, donar: donor1._id },
      { inventoryType: "in", bloodGroup: "O+", quantity: 4, email: donor1.email, organisation: organization._id, donar: donor1._id },
      { inventoryType: "in", bloodGroup: "O-", quantity: 3, email: donor1.email, organisation: organization._id, donar: donor1._id },
      { inventoryType: "in", bloodGroup: "B-", quantity: 1, email: donor1.email, organisation: organization._id, donar: donor1._id },
      { inventoryType: "in", bloodGroup: "AB-", quantity: 2, email: donor1.email, organisation: organization._id, donar: donor1._id },
      { inventoryType: "in", bloodGroup: "AB+", quantity: 2, email: donor1.email, organisation: organization._id, donar: donor1._id },
      { inventoryType: "in", bloodGroup: "A-", quantity: 1, email: donor1.email, organisation: organization._id, donar: donor1._id },
    ];

    // Sample Blood Requests/Consumption (OUT records)
    const bloodRequests = [
      { inventoryType: "out", bloodGroup: "A+", quantity: 1, email: hospital.email, organisation: organization._id, hospital: hospital._id },
      { inventoryType: "out", bloodGroup: "O+", quantity: 2, email: hospital.email, organisation: organization._id, hospital: hospital._id },
      { inventoryType: "out", bloodGroup: "B+", quantity: 1, email: hospital.email, organisation: organization._id, hospital: hospital._id },
    ];

    // Insert all inventory records
    console.log('\nCreating blood donation records...');
    for (const donation of bloodDonations) {
      const inv = new inventoryModel(donation);
      inv.save();
      console.log(`Added donation: ${donation.bloodGroup} (${donation.quantity} units)`);
    }

    console.log('\nCreating blood request/consumption records...');
    for (const request of bloodRequests) {
      const inv = new inventoryModel(request);
      inv.save();
      console.log(`Added consumption: ${request.bloodGroup} (${request.quantity} units)`);
    }

    // Display summary
    console.log('\nCurrent Blood Inventory Summary:');
    const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const db = getDb();

    for (const group of bloodGroups) {
      const inRow = db.prepare(`SELECT COALESCE(SUM(quantity),0) as total FROM inventory WHERE bloodGroup=? AND inventoryType='in' AND organisation=?`).get(group, organization._id);
      const outRow = db.prepare(`SELECT COALESCE(SUM(quantity),0) as total FROM inventory WHERE bloodGroup=? AND inventoryType='out' AND organisation=?`).get(group, organization._id);
      const available = inRow.total - outRow.total;
      console.log(`${group}: ${available} units available (${inRow.total} in - ${outRow.total} out)`);
    }

    console.log('\nInventory seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding inventory:', error);
    process.exit(1);
  }
}

seedInventory();
