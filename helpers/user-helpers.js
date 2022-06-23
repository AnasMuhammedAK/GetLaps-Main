const db = require("../config/connection");
const collection = require("../config/collections");
const jwt = require("jsonwebtoken");
const { response } = require("../app");
const bcrypt = require("bcrypt");
const nodeMailer = require("nodemailer");
const { ObjectId } = require("mongodb");
const moment = require("moment");
// const ObjectId=require("mongodb").ObjectID
//razorpay-----------------------
require("dotenv").config();
const Razorpay = require("razorpay");
const { resolve } = require("path");
var key_id = process.env.key_id;
var key_secret = process.env.key_secret;
var instance = new Razorpay({
  key_id: key_id,
  key_secret: key_secret,
});
//---------------------------------------
module.exports = {
  findUserExist: (userData) => {
    return new Promise(async (resolve, reject) => {
      const user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({
          $or: [{ email: userData.email }, { mobile: userData.mobile }],
        });
      if (!user) {
        resolve({ status: true });
      } else {
        console.log("registration rejected");
        reject({ status: false, msg: "This email or mobile already taken" });
      }
    });
  },
  doSignup: (userData) => {
    let address=[]
    let propic=""
    userData.address=address
    userData.propic=propic
    userData.date=new Date()
    return new Promise(async (resolve, reject) => {
     
      userData.password = await bcrypt.hash(userData.password, 10);
      userData.repassword = await bcrypt.hash(userData.repassword, 10);
      await db.get().collection(collection.USER_COLLECTION).insertOne(userData);
      //jwt
      const secret = "hellooo";
      const payload = {
        email: userData.email,
        number: userData.mobile,
      };
      let token = jwt.sign(payload, secret, { expiresIn: "4m" });
      console.log(token);

      //welcome mail
      const fromEmail = "anasabdulkareem99@gmail.com";
      const toEmail = userData.email;

      const transporter = nodeMailer.createTransport({
        service: "gmail",
        auth: {
          user: "anasabdulkareem99@gmail.com",
          pass: "xryezkjtainljozw",
        },
      });
      transporter.sendMail(
        {
          from: fromEmail,
          to: toEmail,
          subject: "Welcome mail",
          text: "You are successfully registered in GetLaps",
          html: `<h4>We are welcoming you Mr/Ms <h2>${userData.fullname}</h2><h1>To GetLaps</h1></h4>`,
        },
        function (error, response) {
          if (error) {
            console.log("Failed in sending mail");
          } else {
            console.log("Successful in sending email");
          }
        }
      );
      resolve({ status: true, msg: "successfully registered" });
      //}
    });
  },
  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ email: userData.email });
      if (user) {
        bcrypt.compare(userData.password, user.password).then((status) => {
          if (status) {
            console.log("login success");

            response.user = user;
            response.status = true;
            resolve(response);
          } else {
            console.log("login failed");
            resolve({ status: false, msg: "Wrong Password" });
          }
        });
      } else {
        resolve({ status: false, msg: "Invalid User" });
      }
    });
  },
  //change password
  changePassword:(userId,passData)=>{
    return new Promise(async(resolve,reject)=>{
      passData.newpass = await bcrypt.hash(passData.newpass, 10);
      let user=await db.get().collection(collection.USER_COLLECTION).findOne({_id:ObjectId(userId)})
      bcrypt.compare(passData.currpass, user.password).then((status)=>{
        if(status){
          db.get().collection(collection.USER_COLLECTION).updateOne({_id:ObjectId(userId)},{$set:{password:passData.newpass}}).then(()=>{
            resolve({status:true,msg:"Password Updated"})
          })
        }else{
          resolve({status:false,msg:"Password does't Match"})
        }
      
      })
    })
   
  },
  //forgotpassword ;finding user mobile number
  checkValidMobile: (userMob) => {
    console.log(userMob);
    return new Promise(async (resolve, reject) => {
      let mob = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ mobile: userMob.mobile });
      if (mob) {
        console.log(mob);
        resolve({ status: true });
      } else {
        console.log(mob);
        reject({ status: false, msg: "Mobile Number Does't Match" });
      }
    });
  },
  //updatepassword for forgote password
  updatePassword: (userMobile, newPassword) => {
    return new Promise(async (resolve, reject) => {
      newPassword = await bcrypt.hash(newPassword, 10);
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { mobile: userMobile },
          {
            $set: {
              password: newPassword,
            },
          }
        )
        .then((Response) => {
          console.log(response);
          resolve(Response);
        });
    });
  },
  //list user
  getAllUsers: () => {
    return new Promise(async (resolve, reject) => {
      let result = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .find()
        .toArray();

      resolve(result);
    });
  },
  getNewUsers: () => {
    return new Promise(async (resolve, reject) => {
      let result = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .find().limit(6).sort({fullname:-1})
        .toArray();

      resolve(result);
    });
  },
  //block user
  blockUser: (userId) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: ObjectId(userId) },
          { $set: { block: true } },
          { upsert: true }
        );
      resolve();
    });
  },
  //unblock user
  unblockUser: (userId) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: ObjectId(userId) },
          { $set: { block: false } },
          { upsert: true }
        );
      resolve();
    });
  },
  //delete user
  deleteUser: (userId) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .deleteOne({ _id: ObjectId(userId) })
        .then((respons) => {
          resolve(respons);
        });
    });
  },
  //CART
  //add to cart
  addToCart: async(proId, userId) => {
    let product=await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:ObjectId(proId)})
    console.log(product)
   let proObj = {
      item: ObjectId(proId),
      quantity: 1,
      subtotal:parseInt(product.price),
      product:product
      
    }
    return new Promise(async (resolve, reject) => {
      let userCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: ObjectId(userId) });
      if (userCart) {
        let proExist = userCart.products.findIndex(
          (product) => product.item == proId
        );
        console.log(proExist, "hello this important");
        if (proExist == -1) {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: ObjectId(userId) },
              {
                $push: { products: proObj },
              }
            )
            .then((response) => {
              console.log("iam new product");
              resolve({ newProduct: true });
            });
        } else {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: ObjectId(userId), "products.item": ObjectId(proId) },

              {
                $inc: { "products.$.quantity": 1 },
              }
            )
            .then(() => {
              console.log("iam old product");
              resolve({ oldProduct: true });
            });
        }
      } else {
        let cartObj = {
          user: ObjectId(userId),
          products: [proObj],
        };
        await db
          .get()
          .collection(collection.CART_COLLECTION)
          .insertOne(cartObj)
          .then((response) => {
            console.log("iam new cart");
            resolve({ newProduct: true });
          });
      }
    });
  },
  //view products in cart
  getCartproducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartItems = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: ObjectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();
      // console.log(cartItems)
      // console.log(cartItems[0].products)
      resolve(cartItems);
    });
  },
  //get cart count
  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: ObjectId(userId) });
      if (cart) {
        count = cart.products.length;
      }
      resolve(count);
    });
  },
  //get wishlist count
  getWishCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      let wishlist = await db
        .get()
        .collection(collection.WISHLIST_COLLECTION)
        .findOne({ user: ObjectId(userId) });
      if (wishlist) {
        count = wishlist.products.length;
      }
      resolve(count);
    });
  },
  //get one user detailes
  getUser: (userId) => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: ObjectId(userId) });
      if (user) {
        resolve(user);
      } else {
        resolve(false);
      }
    });
  },
  //change cart quntities
  changeProductQuantity: (data) => {
    data.count = parseInt(data.count);
    data.quantity = parseInt(data.quantity);
    return new Promise((resolve, reject) => {
      if (data.count == -1 && data.quantity == 1) {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            { _id: ObjectId(data.cart) },
            {
              $pull: { products: { item: ObjectId(data.product) } },
            }
          )
          .then((response) => {
            resolve({ removeProduct: true });
          });
      } else {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            {
              _id: ObjectId(data.cart),
              "products.item": ObjectId(data.product),
            },

            {
              $inc: { "products.$.quantity": data.count },
            }
          )
          .then((response) => {
            console.log(response);
            resolve({ status: true });
          });
      }
    });
  },
  //delete producgt from cart
  deleteCartProduct: (data) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          { _id: ObjectId(data.cart) },
          {
            $pull: { products: { item: ObjectId(data.product) } },
          }
        )
        .then((response) => {
          resolve({ removeProduct: true });
        });
    });
  },
  //get total amount
  getTotalAmount: (userId) => {
    console.log(userId + "helloooooo");
    return new Promise(async (resolve, reject) => {
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: ObjectId(userId) });
      if (cart) {
        console.log("cart exist");
        if (cart.products.length > 0) {
          console.log("iam hereeeeeeeeeeee");
          let total = await db
            .get()
            .collection(collection.CART_COLLECTION)
            .aggregate([
              {
                $match: { user: ObjectId(userId) },
              },
              {
                $unwind: "$products",
              },
              {
                $project: {
                  item: "$products.item",
                  quantity: "$products.quantity",
                },
              },
              {
                $lookup: {
                  from: collection.PRODUCT_COLLECTION,
                  localField: "item",
                  foreignField: "_id",
                  as: "product",
                },
              },
              {
                $project: {
                  item: 1,
                  quantity: 1,
                  product: { $arrayElemAt: ["$product", 0] },
                },
              },
              {
                $group: {
                  _id: null,
                  total: {
                    $sum: {
                      $multiply: [
                        { $toInt: "$quantity" },
                        { $toInt: "$product.price" },
                      ],
                    },
                  },
                },
              },
            ])
            .toArray();
          resolve(total[0].total);
        } else {
          console.log("no products");
          let total = [{ total: 0 }];
          resolve(total[0].total);
        }
      } else {
        console.log("No cart");
        resolve();
      }
    }).catch((err) => {
      resolve(err);
    });
  },
  //sum of each product
  //get total amount
  getTotalAmountForOneProduct: (userId, proId) => {
    return new Promise(async (resolve, reject) => {
      let subtotal = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: {
              user: ObjectId(userId),
            },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $match: {
              item: ObjectId(proId),
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
          {
            $project: {
              unitPrice: { $toInt: "$product.price" },
              quantity: { $toInt: "$quantity" },
            },
          },
          {
            $project: {
              _id: null,
              subtotal: { $sum: { $multiply: ["$quantity", "$unitPrice"] } },
            },
          },
        ])
        .toArray();
      if (subtotal.length > 0) {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            { user: ObjectId(userId), "products.item": ObjectId(proId) },
            {
              $set: {
                "products.$.subtotal": subtotal[0].subtotal,
              },
            }
          )
          .then((response) => {
            console.log(response);
            resolve(subtotal[0].subtotal);
          });
      } else {
        subtotal = 0;
        resolve(subtotal);
      }
    });
  },
  getCartproductsList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: ObjectId(userId) });
      console.log(cart);
      if (cart) {
        if (cart.products.length > 0) {
          resolve(cart.products);
        }
      }
    });
  },
  //WISHLIST
  //addToWishlist
  addToWishlist: (proId, userId) => {
    proObj = {
      item: ObjectId(proId),
      quantity: 1,
    };
    return new Promise(async (resolve, reject) => {
      let userWishlist = await db
        .get()
        .collection(collection.WISHLIST_COLLECTION)
        .findOne({ user: ObjectId(userId) });
      if (userWishlist) {
        let proExist = userWishlist.products.findIndex(
          (product) => product.item == proId
        );
        console.log(proExist, "hello this important");
        if (proExist == -1) {
          db.get()
            .collection(collection.WISHLIST_COLLECTION)
            .updateOne(
              { user: ObjectId(userId) },
              {
                $push: { products: proObj },
              }
            )
            .then((response) => {
              console.log("iam new product");
              resolve({ newProduct: true });
            });
        } else {
          db.get()
            .collection(collection.WISHLIST_COLLECTION)
            .updateOne(
              { user: ObjectId(userId) },
              {
                $pull: { products: { item: ObjectId(proId) } },
              }
            )
            .then(() => {
              console.log("iam old product");
              resolve({ oldProduct: true });
            });
        }
      } else {
        let wishlistObj = {
          user: ObjectId(userId),
          products: [proObj],
        };
        await db
          .get()
          .collection(collection.WISHLIST_COLLECTION)
          .insertOne(wishlistObj)
          .then((response) => {
            console.log("iam new cart");
            resolve({ newProduct: true });
          });
      }
    });
  },
  //getWishlistproducts
  getWishlistproducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let wishlistItems = await db
        .get()
        .collection(collection.WISHLIST_COLLECTION)
        .aggregate([
          {
            $match: { user: ObjectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();

      resolve(wishlistItems);
    });
  },
  //removeProduct from wishlist
  removeProduct: (proId, userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.WISHLIST_COLLECTION)
        .updateOne(
          { user: ObjectId(userId) },
          {
            $pull: { products: { item: ObjectId(proId) } },
          }
        )
        .then((response) => {
          resolve(response);
        });
    });
  },//checkStock
  checkStock:(products)=>{
return new Promise((resolve,reject)=>{
  products.forEach((product) => {
    db.get()
      .collection(collection.PRODUCT_COLLECTION)
      .findOne({ _id: ObjectId(product.item) })
      .then((response) => {
        console.log(response);
        if (response.stock < 1 || response.stock < product.quantity) {
          resolve({ stockout: true });
        }else{
          resolve({ stockout: false })
        }
      })
  })
})
  },
  //place order
  placeOrder: (orderData, products, total,couponTotal) => {
    console.log(products);
    return new Promise(async (resolve, reject) => {
     console.log("pkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk"); 
      console.log(orderData, products, total);
      let paymentStatus = orderData.paymentMethod === "cod" ? "placed" : "pending";
      let status="placed"
let grandTotal=couponTotal?parseInt(couponTotal)+parseInt(orderData.discount):total
      let nowDate = new Date();
      let date = moment(nowDate).format("YYYY/MM/DD");
      let time = moment(nowDate).format("HH:mm:ss");


      let orderObj = {
        deliveryDetails: {
          userName: orderData.fname + " " + orderData.lname,
          mobile: orderData.mobile,
          address:
            "" +
            orderData.house +
            " ," +
            orderData.localplace +
            " ," +
            orderData.towncity,
          pincode: orderData.pin,
        },
        userId: ObjectId(orderData.userId),
        paymentMethod: orderData.paymentMethod,
        products: products,
        totalAmount: total,
        couponTotal:parseInt(couponTotal),
        discount: parseInt(orderData.discount),
        grandTotal:parseInt(grandTotal),
        coupon: orderData.coupon,
        refund:0,
        date: date,
        date2:nowDate,
        time: time,
        status:status,
        paymentStatus:paymentStatus
      };
      let userId = orderData.userId;
      userId = userId.toString();
      db.get()
        .collection(collection.COUPON_COLLECTION)
        .updateOne(
          { coupon: orderData.coupon },
          {
            $push: { users: userId },
            $inc: { limit: -1 },
          }
        )
        .then(() => {
          db.get()
            .collection(collection.ORDER_COLLECTION)
            .insertOne(orderObj)
            .then((response) => {
              db.get()
                .collection(collection.CART_COLLECTION)
                .deleteOne({ user: ObjectId(orderData.userId) });

              resolve(response);
            });
        });
    });
  },
  //Decrese stock after order

  stockChanger: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              _id: ObjectId(orderId),
            },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "products",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$products", 0] },
              newQty: {
                $subtract: [
                  { $arrayElemAt: ["$products.stock", 0] },
                  "$quantity",
                ],
              },
            },
          },
        ])
        .toArray();

      let proLen = products.length;
      for (let i = 0; i < proLen; i++) {
        let items = products[i];
        db.get()
          .collection(collection.PRODUCT_COLLECTION)
          .updateOne(
            { _id: ObjectId(items.item) },
            {
              $set: {
                stock: items.newQty,
              },
            }
          );
        if (items.newQty < 1) {
          db.get()
            .collection(collection.PRODUCT_COLLECTION)
            .updateOne(
              { _id: ObjectId(items.item) },
              {
                $set: {
                  stockout: true,
                },
              }
            );
          resolve({ stockout: true });
        } else {
          db.get()
            .collection(collection.PRODUCT_COLLECTION)
            .updateOne(
              { _id: ObjectId(items.item) },
              {
                $unset: {
                  stockout: "",
                },
              }
            );
          resolve({ stockout: false });
        }
      }
    });
  },
  getAllOrders: (userId) => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ userId: ObjectId(userId) })
        .toArray();
      console.log(orders);
      resolve(orders);
    });
  },
  //ordered product details
  getOrderProducts: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let orderItems = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { _id: ObjectId(orderId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
              status:"$products.status",
              subtotal:"$products.subtotal"
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,subtotal:1,status:1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
              //-------------------------------------
              subtotal: { $multiply: [{ $arrayElemAt: ["$product.price", 0] }, "$quantity"] }
            },
          },
        ])
        .toArray();
      console.log(orderItems);
      resolve(orderItems);
    });
  }, //getOrderData
  getOneOrderData: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let order = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .findOne({ _id: ObjectId(orderId) });
      resolve(order);
    });
  },
  //razorpay order generation
  generateRazorpay: (orderId, totalPrice) => {
   
    console.log(totalPrice,"=======totalPrice");
    return new Promise((resolve, reject) => {
      var options = {
       
        amount: totalPrice*100,
        currency: "INR",
        receipt: orderId.toString(),
      };
      console.log(options.amount,"========amount");
      instance.orders.create(options, (err, order) => {
        if (err) {
          console.log(err);
        } else {
          console.log("new order" + order);
          resolve(order);
        }
      });
    });
  },
  //verifypaymen status
  verifyPayment: (paymentData) => {
    return new Promise((resolve, reject) => {
      const crypto = require("crypto");
      let hmac = crypto.createHmac("sha256", key_secret);
      hmac.update(
        paymentData["payment[razorpay_order_id]"] +
          "|" +
          paymentData["payment[razorpay_payment_id]"]
      );
      hmac = hmac.digest("hex");
      if (hmac == paymentData["payment[razorpay_signature]"]) {
        console.log("signature matched");
        resolve();
      } else {
        console.log("signature not matched");
        reject();
      }
    });
  },

  //changePaymentStatus
  changePaymentStatus: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: ObjectId(orderId) },
          {
            $set: {
              paymentStatus: "placed",
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },
  //addUserAddress
  addUserAddress: (userId, userAddress) => {
    userAddress.addressId = userAddress.fname + new Date();
    return new Promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: ObjectId(userId) });
      if (user.address) {
        db.get()
          .collection(collection.USER_COLLECTION)
          .updateOne(
            { _id: ObjectId(userId) },
            { $push: { address: userAddress } },
            { upsert: true }
          )
          .then(() => {
            resolve();
          });
      } else {
        db.get()
          .collection(collection.USER_COLLECTION)
          .updateOne(
            { _id: ObjectId(userId) },
            { $set: { address: [userAddress] } },
            { upsert: true }
          )
          .then(() => {
            resolve();
          });
      }
    });
  },
  //getUserAddress
  getUserAddress: (userId) => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: ObjectId(userId) });
      resolve(user.address);
    });
  },
  //getOneAddress
  getOneAddress: (userId, addressId) => {
    return new Promise(async (resolve, reject) => {
      let address = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .aggregate([
          {
            $match: {
              _id: ObjectId(userId),
            },
          },
          {
            $unwind: "$address",
          },
          {
            $match: {
              "address.addressId": addressId,
            },
          },
          {
            $project: {
              address: 1,
              _id: 0,
            },
          },
        ])
        .toArray();

      resolve(address);
    });
  },
  //updateUserAddress
  updateUserAddress: (userId, addressId, data) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: ObjectId(userId), "address.addressId": addressId },
          {
            $set: {
              "address.$.fname": data.fname,
              "address.$.lname": data.lname,
              "address.$.house": data.house,
              "address.$.localplace": data.localplace,
              "address.$.towncity": data.towncity,
              "address.$.district": data.district,
              "address.$.state": data.state,
              "address.$.pin": data.pin,
              "address.$.mobile": data.mobile,
              "address.$.email": data.email,
            },
          }
        )
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },
  //deleteAddress
  deleteAddress:(user,id)=>{
return new Promise((resolve,reject)=>{
  db.get().collection(collection.USER_COLLECTION).updateOne({_id:ObjectId(user)},{$pull:{address:{addressId:id}}}).then(()=>{
    resolve()
  })
})
  },
  //getSearchProducts
  getSearchProducts: (key) => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({
          $or: [
            { title: { $regex: new RegExp("^" + key + ".*", "i") } },
            { brand: { $regex: new RegExp("^" + key + ".*", "i") } },
            { category: { $regex: new RegExp("^" + key + ".*", "i") } },
          ],
        })
        .toArray();
      resolve(products);
    });
  },
  //updateProPic
  updateProPic: (userId, proPic) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: ObjectId(userId) },
          { $set: { propic: proPic } },
          { upsert: true }
        );
      resolve();
    });
  },
  //getProPic
  getProPic: (userId) => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: ObjectId(userId) });
      resolve(user.propic);
    });
  },
};
