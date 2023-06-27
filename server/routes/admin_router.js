const express = require('express');
const route = express.Router();
const multer = require('multer')
const fs = require('fs')
const admin_controller = require('../controller/admin_controller');
const Category = require('../model/add_category');

let storage = multer.diskStorage({
  destination: (req,file,cb)=>{
      // make sure directory exists
      const uploadDir = './uploads';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
      }
      cb(null, uploadDir);
  
  },
  filename: (req,file,cb)=>{
     // remove spaces and special characters from original filename
     const originalname = file.originalname.replace(/[^a-zA-Z0-9]/g, "");
     // set filename to fieldname + current date + original filename
     cb(null, `${file.fieldname}_${Date.now()}_${originalname}`);
   },
});

let upload = multer({
  storage:storage,
})

route.use(express.urlencoded({extended:true}));
route.use(express.json());

route.get("/add_category",async (req, res) => {
  const category_find = await Category.find().exec()
  console.log(category_find);
  res.render("add_category",{category_find});
});
route.get("/admin_login", (req, res) => {
  res.render("admin_login");
});



route.post("/admin_login",admin_controller.admin_login);
route.get("/admin",admin_controller.admin);
route.get("/logout",admin_controller.logout);
route.get("/orderdetail/:id",admin_controller.orderdetail);
route.post("/adminSalesReportFilter",admin_controller.FilterbyDates)


route.get("/product", admin_controller.find_product);




//category
route.post("/add_category",admin_controller.add_category);
route.post("/order_update/:id",admin_controller.orderUpdate);
route.get("/category", admin_controller.find_category)

route.post("/update_category/:id",admin_controller.updatecategory);
route.get("/edit/:id",admin_controller.edit_category)
route.get("/delete_category/:id", admin_controller.deletecategory)
route.get("/edit_pdt/:id",admin_controller.edit_product)
route.post("/update_product/:id",upload.array('photo', 5),admin_controller.updateproduct);
route.get("/deleteImage/:id/:image", admin_controller.deleteImage);
route.get("/delete_product/:id", admin_controller.deleteproduct)
route.get("/user",admin_controller.find_user)
//order
route.get("/order",admin_controller.order_status)
route.post("/order_update/:id",admin_controller.orderUpdate);

//user block and unblock
route.get("/block_user/:id",admin_controller.block_user)
route.get("/unblock_user/:id",admin_controller.unblock_user)

//add product
route.post("/add_product",upload.array('photo', 5),admin_controller.addproduct);
route.get("/add_product_page", admin_controller.addproductpage);

//refund
route.post("/order_refund/:id",admin_controller.refund);

//coupon
route.get("/coupon",admin_controller.coupon_page);
route.get("/add_coupon_page", admin_controller.add_coupon_page)
route.post("/add_coupon",admin_controller.add_coupon);
route.get("/deactivate_coupon/:id", admin_controller.deactivate_coupon)
route.get("/activate_coupon/:id", admin_controller.activate_coupon)
route.post("/edit_coupon/:id", admin_controller.edit_coupon)

//banner
route.get("/banner",admin_controller.banner)
route.post("/add_banner",upload.single('image'),admin_controller.addbanner)
route.get('/add_banner',admin_controller.add_bannerpage)
route.get('/delete_banner/:id', admin_controller.delete_banner);
route.get('/edit_banner/:id',admin_controller.edit_banner)
route.post('/update_banner/:id',upload.single('image'),admin_controller.updatebanner)

module.exports=route;