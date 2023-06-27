const mongoose = require ('mongoose');


const walletSchema=new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        require:true
        
    },
    orderId:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Order'
     
    }],
    balance:{
        type:Number
   

    },
    createdAt:{
        type:Date,
        default:Date.now()
    },
    transaction:[{
        type:String
        
    }]

})

module.exports =mongoose.model('wallet',walletSchema)