import bcryptjs from 'bcryptjs'
import sendEmail from '../utils/nodemailer.js';
async function registerUser(request, reply) {
    // console.log(request.body);
    const connection = await request.server.mysql.getConnection();
    try {

        // Getting the data from the body
        const { name, email, age, gender, password } = request.body;

        // checking if user already Exists
        const [tempUser] = await connection.execute("SELECT * FROM user WHERE EMAIL = ?", [email])
        if (tempUser[0]) {
            return reply.code(400).send({ message: "Account Already Created, Log into your account" })
        }

        //Hashing password 
        let hashedPassword;
        if (password) {
            hashedPassword = await bcryptjs.hash(password, 10)
        }
        // Generating otp
        const verifyOtp = Math.floor(100000 + Math.random() * 900000);
        // Getting mysql connection and creating user
        const emailResponse = await sendEmail(email, { name: "Welcome to Expense tracker ", OTP: verifyOtp })
        console.log(`emailResponse`, emailResponse);
        if (!emailResponse) {
            return reply.status(404).send({ message: "fail to send email to user" })
        }
        const [rows] = await connection.execute(
            "INSERT INTO USER(name, email, password, age, gender, verifyOtp, verifyOtpExpiry) VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))",
            [name, email, hashedPassword, age, gender, verifyOtp]
        );

        // Send email to user if account created successfully
        if (rows.affectedRows == 0) {
            return reply.status(404).send({ message: "failed to create user account" })
        }
        const [user] = await connection.execute(
            "SELECT name,email,gender,profile_pic,coin,role FROM USER WHERE email = ?", [email]
        );
        reply.code(201).send({ message: 'User registered successfully', user });
    } catch (error) {
        console.log(error.message);
        reply.code(400).send({ message: error.message })
    }
    finally {
        connection.release()
    }
}

async function verifyUser(request, reply) {
    const connection = await request.server.mysql.getConnection();
    try {
        const { email, otp } = request.body;

        const [tempUser] = await connection.execute("SELECT * FROM user where email = ?", [email])

        // check ifUser already verified
        if (tempUser[0].isVerified) {
            return reply.code(400).send({ message: "User already Verified" })
        }
        // check is user verifying otp under time
        const isUnderTime = tempUser[0].verifyOTPExpiry > Date.now() + (30 * 60)
        if (!isUnderTime) {
            return reply.code(400).send({ message: "Your otp is expire ,please try regenrating otp" })
        }
        console.log(tempUser[0].verifyOTP);
        const isOtpValid = tempUser[0].verifyOTP === otp
        if (!isOtpValid) {
            return reply.code(400).send({ message: "User verification failed,OTP was incorrect" })
        }
        const modifiedUser = await connection.execute("UPDATE user SET verifyOTP = null, isVerified=true,verifyOTPExpiry=null WHERE email=?", [tempUser[0].email])
        console.log(modifiedUser);
        reply.code(200).send({ message: "User Verified Successfully" })
    } catch (error) {
        console.log(error);
        reply.code(500).send({ message: error.message })
    }
    finally {
        connection.release()
    }
}

async function loginUser(request, reply) {
    const { email, password } = request.body
    if (!email || !password) {
        return reply.code(400).send({ message: "No user or password provided" })
    }
    const connection = await request.server.mysql.getConnection();
    try {
        const [user] = await connection.execute("SELECT * FROM user WHERE email = ?", [email]);
        if (!user) {
            return reply.code(400).send({ message: "No account exists with this email" })
        }
        if (user[0].isVerified !== 1) {
            const verifyOtp = Math.floor(100000 + Math.random() * 900000);
            const emailResponse = sendEmail(user.email, { name: "Welcome to Expense tracker ", OTP: verifyOtp })
            const [newUserResponse] = await connection.execute("UPDATE user SET verifyOTP = ?, verifyOTPExpiry=?", [verifyOtp, Date.now + 60 * 30])
            if (!emailResponse) {
                return reply.code(401).send({ message: "Failed to email to user" })
            }
            return reply.code(200).send({ message: "New OTP has send please verify your account" })
        }
        const isPasswordCorrect = bcryptjs.compare(password, user[0].password);
        if (!isPasswordCorrect) {
            return reply.code(400).send({ message: "Please login with correct credentials" })
        }
        const payLoad = {
            email: user[0].email,
            name: user[0].name
        }
        const token = request.server.jwt.sign({ payLoad })
        reply.setCookie('userToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production" ? true : false,
            sameSite: 'lax',
            path: "/",
            maxAge: 60 * 60 * 24
        }).setCookie("isLoggedIn", true, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production" ? true : false,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24
        }).code(200).send({ message: "logged in successfully" })
    } catch (error) {
        reply.code(404).send({ message: "error in logging user" })
    }
    finally {
        connection.release()
    }


}
async function resendOtp(request, reply) {
    const { email } = request.body
    if (!email) {
        return reply.code(400).send({ message: "No user or password provided" })
    }
    const connection = await request.server.mysql.getConnection();

}
async function handleGoogleLogin(request, reply) {
    const connection = await request.server.mysql.getConnection();
    try {
        // Access googleOAuth2 from the Fastify instance
        const { token } = await this.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

        // Fetch user information using the token
        const userInfoObjectResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token.access_token}`,
            }
        })
        if (!userInfoObjectResponse.ok) {
            reply.code(400).send({ message: "Failed to fetch user information from Google" });
            return;
        }
        const userData = await userInfoObjectResponse.json();
        const { email, name, picture, sub } = userData;
        const [isExistingUser] = await connection.execute("SELECT * FROM USER WHERE EMAIL=?", [userData.email]);
        console.log(isExistingUser);
        let jwtPayload;
        // create user Account if not exists
        if (isExistingUser.length === 0) {
            // connection.execute("INSERT INTO user")
            const [insertResult] = await connection.execute(
                "INSERT INTO USER(name, email,isVerified,profile_pic,providerId,provider) VALUES (?, ?, ?,?,?,?)",
                [name, email, userData.email_verified || false, picture, userData.sub, "google"]
            );
            if (insertResult.affectedRows === 0) {
                reply.code(500).message({ message: "error creating user Account" }).redirect("/")
                return
            }
            jwtPayload = {
                email,
                name
            }
        }

        else {
            jwtPayload = {
                email: isExistingUser[0].email,
                name: isExistingUser[0].name
            }
        }
        const jwtToken = request.server.jwt.sign(jwtPayload)
        reply.setCookie('userToken', jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production" ? true : false,
            sameSite: 'lax',
            path: "/",
            maxAge: 60 * 60 * 24
        }).setCookie("isLoggedIn", true, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production" ? true : false,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24
        }).code(200).send({ message: "logged in successfully" })
        return

    } catch (error) {
        console.error('Error during Google login:', error);
        reply.code(500).send({ error: 'Authentication failed' });
    }
    finally {
        connection.release();
    }
}

export { registerUser, verifyUser, loginUser, resendOtp, handleGoogleLogin }