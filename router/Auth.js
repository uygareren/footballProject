const express = require("express");
const { Joi, validate } = require('express-validation');
const AuthController = require("../Controller/AuthController"); // Adjust the path as needed
const {AuthMiddleware} = require("../middleware/AuthMiddleware");

const registerValidation = {
    body: Joi.object({
        name: Joi.string().required(),
        surname: Joi.string().required(),
        email: Joi.string().email().required(), // Consider validating email format
        phone: Joi.string().required(),
        password: Joi.string().required(),
        password2: Joi.string().required()
    }),
};

const registerVerifyValidation = {
    body: Joi.object({
        email: Joi.string().required(),
        code: Joi.number().required(),
    }),
};

const registerResendVerifyValidation = {
    body: Joi.object({
        email: Joi.string().required(),
    }),
};

const loginValidation = {
    body: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    }),
};

const ForgetPasswordEmailVerification = {
    body: Joi.object({
        email: Joi.string().required(),
    }),
};

const forgetPasswordVerifyValidation = {
    body: Joi.object({
        email: Joi.string().required(),
        code: Joi.number().required(),
    }),
};

const forgetPasswordResendVerifyValidation = {
    body: Joi.object({
        email: Joi.string().required(),
    }),
};

const forgetPasswordResetPasswordValidation = {
    body: Joi.object({
        email: Joi.string().required(),
        newPassword: Joi.string().required(),
    }),
};


const router = express.Router();

router.post('/register', validate(registerValidation), AuthController.Register);
router.post('/register-verify', validate(registerVerifyValidation), AuthController.VerifyRegisterCode);
router.post('/register-resend-verify', validate(registerResendVerifyValidation), AuthController.ResendVerifyRegisterCode);

router.post('/login', validate(loginValidation), AuthController.Login);
router.post('/login-with-token', AuthController.loginWithToken);

router.post('/forget-password-email-verification', validate(ForgetPasswordEmailVerification), AuthController.ForgetPasswordEmailVerification);
router.post('/forget-password-verify', validate(forgetPasswordVerifyValidation), AuthController.VerifyForgetPassword);
router.post('/forget-password-resend-verify', validate(forgetPasswordResendVerifyValidation), AuthController.ResendVerifyForgetPassword);
router.post('/forget-password-reset-password', validate(forgetPasswordResetPasswordValidation), AuthController.ForgetPasswordResetPassword);

router.put('/password-update', AuthMiddleware(), AuthController.PasswordUpdate);

module.exports = router;    
