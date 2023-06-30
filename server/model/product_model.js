const mongoose=require("mongoose")

var productSchema=new mongoose.Schema({
    

    name:{
        type:String,
        require:true
       
    },
    price:{
        type:Number,
        require:true,
       
       
    },

    quantity:{
        type:Number,
        require:true,
       
       
    },
    
    details:{
        type:String,
        require:true,
       
       
    },
    outOfStock :{
        type:Boolean

    },
    photo:[{
        type:String,
        require:true,
       
       
    }],
    category_name:{
        type: mongoose.Schema.Types.ObjectId,
        type:String,
        ref: 'category',
    }
  
})

const Product = new mongoose.model("product",productSchema);


module.exports=Product;