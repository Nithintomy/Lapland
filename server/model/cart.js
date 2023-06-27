const mongoose = require('mongoose')

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user_collection",
        required: true
    },
    total:{
        type:Number,
        required:true,
        default:0


    },
    discount:{
        type:Number,
        require:true,
        default:0
    },
    products: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "product",
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                default: 1
            },
        },
    ],
}, { timestamps: true } );

const cart = new mongoose.model("Cart", cartSchema);
module.exports = cart;