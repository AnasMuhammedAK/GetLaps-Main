const express = require("express");
const twilio = require("twilio");
const { response } = require("../app");
const router = express.Router();
const userHelpers = require("../helpers/user-helpers");
const flash = require("connect-flash");
const productHelpers = require("../helpers/product-helpers");
const session = require("express-session");
const Razorpay = require("razorpay");
const adminHelpers = require("../helpers/admin-helpers");
const uploads = require("../middle-wares/multer");
const collections = require("../config/collections");
const { searchFilter } = require("../helpers/product-helpers");
require("dotenv").config();
//otp--------------------
const serviceSID = process.env.serviceSID;
const accountSID = process.env.accountSID;
const authToken = process.env.authToken;
const otp = require("twilio")(accountSID, authToken);

//----------------------------------
setInterval(offerCheck, 60000);
function offerCheck() {
  let todayDate = new Date().toISOString().slice(0, 10);
  adminHelpers.startProductOffer(todayDate);
  adminHelpers.endProductOffer(todayDate);
  adminHelpers.startCouponOffer(todayDate);
  adminHelpers.startCategoryOffer(todayDate)
  adminHelpers.endCateOffer(todayDate)
}
var filterResult
const veryfyUserLogin = (req, res, next) => {
  // res.header(
  //   "Cache-Control",
  //   "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0"
  // );
  if (req.session.userLoggedIn) {
    let userId = req.session.user._id;
    userHelpers.getUser(userId).then((user) => {
      console.log("In verify login");
      if (user) {
        if (user.block !== true) {
          next();
        } else {
          // req.flash("msg", user.fullname + "blocked by admin")
          req.session.user = null;
          req.session.userLoggedIn = false;
          res.redirect("/login");
        }
      } else {
        console.log("no user");
        // req.flash("msg", "User Does't Exist")
        req.session.user = null;
        req.session.userLoggedIn = false;
        res.redirect("/login");
      }
    });
  } else {
    // req.flash("msg", "You Need To Login ")
    res.redirect("/login");
  }
};

//login
router.get("/", veryfyUserLogin, (req, res) => {
  productHelpers.getAllBrands().then((brands) => {
    productHelpers.getnewProduct().then((newProducts) => {
      userHelpers.getCartCount(req.session.user._id).then(async (cartCount) => {
        let wishCount = await userHelpers.getWishCount(req.session.user._id);
        let banners = await adminHelpers.getBanners()
        let posters1 = await adminHelpers.getPosters1()
        let posters2 = await adminHelpers.getPosters2()
        let gamingLap = await productHelpers.getGamingLap()
        res.render("users/home", {
          userData: req.session.user,
          brands,
          newProducts,
          cartCount,
          wishCount,banners,posters1,posters2,gamingLap
        });
      });
    });
  });
});
router.get("/login", function (req, res, next) {
  if (req.session.userLoggedIn) {
    res.redirect("/");
  } else {
    let signupAlert = req.flash("signupData");
    let blockErr = req.flash("err");
    let loginErr = req.flash("err");
    res.render("users/login", {
      loginErr,
      signupAlert,
      blockErr,
    });
  }
});

router.post("/login", function (req, res, next) {
  userHelpers.doLogin(req.body).then((response) => {
    console.log(response);

    if (response.status) {
      if (response.user.block) {
        req.flash("err", "Blocked By Admin!..");
        res.redirect("/login");
        res.render("users/login", { err: "User Blocked By Admin" });
      } else if (!response.user.block) {
        req.session.userLoggedIn = true;
        req.session.user = response.user;
        req.session.userBlock = response.user.block;

        res.redirect("/");
      }
    } else {
      req.flash("err", response.msg);

      res.redirect("/login");
    }
  });
});

//signup
router.get("/signup", function (req, res) {
  let error = req.flash("msg");
  res.render("users/signup", { error });
});

router.post("/register", (req, res) => {
  userHelpers
    .findUserExist(req.body)
    .then(() => {
      req.session.user = req.body;
      req.session.userMobile = req.body.mobile;
      otp.verify
        .services(serviceSID)
        .verifications.create({
          to: `+91${req.body.mobile}`,
          channel: "sms",
        })
        .then((response) => {
          res.status(200).json({ response });
        });

      res.redirect("/otp-verification");
    })
    .catch((err) => {
      console.log(err);

      req.flash("msg", err.msg);
      res.redirect("/signup");
    });
});
//otp-verification

router.get("/otp-verification", function (req, res, next) {
  if (req.session.userLoggedIn) {
    res.redirect("/");
  }
  res.render("users/otp-verification", { userMobile: req.session.userMobile });
});
router.post("/otp-checking/:mobile", (req, res) => {
  console.log(req.body);
  console.log(req.params.mobile);

  otp.verify
    .services(serviceSID)
    .verificationChecks.create({
      to: `+91${req.params.mobile}`,
      code: req.body.otp,
    })
    .then((response) => {
      console.log(response);
      if (response.valid) {
        userHelpers.doSignup(req.session.user).then((response) => {
          if (response.status) {
            req.flash("signupData", "Data Inserted Sccessfully!..");
            res.redirect("/login");
          }
        });
      } else {
        req.session.userLoggedIn = false;
        res.redirect("/otp-verification");
      }
    });
});

//forgot password
router.get("/forgot-password", (req, res) => {
  let err = req.flash("msg");
  res.render("users/forgot-password", { err });
});
router.post("/forgotPassword", (req, res) => {
  userHelpers
    .checkValidMobile(req.body)
    .then((response) => {
      if (response.status) {
        otp.verify
          .services(serviceSID)
          .verifications.create({
            to: `+91${req.body.mobile}`,
            channel: "sms",
          })
          .then((response) => {
            res.render("users/reset-password-otp", {
              userMobile: req.body.mobile,
            });
            res.status(200).json({ response });
          });
      }
    })
    .catch((err) => {
      req.session.numErr = err.msg;

      console.log("hello here");
      console.log(err);
      req.flash("msg", err.msg);
      res.redirect("/forgot-password");
    });
});

router.post("/resetPasswordOtp/:mobile", (req, res) => {
  otp.verify
    .services(serviceSID)
    .verificationChecks.create({
      to: `+91${req.params.mobile}`,
      code: req.body.otp,
    })
    .then((response) => {
      console.log(response);
      if (response.valid) {
        res.render("users/new-password", { userMobile: req.params.mobile });
      } else {
        res.redirect("/forgot-password");
      }
    });
});
router.post("/newPassword/:mobile", (req, res) => {
  userHelpers
    .updatePassword(req.params.mobile, req.body.password)
    .then((response) => {
      res.redirect("/login");
    });
});
//add to cart
router.get("/add-tocart/:id", async(req, res) => {
 
  userHelpers
    .addToCart(req.params.id, req.session.user._id)
    .then((response) => {
      
      res.json(response);
    });
});
//cart view
router.get("/cart", veryfyUserLogin, async (req, res) => {
  let products = await userHelpers.getCartproducts(req.session.user._id);
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  let wishCount = await userHelpers.getWishCount(req.session.user._id);
  let discount = 0;
  let total = 0;
  let subTotal = 0;
  console.log(products);
  if (products.length > 0) {
    products.forEach((row) => {
      discount += row.quantity * row.product.discound;
    });
    total = await userHelpers.getTotalAmount(req.session.user._id);
  }

  res.render("users/cart", {
    userData: req.session.user,
    products,
    cartCount,
    total,
    discount,
    wishCount,
  });
});
router.post("/changeProductQuandity/:id", (req, res, next) => {
  let proId = req.body.product;
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.params.id);
    response.subTotal = await userHelpers.getTotalAmountForOneProduct(
      req.params.id,
      proId
    );
    let products = await userHelpers.getCartproducts(req.session.user._id);
    let discount = 0;

    products.forEach((row) => {
      discount += row.quantity * row.product.discound;
    });

    response.discount = discount;

    console.log(response);
    res.json(response);
  });
});
//add to wishlist
router.get("/addToWishlist/:id", (req, res) => {
  console.log("hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii");
  userHelpers
    .addToWishlist(req.params.id, req.session.user._id)
    .then((response) => {
      res.json(response);
    });
});
//add to cart from wishlist
router.get("/addToCart/:id", (req, res) => {
  console.log("hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii");
  userHelpers
    .addToCart(req.params.id, req.session.user._id)
    .then((response) => {
      console.log(response);
      userHelpers
        .removeProduct(req.params.id, req.session.user._id)
        .then(() => {
          res.json(response);
        });
    });
});
//whishlist

router.get("/wishlist", veryfyUserLogin, async (req, res) => {
  let products = await userHelpers.getWishlistproducts(req.session.user._id);
  console.log(products);
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  let wishCount = await userHelpers.getWishCount(req.session.user._id);
  res.render("users/wishlist", {
    userData: req.session.user,
    cartCount,
    products,
    wishCount,
  });
});
//removeWishProducts
router.get("/removeWishProduct/:id", (req, res) => {
  userHelpers.removeProduct(req.params.id, req.session.user._id).then(() => {
    res.redirect("/wishlist");
  });
});
//shopping
router.get("/shopping", veryfyUserLogin, async (req, res) => {
  let brands = await productHelpers.getAllBrands();
  let wishCount = await userHelpers.getWishCount(req.session.user._id);
  console.log(brands);
  let categories = await productHelpers.getAllCategory();
  // productHelpers.getAllProduct().then((products) => {
    userHelpers.getCartCount(req.session.user._id).then((cartCount) => {
      res.render("users/shop", {
        userData: req.session.user,
        filterResult,
        cartCount,
        brands,
        categories,
        wishCount,
      });
    });
  // });
});
//view product details
router.get("/view-products/:id", veryfyUserLogin, async (req, res) => {
  let product = await productHelpers.getOneProductDetails(req.params.id);
  let wishCount = await userHelpers.getWishCount(req.session.user._id);
  userHelpers.getCartCount(req.session.user._id).then((cartCount) => {
    res.render("users/view-product", {
      userData: req.session.user,
      cartCount,
      product,
      wishCount,
    });
  });
});
//dlete product from cart
router.post("/deleteCartProduct", (req, res) => {
  userHelpers.deleteCartProduct(req.body).then((response) => {
    res.json(response);
  });
});
//place order
router.get("/place-order", veryfyUserLogin, (req, res) => {
  userHelpers.getCartCount(req.session.user._id).then((cartCount) => {
    userHelpers.getTotalAmount(req.session.user._id).then(async (total) => {
      let products = await userHelpers.getCartproducts(req.session.user._id);
      let address = "";
      let addresses = await userHelpers.getUserAddress(req.session.user._id);
      if (addresses) {
        address = addresses;
      }
      let wishCount = await userHelpers.getWishCount(req.session.user._id);
      let coupons = await adminHelpers.getAllAvailabeCoupons();
      console.log(coupons);
      console.log(total);
      res.render("users/checkout", {
        userData: req.session.user,
        cartCount,
        total,
        products,
        address,
        coupons,
        wishCount,
      });
    });
  });
});
router.post("/placeOrder", async (req, res) => {
  //console.log(req.body)
  let products = await userHelpers.getCartproductsList(req.body.userId);
  products.forEach((x) => {
    x.status = "Ordered";

  });
  if (req.session.couponTotal) {
    var totalPrice = req.session.couponTotal;
  } else {
    totalPrice = await userHelpers.getTotalAmount(req.body.userId);
  }
  userHelpers.checkStock(products).then((response) => {
    if (response.stockout) {
      res.json({ stockout: true });
    } else {
      userHelpers
        .placeOrder(req.body, products, totalPrice,req.session.couponTotal)
        .then((response) => {
          console.log(
            "checkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk"
          );
          req.session.orderId = response.insertedId.toString();
          console.log("order id" + req.session.orderId);
          userHelpers.stockChanger(req.session.orderId).then((response) => {
            
              if (req.body["paymentMethod"] === "cod") {
                res.json({ codSuccess: true });
              } else if (req.body["paymentMethod"] === "razorpay") {
                userHelpers
                  .generateRazorpay(req.session.orderId, totalPrice)
                  .then((order) => {
                    console.log(order);
                    
                    res.json(order);
                  });
              }
            
          });
        });
    }
  });
});
//verify payment
router.post("/verify-payment", (req, res) => {
  console.log("koooooooooooooooooooooyyyyyyyyyyyyyyyyyyyyyyyy")
  console.log(req.body);
  userHelpers
    .verifyPayment(req.body)
    .then(() => {
      userHelpers.changePaymentStatus(req.body["order[receipt]"]).then(() => {
        console.log("payment successfull");
        res.json({ status: true });
      });
    })
    .catch((err) => {
      console.log(err);
      res.json({ status: false, msg: "payment failed" });
    });
});
//order compleated
router.get("/order-compleated", veryfyUserLogin, async (req, res) => {
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  let wishCount = await userHelpers.getWishCount(req.session.user._id);
  res.render("users/order-alert", {
    userData: req.session.user,
    cartCount,
    wishCount,
  });
});
//orders
router.get("/orders", veryfyUserLogin, async (req, res) => {
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  let orders = await userHelpers.getAllOrders(req.session.user._id);
  let wishCount = await userHelpers.getWishCount(req.session.user._id);
  res.render("users/orders-table", {
    userData: req.session.user,
    orders,
    cartCount,
    wishCount,
  });
});

//view ordered product details
router.get("/view-order-products/:id", veryfyUserLogin, async (req, res) => {
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  let products = await userHelpers.getOrderProducts(req.params.id);
  let wishCount = await userHelpers.getWishCount(req.session.user._id);
  let order = await userHelpers.getOneOrderData(req.params.id);
  res.render("users/ordered-products", {
    userData: req.session.user,
    products,
    cartCount,
    wishCount,
    order,
  });
});
///cancelOrder
router.get("/cancelOrder/:id", (req, res) => {
  adminHelpers.cancelOrder(req.params.id, req.query.refund,"Cancelled").then(() => {
    res.redirect("/orders");
  });
});

//Coupon validation
router.post("/couponApply", (req, res) => {
  let todayDate = new Date().toISOString().slice(0, 10);
  adminHelpers.startProductOffer(todayDate);
  adminHelpers.endProductOffer(todayDate);
  adminHelpers.startCouponOffer(todayDate);
  let userId = req.session.user._id;
  adminHelpers.validateCoupon(req.body, userId).then((response) => {
    console.log(response);
    req.session.couponTotal = response.total
    if (response.success) {
      res.json({ couponSuccess: true, total: response.total });
    } else if (response.couponUsed) {
      res.json({ couponUsed: true });
    } else if (response.couponExpired) {
      res.json({ couponExpired: true });
    } else if (response.couponMaxLimit) {
      res.json({ couponMaxLimit: true });
    } else {
      res.json({ invalidCoupon: true });
    }
  });
});
//profile view
router.get("/profile", veryfyUserLogin, async (req, res) => {
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  let wishCount = await userHelpers.getWishCount(req.session.user._id);
  let proPic = "";
  let propic = await userHelpers.getProPic(req.session.user._id);
  if (propic) {
    proPic = propic;
  }
  alert = req.flash("msg");
  res.render("users/profile", {
    cartCount,
    userData: req.session.user,
    proPic,
    alert,
    wishCount,
  });
});
//adress view
router.get("/address", async (req, res) => {
  let wishCount = await userHelpers.getWishCount(req.session.user._id);
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  let proPic = "";
  let propic = await userHelpers.getProPic(req.session.user._id);
  if (propic) {
    proPic = propic;
  }
  let address = "";
  let addresses = await userHelpers.getUserAddress(req.session.user._id);
  if (addresses) {
    address = addresses;
  }
  res.render("users/address", {
    userData: req.session.user,
    cartCount,
    address,
    proPic,
    wishCount,
  });
});
//adress view
router.get("/add-address", async (req, res) => {
  let wishCount = await userHelpers.getWishCount(req.session.user._id);
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  let proPic = "";
  let propic = await userHelpers.getProPic(req.session.user._id);
  if (propic) {
    proPic = propic;
  }
  res.render("users/add-address", {
    userData: req.session.user,
    cartCount,
    proPic,
    wishCount,
  });
});
router.post("/add-address/:id", (req, res) => {
  userHelpers.addUserAddress(req.params.id, req.body).then(() => {
    res.redirect("/address");
  });
});
//edit address
router.get("/edit-address/:id", async (req, res) => {
  let addressId = req.params.id;
  let userId = req.session.user._id;
  let address = await userHelpers.getOneAddress(userId, addressId);
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  let wishCount = await userHelpers.getWishCount(req.session.user._id);
  console.log(address[0].address);
  let proPic = "";
  let propic = await userHelpers.getProPic(req.session.user._id);
  if (propic) {
    proPic = propic;
  }
  res.render("users/edit-address", {
    userData: req.session.user,
    cartCount,
    address: address[0].address,
    proPic,
    wishCount,
  });
});
router.post("/edit-address/:id", (req, res) => {
  let userId = req.session.user._id;
  let addressId = req.params.id;
  let data = req.body;
  userHelpers.updateUserAddress(userId, addressId, data).then(() => {
    res.redirect("/address");
  });
});
//delete address
router.get('/delete-address/:id',(req,res)=>{
  
  userHelpers.deleteAddress(req.session.user._id,req.params.id).then(()=>{
    console.log('liiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii')  
    res.redirect('/address')
  })
})
///changePassword
router.post('/changePassword',(req,res)=>{
  userHelpers.changePassword(req.session.user._id,req.body).then((response)=>{
    if(response.status){
      req.flash('msg',response.msg)
      res.redirect('/profile')
    }else{
      req.flash('msg',response.msg)
      res.redirect('/profile')
    }
  })
})
//search results
router.post("/getSearchProducts",async (req, res) => {
  let key = req.body.key;
  filterResult = await userHelpers.getSearchProducts(key)
  res.redirect('/shopping')
  
});
//filter
//filter by brands
router.get("/productBrand/:id", async (req, res) => {
  let key = req.params.id;
  filterResult = await productHelpers.getProbrands(key)
  res.redirect('/shopping')
});
//filter by categories
router.get("/productCategory/:id", async (req, res) => {
  let key = req.params.id;
  filterResult = await productHelpers.getProCategory(key)
  res.redirect('/shopping')
});
//changeProPic
router.post("/changeProPic", uploads.single("propic"), (req, res) => {
  console.log(req.file);
  let imageId = req.file.filename;
  userHelpers.updateProPic(req.session.user._id, imageId).then(() => {
    req.flash("msg", "Image Uploaded");
    res.redirect("/profile");
  });
});

//invoice
router.get('/invoice/:oId',  async (req, res) => {
  let orderId = req.params.oId
  let userData = req.session.user
  let cartCount = await userHelpers.getCartCount(req.session.user._id);
  let products = await userHelpers.getOrderProducts(orderId);
  let wishCount = await userHelpers.getWishCount(req.session.user._id);
  let order = await userHelpers.getOneOrderData(orderId)
  res.render('users/invoice', { order, userData, cartCount,products,wishCount})
})
// filter
// shopping section
router.get('/shop', async (req, res) => {
  const user = req.session.user
  filterResult = await productHelpers.getAllProduct()
res.redirect('/shopping')
})

router.post('/filter-results', (req, res) => {
  console.log(req.body);
  let data = req.body
  let price = parseInt(data.price)
  let filter = []
  for (let i of data.brand) {
    filter.push({ 'brand': i })
  }
  for (let i of data.category) {
    filter.push({ 'category': i })
  }
  productHelpers.searchFilter(filter, price).then((result) => {
    filterResult = result
    res.json({ status: true })
  })
  console.log(filter);
})


//Logout
router.get("/logout", (req, res) => {
  req.session.user = null;
  req.session.userLoggedIn = false;

  res.redirect("/login");
});
module.exports = router;
