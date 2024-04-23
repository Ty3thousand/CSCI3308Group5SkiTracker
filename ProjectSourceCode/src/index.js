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
const { notStrictEqual } = require('assert');

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

app.use(express.static('src/resources/'))

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************
const user = {
  username: undefined,
  email: undefined,
  password: undefined,
};

//Authentication Middleware
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to login page.
    return res.redirect('/login');
  }
  next();
};




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
var query = `INSERT INTO users (username, email, password, days_skied) VALUES ('${req.body.username}', '${req.body.email}','${hash}', 0) returning *;`;
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
const query = `SELECT username, password, email FROM "users" WHERE username = '${req.body.username}';`;
let usernam;
let password;
//let match;
await db.one(query)
  .then((data) => {
    user.password = req.body.password;
    user.email = data.email;
    user.username = req.body.username;
    usernam = data.username;
    password = data.password;

    if (usernam === undefined || usernam === '' || password === undefined || password === '') {
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
  res.redirect('/home');
  }
});


//Put all page routes below this app.use. This will verify that the user is logged in before sending them to the page.
app.use(auth);





app.get('/profile', (req, res) => {
  res.render('pages/profile', {
    username: req.session.user.username,
    email: req.session.user.email,
    password: req.session.user.password,
  });
});

app.post('/profile', async (req, res) => {
  try {
    // Hash the password using bcrypt library
    const hash = await bcrypt.hash(req.body.password, 10);
    
    // Update user information in the database
    const query = `
      UPDATE users 
      SET username = '${req.body.username}', 
          email = '${req.body.email}', 
          password = '${hash}' 
      WHERE username = '${user.username}' 
      RETURNING *
    `;
    
    // Execute the update query
    const data = await db.one(query);
    
    // If the user is found
    if (data) {
      const user = {
        username: req.body.username,
        email: req.body.email,
        password: req.body.password
      };
      
      req.session.user = user;
      req.session.save();
      
      res.redirect('/profile');
    } else {
      // If user is undefined, render error page
      res.render('pages/register', {
        error: true,
        message: 'User Undefined'
      });
    }
  } catch (err) {
    // If an error occurs during query execution, render error page
    res.render('pages/profile', { error: true, message: err.message });
  }
});

  
  app.get('/login', (req, res) => {
  res.render('pages/login');
  });

app.get('/welcome', (req, res) => {
    res.json({status: 'success', message: 'Welcome!'});
  });

app.get('/reviews', (req, res) =>{
const getView = 'CREATE VIEW review_temp AS SELECT description, review_id, rating FROM reviews ORDER BY rating DESC;';
const getTop3 = 'SELECT mountain_name, description, rating FROM mountains_to_reviews, review_temp WHERE mountains_to_reviews.review_id=review_temp.review_id';
const clearView = 'DROP VIEW review_temp';


//Render page with the top three reviews (May update this to send all reviews and display in carousel style)

db.task('get-everything', async task => {
  return task.batch([
    await task.any(getView), //query 1: Get the view
    await task.any(getTop3), //query 2: Use the view
    await task.any(clearView) //query 3: Clear the view so if page is refreshed there is no duplicate view
  ]);
})
  .then(data => {
    console.log(data);
    res.render('pages/reviews', {data: data[1], username: req.session.user.username,})
  })
  .catch(err => {
    console.log(err);
  });
});


app.post('/reviews', (req, res)=>{
  const query = 'WITH connection AS (SELECT * FROM reviews LEFT JOIN mountains_to_reviews ON reviews.review_id=mountains_to_reviews.review_id) SELECT description, mountain_name, rating FROM connection WHERE LOWER(mountain_name) LIKE LOWER($1) LIMIT 10';
  const getView = 'CREATE VIEW review_temp AS SELECT description, review_id, rating FROM reviews ORDER BY rating DESC;';
  const getTop3 = 'SELECT mountain_name, description, rating FROM mountains_to_reviews, review_temp WHERE mountains_to_reviews.review_id=review_temp.review_id';
  const clearView = 'DROP VIEW review_temp';

    db.task('get-everything', async task =>{
      return task.batch([
        await task.any(getView), //query 1: Get the view
        await task.any(getTop3), //query 2: Use the view
        await task.any(clearView),
        await task.any(query, req.body.mountain+'%')
      ])
    })
  
  .then(data =>{
    console.log(data);
    res.render('pages/reviews', {searchResult: data[3], data: data[1]})
  })
  .catch(err => {
    console.log(err);
  })

});

//logout api
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.render("pages/login",{ message: "Logged Out!" });  
});

/*app.get('/top3Users', (req, res) =>{
  const TopUsers = `SELECT username, days_skied FROM users ORDER BY days_skied DESC;`;
  db.any(TopUsers)
  .then(data => {
    console.log(data);
    res.render('pages/home', {
      TopUsers: data[0],
    });
  })
  .catch(err => {
    console.log(err);
    res.status('400').json({
      TopUsers: null,
      error: err,
    });
  });
});*/

app.get('/home', (req, res) =>{
  const userTopSpeed = `SELECT MAX(sd.top_speed) FROM users u JOIN user_to_ski_day usd ON u.username = usd.username JOIN ski_day sd ON usd.ski_day_id = sd.ski_day_id WHERE u.username = '${req.body.username}';`;
  const TopUsers = `SELECT username, days_skied FROM users ORDER BY days_skied DESC LIMIT 3;`
  const daysSkied = `SELECT count(*) FROM (SELECT username, top_speed FROM (SELECT user_to_ski_day.username, ski_day.top_speed FROM user_to_ski_day FULL JOIN ski_day ON user_to_ski_day.ski_day_id = ski_day.ski_day_id ORDER BY username, top_speed DESC) AS x WHERE username = '${req.body.username}') AS x;`;
  const user_favmnt = `SELECT mountain_name, COUNT(*) AS num FROM (SELECT username, mountain_name FROM(SELECT user_to_ski_day.username, ski_day.mountain_name FROM user_to_ski_day FULL JOIN ski_day ON user_to_ski_day.ski_day_id = ski_day.ski_day_id) AS x WHERE username = '${req.body.username}') AS y GROUP BY mountain_name ORDER BY mountain_name ASC, COUNT(*) DESC LIMIT 1;`
  const avg_ts = 'SELECT ROUND(AVG(top_speed), 2) FROM ski_day;';
  const avg_ds = 'SELECT ROUND(AVG(days_skied), 2) FROM users;';
  const avg_favmnt = 'SELECT mountain_name FROM mountains_to_reviews GROUP BY mountain_name ORDER BY COUNT(*) DESC LIMIT 1;';

  db.task('get-everything', async task=>{
    return task.batch([
      await task.any(userTopSpeed), 
      await task.any(TopUsers), 
      await task.any(daysSkied), 
      await task.any(user_favmnt), 
      await task.any(avg_ts), 
      await task.any(avg_ds), 
      await task.any(avg_favmnt)]);
  })

  .then(data => {
    console.log(data);
    res.render('pages/home', {
      username: req.session.user.username,
      user_ts: data[0][0],
      u1: data[1][0],
      u2: data[1][1],
      u3: data[1][2],
      daysSkied: data[2][0],
      user_favmnt: data[3][0],
      avg_ts: data[4][0],
      avg_ds: data[5][0],
      avg_favmnt: data[6][0],
    });
  })
  .catch(err => {
    console.log(err);
  })

});

/*app.get('/userStatistics', (req, res) =>{
  //query to get top speed of user
  var query = `SELECT username, top_speed FROM (SELECT user_to_ski_day.username, ski_day.top_speed FROM user_to_ski_day FULL JOIN ski_day ON user_to_ski_day.ski_day_id = ski_day.ski_day_id ORDER BY username, top_speed DESC) AS x WHERE username = '${req.body.username}' LIMIT 1;`;
  
  //query to get number of days of user
  var q2 = `SELECT count(*) FROM (SELECT username, top_speed FROM (SELECT user_to_ski_day.username, ski_day.top_speed FROM user_to_ski_day FULL JOIN ski_day ON user_to_ski_day.ski_day_id = ski_day.ski_day_id ORDER BY username, top_speed DESC) AS x WHERE username = '${req.body.username}') AS x;`;
  db.task('get-everything', task => {
    return task.batch([task.any(query), task.any(q2)]);
  })
  .then(data => {
    console.log(data);
    res.render('pages/home', {
      query: data[0],
      q2: data[1],
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
});*/


app.get('/stats', (req, res) => {
  res.render('pages/stats');
  });
  

app.post('/stats', (req, res) => {
  const { mountain, top_speed, reviewOption, reviewText, rating } = req.body;
  console.error('Error', mountain, top_speed, reviewOption, reviewText, rating);
  // Check if all required fields are present
  if (!mountain || !top_speed || !reviewOption) {
    return res.status(400).send('All fields are required.');
  }

  // Initialize variables for review-related database operations
  let reviewId = null;
  let insertReviewPromise = Promise.resolve();
  let skiday_id = null;

  // If reviewOption is 'yes', insert review into the reviews table
  if (reviewOption === 'yes' && reviewText && rating) {
    insertReviewPromise = db.one('INSERT INTO reviews (description, rating) VALUES ($1, $2) RETURNING review_id', [reviewText, rating])
      .then(data => {
        reviewId = data.review_id;
      })
      .catch(error => {
        console.error('Error inserting review:', error);
        throw new Error('An error occurred while submitting your review.');
      });
  }

  // Execute promises sequentially
  insertReviewPromise
    .then(() => {
      // Insert user and ski day association into user_to_ski_day table
      return db.any(`SELECT ski_day_id FROM ski_day WHERE mountain_name = '${mountain}';`)
        .then(data => {
          console.log(data)
          if (data.length > 0) {
            skiday_id = data[0].ski_day_id; // Assigning the ski_day_id from the first result
          } else {
            throw new Error('Ski day not found for the specified mountain.');
          }
        })
        .then(() => {
          return db.none('INSERT INTO user_to_ski_day (username, ski_day_id) VALUES ($1, $2)', [req.session.user.username, skiday_id]);
        });
    })
    .then(() => {
      if (reviewId) {    // If reviewId is not null, insert mountain into mountains_to_reviews 
        return db.none('INSERT INTO mountains_to_reviews (mountain_name, review_id) VALUES ($1, $2)', [mountain, reviewId]);
      }
      return null;    // Otherwise just return with null
    })
    .then(() => {
      // Insert ski day info into ski_day table
      return db.none('INSERT INTO ski_day (mountain_name, top_speed) VALUES ($1, $2)', [mountain, top_speed]);
    })
    .then(() => {
      // Respond with a confirmation message or redirect the user to another page
      res.send('Your statistics have been submitted successfully.');
    })
    .catch(error => {
      console.error('Error:', error.message || error);
      res.status(500).send(error.message || 'An error occurred while submitting.');
    });
});

// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');