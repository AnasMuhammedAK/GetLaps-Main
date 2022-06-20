const db = require("../config/connection");
const collection = require("../config/collections");
const { response } = require("../app");
const { ObjectId } = require("mongodb");
const { CATEGORY_COLLECTION } = require("../config/collections");
module.exports = {
  //add product
  addProduct: (product) => {
    
    return new Promise((resolve, reject) => {
      product.discound=0
    product.proPercentage=0
    product.shippingCost=40
    product.stock=parseInt(product.stock)
    product.mrp=parseInt(product.mrp)
    product.price=parseInt(product.price)
    product.date=new Date()
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .insertOne(product)
        .then((result) => {
          console.log(result);
          resolve(result.insertedId);
        });
    });
  },
  //view product list for admin
  getAllProduct: () => {
    return new Promise(async (resolve, reject) => {
      let result = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find()
        .toArray(); 

      resolve(result);
    });
  },
  getNewProducts: () => {
    return new Promise(async (resolve, reject) => {
      let result = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find().limit(6).sort({date:-1})
        .toArray(); 

      resolve(result);
    });
  },
  //get new products
  getnewProduct: () => {
    return new Promise(async (resolve, reject) => {
      let result = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find().sort({date:-1}).limit(4)
        .toArray(); 

      resolve(result);
    });
  },
  //get gaming laps
  getGamingLap: () => {
    return new Promise(async (resolve, reject) => {
      let result = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({category:"Gaming Laptop"}).limit(4)
        .toArray(); 

      resolve(result);
    });
  },
 // view all detailes of one product
  getOneProductDetails: (proId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: ObjectId(proId) })
        .then((productDetails) => {
          console.log(productDetails);
          resolve(productDetails);
        });
    });
  },
  //updateProducts
  updateProducts: (proId, proDetails) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          { _id: ObjectId(proId) },
          {
            $set: {
              category: proDetails.category,
              brand: proDetails.brand,
              title: proDetails.title,
              specs: proDetails.specs,
              description: proDetails.description,
              stock: parseInt(proDetails.stock),
              price: parseInt(proDetails.price),
              mrp:parseInt(proDetails.mrp),
              updated: new Date()
            },
          },
          { upsert: true }
        )
        .then((result) => {
          console.log("data updated");
          resolve(result);
        });
    });
  },

  //delete products
  deleteProduct: (proId) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .deleteOne({ _id: ObjectId(proId) })
        .then((respons) => {
          resolve(respons);
        });
    });
  },

  //category
  //add product category
  addCategory: (cateData) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.CATEGORY_COLLECTION)
        .insertOne(cateData)
        .then((response) => {
          //   console.log(response);
          resolve(response.insertedId);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  //get list of all category
  getAllCategory: () => {
    return new Promise(async (resolve, reject) => {
      let categories = await db
        .get()
        .collection(collection.CATEGORY_COLLECTION)
        .find()
        .toArray();
      resolve(categories);
    });
  },
  //delete category
  deleteCategory: (cateId) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collection.CATEGORY_COLLECTION)
        .deleteOne({ _id: ObjectId(cateId) })
        .then((respons) => {
          resolve(respons);
        });
    });
  },
  //brand
  //add brand
  addBrand: (brandData) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.BRAND_COLLECTION)
        .insertOne(brandData)
        .then((response) => {
          console.log(response);
          resolve(response.insertedId);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  //get list of all brand
  getAllBrands: () => {
    return new Promise(async (resolve, reject) => {
      let brands = await db
        .get()
        .collection(collection.BRAND_COLLECTION)
        .find()
        .toArray();
      resolve(brands);
    });
  },
  //delete brands
  deleteBrand: (brandId) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collection.BRAND_COLLECTION)
        .deleteOne({ _id: ObjectId(brandId) })
        .then((respons) => {
          resolve(respons);
        });
    });
  },
  //upload products images

  uploadImageId: (proId, imgId1, imgId2, imgId3, imgId4) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          { _id: ObjectId(proId) },
          {
            $set: {
              image: [
                { image1: imgId1 },
                { image2: imgId2 },
                { image3: imgId3 },
                { image4: imgId4 },
              ],
            },
          },
          { upsert: true }
        );

      resolve();
    });
  },
  //upload category images
  uploadCateImg: (cateId, imageId) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.CATEGORY_COLLECTION)
        .updateOne(
          { _id: ObjectId(cateId) },
          { $set: { image: imageId } },
          { upsert: true }
        );
      resolve();
    });
  },
  //upload brand images
  uploadBrandImg: (brandId, imageId) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.BRAND_COLLECTION)
        .updateOne(
          { _id: ObjectId(brandId) },
          { $set: { image: imageId } },
          { upsert: true }
        );
      resolve();
    });
  },
  //filter
  searchFilter :(filter,price) => {
    return new Promise(async (resolve, reject) => {
        let result
        if (filter.length>0){
             result = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
                {
                    $match:{ $or:filter}
                },
                {
                    $match:{price:{$lt:price}}
                }
            ]).toArray()
        } else{
             result = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
                
                {
                    $match:{price:{$lt:price}}
                }
            ]).toArray()
        }
        
        // console.log("",result);
        resolve(result)
    })
  },
  //or---------------------
  //with brands
  getProbrands:(name)=>{
    return new Promise(async(resolve,reject)=>{
let products= await db.get().collection(collection.PRODUCT_COLLECTION).find({brand:name}).toArray()
resolve(products)
    })
  },
   //with category
   getProCategory:(name)=>{
    return new Promise(async(resolve,reject)=>{
let products= await db.get().collection(collection.PRODUCT_COLLECTION).find({category:name}).toArray()
resolve(products)
    })
  }
};
