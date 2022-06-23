const express = require("express");
const { Result, body } = require("express-validator");
const router = express.Router();
const uploads = require("../middle-wares/multer");
const multer = require("multer");
const productHelpers = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-helpers");
const adminHelpers = require("../helpers/admin-helpers");
const { response } = require("../app");
const moment = require("moment");
const { single } = require("../middle-wares/multer");

let veryfyAdminLogin = (req, res, next) => {
  if (req.session.adminLoggedIn) {
    next();
  } else {
    res.redirect("/admin");
  }
};
let verfyAdmin= async(req,res,next)=>{
  let admin=await adminHelpers.check()
  if(admin){
    res.redirect('/')
  }else{
    next()
  }
}
/* GET Admin page. */
router.get("/home", veryfyAdminLogin, async(req, res) => {
  let orders=await adminHelpers.getLastOrders()
  let products=await productHelpers.getNewProducts()
  let users=await userHelpers.getNewUsers()
  res.render("admin/home",{orders,products,users});
});
router.get("/login", function (req, res, next) {
  if (req.session.adminLoggedIn) {
    res.redirect("/admin/home");
  } else {
    let err = req.flash("msg");
    res.render("admin/login", { err });
  }
});
router.get("/", function (req, res, next) {
  if (req.session.adminLoggedIn) {
    res.redirect("/admin/home");
  } else {
    res.redirect("/admin/login");
  }
});

router.post("/login", function (req, res) {
  adminHelpers.doAdminLogin(req.body).then((response) => {
    if (response.status) {
      req.session.adminLoggedIn = true;
      req.session.admin = response.admin;

      res.redirect("/admin/home");
    } else {
      req.session.adminLoggErr = true;
      req.flash("msg", response.msg);
      res.redirect("/admin");
    }
  });
});
//signup
router.get('/signup',verfyAdmin,(req,res)=>{
  res.render('admin/signup')
})
router.post('/signup',(req,res)=>{
  adminHelpers.doSignup(req.body).then(()=>{
    res.redirect('/admin/home')
  })
})
// view products
router.get("/view-products", veryfyAdminLogin, function (req, res) {
  productHelpers.getAllProduct().then((products) => {
    // console.log(products[0].image[0].image1);
    res.render("admin/view-products", { products });
  });
});
// add products
router.get("/add-products", veryfyAdminLogin, function (req, res) {
  productHelpers.getAllCategory().then((categories) => {
    productHelpers.getAllBrands().then((brands) => {
      res.render("admin/add-products", { brands, categories });
    });
  });
});
router.post(
  "/add-products",
  uploads.fields([
    { name: "image1", maxCount: 1 },
    { name: "image2", maxCount: 1 },
    { name: "image3", maxCount: 1 },
    { name: "image4", maxCount: 1 },
  ]),
  function (req, res) {
    console.log(req.body);
    console.log(req.files);

    productHelpers.addProduct(req.body).then((proId) => {
      let imageId1 = req.files.image1[0].filename;
      let imageId2 = req.files.image2[0].filename;
      let imageId3 = req.files.image3[0].filename;
      let imageId4 = req.files.image4[0].filename;

      console.log(imageId1);
      console.log(imageId2);
      console.log(imageId3);
      console.log(imageId4);
      console.log(proId);

      productHelpers.uploadImageId(
        proId,
        imageId1,
        imageId2,
        imageId3,
        imageId4
      );

      res.redirect("/admin/view-products");
    });
  }
);
//edit products
router.get("/edit-products/:id", veryfyAdminLogin, async (req, res) => {
  console.log(req.params.id);
  let productDetails = await productHelpers.getOneProductDetails(req.params.id);
  console.log(productDetails);
  productHelpers.getAllCategory().then((categories) => {
    productHelpers.getAllBrands().then((brands) => {
      res.render("admin/edit-products", { productDetails, categories, brands });
    });
  });
});
//update-products
router.post(
  "/update-products/:id",
  uploads.fields([
    { name: "image1", maxCount: 1 },
    { name: "image2", maxCount: 1 },
    { name: "image3", maxCount: 1 },
    { name: "image4", maxCount: 1 },
  ]),
  (req, res) => {
    productHelpers.updateProducts(req.params.id, req.body).then((result) => {
      console.log(result);

      let imageId1 = req.files.image1
        ? req.files.image1[0].filename
        : req.body.image1;
      let imageId2 = req.files.image2
        ? req.files.image2[0].filename
        : req.body.image2;
      let imageId3 = req.files.image3
        ? req.files.image3[0].filename
        : req.body.image3;
      let imageId4 = req.files.image4
        ? req.files.image4[0].filename
        : req.body.image4;

      productHelpers
        .uploadImageId(req.params.id, imageId1, imageId2, imageId3, imageId4)
        .then(() => {
          console.log("images Updated");
          res.redirect("/admin/view-products");
        });
    });
  }
);
//delete user
router.get("/delete-products/:id", veryfyAdminLogin, (req, res) => {
  productHelpers.deleteProduct(req.params.id).then(() => {
    res.redirect("/admin/view-products");
  });
});
// view all users
router.get("/view-users", veryfyAdminLogin, function (req, res) {
  userHelpers.getAllUsers().then((users) => {
    console.log("isdhfhfusfusuifbsfuifuifgfedihfifiihfewehfuwehfn")
    console.log(users);
    const alert = req.flash("msg");
    res.render("admin/view-users", { users, alert });
  });
});

//block and unblock user
router.get("/block/:id", veryfyAdminLogin, (req, res) => {
  let ID = req.params.id;
  console.log(ID);
  userHelpers.blockUser(req.params.id).then(() => {
    req.flash("msg", "User Blocked.");
    res.redirect("/admin/view-users");
  });
});
router.get("/unblock/:id", veryfyAdminLogin, (req, res) => {
  let ID = req.params.id;
  console.log(ID);
  userHelpers.unblockUser(req.params.id).then(() => {
    req.flash("msg", "User Unblocked.");
    res.redirect("/admin/view-users");
  });
});

//delete user
router.get("/delete-user/:id", veryfyAdminLogin, (req, res) => {
  userHelpers.deleteUser(req.params.id).then(() => {
    res.redirect("/admin/view-users");
  });
});
//view categories
router.get("/view-category", veryfyAdminLogin, (req, res) => {
  productHelpers.getAllCategory().then((categories) => {
    console.log(categories);
    req.session.categories = categories;
    res.render("admin/view-category", { categories });
  });
});
//add category
router.get("/add-category", veryfyAdminLogin, (req, res) => {
  res.render("admin/add-category");
});
router.post("/add-category", uploads.single("image"), (req, res) => {
  console.log(req.body);
  productHelpers
    .addCategory(req.body)
    .then((id) => {
      console.log(id);
      console.log(req.file);
      console.log(req.file.filename);
      // let imageId = req.file.filename;
      productHelpers.uploadCateImg(id, req.file.filename).then(() => {
        res.redirect("/admin/view-category");
      });
    })
    .catch((err) => {
      res.redirect("/admin/add-category");
    });
});
//delete category
router.get("/delete-category/:id", veryfyAdminLogin, (req, res) => {
  productHelpers.deleteCategory(req.params.id).then(() => {
    res.redirect("/admin/view-category");
  });
});
//barnd
//add nwe brand
router.get("/add-brand", veryfyAdminLogin, (req, res) => {
  res.render("admin/add-brand");
});
router.post("/add-brand", uploads.single("logo"), (req, res) => {
  console.log(req.body);
  productHelpers
    .addBrand(req.body)
    .then((id) => {
      productHelpers.uploadBrandImg(id, req.file.filename).then(() => {
        res.redirect("/admin/view-brand");
      });
    })
    .catch((err) => {
      res.redirect("/admin/add-brand");
    });
});
//view brands
router.get("/view-brand", veryfyAdminLogin, (req, res) => {
  productHelpers.getAllBrands().then((brands) => {
    res.render("admin/view-brand", { brands });
  });
});
//delete brand
router.get("/delete-brand/:id", veryfyAdminLogin, (req, res) => {
  productHelpers.deleteBrand(req.params.id).then(() => {
    res.redirect("/admin/view-brand");
  });
});
//orders
//view orders
router.get("/view-orders", veryfyAdminLogin, (req, res) => {
  adminHelpers.getAllOrders().then((orders) => {
    console.log(orders);
    res.render("admin/view-orders", { orders });
  });
});
//view ordered product details
router.get("/view-order-products/:id", veryfyAdminLogin, async (req, res) => {
  let products = await userHelpers.getOrderProducts(req.params.id);
  let order = await userHelpers.getOneOrderData(req.params.id)
  // console.log(products[0].product.image)
  res.render("admin/ordered-products", { products,order });
});
//change order status
router.post("/order-shipped", (req, res) => {
  let status = "Shipped";
  adminHelpers.changeOrderStatus(req.body.orderId, status).then((response) => {
    res.json(response);
  });
});
router.post("/order-delivered", (req, res) => {
  let status = "Delivered";
  adminHelpers.changeOrderStatus(req.body.orderId, status).then((response) => {
    res.json(response);
  });
});
router.post("/order-cancelled", (req, res) => {
  let status = "Cancelled";
  adminHelpers
    .cancelOrder(req.body.orderId, req.body.refund, status)
    .then((response) => {
      res.json(response);
    });
});
//offer management
//product offer
router.get("/product-offer", veryfyAdminLogin, async (req, res) => {
  let products = await productHelpers.getAllProduct();
  let offers = await adminHelpers.getAllOffers();
  let alert = req.flash("msg");
  res.render("admin/product-offer", { products, offers, alert });
});
//add product offer
router.post("/product-offer", (req, res) => {
  console.log(req.body);
  adminHelpers.addProductOffer(req.body).then((response) => {
    req.flash("msg", response.msg);
    res.redirect("/admin/product-offer");
  });
  //console.log(req.body)
});
//edit offer
router.get("/edit-productOffer/:id", veryfyAdminLogin, async (req, res) => {
  let id = req.params.id;
  let products = await productHelpers.getAllProduct();
  let offer = await adminHelpers.getOneProductOffer(id);
  console.log(offer);
  res.render("admin/edit-proOffer", { products, offer });
});
router.post("/edit-productOffer/:id", (req, res) => {
  console.log(req.body);
  console.log(req.params.id);
  adminHelpers
    .updateProductOffer(req.params.id, req.body)
    .then(() => {
      req.flash("msg", "Offer Updated");
      res.redirect("/admin/product-offer");
    })
    .catch((err) => {
      console.log(err);
    });
});
//delete offer
router.get("/delete-productOffer/:id", veryfyAdminLogin, (req, res) => {
  adminHelpers.deleteProductOffer(req.params.id);
  req.flash("msg", "Offer Deleted");
  res.redirect("/admin/product-offer");
});
//coupen management
router.get("/coupon",veryfyAdminLogin, async (req, res) => {
  adminHelpers.getAllCoupons().then((coupons) => {
    let alert = req.flash("msg");
    res.render("admin/coupon", { alert, coupons });
  });
});
//add coupon
router.post("/add-coupon", (req, res) => {
  adminHelpers
    .addNewCoupon(req.body)
    .then(() => {
      req.flash("msg", "New Coupon Added");
      res.redirect("/admin/coupon");
    })
    .catch((err) => {
      console.log(err);
    });
});
//edit coupon
router.get("/edit-coupon/:id",veryfyAdminLogin, (req, res) => {
  adminHelpers.getOneCoupon(req.params.id).then((coupon) => {
    res.render("admin/edit-coupon", { coupon });
  });
});
router.post("/edit-coupon/:id", (req, res) => {
  adminHelpers.updateCoupon(req.params.id, req.body).then(() => {
    res.redirect("/admin/coupon");
  });
});
//delete coupens
router.get("/delete-coupon/:id",veryfyAdminLogin, (req, res) => {
  adminHelpers.deleteCoupon(req.params.id).then(() => {
    res.redirect("/admin/coupon");
  });
});
//category offer
router.get("/category-offer", veryfyAdminLogin, async (req, res) => {
  let categories = await productHelpers.getAllCategory();
  let cateOffers= await adminHelpers.getAllCatOffers()
  let alert=req.flash('msg')
  let alert2=req.flash('err')
  res.render("admin/category-offer", { categories,cateOffers,alert,alert2 });
});
router.post("/categoryOffer", (req, res) => {
  adminHelpers.addCategoryOffer(req.body).then((response) => {
    req.flash('msg',response.msg)
    req.flash('err',response.err)
    res.redirect('/admin/category-offer')
  }).catch((err)=>{
    console.log(err)
  })
  console.log(req.body);
});
//edit-cetegory offer
router.get('/edit-cateOffer/:id',veryfyAdminLogin,async(req,res)=>{
  let categories=await productHelpers.getAllCategory()
let cateOffer=await adminHelpers.getCatOfferDetails(req.params.id)
res.render('admin/edit-cateOffer',{cateOffer,categories})
})
router.post('/edit-cateOffer/:id',(req,res)=>{
  console.log(req.body)
})
//delete cate offer
router.get('/delete-cateOffer/:id',veryfyAdminLogin,(req,res)=>{
  adminHelpers.deleteCatOffer(req.params.id).then(()=>{
    res.redirect('/admin/category-offer')
  })
})
//getCartData
router.post("/getChartData", async (req, res) => {
  console.log('fhdsiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiia')
  console.log(req.body)
  
  console.log(req.body, "req.body");
  const date = new Date(Date.now());
  const month = date.toLocaleString("default", { month: "long" });
  adminHelpers.salesReport(req.body).then((data) => {
    let salesReport = data.salesReport;
    let brandReport = data.brandReport;
    let allOrderStatus=data.orderStatus

    let dateArray = [];
    let totalArray = [];
    salesReport.forEach((s) => {
      dateArray.push(`${month}-${s._id} `);
      totalArray.push(s.total);
    });
   

    let brandArray = [];
    let sumArray = [];
    brandReport.forEach((s) => {
      brandArray.push(s._id);
      sumArray.push(s.totalAmount);
    });
    
    let orderCount=data.orderCount
    let successOrders=data.successOrders
    let cancelledOrders=data.cancelledOrders
    let cod=data.cod
    let razorpay=data.razorpay

    
 let successPayment = 0
 let refund = 0
 let Sales = 0;

 salesReport.map((t) => {
   Sales += t.total
 })
 console.log (Sales,'Sales')

 successOrders.map((e)=>{
   successPayment += e.totalAmount
 })

 cancelledOrders.map((e)=>{
  refund += e.refund
})
console.log("jihihhhhhihihihih");
    console.log(dateArray, totalArray,orderCount,cod,razorpay);

    res.json({ dateArray, totalArray, brandArray, sumArray,orderCount ,Sales,successPayment,cod,razorpay,refund,allOrderStatus});
  });
});

// -------------------------------------When search
router.post("/getChartDatas", async (req, res) => {
  let orders=await adminHelpers.getLastOrders()
  console.log(orders)
  let products=await productHelpers.getNewProducts()
  let users=await userHelpers.getNewUsers()
  const date = new Date(Date.now());
  const month = date.toLocaleString("default", { month: "long" });
  adminHelpers.salesReport(req.body).then((data) => {
    let salesReport = data.salesReport;
    let brandReport = data.brandReport;
    let allOrderStatus=data.orderStatus
    let text=data.text
    let dateArray = [];
    let totalArray = [];
    salesReport.forEach((s) => {
      dateArray.push(`${month}-${s._id} `);
      totalArray.push(s.total);
    });
   

    let brandArray = [];
    let sumArray = [];
    brandReport.forEach((s) => {
      brandArray.push(s._id);
      sumArray.push(s.totalAmount);
    });
    
    let orderCount=data.orderCount
    let successOrders=data.successOrders
    let cancelledOrders=data.cancelledOrders
    let cod=data.cod
    let razorpay=data.razorpay

    
 let successPayment = 0
 let refund = 0
 let Sales = 0;

 salesReport.map((t) => {
   Sales += t.total
 })
 console.log (Sales,'Sales')

 successOrders.map((e)=>{
   successPayment += e.totalAmount
 })

 cancelledOrders.map((e)=>{
  refund += e.refund
})
console.log("jihihhhhhihihihih");
    console.log(dateArray, totalArray,orderCount,cod,razorpay,allOrderStatus);

    res.render('admin/searchReport',{text,dateArray, totalArray, brandArray, sumArray,orderCount ,Sales,successPayment,cod,razorpay,refund,allOrderStatus,orders,products,users})
    // res.json({ dateArray, totalArray, brandArray, sumArray,orderCount ,Sales,successPayment,cod,razorpay,refund,allOrderStatus})
  });
});
// ---------------------------------------------------_
//banners
router.get('/banner',veryfyAdminLogin,async(req,res)=>{
  let banners = await adminHelpers.getBanners()
  
  console.log(banners)
  res.render('admin/banners',{banners})
})
//add banner
router.get('/addBanner',veryfyAdminLogin,async(req,res)=>{
  let categories = await productHelpers.getAllCategory()
res.render('admin/add-banner',{categories})
})
router.post('/addBanner',uploads.single('image'),(req,res)=>{
  let imageId = req.file.filename;
  adminHelpers.addBanner(req.body).then((bannerId)=>{
    adminHelpers.uploadImageId(bannerId,imageId).then(()=>{
res.redirect('/admin/banner')
    })

  }).catch((err)=>{
    console.log(err)
  })
})
//edit banner
router.get('/editBanner/:id',veryfyAdminLogin,async(req,res)=>{
let banner=await adminHelpers.getBanner(req.params.id)
let categories = await productHelpers.getAllCategory()
res.render('admin/edit-banner',{banner,categories})
})
router.post('/editBanner/:id',uploads.single('image'),(req,res)=>{
  
  let imageId = req.file ? req.file.filename: req.body.image
  console.log(imageId)
  adminHelpers.updateBanner(req.params.id,req.body).then(()=>{
   
    adminHelpers.uploadImageId(req.params.id,imageId).then(()=>{
      console.log('hoooooooooooooooooooooo')
res.redirect('/admin/banner')
    })
  })
})
//delete banner
router.get('/deleteBanner/:id',(req,res)=>{
  adminHelpers.deleteBanner(req.params.id).then(()=>{
    res.redirect('/admin/banner')
  })
})
//posters
router.get('/poster',veryfyAdminLogin,async(req,res)=>{
  let posters = await adminHelpers.getPosters()
  
  
  res.render('admin/posters',{posters})
})
//add poster
router.get('/addPoster',veryfyAdminLogin,async(req,res)=>{
  
res.render('admin/add-poster')
})
router.post('/addPoster',uploads.single('image'),(req,res)=>{
  let imageId = req.file.filename;
  adminHelpers.addPoster(req.body).then((Id)=>{
    adminHelpers.uploadImage(Id,imageId).then(()=>{
res.redirect('/admin/poster')
    })

  }).catch((err)=>{
    console.log(err)
  })
})
//edit poster
router.get('/editPoster/:id',veryfyAdminLogin,async(req,res)=>{
let banner=await adminHelpers.getPoster(req.params.id)
res.render('admin/edit-poster',{banner})
})
router.post('/editPoster/:id',uploads.single('image'),(req,res)=>{
  
  let imageId = req.file ? req.file.filename: req.body.image
  console.log(imageId)
  adminHelpers.updatePoster(req.params.id,req.body).then(()=>{
   
    adminHelpers.uploadImage(req.params.id,imageId).then(()=>{
      console.log('hoooooooooooooooooooooo')
res.redirect('/admin/poster')
    })
  })
})
//delete poster
router.get('/deletePoster/:id',veryfyAdminLogin,(req,res)=>{
  adminHelpers.deletePoster(req.params.id).then(()=>{
    res.redirect('/admin/poster')
  })
})
//logout
router.get("/logout", (req, res) => {
  req.session.admin = null;
  req.session.adminLoggedIn = false;
  res.redirect("/admin");
});

module.exports = router;
