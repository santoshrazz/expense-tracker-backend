import bcryptjs from 'bcryptjs'
import sendEmail from '../utils/nodemailer.js';
async function registerUser(request, reply) {
    // console.log(request.body);
    try {

        // Getting the data from the body
        const { name, email, age, gender, password } = request.body;

        const connection = await request.server.mysql.getConnection();

        // checking if user already Exists
        const [tempUser] = await connection.execute("SELECT * FROM user WHERE EMAIL = ?", [email])
        console.log(`tempUser in registerUser`, tempUser);
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
}

async function verifyUser(request, reply) {
    try {
        const { email, otp } = request.body;
        const connection = await request.server.mysql.getConnection();

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
}

async function loginUser(request, reply) {
    const { email, password } = request.body
    if (!email || !password) {
        return reply.code(400).send({ message: "No user or password provided" })
    }
    const connection = await request.server.mysql.getConnection();
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
    })
        .code(200).send({ message: "logged in successfully" })

}
export { registerUser, verifyUser, loginUser }