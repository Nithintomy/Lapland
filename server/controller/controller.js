
const bcrypt = require('bcrypt')
const UserSchema = require('../model/model')
const productSchema = require('../model/product_model')
const categorySchema = require('../model/add_category')
const mongoose = require('mongoose')
const cartSchema =require('../model/cart')
const order_model = require('../model/order')
const couponSchema = require('../model/coupon')
const bannerSchema=require('../model/banner')
const walletSchema =require('../model/wallet_model')
const Wishlist = require('../model/wishlist');
const paypal=require('paypal-rest-sdk')
const Razorpay = require("razorpay");

const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_ID_KEY,
  key_secret: process.env.RAZORPAY_SECRET_KEY,
});


require('dotenv').config();


exports.login = (req, res) => {
    res.render("login");
  };
  exports.signup=(req,res)=>{
    res.render("signUp")
  }
 
// index
exports.index= async(req,res)=>{
  product = await productSchema.find().limit(4);
  banners=await bannerSchema.find();
  if(req.session.authorized){
    const User = req.session.user
    
    // product = await productSchema.find().limit(4);
    res.render('index',{User,product,banners});
  }else{
    // const product = await productSchema.find().limit(4)
    res.render('index', { product });
  }

}


//add addrress
exports.addaddress = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { name, address, phone, pincode, city, email } = req.body;

    // Find the user by a specific identifier
    const User = await UserSchema.findOne({ _id: userId });

    
    if (!User) {
      res.status(404).send('User not found.');
      return;
    }
  
    // Push the new address data to the existing address array
    User.address.push({ name, address, phone, pincode, city, email });

    // Save the updated user document
    await User.save();

    // Retrieve the additional data needed for rendering the checkout page
  
  
    const cart = await cartSchema.findOne({ userId: userId }).populate('products.productId');

    if (cart) {
      const products = cart.products;
      let subtotal = 0;
      for (const product of products) {
        subtotal += product.productId.price * product.quantity;
      }

      // Render the checkout page with the necessary data
      res.redirect("/checkout")
    } else {
      res.redirect("/checkout");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error finding/updating user.');
  }
};





exports.deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.addressId;
    console.log(addressId);
    const userId = req.session.user?._id;
    console.log(userId);
    const address = await UserSchema.findOneAndUpdate(
      { _id: userId },
      { $pull: { address: { _id: addressId } } },
      { new: true }
    );
   

    if (address) {
      res.redirect("/checkout");
    } else {
      console.log("Address not deleted");
      res.redirect("/cart");
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Server Error");
  }
};




//signup


// single product

exports.single_product = async (req, res) => {
  try {
    const product_id = req.params.id;
    console.log(product_id);
    if (!mongoose.Types.ObjectId.isValid(product_id)) {
      return res.status(400).send('Invalid product ID');
    }

    const product = await productSchema.findById(product_id);

    if (!product) {
      return res.status(404).send('Product not found');
    }

    // Check stock availability for the product
    if (product.quantity <= 0) {
      // If stock is empty, mark the product as out of stock
      product.outOfStock = true;
      await product.save(); // Update the product in the database
    }

    const User = req.session.user;

    const products = await productSchema.find().skip(4).limit(4);
    console.log(products,"products here")

    res.render('single_product', { User, product, products:products|| [] });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }
};


exports.shop = async (req, res) => {
  try {
    const { category, sortBy } = req.query;

    let products;
    const Category = await categorySchema.find();
    const User = req.session.user;

    const perPage = 8; // Number of products per page
    const currentPage = parseInt(req.query.page) || 1; // Current page number

    // Calculate total number of products and pages
    const totalProducts = category ? await productSchema.countDocuments({ category }) : await productSchema.countDocuments();
    const totalPages = Math.ceil(totalProducts / perPage);

    if (category) {
      products = await productSchema.find({ category })
        .sort({ price: sortBy === 'low-to-high' ? 1 : -1 })
        .skip((perPage * currentPage) - perPage)
        .limit(perPage);
    } else {
      products = await productSchema.find()
        .sort({ price: sortBy === 'low-to-high' ? 1 : -1 })
        .skip((perPage * currentPage) - perPage)
        .limit(perPage);
    }

    res.render("shop", { products, Category, User, totalPages, currentPage });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Internal server error" });
  }
};



exports.filter = async (req, res) => {
  try {
      const id = req.params.id;
      const category = req.query.category;
      const categories = await categorySchema.findOne({ _id: id });
      const products = await productSchema.find({ category_name: categories.category });
      console.log(categories);

      const Category = await categorySchema.find();
      const User = req.session.user;

      const perPage = 4; // Number of products per page
      const totalProducts = category ? await productSchema.countDocuments({ category }) : await productSchema.countDocuments();
      const totalPages = Math.ceil(totalProducts / perPage);

      res.render("shop", { products, Category, User, totalPages,currentPage: 1 }); // Pass the totalPages and currentPage variables
  } catch (error) {
      console.log(error);
      res.status(500).send({ error: "Internal server error" });
  }
};



exports.checkout = async (req, res) => {
  const User = req.session.user;

  try {
    const userId = req.session.user?._id;
    const data = await UserSchema.findOne({ _id: userId });

    const coupon = await couponSchema.find();
    const cart = await cartSchema.findOne({ userId: userId }).populate("products.productId");

    if (!cart) {
      throw new Error("Cart not found");
    }

    const items = cart.products.map((item) => {
      const product = item.productId;
      const quantity = item.quantity;
      const price = product.price;

      if (!price) {
        throw new Error("Product price is required");
      }
      if (!product) {
        throw new Error("Product is required");
      }

      return {
        product: product._id,
        quantity: quantity,
        price: price,
      };
    });

    let totalPrice = 0;
    items.forEach((item) => {
      totalPrice += item.price * item.quantity;
    });

    // Check if a coupon code was applied
    const appliedCoupon = req.session.couponCode;
    let discount = 0;
    let discountMsg = '';

    if (appliedCoupon) {
      const cartWithCoupon = await cartSchema.findOne({
        userId: userId,
        couponCode: appliedCoupon,
      });

      if (cartWithCoupon) {
        discountMsg = 'Coupon has already been applied';
      } else {
        const coupon = await couponSchema.findOne({ code: appliedCoupon });

        if (coupon && coupon.status) {
          // Calculate the discount based on the coupon percentage or amount
          if (coupon.discountType === 'percentage') {
            discount = (coupon.discount / 100) * totalPrice;
          } else if (coupon.discountType === 'amount') {
            discount = coupon.discount;
          }

          // Update the discount message
          discountMsg = `Coupon "${appliedCoupon}" applied. You saved ₹${discount.toFixed(2)}`;

          // Save the applied coupon code to the cart
          cart.couponCode = appliedCoupon;
          await cart.save();
        } else {
          discountMsg = 'Invalid coupon code';
        }
      }
    }

    const totalAfterDiscount = totalPrice - discount;

    const products = cart.products;
    cart.total = totalAfterDiscount;

    // Check if the user needs to add balance to apply the coupon
    const balanceRequired = 40000;
    const balanceMsg = totalPrice >= balanceRequired ? null : `You need to add ₹${balanceRequired - totalPrice} to apply this coupon`;

    req.session.discountMsg = discountMsg;
    req.session.balanceMsg = balanceMsg;

    await cart.save();

    res.render("checkout", { User, coupon, products, cart, data: data.address, discountMsg, balanceMsg });
  } catch (error) {
    console.error(error);
    res.status(500).send("Some error occurred");
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const couponId = req.params.id;

    // Remove the coupon from the user model
    const user = await UserSchema.findOne({ _id: userId });
    user.coupon = null; // Assuming the coupon field in the user model is named 'coupon'
    await user.save();

    // Remove the coupon from the cart products
    const cart = await cartSchema.findOne({ userId: userId }).populate("products.productId");
    if (cart) {
      cart.products.forEach((item) => {
        if (item.productId.coupon === couponId) {
          item.productId.coupon = null;
        }
      });
      await cart.save();
    }

    res.redirect("/checkout"); // Redirect to the checkout page or any other desired page
  } catch (error) {
    console.error(error);
    res.status(500).send("Some error occurred");
  }
};


exports.return = async (req, res) => {
  const User = req.session.user;
  const userId = req.session.user?._id;
  try {
    const orderId = req.params.id;

    await order_model.findByIdAndUpdate(orderId, {
      reason: req.body.reason,
      status: "Returned",
    });

    const order_data = await order_model.find({ user: orderId });
    console.log(orderId, "fnwenfjefjkewf");

    // res.render("orders", { order_data, User });
    res.redirect(`/order/${userId}`);
  } catch (error) {
    console.log(error);
  }
};





exports.contact = (req, res) => {
  const User=req.session.user
    res.render("contact",{User});
  };
  //payment
exports.payment = async (req, res) => {
  const User = req.session.user
  try{

    const id = req.params.id
    const userId = req.session.user?._id
    const cart = await cartSchema.findOne({ userId: userId }).populate(
      "products.productId")
    const user = await UserSchema.findOne(
      { _id: userId},
      { address: { $elemMatch: { _id: id } } }
    );
if(user){
  const products = cart.products
  let subtotal = 0;
  for (const product of products) {
    subtotal += product.productId.price * product.quantity;
  }

   const address = user.address[0]

    res.render("payment",{address,subtotal,User});
    }
  }
  catch (error) {
    console.error(error);
    res.status(500).send('Some Error occurred') 
};
}

exports.blog = (req, res) => {
  const User = req.session.user 
    res.render("blog",{User});
  };


  exports.about = (req, res) => {
    const User = req.session.user
    res.render("about",{User});
  };




let paypalTotal = 0;


exports.placeOrder = async (req, res) => {
  if (req.session.user) {
    try {
      const payment = req.body.payment_method;
      console.log(payment,"i am payment")
      const User = req.session.user;
      const userId = req.session.user?._id;
      const id = req.params.id;

      const cartdisc = await cartSchema.findOne({ userId: userId });
      const userModel = await UserSchema.findById(userId);
      const addressIndex = userModel.address.findIndex((item) => item._id.equals(id));
      const specifiedAddress = userModel.address[addressIndex];
      const wallet = await walletSchema.findOne({ userId: userId });

      const cart = await cartSchema.findOne({ userId: userId }).populate("products.productId");
      cart ? console.log(cart) : console.log("Cart not found");

      const items = cart.products.map((item) => {
        const product = item.productId;
        const quantity = item.quantity;
        const price = product.price;

        if (!price) {
          throw new Error("Product price is required");
        }
        if (!product) {
          throw new Error("Product is required");
        }

        return {
          product: product._id,
          quantity: quantity,
          price: price,
        };
      });

      console.log(items);

      let totalPrice = cartdisc.total - cartdisc.discount;
      console.log(totalPrice, "book now");
        if (payment === "COD"||payment === "wallet") {
     
      
          const order = new order_model({
            user: userId,
            items: items,
            discount: cart.discount,
            total: totalPrice,
            status: "Pending",
            payment_method: payment,
            createdAt: new Date(),
            shipping_charge: 50,
            address: specifiedAddress,
          });
    
          await order.save();
          let data = order;
          await cartSchema.deleteOne({ userId: userId });
    
          if(payment === "wallet"){
            const Twallet= wallet.balance-totalPrice;
            await walletSchema.findOneAndUpdate({userId:userId},{balance:Twallet})
          }
    
          res.render("confirm", { User, userId,order, specifiedAddress,cart,payment,data,totalPrice});

    
        }else if (payment === "paypal") {
        console.log("990099");

        const shippingCharge = 150;
        const order = new order_model({
          user: userId,
          items: items,
          total: totalPrice - shippingCharge,
          status: "Pending",
          payment_method: payment,
          createdAt: new Date(),
          shipping_charge: shippingCharge,
          address: specifiedAddress,
        });
        await order.save();

        cart.products.forEach((element) => {
          paypalTotal += totalPrice;
        });

        console.log("createPayment");

        let createPayment = {
          intent: "sale",
          payer: { payment_method: "paypal" },
          redirect_urls: {
            return_url: `http://localhost:3000/paypalSuccess/${userId}`,
            cancel_url: "http://localhost:3000/paypal_err",
          },
          transactions: [
            {
              amount: {
                currency: "USD",
                total: (paypalTotal / 82).toFixed(2), // Divide by 82 to convert to USD
              },
              description: "Super User Paypal Payment",
            },
          ],
        };

        paypal.payment.create(createPayment, function (error, payment) {
          console.log("error", "567");
          if (error) {
            throw error;
          } else {
            for (let i = 0; i < payment.links.length; i++) {
              if (payment.links[i].rel === "approval_url") {
                cartSchema.deleteOne({ userId: userId })
                  .then(() => {
                    res.redirect(payment.links[i].href);
                  })
                  .catch((error) => {
                    console.error("Error deleting cart:", error);
                    // Handle the error accordingly
                  });
              }
            }
          }
        });

       
      } else if (payment === "razorpay") {
        console.log(payment, "razorpay");
      
        const shippingCharge = 150;
        const order = new order_model({
          user: userId,
          items: items,
          total: totalPrice - shippingCharge,
          status: "Pending",
          payment_method: payment,
          createdAt: new Date(),
          shipping_charge: shippingCharge,
          address: specifiedAddress,
        });
        await order.save();
      
        let razorpayTotal = 0;
      
        // Calculate the total amount for Razorpay by multiplying the totalPrice with the quantity for each product
        cart.products.forEach((element) => {
          razorpayTotal += totalPrice * element.quantity;
        });
      
        const options = {
          amount: razorpayTotal * 100, // Multiply by 100 to convert to paise (Razorpay expects amount in paise)
          currency: "INR",
          receipt: "order_receipt",
          payment_capture: 1,
        };
        console.log(razorpayTotal, "total");
      
        try {
          const ordered = await razorpay.orders.create(options);
          if (!ordered || !ordered.id) {
            console.error("Error creating Razorpay order");
            res.status(400).send({ success: false, msg: "Something went wrong!" });
            return;
          }
        
      
          let details = {
            msg: "Order Created",
            order_id: ordered.id,
            amount: razorpayTotal * 100,
            key_id: process.env.RAZORPAY_ID_KEY,
            product_name: cartdisc.name,
            user_data: {
              name: userModel.name,
              email: userModel.email,
              contact: userModel.phone,
            },
          };
          console.log(details.user_data, "name,email");
          console.log(options, "dnWDBWEBNEWB");
          res.json({
            success: true,
            details: details,
            
          });
          await cartSchema.deleteOne({ userId: userId });
        } catch (error) {
          console.error("Error creating Razorpay order:", error);
          res.status(500).send({ success: false, msg: "Something went wrong!" });
        }
      
      }
      
    } catch (error) {
      console.log(error);
      res.status(500).send("Network error");
    }
  } else {
    res.redirect("/");
  }
};

exports.verifyRazorpay =(req,res)=>{
  const {razorpay_payment_id ,razorpay_order_id,razorpay_signature }= req.body.payment
  console.log(razorpay_payment_id,razorpay_order_id,razorpay_signature,"verifying")
  let hmac =crypto.createHmac('sha256',RAZORPAY_SECRET_KEY);
  hmac.update(razorpay_order_id + '|' +razorpay_payment_id);
  hmac=hmac.digest('hex');
  if(hmac===razorpay_signature){
    console.log("payment Successfull");
  }else{
    console.log("Payment failed")
  }
}

exports.invoice= async(req,res)=>{

  try{
    const orderId=req.params.id;
    const order_data = await order_model.findOne({_id: orderId}).populate("user").populate("items.product").populate("items.quantity")
     res.render('invoice',{order_data:order_data})

  }catch(error){
    console.log(error)
    res.status(500).send("Internal Server Error")

  }
}


exports.paypal_success = async (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;
   const userId = req.params.id
   const User = await UserSchema.findById(userId)
   req.session.user=User
  
  const execute_payment_json = {
    "payer_id": payerId,
    "transactions": [{
      "amount": {
        "currency": "USD",
        "total": paypalTotal
      }
    }]
  };
  paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
    //When error occurs when due to non-existent transaction, throw an error else log the transaction details in the console then send a Success string reposponse to the user.
    

    
    if (error) {
      console.log(error.response);
      throw error;
    } else {
      
      // console.log(JSON.stringify(payment));
      console.log(User,"dnbjaehbfeajhbfjv---------------------------")
      res.render("paypalSuccess", { payment, User, userId, })
    }
  });
  
}


exports.paypal_err = (req, res) => {
  console.log(req.query);
  res.send("error")
}

  exports.find_user = async (req, res) => {
    if (!req.body.email || req.body.email.trim() === "" || !req.body.password || req.body.password.trim() === "") {
      // const product = await productSchema.find().limit(4)
      return res.status(400).render("login",{ msg: "Email and password are required."});
    }
    const email = req.body.email;
  
    const password = req.body.password;
  console.log(email,"haahaa");
    try {
      const User = await UserSchema.findOne({ email: email });
  
      if (User) {
        if(User.isBlocked){
          const product = await productSchema.find().limit(4)
          res.render("login",{product, msg: "user is blocked" })
        }else{
          const isMatch = await bcrypt.compare(password, User.password);
  
        if (isMatch) {
          
          req.session.user = User; // Store the user ID in the session
          req.session.authorized = true; 
        User.isLogedin = true;
        await User.save(); // Save the updated user
        
        res.redirect("/index",);
       
        } else {
          const product = await productSchema.find().limit(4)
          res.render("login", {product, msg: "Invalid entry" });
        }
        }
        
      }else{
        const product = await productSchema.find().limit(4)
          res.render("login", {product, msg: "You need to Signup first!" });
      }
    } catch (error) {
      console.error(error);
      res.send("An error occurred while logging in.");
    }
  };


  exports.create = (req, res) => {
    const saltRounds = 10; // You can adjust the number of salt rounds as needed
  
    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
      if (err) {
        res.status(500).send({
          message:
            err.message || "Some error occurred while hashing the password",
        });
        return;
      }
  
      const user = new UserSchema({
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        password: hash,
        confirmPassword:hash
      });
  
      user
        .save()
        .then(() => {
          res.render("login", { msg: "successfully registered" });
        })
        .catch((err) => {
          res.status(500).send({
            message:
              err.message ||
              "Some error occurred while creating a create operation",
          });
        });
    });
  };

//logout
exports.log_out = async (req, res) => {
  const { id } = req.params;
  const User = await UserSchema.findByIdAndUpdate(id, {
    isLogedin: false,
  })
  
    req.session.user = null
    res.redirect("/index")
 
};

exports.userCart = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const User = req.session.user;
    const cart = await cartSchema.findOne({ userId: userId }).populate('products.productId');

    if (cart) {
      const products = cart.products;
      const cartId = cart._id;
      res.render('cart', { User, products, cartId, cart });
    } else {
      res.render('empty_cart', { User });
    }

  } catch (error) {
    console.log(error);
  }
};

exports.addToCart = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    const productId = req.params.id;

    let userCart = await cartSchema.findOne({ userId: userId });
    if (!userCart) {
      const newCart = await new cartSchema({ userId: userId, products: [] });
      await newCart.save();

      userCart = newCart;
    }

    const productIndex = userCart?.products.findIndex(
      (product) => product.productId == productId
    );

    if (productIndex === -1) {
      userCart.products.push({ productId, quantity: 1 });
    } else {
      userCart.products[productIndex].quantity += 1;
    }

    await userCart.save();

  
   
    res.redirect(userCart.products.length > 0 ? '/viewcart' : '/empty_cart');

  } catch (error) {
    console.log(error);
  }
};

exports.deleteCartItem = async (req, res) => {
  try {
    
      const productId = req.params.id
      const userId = req.session.user?._id
      const productDeleted = await cartSchema.findOneAndUpdate(
          {userId: userId},
          {$pull:{ products:{productId: productId}}},
          {new: true}
      )
      if(productDeleted) {
          res.redirect("/viewcart")
      } else {
          console.log("product not deleted");
      }
  } catch (error) {
      console.log(error);
      res.status(500).send("Server Error")
  }
}

exports.incrementQuantity = async (req, res) => {
  const userId = req.session.user?._id;
  const cartId = req.body.cartId;

  try {
    let cart = await cartSchema.findOne({ userId: userId }).populate("products.productId");
    let cartItem = cart.products.find((item) => item.productId._id.equals(cartId));
    let cartIndex = cart.products.findIndex(items=> items.productId.equals(cartId))
    if (!cartItem) {
      return res.status(404).json({ success: false, message: "Cart item not found" });
    }
console.log(cart,"cart")
    cartItem.quantity += 1;
    await cart.save();

    const proId = cart.products[cartIndex].productId._id;
    const pro = await productSchema.findById(proId)
    const remain = pro.quantity-cart.products[cartIndex].quantity
    let mess=""
    if(remain>0){
    mess=remain
    }else{
      mess="out of stock"
    }
    
    const total = cartItem.quantity * cartItem.productId.price;
    const quantity = cartItem.quantity;



    res.json({ success: true, total, quantity,mess });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "Failed to update quantity" });
   }
};

exports.decrementQuantity = async (req, res) => {
  const cartItemId = req.body.cartItemId;
  const userId = req.session.user?._id;
 
  try {
    const cart = await cartSchema.findOne({ userId: userId }).populate("products.productId");
    const cartItem = cart.products.find((item) => item.productId._id.equals(cartItemId));
    let cartIndex = cart.products.findIndex(items=> items.productId.equals(cartItemId))


    if (!cartItem) {
      return res.status(404).json({ success: false, message: "Cart item not found" });
    }
    let mess="";
    if (cartItem.quantity > 1) {
      cartItem.quantity -= 1;

      const proId = cart.products[cartIndex].productId._id;
    const pro = await productSchema.findById(proId)
    const remain = pro.quantity-cart.products[cartIndex].quantity
    console.log(remain,"abwdwebfjhewf")
    
    if(remain>0){
    mess=remain
    }else{
      mess="out of stock"
    }
    

      await cart.save();
    }

    const total = cartItem.quantity * cartItem.productId.price;
    const quantity = cartItem.quantity;

    res.json({ success: true, total, quantity,mess });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update quantity" });
  }
};




//order page
const ITEMS_PER_PAGE = 10;

exports.order_details = async (req, res) => {
  const User = req.session.user;
  try {
    const id = req.params.id;
    const page = req.query.page || 1; // Get the page number from the query parameters, default to 1 if not provided

    const totalOrders = await order_model.countDocuments({ user: id });
    const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE); // Calculate the total number of pages

    const order_data = await order_model
      .find({ user: id })
      .populate("items.product")
      .populate("items.quantity")
      .skip((page - 1) * ITEMS_PER_PAGE) // Skip the appropriate number of orders based on the current page
      .limit(ITEMS_PER_PAGE); // Limit the number of orders per page

    res.render("orders", { order_data, User, totalPages, currentPage: page });
  } catch (error) {
    console.error(error);
    res.send({ message: error.message });
  }
};


//order cancel
exports.ordercancel = async (req, res) => {
  try {
    const id = req.session.user?._id
    const orderId = req.params.id;
    const cancelled ="cancelled"
    // Update the order using findByIdAndUpdate
    await order_model.findByIdAndUpdate(orderId, { status: cancelled });
    const order_data = await order_model.find({user:id}).populate("items.product").populate("items.quantity")
    res.render('orders',{order_data});
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

// order details
exports.orderdetailspage = async (req, res) => {
  const User = req.session.user;
  try {
    const id = req.params.id;

    const order_data = await order_model
      .findOne({ _id: id })
      .populate("user")
      .populate("items.product")
      .populate("items.quantity");
      
    res.render('order_detail', { order_data, User, createdAt: order_data.createdAt });

  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}

//search
exports.search_product = async (req, res) => {
  try {
    const pro = req.body.product;
    console.log(pro, "dnbsjvsedv");
    const perPage = 4; // Number of products per page
    const page = parseInt(req.query.page) || 1; // Current page number

    const products = await productSchema.find({ name: { $regex: new RegExp(pro, 'i') } })
      .skip((perPage * page) - perPage)
      .limit(perPage);

    const totalProducts = await productSchema.countDocuments({ name: { $regex: new RegExp(pro, 'i') } });
    const totalPages = Math.ceil(totalProducts / perPage);

    const Category = await categorySchema.find();
    const User = req.session.user;
    const product = await productSchema.find();

    if (products.length > 0) {
      res.render('shop', { User, Category, product, products, totalPages, currentPage: page });
    } else {
      res.render('shop', { User, Category, product, message: "There are no products" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};



exports.coupon = async (req, res) => {
  try {
    const user_id = req.session.user?._id;
    const code = req.body.coupon;

    const coupon = await couponSchema.findOne({ code: code });

    if (coupon) {
      const currentDate = new Date();
      const expDate = new Date(coupon.date);

      const User = await UserSchema.findById(user_id);
      const couponIndex = User.coupons.findIndex((item) => item === code);
      const foundCoupon = User.coupons[couponIndex];

      if (currentDate > expDate) {
        req.session.couponMsg = "The coupon has expired.";
        return res.redirect("/checkout");
      } else if (foundCoupon && coupon.status) {
        req.session.couponMsg = "The coupon is already activated.";
        return res.redirect("/checkout");
      } else if (!coupon.status) {
        req.session.couponMsg = "The coupon is deactivated.";
        return res.redirect("/checkout");
      } else {
        const cart = await cartSchema
          .findOne({ userId: user_id })
          .populate("products.productId");

        const items = cart.products.map((item) => {
          const product = item.productId;

          if (!product) {
            throw new Error("Product is required");
          }

          return {
            product: product._id,
          };
        });

        if (cart.total < 40000) {
          const balance = 40000 - cart.total;
          req.session.discountMsg = `You need to add ₹${balance} to apply this coupon.`;
          return res.redirect("/checkout");
        }

        const discount = cart.total * (coupon.discount / 100);
        await cartSchema.findOneAndUpdate({ userId: user_id }, { discount: discount });

        if (!foundCoupon) {
          User.coupons.push(coupon.code);
          await User.save();
        }

        return res.redirect("/checkout");
      }
    } else {
      req.session.couponMsg = "Invalid coupon code.";
      return res.redirect("/checkout");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

//wishlist

exports.wishlist = async (req, res) => {


  try {
    const product_id = req.params.id;
    const User = req.session.user;
    console.log(product_id);
    if (!mongoose.Types.ObjectId.isValid(product_id)) {
      return res.status(400).send('Invalid product ID');
    }

    const product = await productSchema.findById(product_id);

    if (!product) {
      return res.status(404).send('Product not found');
    }

 

    const products = await productSchema.find().skip(4).limit(4);
    console.log(products,"products here")

    res.render('wishlist', { User, product, products:products|| [] });
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }
};
exports.viewWishlist = async (req, res) => {
  const userId = req.session.user?._id;
  const User = req.session.user;

  try {
    const wishlist = await Wishlist.findOne({ userId: userId }).populate('products');
console.log(wishlist,"bnebvrb")
    res.render('wishlist', { User, wishlist });
    
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }
};


exports.addTowishlist = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const productId = req.params.id;

    const wishlist = await Wishlist.findOne({ userId: userId });
    if (!wishlist) {
      // If the wishlist doesn't exist for the user, create a new one
      const newWishlist = new Wishlist({ userId: userId, products: [] });
      await newWishlist.save();
      
    }

    // Check if the product is already in the wishlist
    const isProductInWishlist = wishlist.products.includes(productId);
    console.log(isProductInWishlist,"ok product list")
    if (!isProductInWishlist) {
      // If the product is not already in the wishlist, add it
      wishlist.products.push(productId);
      await wishlist.save();
      console.log(wishlist,"wwjff")
    }

    res.redirect('/shop');
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }
};

//delete wishlist 

exports.deleteWishlist = async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.session.user?._id;

    const wishlistDeleted = await Wishlist.findOneAndUpdate(
      { userId: userId },
      { $pull: { products: { _id: productId } } },
      { new: true }
    );

    if (wishlistDeleted) {
      res.redirect("/viewWishlist");
    } else {
      console.log("Product not deleted");
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Server Error");
  }
};



//profile
exports.profilePage = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const User = req.session.user;
   
    console.log(User,"mjvevejebhfhj")
    const wallet = await walletSchema.findOne({ userId: userId });
 
    const data = await UserSchema.findOne({ _id: userId });

    if (!data) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const address = data.address[0]; // Fetch the first address

    res.render('profile', { User, address, wallet ,data: data.address });
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};


exports.updateProfile = async (req,res)=>{
  const userId =req.session.user ?._id;
  const User = req.session.user;
  const {name,email,phone,address,pincode,city}= req.body
  try {
    // Find the user by ID and update the profile details
    const wallet = await walletSchema.findOne({ userId: userId });

    const data = await UserSchema.findOne({ _id: userId });
    const user = await UserSchema.findByIdAndUpdate(
      userId,
      {
       
        address: {
          name: name,
          email: email,
          phone: phone,
          address: address,
          pincode: pincode,
          city: city
        }
      },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.render('profile',{User,data,wallet,data: data.address });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
}

// Update the profile picture route
exports.updateProfilePicture = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { file } = req;

    if (!file) {
      res.status(400).send('No image file provided.');
      return;
    }

    // Update the user document with the path to the uploaded image
    const user = await UserSchema.findOne({ _id: userId });
    user.profilePicture = file.path;
    await user.save();

    res.redirect('/profile');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

