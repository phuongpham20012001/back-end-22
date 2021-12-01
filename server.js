const express = require("express");
const app = express();
const port = 3000;
const mysql = require("mysql");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const cors = require("cors");
const db = mysql.createConnection({
  host: "http://eu-cdbr-west-01.cleardb.com/",
  user: "b5e1cc05d567dc",
  password: "b0c9f2fc",
  database: "heroku_1881ea096897225",
});
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(passport.initialize());
app.use(
  session({
    secret: "mysecret",
    cookie: { maxAge: 1000 * 60 * 5 },
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.session());
app.get("/login", (req, res) => {
  res.send({message : "login"});
});
app.post("/login",
    passport.authenticate("local", {
      failureRedirect: "/login",
      successRedirect: "/home",
    })
  );
//check if the user is logged in
function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

function manager (req, res, next) {
  const user = req.session.passport.user;
  db.query(
    `SELECT root FROM user WHERE username ='${user}'`,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));

      if (result[0].root === "manager") {
        return next();
      } else {
        res.redirect("/login");
      }
    }
  );
  
  
}

function customer (req, res, next) {
  const user = req.session.passport.user;
  db.query(
    `SELECT root FROM user WHERE username ='${user}'`,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));

      if (result[0].root === "customer") {
        return next();
      } else {
        res.redirect("/login");
      }
    }
  );
  
  
}
app.get('/logout', function (req, res) {
  delete req.session.passport.user
  res.redirect('/login');
});  
function status (req, res) {
  setTimeout(function(){
    const user = req.session.passport.user
    console.log(user)
    ; 
 }, 1000);
}

// customer or manager
function authRoot(req, res, next) {
  const user = req.session.passport.user;
  db.query(
    `SELECT root FROM user WHERE username ='${user}'`,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));

      if (result.length === 0) {
        done(null, false);
      } else {
        if (result[0].root === "customer") {
         
          res.redirect("/customer")
        } else {
         
          res.redirect("/manager")
        }
      }
    }
  );

  next();
}

app.get("/home" ,authRoot ,checkAuthenticated, (req, res) => { 
  
});
app.get("/customer",checkAuthenticated,customer,(req, res) => {
  const user = req.session.passport.user;
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
app.get("/restaurant/search",(req, res) => {
  res.send({message :"restaurant search"});
});
app.post("/restaurant/search",(req, res) => {
  console.log(req.body.restaurant)
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
app.get("/customer/order/status",checkAuthenticated,customer,(req, res) => {
  
  const user = req.session.passport.user;
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
          else {res.send(result2)  }
           
        } 
      );
    } 
  );
 
       
});
// customer order history
app.get("/customer/order/history",checkAuthenticated,customer,(req, res) => {
  
  const user = req.session.passport.user;
  db.query(
    `SELECT user_id FROM user WHERE username ='${user}'`,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));
       var id = result.map(a => a.user_id)   
       db.query(
        "SELECT * FROM `order`  WHERE user_id =" + `${id}` +" AND order_status = 'Delivered'",
        function (err, rows) {
          if (err) throw err;
          var result2 = Object.values(JSON.parse(JSON.stringify(rows)));
           
          if (result2.length === 0) {res.send({message :"no order yet"})} else {res.send(result2)}
           
        } 
      );
    } 
  );
 
       
});
//customer comfirm order 
app.get("/customer/order/confirm",checkAuthenticated,customer,(req, res) => {
  const user = req.session.passport.user;
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
          else {res.send(result2)  }
           
        } 
      );
    } 
  );
})
app.post("/customer/order/confirm",checkAuthenticated,customer,(req, res) => {
   const user = req.session.passport.user;
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
app.get("/customer/order",checkAuthenticated,customer,(req, res) => {
  res.send({message :"Customer add order"})
});
app.post("/customer/order",checkAuthenticated,customer,(req, res) => {
  
  const user = req.session.passport.user;
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
// manager modify order status
app.get("/manager/order/modify/status",checkAuthenticated,manager,(req, res) => {
  const user = req.session.passport.user;
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
                
                  "SELECT * FROM `order`  WHERE product_id IN "+ stringSQL+ " AND order_status = 'Ordering'",
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
app.post("/manager/order/modify/status",checkAuthenticated,manager,(req, res) => {
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
app.get("/manager/order",checkAuthenticated, manager, (req, res) => {
  const user = req.session.passport.user;
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
                
                  "SELECT * FROM `order`  WHERE product_id IN "+ stringSQL+ " AND order_status = 'Ordering'",
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
// manager order history (need to fix)
app.get("/manager/order/history",checkAuthenticated, manager, (req, res) => {
  const user = req.session.passport.user;
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
                
                  "SELECT * FROM `order`  WHERE product_id IN "+ stringSQL+ " AND order_status = 'Delivered'",
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
app.get("/manager", checkAuthenticated,(req, res) => {
  const user = req.session.passport.user;
  db.query(
    `SELECT * FROM user WHERE username ='${user}'`,
    function (err, rows) {
      if (err) throw err;
      var result = Object.values(JSON.parse(JSON.stringify(rows)));
      res.send(result);
      console.log("manager")
     
    }
  );
});
// Create a new category
app.get("/category",checkAuthenticated,manager,(req, res) => {
 
  res.send({message :"category"})

});
app.post("/category",checkAuthenticated,manager,(req, res) => {
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
  new LocalStrategy(function (username, password, done) {
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
passport.serializeUser(function (user, done) {
  done(null, user.username);
});
passport.deserializeUser((username, done) => {
  try {
    db.query(
      `SELECT * FROM user WHERE username ='${username}'`,
      function (err, rows) {
        if (err) throw err;
        var result = Object.values(JSON.parse(JSON.stringify(rows)));

        if (result[0]) {
          done(null, result[0]);
        } else {
          return done(null, false);
        }
      }
    );
  } catch (err) {
    done(err, null);
  }
});
// create menu  
app.get("/restaurant/menu",checkAuthenticated ,manager,(req, res) => {
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
app.post("/restaurant/menu", (req, res) => {
  if(req.body.product_name && req.body.price &&  req.body.description && req.body.product_image && req.body.category_name && req.body.restaurant_name) {
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
                  (product_image= req.body.product_image),
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
app.get("/register", (req, res) => {

  res.send({message :"register"})
});
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
app.get("/register_restaurant",checkAuthenticated,manager,(req, res) => {
  res.send({message :"register_restaurant"})
});
app.post("/register_restaurant",checkAuthenticated,manager, (req, res) => {
  const user = req.session.passport.user;
  if( req.body.restaurant_name && req.body.address_restaurant &&  req.body.operating_hours && req.body.image && req.body.restaurant_type && req.body.price_level) {
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
            // console.log(result1)
            console.log(result3)
            if (result3.includes(result1[0]) === false ) {
              var sql =
              "INSERT INTO restaurant (restaurant_name, address, operating_hours,image,type,price_level,user_id) VALUES ?";
            
              var values = [
              [
                (restaurant_name = req.body.restaurant_name),
                (address = req.body.address_restaurant),
                (operating_hours = req.body.operating_hours),
                (image = req.body.image),
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
    res.send({message :"Please fill in all the information"})
  }
  
 

  
   
 
});

app.listen(process.env.PORT || 3000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});