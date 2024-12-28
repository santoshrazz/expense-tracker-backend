import { loginUser, registerUser, verifyUser, handleGoogleLogin } from "../controller/user.controller.js"

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
    fastify.get("/auth/google/callback", {
        handler: handleGoogleLogin
    })
}
export default userRoutes



// async function (request, reply) {
//     const { token } = await this.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request)

//     console.log(token.access_token)

//     // if later need to refresh the token this can be used
//     // const { token: newToken } = await this.getNewAccessTokenUsingRefreshToken(token)

//     reply.send({ access_token: token.access_token })
// }