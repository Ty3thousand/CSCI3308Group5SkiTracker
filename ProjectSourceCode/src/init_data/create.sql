CREATE TABLE IF NOT EXISTS users
(
    username VARCHAR(50) PRIMARY KEY NOT NULL,
    email VARCHAR(50) NOT NULL,
    password VARCHAR(50) NOT NULL,
);

CREATE TABLE IF NOT EXISTS reviews
(
    review_id SERIAL PRIMARY KEY NOT NULL,
    description VARCHAR(400) NOT NULL,
    rating DECIMAL NOT NULL
);

CREATE TABLE IF NOT EXISTS mountains
(
    mountain_name VARCHAR(50) PRIMARY KEY NOT NULL,
    review_id INT NOT NULL,
    location VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS ski_day
(
    ski_day_id SERIAL PRIMARY KEY NOT NULL,
    mountain_name VARCHAR(50) NOT NULL,
    top_speed DECIMAL NOT NULL,
    FOREIGN KEY (mountain_name) REFERENCES mountains (mountain_name) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_to_ski_day
(
    username VARCHAR(50) NOT NULL,
    ski_day_id INT NOT NULL,
    FOREIGN KEY (username) REFERENCES users (username) ON DELETE CASCADE,
    FOREIGN KEY (ski_day_id) REFERENCES ski_day (ski_day_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mountains_to_reviews
(
    mountain_name VARCHAR(50),
    review_id INT NOT NULL,
    FOREIGN KEY (mountain_name) REFERENCES mountains (mountain_name) ON DELETE CASCADE,
    FOREIGN KEY (review_id) REFERENCES reviews (review_id) ON DELETE CASCADE
);
