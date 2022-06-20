const db = require("../config/connection");
const collection = require("../config/collections");
const { promises } = require("nodemailer/lib/xoauth2");
const { ObjectId } = require("mongodb");
const moment = require("moment");
const { response } = require("../app");

module.exports = {
  doAdminLogin: (adminData) => {
    return new Promise(async (resolve, reject) => {
      let admin = await db
        .get()
        .collection(collection.ADMIN_COLLECTION)
        .findOne({ email: adminData.email });
      console.log(admin);

      if (admin) {
        if (adminData.password == admin.password) {
          console.log("admin login success");

          resolve({ status: true, admin });
        } else {
          console.log("admin login failed");
          resolve({ status: false, msg: "Wrong Password" });
        }
      } else {
        console.log("no admin found");
        resolve({ status: false, msg: "Admin not found" });
      }
    });
  }, //signup
  doSignup: (data) => {
    data.adminLogin = true;
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ADMIN_COLLECTION)
        .insertOne(data)
        .then(() => {
          resolve();
        });
    });
  }, //check admin
  check: () => {
    let status = true;
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ADMIN_COLLECTION)
        .findOne({ adminLogin: status })
        .then((response) => {
          console.log(response + "bfusfgusgfusdgfuysgfsdfsedfys");
          resolve(response);
        });
    });
  },
  //view orders
  getAllOrders: () => {
    return new Promise((resolve, reject) => {
      let orders = db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find()
        .toArray();
      resolve(orders);
    });
  },
  //view last orders
  getLastOrders: () => {
    return new Promise((resolve, reject) => {
      let orders = db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find().sort({date2:-1}).limit(6)
        .toArray()
      resolve(orders);
    });
  },
  //changeOrderStatus
  changeOrderStatus: (orderId, status) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: ObjectId(orderId) },
          {
            $set: {
              status: status,
            },
          }
        )
        .then((response) => {
          resolve(response);
        });
    });
  },
  //cancelOrder
  cancelOrder: (orderId, refund, status) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: ObjectId(orderId) },
          {
            $set: {
              status: status,
              refund: parseInt(refund),
              paymentStatus: "refund",
            },
          }
        )
        .then((response) => {
          resolve(response);
        });
    });
  },

  //Offer section
  //products offers
  addProductOffer: (data) => {
    data.startDateIso = new Date(data.starting);
    data.endDateIso = new Date(data.expiry);
    return new Promise(async (resolve, reject) => {
      let product = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: ObjectId(data.proId) });
      if (product.productOffer) {
        console.log("product offer exist");
        resolve({ msg: "Already an Offer exist for this product" });
      } else {
        data.name = product.title;
        data.mrp = product.mrp;
       

        db.get()
          .collection(collection.PRODUCT_OFFER_COLLECTION)
          .insertOne(data)
          .then(() => {
            resolve({ msg: "Product offer Successfully Added" });
          });
      }
    });
  },
  //offer starts when user login or admin login
  startProductOffer: (date) => {
    let proStartDateIso = new Date(date);
    return new Promise(async (resolve, reject) => {
      let data = await db
        .get()
        .collection(collection.PRODUCT_OFFER_COLLECTION)
        .find({ startDateIso: { $gte: proStartDateIso } })
        .toArray();
      console.log("data okkkkkkkkkk");
      //console.log(data)
      if (data) {
        await data.map(async (onedata) => {
          let product = await db
            .get()
            .collection(collection.PRODUCT_COLLECTION)
            .findOne({
              _id: ObjectId(onedata.proId),
              productOffer: { $exists: false },
            });
          if (product) {
            console.log("product okkkkkkkkkkk");
            //console.log(product);
            let actualPrice = product.mrp;
            let off = (actualPrice * onedata.offer) / 100;
            let newPrice = actualPrice - off;
            console.log(newPrice, actualPrice, off);
            newPrice = newPrice.toFixed();
            //console.log(newPrice)
            db.get()
              .collection(collection.PRODUCT_COLLECTION)
              .updateOne(
                { _id: ObjectId(product._id) },
                {
                  $set: {
                    productOffer: true,
                    proPercentage: parseInt(onedata.offer),
                    price:parseInt( newPrice),
                    discound: parseInt(off),
                  },
                }
              );
            resolve();
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  },
  //offer ends when user login or admin login
  endProductOffer: (date) => {
    let proEndDateIso = new Date(date);

    return new Promise(async (resolve, reject) => {
      let data = await db
        .get()
        .collection(collection.PRODUCT_OFFER_COLLECTION)
        .find({ endDateIso: { $lte: proEndDateIso } })
        .toArray();
      console.log("products offer ends");
      //console.log(data);
      if (data) {
        await data.map(async (onedata) => {
          let product = await db
            .get()
            .collection(collection.PRODUCT_COLLECTION)
            .findOne({
              _id: ObjectId(onedata.proId),

              productOffer: { $exists: true },
            });
          if (product) {
            console.log("dfkjdfsdgfhdsf");
            //console.log(product);

            db.get()
              .collection(collection.PRODUCT_COLLECTION)
              .update(
                { _id: ObjectId(product._id) },
                {
                  $set: {
                    productOffer: false,
                    proPercentage: 0,
                    price:parseInt( product.mrp),
                    discound: 0,
                  },
                },
                { upsert: true }
              );
            resolve();
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  },
  //get all offers
  getAllOffers: () => {
    return new Promise(async (resolve, reject) => {
      let offers = await db
        .get()
        .collection(collection.PRODUCT_OFFER_COLLECTION)
        .find()
        .toArray();
      resolve(offers);
    });
  },
  //getOneProductOffer
  getOneProductOffer: (offerId) => {
    return new Promise(async (resolve, reject) => {
      let offer = await db
        .get()
        .collection(collection.PRODUCT_OFFER_COLLECTION)
        .findOne({ _id: ObjectId(offerId) });
      resolve(offer);
    });
  },
  //updateProductOffer
  updateProductOffer: (offerId, data) => {
    return new Promise(async (resolve, reject) => {
      let product = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: ObjectId(data.proId) });
      await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          { _id: ObjectId(data.proId) },
          {
            $unset: {
              productOffer: "",
            },
          }
        );
      console.log("33333333333333333333333333333333333333333333" + product);
      db.get()
        .collection(collection.PRODUCT_OFFER_COLLECTION)
        .updateOne(
          { _id: ObjectId(offerId) },
          {
            $set: {
              startDateIso: new Date(data.starting),
              endDateIso: new Date(data.expiry),
              price:parseInt( product.mrp),
              name: product.title,
              proId: data.proId,
              starting: data.starting,
              expiry: data.expiry,
              offer: parseInt(data.offer),
            },
          }
        )
        .then((response) => {
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  //deleteProductOffer
  deleteProductOffer: (offerId) => {
    return new Promise(async (resolve, reject) => {
      let productOffer = await db
        .get()
        .collection(collection.PRODUCT_OFFER_COLLECTION)
        .findOne({ _id: ObjectId(offerId) });
      let proId = productOffer.proId;
      let product = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: ObjectId(proId) });
      db.get()
        .collection(collection.PRODUCT_OFFER_COLLECTION)
        .deleteOne({ _id: ObjectId(offerId) })
        .then(() => {
          db.get()
            .collection(collection.PRODUCT_COLLECTION)
            .updateOne(
              { _id: ObjectId(proId) },
              {
                $set: {
                  price: parseInt(product.mrp),
                  proPercentage: 0,
                  discound: 0,
                },
                $unset: {
                  productOffer: "",
                },
              }
            )
            .then(() => {
              resolve();
            });
        });
    });
  },
  //coupon
  //addNewCoupon
  addNewCoupon: (data) => {
    console.log(data);
    return new Promise(async (resolve, reject) => {
      let startDate = new Date(data.starting);
      let endDate = new Date(data.expiry);
      let expiry = moment(data.expiry).format("YYYY-MM-DD");
      let starting = moment(data.starting).format("YYYY-MM-DD");
      let dataObject = {
        coupon: data.coupon,
        offer: parseInt(data.offer),
        starting: starting,
        expiry: expiry,
        startDate: startDate,
        endDate: endDate,
        limit: parseInt(data.limit),
        users: [],
      };
      db.get()
        .collection(collection.COUPON_COLLECTION)
        .insertOne(dataObject)
        .then(() => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  //get all coupen
  getAllCoupons: () => {
    return new Promise(async (resolve, reject) => {
      let coupons = await db
        .get()
        .collection(collection.COUPON_COLLECTION)
        .find()
        .toArray();

      resolve(coupons);
    });
  },
  //get all available coupen
  getAllAvailabeCoupons: () => {
    let date = new Date();
    return new Promise(async (resolve, reject) => {
      let coupons = await db
        .get()
        .collection(collection.COUPON_COLLECTION)
        .find({ endDate: { $gte: date }, startDate: { $lt: date } })
        .toArray();

      resolve(coupons);
    });
  },
  //start coupen
  startCouponOffer: (date) => {
    let couponStartDate = new Date(date);
    return new Promise(async (resolve, reject) => {
      let data = await db
        .get()
        .collection(collection.COUPON_COLLECTION)
        .find({ startDate: { $lte: couponStartDate } })
        .toArray();
      if (data) {
        await data.map(async (singleData) => {
          db.get()
            .collection(collection.COUPON_COLLECTION)
            .updateOne(
              { _id: ObjectId(singleData._id) },
              {
                $set: {
                  available: true,
                },
              },
              {
                upsert: true,
              }
            )
            .then(() => {
              resolve();
            });
        });
      } else {
        resolve();
      }
    });
  },
  //verify coupon
  validateCoupon: (data, userId) => {
    return new Promise(async (resolve, reject) => {
      console.log(data.coupon);
      obj = {};

      let coupon = await db
        .get()
        .collection(collection.COUPON_COLLECTION)
        .findOne({ coupon: data.coupon, available: true });
      console.log(coupon);
      if (coupon) {
        if (coupon.limit > 0) {
          let users = coupon.users;
          let checkUserUsed = users.includes(userId);
          if (checkUserUsed) {
            obj.couponUsed = true;
            obj.msg = " You Already Used A Coupon";
            console.log(" You Already Used A Coupon");
            resolve(obj);
          } else {
            let nowDate = new Date();
            date = moment(nowDate).format("YYYY-MM-DD");
            console.log(date);
            if (date <= coupon.expiry) {
              let total = parseInt(data.total);
              let percentage = parseInt(coupon.offer);
              let discoAmount = ((total * percentage) / 100).toFixed();
              obj.total = total - discoAmount;
              obj.success = true;
              resolve(obj);
            } else {
              obj.couponExpired = true;
              console.log("This Coupon Is Expired");
              resolve(obj);
            }
          }
        } else {
          obj.couponMaxLimit = true;
          console.log("Used Maximum Limit");
          resolve(obj);
        }
      } else {
        obj.invalidCoupon = true;
        console.log("This Coupon Is Invalid");
        resolve(obj);
      }
    });
  },
  //get coupon
  getOneCoupon: (id) => {
    return new Promise(async (resolve, reject) => {
      let coupon = await db
        .get()
        .collection(collection.COUPON_COLLECTION)
        .findOne({ _id: ObjectId(id) });
      resolve(coupon);
    });
  },
  //updateCoupon
  updateCoupon: (id, data) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.COUPON_COLLECTION)
        .updateOne(
          { _id: ObjectId(id) },
          {
            $set: {
              coupon: data.coupon,
              starting: data.starting,
              expiry: data.expiry,
              offer: parseInt(data.offer),
              limit: parseInt(data.limit),
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },
  //deleteCoupon
  deleteCoupon: (couponId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.COUPON_COLLECTION)
        .deleteOne({ _id: ObjectId(couponId) })
        .then(() => {
          resolve();
        });
    });
  },
  // Category offers
  addCategoryOffer: (data) => {
    data.catOfferPercentage = parseInt(data.offer);
    return new Promise(async (resolve, reject) => {
      data.startDate = new Date(data.starting);
      data.endDate = new Date(data.expiry);
      let response = {};
      let exist = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ category: data.category, categoryOffer: { $exists: true } });
      if (exist) {
        response.exist = true;
        resolve({ err: "Already an Offer exist for this product" });
      } else {
        db.get()
          .collection(collection.CATEGORY_OFFER_COLLECTION)
          .insertOne(data)
          .then((response) => {
            resolve({ msg: "offer Successfully Added" })
          })
          .catch((err) => {
            reject(err);
          });
      }
    });
  },
  startCategoryOffer: (date) => {
    let startDate = new Date(date);
    return new Promise(async (resolve, reject) => {
      let data = await db
        .get()
        .collection(collection.CATEGORY_OFFER_COLLECTION)
        .find({ startDate: { $lte: startDate } })
        .toArray();
      if (data.length > 0) {
        await data.map(async (onedata) => {
          let products = await db
            .get()
            .collection(collection.PRODUCT_COLLECTION)
            .find({
              category: onedata.category,
              categoryOffer: { $exists: false },
            })
            .toArray();

          await products.map(async (product) => {
            let actualPrice = product.price;
            let off = (product.price * onedata.catOfferPercentage) / 100;
            let newPrice = actualPrice - parseInt(off);
            newPrice = newPrice.toFixed();

            db.get()
              .collection(collection.PRODUCT_COLLECTION)
              .updateOne(
                { _id: ObjectId(product._id) },
                {
                  $set: {
                    actualPrice: parseInt(product.price),
                    price: parseInt(newPrice),
                    categoryOffer: true,
                    catOfferPercentage: onedata.catOfferPercentage,
                    proDiscount: product.discound,
                    discound: product.discound + parseInt(off),
                  },
                },
                { upsert: true }
              );
          });
        });
        resolve();
      } else {
        resolve();
      }
    });
  },
  //end category offer
  //cate ends when user login or admin login
  endCateOffer: (date) => {
    let endDate = new Date(date);

    return new Promise(async (resolve, reject) => {
      let data = await db
        .get()
        .collection(collection.CATEGORY_OFFER_COLLECTION)
        .find({ endDate: { $lte: endDate } })
        .toArray();
      console.log("products offer ends");
      //console.log(data);
      if (data) {
        await data.map(async (onedata) => {
          let product = await db
            .get()
            .collection(collection.PRODUCT_COLLECTION)
            .findOne({
              category: onedata.category,

              productOffer: { $exists: true },
            });
          if (product) {
            console.log("dfkjdfsdgfhdsf");
            //console.log(product);

            db.get()
              .collection(collection.PRODUCT_COLLECTION)
              .update(
                { _id: ObjectId(product._id) },
                {
                  $set: {
                    categoryOffer: false,
                    catOfferPercentage: 0,
                    price: parseInt(product.actualPrice),
                    discound: parseInt(product.proDiscount),
                  },
                },
                { upsert: true }
              );
            resolve();
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  },
  getAllCatOffers: () => {
    return new Promise(async (resolve, reject) => {
      let categoryOffer = await db
        .get()
        .collection(collection.CATEGORY_OFFER_COLLECTION)
        .find()
        .toArray();
      resolve(categoryOffer);
    });
  },
  getCatOfferDetails: (id) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CATEGORY_OFFER_COLLECTION)
        .findOne({ _id: ObjectId(id) })
        .then((offer) => {
          resolve(offer);
        });
    });
  },
  updateCatOffer: (id, newData) => {
    return new Promise(async(resolve, reject) => {
      let products = await db
      .get()
      .collection(collection.PRODUCT_COLLECTION)
      .findOne({ category: newData.category });
      products.map(async(product)=>{
        await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          { _id: ObjectId(product._id) },
          {
            $unset: {
              categoryOffer: "",
            },
          }
        );
      })
    
      db.get()
        .collection(collection.CATEGORY_OFFER_COLLECTION)
        .updateOne(
          { _id: ObjectId(id) },
          {
            $set: {
              category: newData.category,
              starting: newData.starting,
              expiry: newData.expiry,
              catOfferPercentage: parseInt(newData.offer),
            },
          }
        )
        .then((response) => {
          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  deleteCatOffer: (id) => {
    return new Promise(async (resolve, reject) => {
      let cateOffer = await db
        .get()
        .collection(collection.CATEGORY_OFFER_COLLECTION)
        .findOne({ _id: ObjectId(id) });

      let products = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({
          category: cateOffer.category,
          categoryOffer: { $exists: true },
        })
        .toArray();
        console.log('dddddddddddddddddddddddddddddddd')
      console.log(products);
      if (products) {
        db.get()
          .collection(collection.CATEGORY_OFFER_COLLECTION)
          .deleteOne({ _id: ObjectId(id) })
          .then(async () => {
            await products.map(async (product) => {
              db.get()
                .collection(collection.PRODUCT_COLLECTION)
                .updateOne(
                  { _id: ObjectId(product._id) },
                  {
                    $set: {
                      price: parseInt(product.actualPrice),
                      discound: parseInt(product.proDiscount),
                    },
                    $unset: {
                      offer: "",
                      catOfferPercentage: "",
                      actualPrice: "",
                      categoryOffer: "",
                      proDiscount: "",
                    },
                  }
                )
                .then(() => {
                  
                  resolve();
                });
            });
          });
      } else {
        resolve();
      }
    });
  },
  //CHART
  salesReport: (data) => {
    let response = {};
    let { startDate, endDate } = data;

    let d1, d2, text;
    if (!startDate || !endDate) {
      d1 = new Date();
      d1.setDate(d1.getDate() - 7);

      d2 = new Date();

      text = "For the Last 7 days";
    } else {
      d1 = new Date(startDate);
      d2 = new Date(endDate);
      text = `Between ${startDate} and ${endDate}`;
    }

    // Date wise sales report
    return new Promise(async (resolve, reject) => {
      console.log("dateeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
      console.log(d1, d2);
      let salesReport = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              date2: {
                $lt: d2,
                $gte: d1,
              },
            },
          },
          {
            $group: {
              _id: { $dayOfMonth: "$date2" },
              total: { $sum: "$totalAmount" },
            },
          },
        ])
        .toArray();

      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
      console.log(salesReport, "salesReport");

      let brandReport = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              date2: {
                $lt: d2,
                $gte: d1,
              },
            },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              brand: "$products.product.brand",
              subTotal: "$products.subtotal",
            },
          },
          {
            $group: {
              _id: "$brand",
              totalAmount: { $sum: "$subTotal" },
            },
          },
        ])
        .toArray();

      console.log(
        "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR"
      );
      console.log(brandReport, "brandReport");

      let orderStatus = [];
      //To get number of placed orders
      let placedProducts = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              status: "placed",
              date2: {
                $lt: d2,
                $gte: d1,
              },
            },
          },
        ])
        .toArray();
      let placedLen = placedProducts.length;
      orderStatus.push(placedLen);
      //To get number of shipped orders
      let shippedProducts = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              status: "Shipped",
              date2: {
                $lt: d2,
                $gte: d1,
              },
            },
          },
        ])
        .toArray();
      let shippedLen = shippedProducts.length;
      orderStatus.push(shippedLen);
      //To get number of delivered orders
      let deliveredProducts = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              status: "Delivered",
              date2: {
                $lt: d2,
                $gte: d1,
              },
            },
          },
        ])
        .toArray();
      let deliveredLen = deliveredProducts.length;
      orderStatus.push(deliveredLen);
      //To get number of cancelled orders
      let pendingProducts = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              status: "Cancelled",
              date2: {
                $lt: d2,
                $gte: d1,
              },
            },
          },
        ])
        .toArray();
      let pendingLen = pendingProducts.length;
      orderStatus.push(pendingLen);
      //Resolve all order status in an array for chart

      let orderCount = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ date2: { $gt: d1, $lt: d2 } })
        .count();
      let successOrders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ paymentStatus: "placed", date2: { $gt: d1, $lt: d2 } })
        .toArray();
      let cancelledOrders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ status: "Cancelled", date2: { $gt: d1, $lt: d2 } })
        .toArray();
      let cod = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ paymentMethod: "cod", date2: { $gt: d1, $lt: d2 } })
        .count();
      let razorpay = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ paymentMethod: "razorpay", date2: { $gt: d1, $lt: d2 } })
        .count();
      console.log(successOrders + "ffffffffffffffffffffffffffffffffffffffff");
      console.log(successOrders);
      response.orderCount = orderCount;
      response.salesReport = salesReport;
      response.brandReport = brandReport;
      response.successOrders = successOrders;
      response.cancelledOrders = cancelledOrders;
      response.cod = cod;
      response.razorpay = razorpay;
      response.orderStatus = orderStatus;
      response.text = text;

      resolve(response);
    });
  },
  //Banner Managemment
  addBanner: (data) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.BANNER_COLLECTION)
        .insertOne(data)
        .then((response) => {
          resolve(response.insertedId.toString());
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  uploadImageId: (bannerId, imageId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.BANNER_COLLECTION)
        .updateOne(
          { _id: ObjectId(bannerId) },
          { $set: { image: imageId } },
          { upsert: true }
        );
      resolve();
    });
  },
  getBanners: () => {
    return new Promise(async (resolve, reject) => {
      let banners = await db
        .get()
        .collection(collection.BANNER_COLLECTION)
        .find()
        .toArray();
      resolve(banners);
    });
  },
  getBanner: (id) => {
    return new Promise(async (resolve, reject) => {
      let banner = await db
        .get()
        .collection(collection.BANNER_COLLECTION)
        .findOne({ _id: ObjectId(id) });
      resolve(banner);
    });
  },
  updateBanner: (id, data) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.BANNER_COLLECTION)
        .updateOne(
          { _id: ObjectId(id) },
          {
            $set: {
              bannerName: data.bannerName,
              offer: data.offer,
              description: data.description,
              link: data.link,
            },
          }
        )
        .then((response) => {
          resolve(response);
        });
    });
  },
  deleteBanner: (id) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.BANNER_COLLECTION)
        .deleteOne({ _id: ObjectId(id) })
        .then(() => {
          resolve();
        });
    });
  },
  //poster management

  addPoster: (data) => {
    data.date = new Date();
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.POSTER_COLLECTION)
        .insertOne(data)
        .then((response) => {
          resolve(response.insertedId.toString());
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  uploadImage: (Id, imageId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.POSTER_COLLECTION)
        .updateOne(
          { _id: ObjectId(Id) },
          { $set: { image: imageId } },
          { upsert: true }
        );
      resolve();
    });
  },
  getPosters: () => {
    return new Promise(async (resolve, reject) => {
      let posters = await db
        .get()
        .collection(collection.POSTER_COLLECTION)
        .find()
        .toArray();
      resolve(posters);
    });
  },
  //posters 1 for home
  getPosters1: () => {
    return new Promise(async (resolve, reject) => {
      let posters = await db
        .get()
        .collection(collection.POSTER_COLLECTION)
        .find()
        .sort({ date: -1 })
        .limit(2)
        .toArray();
      resolve(posters);
    });
  },
  //posters 2 for home
  getPosters2: () => {
    return new Promise(async (resolve, reject) => {
      let posters = await db
        .get()
        .collection(collection.POSTER_COLLECTION)
        .find()
        .sort({ date: -1 })
        .skip(2)
        .limit(3)
        .toArray();
      resolve(posters);
    });
  },
  getPoster: (id) => {
    return new Promise(async (resolve, reject) => {
      let poster = await db
        .get()
        .collection(collection.POSTER_COLLECTION)
        .findOne({ _id: ObjectId(id) });
      resolve(poster);
    });
  },
  updatePoster: (id, data) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.POSTER_COLLECTION)
        .updateOne(
          { _id: ObjectId(id) },
          {
            $set: {
              bannerName: data.bannerName,
              offer: data.offer,
              description: data.description,
            },
          }
        )
        .then((response) => {
          resolve(response);
        });
    });
  },
  deletePoster: (id) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.POSTER_COLLECTION)
        .deleteOne({ _id: ObjectId(id) })
        .then(() => {
          resolve();
        });
    });
  },
};
