const mongoose = require("mongoose")

var couponSchema = new mongoose.Schema({
    brand:{
        type:String,
        required: true
       
    },

    code: {
        type:String,
        unique: true,
        required: true
    },
    date: {
        type: Date,
        required: true
    },

    discount:{
        type: String,
        required: true

    },
    

    status: {
        type: Boolean,
        default: false
    }

})

const coupon = new mongoose.model("coupon", couponSchema);


module.exports = coupon;