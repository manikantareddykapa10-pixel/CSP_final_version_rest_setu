const express = require('express');
const { registerController,loginController,currentUserController, updateLocationController, updateProfileController } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { registerValidation, loginValidation } = require('../middleware/validationMiddleware');
const { authLimiter } = require('../middleware/securityMiddleware');

const router = express.Router();

//Register || POST
router.post("/register", authLimiter, registerValidation, registerController);

//LOGIN || POST
router.post("/login", authLimiter, loginValidation, loginController);

//GET CURR USER || GET
router.get('/current-user', authMiddleware, currentUserController );

//UPDATE LOCATION || PATCH
router.patch('/update-location', authMiddleware, updateLocationController);
router.patch('/update-profile', authMiddleware, updateProfileController);


module.exports =router;