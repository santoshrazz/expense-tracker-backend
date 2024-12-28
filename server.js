import dotenv from "dotenv";
import Fastify from "fastify";
import fastifySensible from "@fastify/sensible";
import fastifyFormBody from "@fastify/formbody";
import fastifyMySql from "@fastify/mysql";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import userRoutes from "./routes/user.route.js";
import fastifyOAuth from "@fastify/oauth2";

dotenv.config({ path: ".env" });
const fastify = Fastify({
    logger: true,
});

fastify.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET_KEY,
    parseOptions: {
        httpOnly: true,
        secure: false, // Set to true if using HTTPS
        // sameSite: 'None', // Set to 'None' for cross-origin requests
    },
});
fastify.register(fastifyOAuth, {
    name: "googleOAuth2",
    scope: ["email", "profile"],
    credentials: {
        client: {
            id: process.env.GOOGLE_CLIENT_ID,
            secret: process.env.GOOGLE_CLIENT_SECRET,
        },
        auth: fastifyOAuth.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: "/user/auth/google",
    callbackUri: process.env.GOOGLE_REDIRECT_URL,
});

fastify.addHook("onReady", async () => {
    const connection = await fastify.mysql.getConnection();
    try {
        await connection.query("CREATE DATABASE IF NOT EXISTS expenses");
        await connection.query("USE expenses")
        await connection.query(`
            CREATE TABLE IF NOT EXISTS user (
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255),
                age INT,
                gender ENUM('MALE', 'FEMALE'),
                isVerified BOOLEAN DEFAULT FALSE,
                verifyOTP INT,
                verifyOTPExpiry DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                profile_pic VARCHAR(255),
                role ENUM('USER', 'ADMIN', 'SUBADMIN') DEFAULT 'USER'
            )
        `);
        // console.log(`connection in preHandler`, connection);
    } catch (error) {
        console.log(`error in onReady Hook`, error);
    }
    finally {
        connection.release()
    }
});
fastify.register(fastifyMySql, {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    queueLimit: 0,
    connectionLimit: 10,
    promise: true,
});
fastify.register(fastifyFormBody);
fastify.register(fastifySensible);
fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET_KEY,
});
fastify.register(fastifyCors, {
    origin: (origin, cb) => {
        const allowedOrigins = ["http://localhost:3000"]; // Replace with your frontend origin
        if (!origin || allowedOrigins.includes(origin)) {
            cb(null, true);
        } else {
            cb(new Error("Not allowed by CORS"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Include OPTIONS
    credentials: true, // Allow credentials
});
fastify.get("/", (request, reply) => {
    reply.code(200).send({ message: "Hello from Api" });
});
fastify.register(userRoutes, { prefix: "/user" });
fastify.listen({ port: 5500 }, (err) => {
    if (err) {
        fastify.log.error(err);
        process.exit(1);
    }
});
