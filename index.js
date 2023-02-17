const express = require("express");
const bodyParser = require("body-parser");
const postgres = require("postgres");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { initializeApp } = require("firebase/app");
const {
  getDatabase,
  ref,
  set,
  onValue,
  update,
  remove,
  get,
  child,
} = require("firebase/database");

require("dotenv").config();

const app = express();
const port = 3001;

//POSTGRES CONFIG
const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD, ENDPOINT_ID } = process.env;
const URL = `postgres://${PGUSER}:${PGPASSWORD}@${PGHOST}/${PGDATABASE}?options=project%3D${ENDPOINT_ID}`;

//FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyD7qaerHi2ZKqZ_dpU2bTh0mVaZr5qUqAE",
  authDomain: "project-f1758.firebaseapp.com",
  databaseURL: "https://project-f1758-default-rtdb.firebaseio.com",
  projectId: "project-f1758",
  storageBucket: "project-f1758.appspot.com",
  messagingSenderId: "480421565367",
  appId: "1:480421565367:web:eec3bb629671961ba58e32",
  measurementId: "G-GCWH00YNKD",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const sql = postgres(URL, { ssl: "require" });

//DATABASE HELPER FUNCTIONS
async function findUser(email, password) {
  const user = await sql`
      select
        *
      from users
      where email = ${email}
      and 
      password = ${password}
    `;

  // const user = await get(child(ref(db), `users/` + email)).then((snapshot) => {
  //     return snapshot.val();
  // });

  return user;
}

async function findEmail(email) {
  const user = await sql`
      select
        *
      from users
      where email = ${email}
    `;

  // const user = await get(child(ref(db), `users/` + email)).then((snapshot) => {
  //   if (snapshot.val()) return true;
  //   else return false;
  // });

  return user;
}

async function updatePreferences(email, brand, category) {
  const user = await sql`
      update users
      set
      brand=${brand},
      category=${category}
      where email = ${email}
    `;

  // const res = await update(ref(db, `users/` + email), {
  //   brand: brand,
  //   category: category,
  // });

  if (user.length == 1) return true;
  else return false;
}

async function registerUser(email, password) {
  const user = await sql`
      insert into users
      (email, password)
      values
      (${email},${password})
      returning email, password
    `;

  // set(ref(db, "users/" + email), {
  //   email: email,
  //   password: password,
  // });

  return user;
}

//JWT Middleware
function verifyToken(req, res, next) {
  const auth = req.headers["authorization"];
  if (auth) {
    const token = auth.split(" ")[1];
    jwt.verify(token, process.env.JWT_KEY, (err, valid) => {
      if (err) {
        res.status(401).send({ result: "provide valid token" });
      } else {
        next();
      }
    });
  } else {
    res.status(403).send({ result: "provide a token" });
  }
}

//HOME ROUTE
app.get("/", (req, res) => {
  res.send("server is running!");
});

//DATABASE ROUTES

//LOGIN ROUTE
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  findUser(email, password).then((response) => {
    if (response.length === 1) {
      const result = true;
      const brand = response[0].brand;
      const category = response[0].category;
      jwt.sign(
        { response },
        process.env.JWT_KEY,
        { expiresIn: "15m" },
        (err, token) => {
          if (err) {
            const result = false;
            res.send({ result, email });
          }
          res.send({ result, email, brand, category, auth: token });
        }
      );
    } else {
      const result = false;
      res.send({ result, email });
    }
  });
});

//REGISTER ROUTE
app.post("/register", (req, res) => {
  const { email, password } = req.body;
  findEmail(email).then((result) => {
    if (result.length >= 1) {
      const response = false;
      res.send({ response, email });
    } else {
      registerUser(email, password).then(() => {
        const response = true;
        jwt.sign(
          { email },
          process.env.JWT_KEY,
          { expiresIn: "15m" },
          (err, token) => {
            if (err) {
              const response = false;
              res.send({ response, email });
            }
            res.send({ response, email, auth: token });
          }
        );
      });
    }
  });
});

//PREFERENCE ROUTE
app.post("/preference", verifyToken, (req, res) => {
  const { email, brand, category } = req.body;
  updatePreferences(email, brand, category)
    .then((response) => {
      res.send(true);
    })
    .catch((err) => {
      console.log("Err", err);
    });
});

//SERVER LISTENER
app.listen(port, () => {
  console.log("running on port 3001!");
});
