const express = require("express");
const authMiddelware = require("../middleware/authMiddleware");
const {
  bloodGroupDetailsContoller,
  globalStatsController,
  hospitalRequestStatsController,
  hospitalDonationsController,
} = require("../controllers/analyticsController");

const router = express.Router();

//routes

//GET BLOOD DATA
router.get("/bloodGroups-data", authMiddelware, bloodGroupDetailsContoller);

//GET GLOBAL STATS
router.get("/stats", authMiddelware, globalStatsController);
router.get("/hospital-requests", authMiddelware, hospitalRequestStatsController);
router.get("/hospital-donations", authMiddelware, hospitalDonationsController);

module.exports = router;