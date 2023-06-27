
require('dotenv').config();
const UserSchema = require("../model/model");
const bcrypt = require("bcrypt");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken)
const serviceSid = process.env.TWILIO_SERVICE_SID;
const productSchema = require('../model/product_model')

//send OTP
exports.sendOTP = async (req, res, next) => {
  console.log("sms");
  const { phone } = req.body;
  req.session.phone = phone;
  
  if (!phone) {
    res.json({
      status: "error",
      message: "Phone number is required",
    });
    return;
  }
  
  try {
    const user = await UserSchema.findOne({ phone: phone });
    
    const otpResponse = await client.verify.v2.services(serviceSid).verifications.create({
      to: "+91" + phone,
      channel: "sms",
    });
    
    console.log("OTP Response:", otpResponse);
    console.log("SMS sent");
    
    res.json({
      status: "success",
      message: "OTP Sent Successfully",
    });
  } catch (error) {
    console.log("Twilio Error:", error);
    res.status(error?.status || 400).send(error?.message || "Something went wrong!");
  }
};

  


//verify OTP
exports.verifyOTPcreate = async (req, res) => {
console.log("hi1");
  const verificationCode =req.body.otp;
  const phoneNumber = req.session.phone;
  if (!phoneNumber) {
    res.status(400).send({ message: "Phone number is required" });
    return;
  }

  try {
    // Verify the SMS code entered by the user
    const verification_check = await client.verify.v2.services(serviceSid).verificationChecks.create({ to: '+91' + phoneNumber, code: verificationCode });

    if (verification_check.status === 'approved') {
      // If the verification is successful, do something
    console.log("verify");
      
      const user = await UserSchema.findOne({email: req.body.email})
      console.log(user);
      if(user){
        res.json({
          status: "success",
          message: "Email is already used",
      });
      }else{
        const saltRounds = 10 // you adjust the number of salt rounds as needed
        bcrypt.hash(req.body.password, saltRounds,(err,hash)=>{
            if(err){
                res.status(500).send({
                     Message:
                err.message || "some error while hashing the password",
                });
               return;
            }
            const User = new UserSchema({
                name: req.body.name,
                email: req.body.email,
                phone:req.body.phone,
                password: hash
            });
    
            User
            .save()
            .then(()=>{
              res.json({
                status: "success",
                message: "Sign up successfully",
            });
            })
            .catch((err)=>{
                res.status(500).send({
                    message:
                    err.message || "Some error occurred while creating a create operation"
                });
            });
        });
      }
      
    } else {
      // If the verification fails, return an error message
      res.json({
        status: "success",
        message: "Invalid verification code",
    });
    }
  } catch (err) {
    res.status(500).send({ message: err.message || "Some error occurred while verifying the code" });
}


};

exports.send_password_OTP = async (req, res, next) => {
  const { phone } = req.body;
  req.session.phone=phone
  try {
    const user = await UserSchema.findOne({ phone: phone });
      if(!user){
        res.json({
          status: "success",
          message: "phone number is not registered",
      });
    }else{
       const otpResponse = await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        to: "+91"+phone,
        channel: "sms",
      });
      res.json({
        status: "success",
        message: "OTP Sent Successfully",
    });
    }
   
  } catch (error) {
    res.status(error?.status || 400).send(error?.message || "Something went wrong!");
  }
  
};

exports.verify_password_OTP = async (req, res) => {
  const verificationCode =req.body.otp;
  const phoneNumber = req.session.phone;
  const password=req.body.password;
  

  if (!phoneNumber) {
    res.status(400).send({ message: "Phone number is required" });
    return;
  }

  try {
    // Verify the SMS code entered by the user
    const verification_check = await client.verify.v2.services(serviceSid).verificationChecks.create({ to: '+91' + phoneNumber, code: verificationCode });

    if (verification_check.status === 'approved') {
      // If the verification is successful, do something
    
      // res.render('home', { message: "Verification successful" });
      UserSchema.findOne({ phone: phoneNumber })
      .then((user) => {
        const saltRounds = 10; // You can adjust the number of salt rounds as needed
        bcrypt.hash(password, saltRounds, (err, hash) => {
          if (err) {
            res.status(500).send({
              message: err.message || "Some error occurred while hashing the password"
            });
          } else {
            UserSchema.findOneAndUpdate({  phone: phoneNumber }, { password: hash }, { useFindAndModify: false })
              .then(async data => {
                if (!data) {
                  res.status(404).send({ message: `Cannot update user with ID: ${phone}. User not found.` });
                } else {
                  res.json({
                    status: "success",
                    message: "Successfully updated password",
                });
                }
              })
              .catch(err => {
                res.status(500).send({ message: "Error updating user information" });
              });
          }
        });
      })
      
    } else {
      // If the verification fails, return an error message
      res.json({
        status: "success",
        message: "Invalid verification code",
    });
    }
  } catch (err) {
    res.status(500).send({ message: err.message || "Some error occurred while verifying the code" });
}

};










    