// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcrypt'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
});

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************


// TODO - Include your API routes here
app.get('/', (req, res) => {
  res.redirect('/login'); //this will call the /anotherRoute route in the API
});
app.get('/register', (req, res) => {
res.render('pages/register');
});

// Register
app.post('/register', async (req, res) => {
//hash the password using bcrypt library
const hash = await bcrypt.hash(req.body.password, 10);
var query = `INSERT INTO users (username, password) VALUES ('${req.body.username}', '${hash}') returning *;`;
db.task('post-everything', task => {
  return task.batch([task.any(query)]);
})
  // if query execution succeeds
  // query results can be obtained
  // as shown below
  .then(data => {
    res.redirect('/login');
  })
  // if query execution fails
  // send error message
  .catch(err => {
    res.render('pages/register');
  });
});

app.get('/login', (req, res) => {
res.render('pages/login');
});

// Login
app.post('/login', async (req, res) => {
// check if password from request matches with password in DB
const query = `SELECT username, password FROM "users" WHERE username = '${req.body.username}';`;
let user;
let password;
//let match;
await db.one(query)
  .then((data) => {
    
    user = data.username;
    password = data.password;

    if (user === undefined || user === '' || password === undefined || password === '') {
      res.render('pages/register', {
        error: true,
        message: 'User Undefined'
      });
    }

  })
  .catch((err) => {
    res.render('pages/login', {
      error: true,
      message: 'User Underfined'
    });
  });

  let match;
  try {
  match = await bcrypt.compare(req.body.password, password);
  } catch {
    match = false;
  }
  if (!match) {
    res.render('pages/login', {
      error: true,
      message: 'Password Incorrect'
    });
  } else {
  req.session.user = user;
  req.session.save();
  res.redirect('/discover');
  }
});

app.get('/welcome', (req, res) => {
    res.json({status: 'success', message: 'Welcome!'});
  });

app.get('/top3Users', (req, res) =>{
  var q =`SELECT COUNT(*) FROM user_to_ski_day GROUP BY username ORDER BY username DESC LIMIT 3;`;
  const TopUsers = 4;//RESULT HERE
});
  
app.get('/userStatistics', (req, res) =>{
  //query to get top speed of user
  var query = `SELECT username, top_speed FROM (SELECT user_to_ski_day.username, ski_day.top_speed FROM user_to_ski_day FULL JOIN ski_day ON user_to_ski_day.ski_day_id = ski_day.ski_day_id ORDER BY username, top_speed DESC) AS x WHERE username = '${req.body.username}' LIMIT 1;`;
  //query to get number of days of user
  var q2 = `SELECT count(*) FROM (SELECT username, top_speed FROM (SELECT user_to_ski_day.username, ski_day.top_speed FROM user_to_ski_day FULL JOIN ski_day ON user_to_ski_day.ski_day_id = ski_day.ski_day_id ORDER BY username, top_speed DESC) AS x WHERE username = '${req.body.username}') AS x;`;
  db.task('get-everything', task => {
    return task.batch([task.any(query), task.any(q2)]);
  })
  .then(data => {
    res.status(200).json({
      query: data[0],
      q2: data[1]
    });
  })
  .catch(err => {
    console.log(err);
    res.status('400').json({
      query: '',
      q2: '',
      error: err,
    });
  });
});

// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');