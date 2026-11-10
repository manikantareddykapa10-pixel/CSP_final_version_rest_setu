const bcryptjs = require('bcryptjs');
const colors = require('colors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize SQLitew
const { connectDB } = require('./config/db.js');
connectDB();

const userModel = require('./models/userModel.js');

// Sample Users Data use
const sampleUsers = [
  {
    role: "admin",
    name: "Admin User",
    email: "admin@raktsetu.com",
    password: "admin123",
    address: "Admin Office, New Delhi",
    phone: "9999999999",
  },
  {
    role: "organisation",
    organisationName: "Red Cross Delhi",
    email: "redcross@raktsetu.com",
    password: "org123",
    website: "www.redcrossdelhi.org",
    address: "Red Cross Building, CP, New Delhi",
    phone: "9888888888",
  },
  {
    role: "hospital",
    hospitalName: "AIIMS Delhi",
    email: "aiims@raktsetu.com",
    password: "hospital123",
    website: "www.aiims.edu",
    address: "AIIMS, Ansari Nagar, New Delhi",
    phone: "9777777777",
  },
  {
    role: "donar",
    name: "John Doe",
    email: "john@raktsetu.com",
    password: "donor123",
    address: "Donor Street, Mumbai",
    phone: "9666666666",
    bloodGroup: "A+",
  }
];

async function seedDatabase() {
  try {
    console.log('Connected to SQLite'.bgCyan.white);

    for (let userData of sampleUsers) {
      // Check if user already exists
      const existingUser = await userModel.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`User with email ${userData.email} already exists. Skipping...`);
        continue;
      }

      // Hash password
      const salt = await bcryptjs.genSalt(10);
      userData.password = await bcryptjs.hash(userData.password, salt);

      // Create and save user
      const user = new userModel(userData);
      user.save();
      console.log(`Created ${userData.role}: ${userData.email}`);
    }

    console.log('Database seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
