const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth');
const authMiddleware = require('../middlewares/auth');

router.post('/sign-up', authController.signUp);
router.post('/login', authController.logIn);
router.get('/details', authMiddleware.authenticate, authController.getDetails);

module.exports = router;