import { loginUser, registerUser, verifyUser } from "../controller/user.controller.js"

async function userRoutes(fastify, options) {
    fastify.post('/register', {
        schema: {
            body: {
                type: "object",
                required: ["name", "email", "age", "gender",],
                properties: {
                    email: {
                        type: "string", format: "email"
                    },
                    name: {
                        type: "string"
                    },
                    password: {
                        type: "string", minLength: 4
                    },
                    age: {
                        type: "number"
                    },
                    gender: {
                        type: "string"
                    }
                }
            }
        },
        handler: registerUser
    })
    fastify.post("/verify", {
        schema: {
            body: {
                type: "object",
                required: ["email", "otp"],
                properties: {
                    email: {
                        type: "string", format: "email"
                    },
                    otp: {
                        type: "number"
                    }
                }
            }
        },
        handler: verifyUser
    })
    fastify.post("/login", {
        schema: {
            body: {
                type: "object",
                required: ["email", "password"],
                properties: {
                    email: {
                        type: "string", format: "email"
                    },
                    password: {
                        type: "string", minLength: 4
                    }
                }
            }
        },
        handler: loginUser
    })
}
export default userRoutes