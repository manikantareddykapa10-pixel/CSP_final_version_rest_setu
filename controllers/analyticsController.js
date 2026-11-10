const inventoryModel = require("../models/inventoryModel");
const { getDb } = require('../config/db');

const globalStatsController = async (req, res) => {
  try {
    const db = getDb();
    const totalDonors = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'donar'").get().c;
    const totalHospitals = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'hospital'").get().c;
    const totalOrgs = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'organisation'").get().c;
    const totalInventoryIn = db.prepare("SELECT COALESCE(SUM(quantity),0) as c FROM inventory WHERE inventoryType = 'in'").get().c;
    const totalInventoryOut = db.prepare("SELECT COALESCE(SUM(quantity),0) as c FROM inventory WHERE inventoryType = 'out'").get().c;
    const pendingRequests = db.prepare("SELECT COUNT(*) as c FROM requests WHERE status = 'pending'").get().c;
    const acceptedRequests = db.prepare("SELECT COUNT(*) as c FROM requests WHERE status = 'accepted'").get().c;
    const completedRequests = db.prepare("SELECT COUNT(*) as c FROM requests WHERE status = 'completed'").get().c;

    const bloodGroupBreakdown = db.prepare(`
      SELECT bloodGroup, SUM(CASE WHEN inventoryType='in' THEN quantity ELSE 0 END) as totalIn,
        SUM(CASE WHEN inventoryType='out' THEN quantity ELSE 0 END) as totalOut
      FROM inventory GROUP BY bloodGroup
    `).all();

    return res.status(200).json({
      success: true,
      stats: {
        totalDonors, totalHospitals, totalOrgs,
        totalInventoryIn, totalInventoryOut,
        availableBlood: totalInventoryIn - totalInventoryOut,
        pendingRequests, acceptedRequests, completedRequests,
        bloodGroupBreakdown
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching stats', error: error.message });
  }
};

const hospitalRequestStatsController = async (req, res) => {
  try {
    const db = getDb();
    const userId = req.body.userId;
    const hospital = db.prepare("SELECT role FROM users WHERE _id = ?").get(userId);

    if (!hospital || hospital.role !== 'hospital') {
      return res.status(403).json({ success: false, message: 'Hospital access required' });
    }

    const stats = db.prepare(`
      SELECT
        COUNT(*) as totalRequests,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as acceptedRequests,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingRequests
      FROM requests
      WHERE requestedBy = ?
    `).get(userId);

    return res.status(200).json({
      success: true,
      stats: {
        totalRequests: stats.totalRequests,
        acceptedRequests: stats.acceptedRequests || 0,
        pendingRequests: stats.pendingRequests || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching hospital request stats', error: error.message });
  }
};

const hospitalDonationsController = async (req, res) => {
  try {
    const db = getDb();
    const userId = req.body.userId;
    const hospital = db.prepare("SELECT role FROM users WHERE _id = ?").get(userId);

    if (!hospital || hospital.role !== 'hospital') {
      return res.status(403).json({ success: false, message: 'Hospital access required' });
    }

    const donations = db.prepare(`
      SELECT r._id, r.bloodGroup, r.patientName, r.patientPhoto, r.updatedAt as completedAt,
        u.name as donorName, u.profilePicture as donorProfilePicture
      FROM requests r
      LEFT JOIN users u ON r.acceptedBy = u._id AND u.role = 'donar'
      WHERE r.requestedBy = ? AND r.status = 'completed'
      ORDER BY r.updatedAt DESC
    `).all(userId);

    return res.status(200).json({ success: true, donations });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching hospital donations', error: error.message });
  }
};

//GET BLOOD DATA
const bloodGroupDetailsContoller = async (req, res) => {
  try {
    const bloodGroups = ["O+", "O-", "AB+", "AB-", "A+", "A-", "B+", "B-"];
    const bloodGroupData = [];
    const organisation = req.body.userId;
    //get single blood group
    await Promise.all(
      bloodGroups.map(async (bloodGroup) => {
        //COunt TOTAL IN
        const totalIn = await inventoryModel.aggregate([
          {
            $match: {
              bloodGroup: bloodGroup,
              inventoryType: "in",
              organisation,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$quantity" },
            },
          },
        ]);
        //COunt TOTAL OUT
        const totalOut = await inventoryModel.aggregate([
          {
            $match: {
              bloodGroup: bloodGroup,
              inventoryType: "out",
              organisation,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$quantity" },
            },
          },
        ]);
        //CALCULATE TOTAL
        const availabeBlood =
          (totalIn[0]?.total || 0) - (totalOut[0]?.total || 0);

        //PUSH DATA
        bloodGroupData.push({
          bloodGroup,
          totalIn: totalIn[0]?.total || 0,
          totalOut: totalOut[0]?.total || 0,
          availabeBlood,
        });
      })
    );

    return res.status(200).send({
      success: true,
      message: "Blood Group Data Fetch Successfully",
      bloodGroupData,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error In Bloodgroup Data Analytics API",
      error,
    });
  }
};

module.exports = {
  bloodGroupDetailsContoller,
  globalStatsController,
  hospitalRequestStatsController,
  hospitalDonationsController,
};