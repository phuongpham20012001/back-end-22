const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const JwtStrategy = require("passport-jwt").Strategy,
      ExtractJwt = require("passport-jwt").ExtractJwt;
const mysql = require("mysql");
const passport = require("passport");
const BasicStrategy = require("passport-http").BasicStrategy
const cors = require("cors");
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
cloudinary.config({ 
  cloud_name: 'hkkf8la48', 
  api_key: '499861985493486',
  api_secret: 'J3CCBaeckEdx-QLPpSKaGRIM0qM'
});
const db = mysql.createPool({
  host: "eu-cdbr-west-01.cleardb.com",
  user: "b5e1cc05d567dc",
  password: "b0c9f2fc",
  database: "heroku_1881ea096897225",
});
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: '',
    format: async (req, file) => 'png', // supports promises as well
  
  },
});
var parser = multer({ storage: storage });
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(passport.initialize());




const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey :"MyVerySercretSigningKey"
}
passport.use(new JwtStrategy(jwtOptions, function(jwt_payload, done) {
  console.log("Processing JWT payload for token content:");
  console.log(jwt_payload);
    done(null, jwt_payload);
}));

app.post("/login",passport.authenticate('basic', { session: false }),(req, res) => {
  
  const payload = {
    user: req.user
  }
  const serectKey = "MyVerySercretSigningKey"
  const options = {
    expiresIn : '1d'
  }
  const generatedJWT= jwt.sign(payload,serectKey,options)
  res.send({jwt : generatedJWT})

});



function manager (req, res, next) {
  const user = req.user.user.username;
  db.query(
    `SELECT root FROM user WHERE username ='${user}'`,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));

      if (result[0].root === "manager") {
        return next();
      } else {
        res.send({message : "Need to login as manager"})
      }
    }
  );
  
  
}

function customer (req, res, next) {
  const user = req.user.user.username;
  db.query(
    `SELECT root FROM user WHERE username ='${user}'`,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));

      if (result[0].root === "customer") {
        return next();
      } else {
        res.send({message : "Need to login as customer"})
      }
    }
  );
  
  
}
app.get('/logout', function (req, res) {
  delete req.user
  res.send({message : "logout"});
});  


app.get("/customer",passport.authenticate('jwt', { session:false }),customer,(req, res) => {
  const user = req.user.user.username;
  db.query(
    `SELECT * FROM user WHERE username ='${user}'`,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));
      res.send(result);
      console.log("customer")
    }
  );
});
// browse restaurant (customer)
app.get("/restaurants",(req, res) => {    
  db.query(
    `SELECT * FROM restaurant `,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));
      console.log(result)
       res.send(result);
    }
    
    
  );
});
// Search for restaurant 

app.post("/restaurant/search",(req, res) => {
   db.query(
    `SELECT * FROM restaurant WHERE restaurant_name LIKE'%${req.body.restaurant}%'`,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));
      console.log(result)
       
       if(result.length !== 0){
         
        res.send(result);
       } else {
         res.send({message :"No match restaurant"})
       }
      
    }
    
    
  );
});
//Browse restaurant (customer)
app.get("/restaurant/:id", (req, res) => {
  db.query(
    `SELECT * FROM restaurant WHERE restaurant_id ='${req.params.id}'`,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));
      res.send(result);
      console.log(result)
     
    }
  );
  
});
//Browse restaurant menus (customer)
app.get("/restaurant/menu/:id", (req, res) => {
  db.query(
    `SELECT * FROM product WHERE restaurant_id ='${req.params.id}'`,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));
      res.send(result);
      console.log(result)
     
    }
  );
  
});
//customer order status
app.get("/customer/order/status",passport.authenticate('jwt', { session:false }),customer,(req, res) => {
  const user = req.user.user.username;
  db.query(
    `SELECT user_id FROM user WHERE username ='${user}'`,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));
       var id = result.map(a => a.user_id)   
       db.query(
        "SELECT product_id, order_status FROM `order`  WHERE user_id =" + `${id}` + " AND order_status != 'Delivered'",
        function (err, rows) {
          if (err) throw err;
          var result2 = Object.values(JSON.parse(JSON.stringify(rows)));
          
          if (result2.length === 0) { res.send({message :"No order yet"})}
          else { 
            var product_id = result2.map(a => a.product_id)

            var stringSQL="(";
              for (var i = 0; i < product_id.length; i++) { 
                
                stringSQL= stringSQL + ",'" +product_id[i] +"'"
              }
              stringSQL=stringSQL +")"
              

              var strArr = stringSQL.split("");
              strArr[1]="";
              stringSQL= strArr.join("");
                console.log(stringSQL)
             
                db.query(
                
                  "SELECT product.product_id, product_name, `order`.order_status FROM product INNER JOIN `order` ON product.product_id = `order`.product_id WHERE product.product_id IN "+ stringSQL + "AND `order`.order_status != 'Delivered'" + "AND `order`.user_id =" + `${id}`,
                   function (err, rows) {
                     if (err) throw err;
                     
                     var result3 = Object.values(JSON.parse(JSON.stringify(rows)));
                    
                     if (result3.length === 0) {
                       res.send({message:"No order yet"})
                     
                     } else {
                      
                      res.send(result3)
                     
                     }
                     
                   } 
                 );
           }
           
        } 
      );
    } 
  );
 
       
});
// customer order history 
app.get("/customer/order/history",passport.authenticate('jwt', { session:false }),customer,(req, res) => {
  
  const user = req.user.user.username;
  db.query(
    `SELECT user_id FROM user WHERE username ='${user}'`,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));
       var id = result.map(a => a.user_id)   
       db.query(
        "SELECT product_id, order_status FROM `order`  WHERE user_id =" + `${id}` + " AND order_status = 'Delivered'",
        function (err, rows) {
          if (err) throw err;
          var result2 = Object.values(JSON.parse(JSON.stringify(rows)));
          
          if (result2.length === 0) { res.send({message :"No order yet"})}
          else { 
            var product_id = result2.map(a => a.product_id)

            var stringSQL="(";
              for (var i = 0; i < product_id.length; i++) { 
                
                stringSQL= stringSQL + ",'" +product_id[i] +"'"
              }
              stringSQL=stringSQL +")"
              

              var strArr = stringSQL.split("");
              strArr[1]="";
              stringSQL= strArr.join("");
                console.log(stringSQL)
             
                db.query(
                
                  "SELECT product.product_id, product_name, `order`.order_status FROM product INNER JOIN `order` ON product.product_id = `order`.product_id WHERE product.product_id IN "+ stringSQL + "AND `order`.order_status = 'Delivered'" + "AND `order`.user_id =" + `${id}`,
                   function (err, rows) {
                     if (err) throw err;
                     
                     var result3 = Object.values(JSON.parse(JSON.stringify(rows)));
                    
                     if (result3.length === 0) {
                      //  res.send("No order yet")
                      res.send({message : "No order yet"})
                     } else {
                      
                      res.send(result3)
                     
                     }
                     
                   } 
                 );
           }
           
        } 
      );
    } 
  );
 
       
});
//customer comfirm order 
app.get("/customer/order/confirm",passport.authenticate('jwt', { session:false }),customer,(req, res) => {
  const user = req.user.user.username;
  db.query(
    `SELECT user_id FROM user WHERE username ='${user}'`,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));
       var id = result.map(a => a.user_id)   
       db.query(
        "SELECT product_id, order_status FROM `order`  WHERE user_id =" + `${id}` + " AND order_status != 'Delivered'",
        function (err, rows) {
          if (err) throw err;
          var result2 = Object.values(JSON.parse(JSON.stringify(rows)));
          
          if (result2.length === 0) { res.send({message :"No order yet"})}
          else { 
            var product_id = result2.map(a => a.product_id)

            var stringSQL="(";
              for (var i = 0; i < product_id.length; i++) { 
                
                stringSQL= stringSQL + ",'" +product_id[i] +"'"
              }
              stringSQL=stringSQL +")"
              

              var strArr = stringSQL.split("");
              strArr[1]="";
              stringSQL= strArr.join("");
                console.log(stringSQL)
             
                db.query(
                
                  "SELECT product.product_id, product_name, `order`.order_status FROM product INNER JOIN `order` ON product.product_id = `order`.product_id WHERE product.product_id IN "+ stringSQL + "AND `order`.order_status != 'Delivered' ",
                   function (err, rows) {
                     if (err) throw err;
                     
                     var result3 = Object.values(JSON.parse(JSON.stringify(rows)));
                    
                     if (result3.length === 0) {
                      //  res.send("No order yet")
                      console.log("no")
                     } else {
                      
                      res.send(result3)
                     
                     }
                     
                   } 
                 );
           }
           
        } 
      );
    } 
  );
})
app.post("/customer/order/confirm",passport.authenticate('jwt', { session:false }),customer,(req, res) => {
   const user = req.user.user.username;
  db.query(
    `SELECT user_id FROM user WHERE username ='${user}'`,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));
      
      var id = result.map(a => a.user_id)
      console.log(id)
       var sql = "UPDATE `order` SET order_status = 'Delivered' WHERE user_id = " + `${id}` + " AND product_id  =  " + `${req.body.product_id}`
  
                db.query(sql, function (err) {
                  if (err) throw err;
                  res.send({message :"confirm order success"})
                });
               
      } 
  );
 
       
});
//customer add order
app.post("/customer/order",passport.authenticate('jwt', { session:false }),customer,(req, res) => {
  
  const user = req.user.user.username;
  db.query(
    `SELECT user_id FROM user WHERE username ='${user}'`,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));
      
      var id = result.map(a => a.user_id)
      console.log(id)
       var sql = "INSERT INTO `order` ( `user_id`, `product_id`, `order_status`) VALUES ?";
      var values = [
        [
          (user_id = id),
          (product_id = req.body.product_id),
          (order_status = "Ordering"),
          
        ],
      ];
      console.log(values);
              db.query(sql, [values], function (err) {
                if (err) throw err;
               
              });
    } 
  );
 
  res.send({message :"okay"})       
});
app.get("/manager",passport.authenticate('jwt', { session:false }),manager,(req, res) => {
  const user = req.user.user.username;
  db.query(
    `SELECT * FROM user WHERE username ='${user}'`,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));
      res.send(result);
      console.log("customer")
    }
  );
});
// manager modify order status
// manager modify order status
app.get("/manager/order/modify/status",passport.authenticate('jwt', { session:false }),manager,(req, res) => {
  const user = req.user.user.username;
  db.query(
    `SELECT user_id FROM user WHERE username ='${user}'`,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));
     
      var user_id = result.map(a => a.user_id)
       
      db.query(
        `SELECT restaurant_id FROM restaurant WHERE user_id ='${user_id}'`,
        function (err, rows) {
          if (err) throw err;
          var result1 = Object.values(JSON.parse(JSON.stringify(rows)));
          var restaurant_id = result1.map(a => a.restaurant_id)
          db.query(
            `SELECT product_id FROM product WHERE restaurant_id ='${restaurant_id}'`,
            function (err, rows) {
              if (err) throw err;
              var result2 = Object.values(JSON.parse(JSON.stringify(rows)));
              
              var product_id = result2.map(a => a.product_id)
              
            var stringSQL="(";
              for (var i = 0; i < product_id.length; i++) { 
                
                stringSQL= stringSQL + ",'" +product_id[i] +"'"
              }
              stringSQL=stringSQL +")"
              

              var strArr = stringSQL.split("");
              strArr[1]="";
              stringSQL= strArr.join("");
                console.log(stringSQL)
             
                db.query(
                
                  "SELECT `order`.order_id, `order`.order_status, `order`.product_id, product.product_name FROM `order` INNER JOIN `product` ON `order`.product_id = product.product_id WHERE product.product_id IN "+ stringSQL + "AND `order`.order_status != 'Delivered' ",
                   function (err, rows) {
                     if (err) throw err;
                     
                     var result3 = Object.values(JSON.parse(JSON.stringify(rows)));
                    
                     if (result3.length === 0) {
                      //  res.send("No order yet")
                      console.log("no")
                     } else {
                      res.send(result3)
                     
                     }
                     
                   } 
                 );
              
              
            } 
            
          );
        } 
      );
      
    } 
  );

  
 
       
});
app.post("/manager/order/modify/status",passport.authenticate('jwt', { session:false }),manager,(req, res) => {
  if( req.body.order_id && req.body.order_status ) {
    var sql = "UPDATE `order` SET order_status = ? WHERE order_id = " + `${req.body.order_id}`
  console.log(req.body.order_status)
  var values = [
    [
      
      (order_status =req.body.order_status),
      
    ]
  ];
  db.query(sql, [values],function (err) {
    if (err) throw err;
    res.send({message :"okay"})
  });
    
  }  else {
    res.send({message :"Please fill in all the information"})
  }
  
       
});
// manager receive order 
app.get("/manager/order",passport.authenticate('jwt', { session:false }), manager, (req, res) => {
  const user = req.user.user.username;
  db.query(
    `SELECT user_id FROM user WHERE username ='${user}'`,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));
     
      var user_id = result.map(a => a.user_id)
       
      db.query(
        `SELECT restaurant_id FROM restaurant WHERE user_id ='${user_id}'`,
        function (err, rows) {
          if (err) throw err;
          var result1 = Object.values(JSON.parse(JSON.stringify(rows)));
          var restaurant_id = result1.map(a => a.restaurant_id)
          db.query(
            `SELECT product_id FROM product WHERE restaurant_id ='${restaurant_id}'`,
            function (err, rows) {
              if (err) throw err;
              var result2 = Object.values(JSON.parse(JSON.stringify(rows)));
              
              var product_id = result2.map(a => a.product_id)
              console.log(product_id)
              
            var stringSQL="(";
              for (var i = 0; i < product_id.length; i++) { 
                
                stringSQL= stringSQL + ",'" +product_id[i] +"'"
              }
              stringSQL=stringSQL +")"
              

              var strArr = stringSQL.split("");
              strArr[1]="";
              stringSQL= strArr.join("");
                console.log(stringSQL)
             
                db.query(
                
                  "SELECT `order`.order_status, `order`.product_id, product.product_name FROM `order` INNER JOIN `product` ON `order`.product_id = product.product_id WHERE product.product_id IN "+ stringSQL + "AND `order`.order_status != 'Delivered' ",
                   function (err, rows) {
                     if (err) throw err;
                     
                     var result3 = Object.values(JSON.parse(JSON.stringify(rows)));
                    
                     if (result3.length === 0) {
                      //  res.send("No order yet")
                      res.send({message: "No order yet!"});
                     } else {
                      res.send(result3)
                     
                     }
                     
                   } 
                 );
              
              
            } 
            
          );
        } 
      );
      
    } 
  );

});
// manager order history 
app.get("/manager/order/history",passport.authenticate('jwt', { session:false }), manager,(req, res) => {
  const user = req.user.user.username;
  db.query(
    `SELECT user_id FROM user WHERE username ='${user}'`,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));
      
      var user_id = result.map(a => a.user_id)
      db.query(
        `SELECT restaurant_id FROM restaurant WHERE user_id ='${user_id}'`,
        function (err, rows) {
          if (err) throw err;
          var result1 = Object.values(JSON.parse(JSON.stringify(rows)));
         
          var restaurant_id = result1.map(a => a.restaurant_id)
          db.query(
            `SELECT product_id FROM product WHERE restaurant_id ='${restaurant_id}'`,
            function (err, rows) {
              if (err) throw err;
              var result2 = Object.values(JSON.parse(JSON.stringify(rows)));
              
              var product_id = result2.map(a => a.product_id)
              var stringSQL="(";
              for (var i = 0; i < product_id.length; i++) { 
                
                stringSQL= stringSQL + ",'" +product_id[i] +"'"
              }
              stringSQL=stringSQL +")"
              

              var strArr = stringSQL.split("");
              strArr[1]="";
              stringSQL= strArr.join("");
                console.log(stringSQL)
             
                db.query(
                
                  "SELECT `order`.order_status, `order`.product_id, product.product_name FROM `order` INNER JOIN `product` ON `order`.product_id = product.product_id WHERE product.product_id IN "+ stringSQL + "AND `order`.order_status = 'Delivered' ",
                   function (err, rows) {
                     if (err) throw err;
                     
                     var result3 = Object.values(JSON.parse(JSON.stringify(rows)));
                    
                     if (result3.length === 0) {
                      //  res.send("No order yet")
                      console.log("no")
                     } else {
                      res.send(result3)
                     
                     }
                     
                   } 
                 );
            } 
            
          );
        } 
      );
      
    } 
  );

});
// Create a new category

app.post("/category",passport.authenticate('jwt', { session:false }),manager,(req, res) => {
  db.query(
    `SELECT category_name FROM category `,
      function (err, rows) {
        if (err) throw err;
        var result = Object.values(JSON.parse(JSON.stringify(rows)));
         var result1 = result.map(a => a.category_name);
         if(result1.includes(req.body.category_name) === false) {
          var sql =
          "INSERT INTO category (category_name) VALUES ?";
          var values = [[category_name =req.body.category_name]];
          
          db.query(sql, [values],function (err) {
            if (err) throw err;
            res.send({message :"okay"})
          });
         } else {res.send({message : "categoryname is already exists"})}
         
          
        
       
     
      } 
      
     
  ) 
 
});
//passport login
passport.use(
  new BasicStrategy(function (username, password, done) {
    try {
      db.query(
        `SELECT * FROM user WHERE username ='${username}'`,
        function (err, rows) {
          if (err) throw err;
          var result = Object.values(JSON.parse(JSON.stringify(rows)));

          if (result.length === 0) {
            done(null, false);
          } else {
            if (result[0].password === password) {
              done(null, result[0]);
            } else {
              done(null, false);
            }
          }
        }
      );
    } catch (err) {
      done(err, null);
    }
  })
);

// create menu  
app.get("/restaurantmenu",(req, res) => {
 
  db.query(
    `SELECT category_name FROM category `,
    function (err, rows) {
      if (err) throw err;
      var category_name = Object.values(JSON.parse(JSON.stringify(rows)));
      
      db.query(
        `SELECT restaurant_name FROM restaurant `,
        function (err, rows) {
          if (err) throw err;
          var restaurant_name = Object.values(JSON.parse(JSON.stringify(rows)));
         console.log( category_name,  restaurant_name)
         const combined = [...category_name, ...restaurant_name];
         res.send(combined)
        }
        
    ) 
   
    }
    
);
});
app.post("/restaurantmenu",passport.authenticate('jwt', { session:false }), parser.single('image'), manager,(req, res) => {
  if(req.body.product_name && req.body.price &&  req.body.description && req.file.path && req.body.category_name && req.body.restaurant_name) {
    db.query(
      `SELECT category_id FROM category WHERE category_name ='${req.body.category_name}'`,
        function (err, rows) {
          if (err) throw err;
          var result = Object.values(JSON.parse(JSON.stringify(rows)));
          
          var category = result.map(a => a.category_id)
          db.query(
            `SELECT restaurant_id FROM restaurant WHERE restaurant_name ='${req.body.restaurant_name}'`,
              function (err, rows) {
                if (err) throw err;
                var result = Object.values(JSON.parse(JSON.stringify(rows)));
                
                var restaurant = result.map(a => a.restaurant_id)
                var sql =
                "INSERT INTO product (product_name, price, description,product_image,category_id,restaurant_id) VALUES ?";
          
                var values = [
                [
                  (product_name = req.body.product_name),
                  (price = req.body.price),
                  (description = req.body.description),
                  (product_image= req.file.path),
                  (category_id = category),
                  (restaurant_id = restaurant)
                ],
              ];
          
              console.log(values);
              db.query(sql, [values], function (err) {
                if (err) throw err;
               
              });
               res.send({message: "okay"})
               
              }
             
          );
          
        
        }
       
    );
    
  } else {
    res.send({message :"Please fill in all the information"})
  }
})
//create user account and account is unique
app.post("/register", (req, res) => {
  
  if(req.body.username && req.body.password &&  req.body.first_name && req.body.last_name && req.body.address && req.body.phone_number && req.body.country && req.body.date_of_birth && req.body.root) {
    db.query(
      `SELECT * FROM user WHERE username ='${req.body.username}'`,
      function (err, rows) {
        if (err) throw err;
        var result = Object.values(JSON.parse(JSON.stringify(rows)));

        if (result.length === 0) {
          var sql =
            "INSERT INTO user (username, password, first_name,last_name,address,phone_number,country,date_of_birth,root) VALUES ?";

          var values = [
            [
              (username = req.body.username),
              (password = req.body.password),
              (first_name = req.body.first_name),
              (last_name = req.body.last_name),
              (address = req.body.address),
              (phone_number = req.body.phone_number),
              (country = req.body.country),
              (date_of_birth = req.body.date_of_birth),
              (root = req.body.root),
            ],
          ];
          console.log(values)
          db.query(sql, [values], function (err) {
            if (err) throw err;
          });
          res.send({message: "OKay"})
        } else {
          res.send({message:"account name is already in use"})
        }
      }
    );
    
  } else {
    res.send({message :"Please fill in all the information"})
  }
   
  
});
// create restaurant
app.post("/register_restaurant",passport.authenticate('jwt', { session:false }), parser.single('image'), manager,(req, res) => {
  const user = req.user.user.username;
  if( req.body.restaurant_name && req.body.address_restaurant &&  req.body.operating_hours && req.file.path && req.body.restaurant_type && req.body.price_level) {
    db.query(
      `SELECT user_id FROM user WHERE username ='${user}'`,
        function (err, rows) {
          if (err) throw err;
          var result = Object.values(JSON.parse(JSON.stringify(rows)));
           var result1 = result.map(a => a.user_id)
           db.query("SELECT user_id FROM restaurant", function (err, rows) {
            if (err) throw err;
            var result2 = Object.values(JSON.parse(JSON.stringify(rows)));
            var result3 = result2.map(a => a.user_id)
         
           
            
            if (result3.includes(result1[0]) === false ) {
              var sql =
              "INSERT INTO restaurant (restaurant_name, address, operating_hours,image,type,price_level,user_id) VALUES ?";
               
               
              var values = [
              [
                (restaurant_name = req.body.restaurant_name),
                (address = req.body.address_restaurant),
                (operating_hours = req.body.operating_hours),
                (image = req.file.path),
                (restaurant_type = req.body.restaurant_type),
                (price_level = req.body.price_level),
                (user_id = result1)
              ],
            ];
            
            
            db.query(sql, [values], function (err) {
              if (err) throw err;
            });
             res.send({message :"Okay"})
            }
            else 
             {res.send({message :"1 manager account can only create 1 restaurant"})}
          
          });
       
        } 
        
       
    ) 
    
  }  else {
    
    // console.log(req.file.path)
    
    res.send({message :"Please fill in all the information"})
  }
  
 

  
   
 
});

app.listen(process.env.PORT || 3000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});
