const express = require("express");
const { Joi, validate } = require('express-validation');
const UserController = require("../Controller/UserController"); // Adjust the path as needed
const { AuthMiddleware } = require("../middleware/AuthMiddleware");


const router = express.Router();

router.put('/update-profile', AuthMiddleware(), UserController.UpdateProfile);

router.post('/follow', AuthMiddleware(), UserController.PostFollow);
router.get('/requests', AuthMiddleware(), UserController.GetFollowRequest);
router.post('/request-action', AuthMiddleware(), UserController.PostFollowRequestAction);

module.exports = router;    
