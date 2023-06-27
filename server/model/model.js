const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    name:{
        type:String,
        require:true
    },
    email:{
        type:String,
        require:true
    },
    phone:{
        type:Number,
        require:true
    },
    password:{
        type:String,
        require:true
    },
    isBlocked:{
        default:false,
        type:Boolean
    },
    isLogedin:{
        default:false,
        type:Boolean
    },
    coupons:{
        type:[String]
    },
    
    address:[{
        
        name:String,
        address:String,
        phone:Number,
        pincode:Number,
        city:String,
        email:String
    }]
})

const User = new mongoose.model("user_collection",UserSchema)

module.exports=User