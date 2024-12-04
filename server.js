import dotenv from 'dotenv'
import Fastify from 'fastify'
import fastifySensible from '@fastify/sensible'
import fastifyFormBody from '@fastify/formbody'
import fastifyMySql from '@fastify/mysql'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import userRoutes from './routes/user.route.js'
dotenv.config({ path: ".env" })
const fastify = Fastify({
    logger: true
})
fastify.register(fastifyMySql, {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    queueLimit: 0,
    connectionLimit: 10,
    promise: true
})
fastify.register(fastifyFormBody)
fastify.register(fastifySensible)
fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET_KEY
})
fastify.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET_KEY,
    hook: "onRequest",
    parseOptions: {}
})
fastify.register(fastifyCors, {
    origin: (origin, cb) => {
        const allowedOrigins = ["http://localhost:3000"]; // Replace with your frontend origin
        if (!origin || allowedOrigins.includes(origin)) {
            cb(null, true);
        } else {
            cb(new Error("Not allowed by CORS"));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Include OPTIONS
    credentials: true, // Allow credentials
});
fastify.register(userRoutes, { prefix: "/user" })
fastify.listen({ port: 5500 }, (err) => {
    if (err) {
        fastify.log.error(err)
        process.exit(1)
    }
})