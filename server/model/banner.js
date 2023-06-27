const mongoose=require('mongoose')

const bannerSchema=new mongoose.Schema({
  image:{
    type:String,
    required:true
  },
  title:{
    type:String,
    require:true
  },
  subtitle:{
    type:String,
    require:true
  },
  createdAt:{
    type:Date,
    required:true
  },
  link:{
    type: String,
    required: true,

  }

})

const Banner =mongoose.model('banner',bannerSchema)

module.exports= Banner;