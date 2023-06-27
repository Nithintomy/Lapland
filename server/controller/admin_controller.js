const categorySchema = require('../model/add_category');
const UserSchema = require('../model/model');
const productSchema = require('../model/product_model');
const orderSchema = require('../model/order');
const couponSchema = require('../model/coupon')
const bannerSchema= require('../model/banner')
const walletSchema=require('../model/wallet_model')
const sharp=require('sharp')
const fs = require('fs');
const multer = require('multer');


var storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'uploads')
  },
  filename: (req, file, cb) => {
      cb(null, file.fieldname + '-' + Date.now())
  }
});

var upload = multer({
  storage: storage,
}).single("photo");


//admin login
exports.admin_login = (req, res) => {
 
  try {
    const adcredentail = {
      email: "nithintomy2255@gmail.com" ,
      password: 12345678
    }
    console.log(adcredentail.email);
    if (req.body.email == adcredentail.email && req.body.password == adcredentail.password) {
        req.session.user=adcredentail.email
        res.redirect("/admin");

    } else {
      res.render("admin_login", { message: "Invalid entry" });
    }
  } catch (error) {
    console.error(error);
    res.send("An error occurred while logging in.");
  }
};

// admin
exports.admin= async (req, res) => {

  const admin = req.session.user
  if(admin){
    //T  only select the date part

    const today = new Date().toISOString().split("T")[0];
    const startOfDay = new Date(today);
    const endOfDay = new Date(today);
    endOfDay.setDate(endOfDay.getDate() + 1);
    endOfDay.setMilliseconds(endOfDay.getMilliseconds() - 1);

    const orders = await orderSchema.find(); // Fetching all orders from the database

    // Extracting necessary data for the chart
    const salesData = orders.map(order => ({
      createdAt: order.createdAt.toISOString().split('T')[0], // Extracting date only
      total: order.total
    }));

    // Calculating the total sales for each date
    const salesByDate = salesData.reduce((acc, curr) => {
      acc[curr.createdAt] = (acc[curr.createdAt] || 0) + curr.total;
      return acc;
    }, {});

    // Converting the sales data into separate arrays for chart labels and values
    const chartLabels = Object.keys(salesByDate);
    const chartData = Object.values(salesByDate);
  
    const todaySales = await orderSchema
      .countDocuments({
        createdAt: { $gte: startOfDay, $lt: endOfDay },
        status: "Delivered",
      })
      .exec();
    console.log(todaySales);
  
    const totalsales = await orderSchema.countDocuments({ status: "Delivered" });
  
    const todayRevenue = await orderSchema.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lt: endOfDay },
          status: "Delivered",
        },
      },
      { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
    ]);
  
    const revenue = todayRevenue.length > 0 ? todayRevenue[0].totalRevenue : 0;
  
    const TotalRevenue = await orderSchema.aggregate([
      {
        $match: { status: "Delivered" },
      },
      { $group: { _id: null, Revenue: { $sum: "$total" } } },
    ]);
  
    const Revenue = TotalRevenue.length > 0 ? TotalRevenue[0].Revenue : 0;

    console.log(TotalRevenue);
  
    const Orderpending = await orderSchema.countDocuments({ status: "Pending" });
    const OrderReturn = await orderSchema.countDocuments({
      status: "Returned",
    });
    const Ordershipped = await orderSchema.countDocuments({ status: "Shipped" });
  
    const Ordercancelled = await orderSchema.countDocuments({
      status: "cancelled",
    });
  
    const salesCountByMonth = await orderSchema.aggregate([
      {
        $match: {
          status: "Delivered",
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          month: "$_id.month",
          year: "$_id.year",
          count: 1,
        },
      },
    ]);
  
    console.log(salesCountByMonth);
  
    res.render("admin", {
      todaySales,
      totalsales,
      revenue,
      Revenue,
      Orderpending,
      Ordershipped,
      Ordercancelled,
      salesCountByMonth,
      OrderReturn,
      chartLabels: JSON.stringify(chartLabels),
      chartData: JSON.stringify(chartData)
    });

  }else{
    res.render('admin_login')
  }
}



//logout

exports.logout= (req, res) => {
  req.session.user=null
  res.redirect('/admin')
}


  // add  category

  exports.add_category = async (req, res) => {
    const admin = req.session.user;
    if (!admin) {
      res.redirect('/admin');
    }
  
    try {
      const category = await categorySchema.find();
      const categoryExists = category.some(
        (item) => item.category.toLowerCase() === req.body.category.toLowerCase().trim()
      );
  
      if (/\s/.test(req.body.category)) {
        return res.render('add_category', { message: 'No white spaces are allowed' });
      }
  
      if (/[^a-zA-Z0-9]/.test(req.body.category)) {
        return res.render('add_category', { message: 'Invalid category entry. Retry' });
      }
  
      if (categoryExists) {
        res.render('add_category', { message: 'Category already exists' });
      } else {
        const user = new categorySchema({
          category: req.body.category,
        });
  
        const data = await user.save();
  
        res.redirect('/category');
      }
    } catch (err) {
      console.log(err);
      res.status(500).send({
        message:
          err.message ||
          'Some error occurred while creating a create operation',
      });
    }
  };
  
  
//get category

exports.find_category = async (req, res) => {
  const admin = req.session.user
  if(!admin){
    res.redirect('/admin')
  }
  categorySchema
  .find()
  .then((category_find) => {
    res.render("category", { category_find });
  })
  .catch((err) => {
    res.status(500).send({
      message:
        err.message || "error occured while retrieving user information",
    });
  });
    
     
};

//get category update/edit page 

exports.edit_category=async (req, res) => {
  try {
    let {id} = req.params;
    
    let user = await categorySchema.findById(id);
    if (user == null) {
      res.redirect('/category');
    } else {
      res.render("update_category", { user });
    }
  } catch (err) {
    res.redirect('/category');
    console.log(err); // log the error for debugging purposes}
}};

//update category

exports.updatecategory = (req, res) => {
  const { id } = req.params;
  
  
  categorySchema.findByIdAndUpdate(id, {
    category: req.body.category,
    description: req.body.description,
  }, )
    .then(() => {
      res.redirect("/category" );
    })
    .catch((error) => {
      res.send(error);
    });
}


//delete category
exports.deletecategory=async(req,res)=>{
  try {
    const id = req.params.id;
    const result = await categorySchema.findByIdAndRemove(id);

    if (result) {
      // Check if user was found and removed
      res.redirect("/category");
      
    } else {

      res.redirect("/category");
    }
    
  } catch (err) {
    res.status(500).send(err.message); // Send error response with status code 500
  }
}

//get add product page 

exports.addproductpage=async (req, res) => {
  const admin = req.session.user
  if(!admin){
    res.redirect('/admin')
  }
  try {

    const data = await categorySchema.find()
 
    res.render('add_product', { data });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};



//add product

exports.addproduct = async (req, res) => {
  try {
    const pro = await productSchema.find();
    const productExists = pro.some((item) => item.name === req.body.name);
    
    if (productExists) {
      const data = await categorySchema.find()
      res.render("add_product", { data, msg: "product already exists" });
    }else{

    const product = new productSchema({
      name: req.body.name,
      price: req.body.price,
      quantity:req.body.quantity,
      details:req.body.details,
      category_name: req.body.category,
      // photo: req.files.map((file) => file.filename) // use req.file.buffer to get the file buffer
    });

    const croppedImages=[];
    for(const file of req.files){
      const croppedImage = `cropped_${file.filename}`;
      await sharp(file.path)
      .resize(522, 522, { fit: "cover" })
      .toFile(`uploads/${croppedImage}`);

    croppedImages.push(croppedImage);

    product.photo = croppedImages;

    await product.save();

    const product_data = await productSchema.find().exec();

    res.render("product", { product_data });

  }

    // const data = await product.save();

    // res.redirect( "/product");
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message:
        err.message || "Some error occurred while creating a create operation",
    });
  }
};


// get products
 exports.find_product = async (req, res) => {
  const admin = req.session.user
  if(!admin){
    res.redirect('/admin')
  }
  try {
    const product_data = await productSchema.find().exec();
    
    

    res.render("product", {
      product_data
      
    });
  } catch (error) {
    console.error(error);
    res.send({ message: error.message });
  }
};

// get order page
 exports.order_status = async (req, res) => {
  const admin = req.session.user
  if(!admin){
    res.redirect('/admin')
  }
  try {
    const order_data = await orderSchema.find().populate("user").populate("items.product").populate("items.quantity")

    res.render("order_status", {order_data });
  } catch (error) {
    console.error(error);
    res.send({ message: error.message });
  }
};

exports.FilterbyDates=async(req,res)=>{
  const admin=req.session.admin
  const FromDate=req.body.fromdate
  console.log(FromDate);
  const Todate=req.body.todate
  console.log(Todate);
  const order_data=await orderSchema.find({createdAt:{$gte:FromDate,$lte:Todate}}).populate("user").populate("items.product").populate("address")
 
  res.render("order_status",{admin,order_data})
}


exports.banner = async (req, res) => {
  const admin = req.session.user
  if(!admin){
    res.redirect('/admin')
  }
  try {
    const banner_data = await bannerSchema.find().exec();
    
    

    res.render("banner", {banner_data });
  } catch (error) {
    console.error(error);
    res.send({ message: error.message });
  }
};

// get add banner

exports.add_bannerpage=async (req, res) => {
  const admin = req.session.user
  if(!admin){
    res.redirect('/admin')
  }
  try {

    const data = await bannerSchema.find()
 
    res.render('add_banner', { data });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};


//add banner

//add banner
exports.addbanner = async (req, res) => {
  try {
    const bannerExists = await bannerSchema.exists({ title: req.body.title });

    if (bannerExists) {
      const data = await bannerSchema.find();
      res.render("add_banner", { data, msg: "Banner already exists" });
    } else {
      const banner = new bannerSchema({
        title: req.body.title,
        subtitle: req.body.subtitle,
        link: req.body.link,
        createdAt: new Date(),
        
      });

      if (req.file) {
        const croppedImage = `cropped_${req.file.filename}`;
        await sharp(req.file.path)
          .resize(1349,650, { fit: "cover" })
          .toFile(`uploads/${croppedImage}`);

        banner.image = croppedImage;

        // Remove the original uploaded file
        fs.unlinkSync(req.file.path);
      }

      await banner.save();

      const banner_data = await bannerSchema.find().exec();
      res.render("banner", { banner_data });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message:
        err.message || "Some error occurred while creating a create operation",
    });
  }
};


exports.delete_banner = async (req, res) => {
  try {
    const bannerId = req.params.id;
    
    // Find the banner by its ID and remove it from the database
    await bannerSchema.findByIdAndRemove(bannerId);
    
    // Redirect back to the banner page or any other appropriate page
    res.redirect('/banner');
  } catch (error) {
    // Handle any errors that occur during the deletion process
    console.error('Error deleting banner:', error);
    res.status(500).send('Error deleting banner');
  }
};
exports.edit_banner = async (req, res) => {
  try {
    const bannerId = req.params.id;
    const banner = await bannerSchema.findById(bannerId).exec();

    if (banner) {
      res.render("update_banner", { banner });
    } else {
      // Banner not found
      req.session.message = {
        type: "error",
        message: "Banner not found",
      };
      res.redirect("/banner");
    }
  } catch (error) {
    console.error(error);
    res.send(error);
  }
};

exports.updatebanner = async (req, res) => {
  try {
    const bannerId = req.params.id;
    const banner = await bannerSchema.findById(bannerId);

    console.log(bannerId, "ndhejwdJWHECGHaweceWJGD");

    let new_image = banner.image; // Set initial value as the existing image

    if (req.file) {
      // A new image is uploaded, update the image value
      new_image = req.file.filename;
      
      if (banner.image) {
        // Delete the previous image file
        try {
          fs.unlinkSync("./uploads/" + banner.image);
        } catch (error) {
          console.log(error);
        }
      }
    }

    // Update the banner using findByIdAndUpdate
    const updatedbanner = await bannerSchema.findByIdAndUpdate(
      bannerId,
      {
        title: req.body.title,
        subtitle: req.body.subtitle,
        link: req.body.link,
        image: new_image,
      },
      { new: true }
    );

    if (updatedbanner) {
      req.session.message = {
        type: 'success',
        message: 'Banner update successful',
      };
      req.session.authorized = true;
      res.redirect('/banner');
    } else {
      // Banner not found
      req.session.message = {
        type: 'error',
        message: 'Banner not found',
      };
      res.redirect('/banner');
    }
  } catch (error) {
    console.error(error);
    res.send(error);
  }
};





// order update
exports.orderUpdate = async (req, res) => {
  try {
    const orderId = req.params.id;
    console.log(orderId);
    const newStatus = req.body.status;

    // Update the order using findByIdAndUpdate
    await orderSchema.findByIdAndUpdate(orderId, { status: newStatus });

    res.redirect('/order');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

// order details
exports.orderdetail =async (req,res)=>{
  try{
    const id = req.params.id;
    
    const order_data = await orderSchema.findOne({_id: id}).populate("user").populate("items.product").populate("items.quantity")
   console.log(order_data);
   res.render('order_details',{order_data})
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}

//get update product page

exports.edit_product = async (req, res) => {
  try {
    const { id } = req.params;
   
    const user = await productSchema.findById(id);
    const category = await categorySchema.find();

    if (!user) {
      return res.redirect('/product');
    }

    return res.render('update_product', { user, category, new_images: [] });
  } catch (err) {
    console.error(err);
    return res.redirect('/product');
  }
};


//update product

exports.updateproduct = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await productSchema.findById(id); // Retrieve the current product

    let new_images = user.photo; // Initialize new_images with existing images

    if (req.files && req.files.length > 0) {
      new_images = new_images.concat(req.files.map((file) => file.filename));
    }

    // Update the product using findByIdAndUpdate
    const updatedProduct = await productSchema.findByIdAndUpdate(
      id,
      {
        name: req.body.name,
        price: req.body.price,
        quantity: req.body.quantity,
        details: req.body.details,
        category_name: req.body.category,
        photo: new_images,
      },
      { new: true }
    );

    // Set { new: true } to return the updated document

    if (updatedProduct) {
      req.session.message = {
        type: "success",
        message: "Product update successful",
      };
      req.session.authorized = true;
      res.redirect("/product");
    } else {
      // Product not found
      req.session.message = {
        type: "error",
        message: "Product not found",
      };
      res.redirect("/product");
    }
  } catch (error) {
    console.error(error);
    res.send(error);
  }
};



exports.deleteImage = async (req, res) => {
  try {
    const { id, image } = req.params;

    // Find the product by id
    const product = await productSchema.findById(id);

    if (!product) {
      // Product not found
      req.session.message = {
        type: "error",
        message: "Product not found",
      };
      return res.redirect("/product");
    }

    // Remove the image from the photo array
    const updatedPhotos = product.photo.filter((photo) => photo !== image);

    // Delete the image file from the server
    fs.unlinkSync("./uploads/" + image);

    // Update the product with the updated photo array
    await productSchema.findByIdAndUpdate(id, { photo: updatedPhotos });

    req.session.message = {
      type: "success",
      message: "Image deleted successfully",
    };
    res.redirect("/product");
  } catch (error) {
    console.error(error);
    res.send(error);
  }
};



exports.deleteproduct=async(req,res)=>{
  try {
    const id = req.params.id;
    const result = await productSchema.findByIdAndRemove(id);

    if (result) {
      // Check if user was found and removed
      res.redirect("/product");
      
    } else {

      res.redirect("/product");
    }
    
  } catch (err) {
    res.status(500).send(err.message); // Send error response with status code 500
  }
}

// find user

exports.find_user = async (req, res) => {
  const admin = req.session.user
  if(!admin){
    res.redirect('/admin')
  }
  try {
    const user_data = await UserSchema.find().exec();
    
    

    res.render("user", {
      user_data: user_data,
      
    });
  } catch (error) {
    console.error(error);
    res.send({ message: error.message });
  }
};


//refund
exports.refund = async (req,res)=>{
  try{
    const orderId = req.params.id;
    const newStatus = "Refunded"
    await orderSchema.findByIdAndUpdate(orderId, { status: newStatus });
    const order = await orderSchema.findById(orderId)
    
    const userwallet=await walletSchema.findOne({userId:order.user})
    if(!userwallet){
      const newWallet= new walletSchema ({
        userId:order.user,
        balance:order.total,
        orderId:order._id,
        createdAt:new Date()
      })

      await newWallet.save();
    }else{

      console.log(order.total );
      const wallets = userwallet.balance + order.total;
      
      userwallet.balance=wallets
      userwallet.orderId.push(order._id)

      await userwallet.save();
    }

    res.redirect('/order');
  } catch (error) {
    console.error(error);
    res.send(error);
}
}



//block user


exports.block_user = (req, res) => {
  const { id } = req.params;

  UserSchema.findByIdAndUpdate(id, {
    isBlocked: true,
  }, { new: true })
    .then((updatedUser) => {
      res.redirect('/user'); 
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("Failed to update user.");
    });
};


exports.unblock_user = (req, res) => {
  const { id } = req.params;

  UserSchema.findByIdAndUpdate(id, {
    isBlocked: false,
  }, { new: true })
    .then((updatedUser) => {
      res.redirect('/user'); 
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("Failed to update user.");
    });
};



// get coupon page with data
  exports.coupon_page = async (req, res) => {
    let user = req.session.user
    try {
      const coupon_data = await couponSchema.find()

      res.render('coupon', { user, coupon_data })
    }
    catch (error) {
      console.error(error);
      res.send({ message: error.message });
    }
  }



  // get method to add coupon page
  exports.add_coupon_page = (req, res) => {

    res.render('add_coupon')
  }


  //post method
  exports.add_coupon = async (req, res) => {

    try {
      const data = await couponSchema({
        brand:req.body.brand,
        code: req.body.coupon_code,
        date: req.body.date,
        discount: req.body.discount,


      })
      const coupon = await data.save()

      res.redirect('add_coupon_page');
    } catch (err) {
      console.log(err);
      res.status(500).send({
        message: err.message || 'Some error occurred'
      });
    }

  }


  //deactivate coupon

  exports.deactivate_coupon = async (req, res) => {

    try {
      const id = req.params.id

      await couponSchema.findByIdAndUpdate(id, {
        status: false
      }, { new: true })
      res.redirect('/coupon')

    } catch (error) {
      console.error(error);
      res.status(500).send("failed to Deactivate coupon.");
    };
  }


  //activate coupon
  exports.activate_coupon = async (req, res) => {
    try {
      const id = req.params.id

      await couponSchema.findByIdAndUpdate(id, {
        status: true
      }, { new: true })
      res.redirect('/coupon')

    } catch (error) {
      console.error(error);
      res.status(500).send("failed to Activate coupon.");
    };
  }

  //edit coupon
  exports.edit_coupon = async (req, res) => {
    try {
      const id = req.params.id
      const editedCoupon = await couponSchema.findByIdAndUpdate(id, {
        brand:req.body.brand,
        code: req.body.coupon_code,
        date: req.body.date,
        discount: req.body.discount
      
      }, { new: true })
     

      if (editedCoupon) {

        res.redirect("/coupon");

      } else {
        res.send(err)
      }

    } catch (error) {
      console.error(error);
      res.send(error);
    }
  }


