const express = require('express')
const route = express.Router()
const controller = require('../controller/controller')
const User = require('../model/model')




const isblock = async (req, res, next) => {
  if (req.session.user) {
    const userId = req.session.user?._id;
    const userblock = await User.findById(userId);

    if (userblock && userblock.isBlocked) {
      console.log("block");
      req.session.user = null;
      req.session.authorized = false;
      return res.redirect("/index");
    }
  }

  next();
};




route.get("/404",(req, res) => {
    res.render("404");
  });

route.get('/',controller.index);
route.get('/login',controller.login);
route.get('/index',isblock,controller.index);

route.get('/viewcart',isblock,controller.userCart);
route.get('/payment/:id',isblock,controller.payment);
route.get('/single_product/:id',controller.single_product);
route.get('/contact',isblock,controller.contact);
route.get('/about',isblock,controller.about);
route.get('/blog',isblock,controller.blog);
route.get('/shop',isblock,controller.shop);
route.get('/filter/:id',controller.filter);
//search product

route.post('/search_product',isblock,controller.search_product);

route.get('/cart',isblock,controller.userCart)
route.get('/checkout',isblock,controller.checkout);
route.get('/deleteCoupon/', controller.deleteCoupon);
route.get('/deleteCartItem/:id',isblock,controller.deleteCartItem);


route.get("/order/:id",isblock,controller.order_details)
route.post("/returnOrder/:id",isblock,controller.return)

route.get('/signup',controller.signup)
route.get('/order_detail/:id',isblock,controller.orderdetailspage);
route.get('/deleteaddress/:addressId',isblock,controller.deleteAddress); 
route.get('/paypalSuccess/:id',controller.paypal_success)
route.get('/paypal_err',controller.paypal_err)

route.get('/profile',controller.profilePage)
route.get('/profile/:id',controller.profilePage)
route.get('/profileAddressdelete/:addressId',controller.profileAddressDelete)
route.post('/edit_address/:id',controller.updateProfile)


//login
route.post('/login',controller.find_user);
route.post('/api/users',controller.create);

//wishlist 


route.get('/wishlist/:id',controller.addTowishlist)
route.get('/viewWishlist',controller.viewWishlist)
route.get('/deleteWishlist/:id',controller.deleteWishlist)

//order
route.post("/order_cancel/:id",isblock,controller.ordercancel);
route.post('/viewcart',isblock,controller.userCart);
route.post('/addToCart/:id',isblock,controller.addToCart);


//quantity
route.post('/incrementQuantity',isblock ,controller.incrementQuantity);
route.post('/decrementQuantity',isblock, controller.decrementQuantity);

//address
route.post('/addAddress',isblock,controller.addaddress);



//placeOrder
route.post('/placeOrder/:id',isblock, controller.placeOrder);

//coupon

route.post('/coupon',isblock,controller.coupon)

route.post('/verifySignature/:id',isblock,controller.verifyRazorpay)

route.get('/invoice/:id',controller.invoice)

//logout
route.post('/log_out/:id',controller.log_out);




module.exports=route