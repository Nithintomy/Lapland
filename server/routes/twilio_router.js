require('dotenv').config()


const express = require('express');
const twilio_sms=require('../controller/twilio_sms')
const router = express.Router();





router.post('/OTPSend',twilio_sms.sendOTP)
router.post('/verifyOTPsign',twilio_sms.verifyOTPcreate)

router.post('/sendOTP_forgot',twilio_sms.send_password_OTP) 

router.post('/verify_password_OTP',twilio_sms.verify_password_OTP)



module.exports = router;